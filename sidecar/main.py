"""
ULASA local sidecar — free speech recognition and translation, no API key.

This is the free path Addendum A asks ULASA to ship before any cloud call. It
runs on the clinician's own machine and binds to loopback only, so audio and
transcripts never touch a network. Models are downloaded once from Hugging Face
and then work offline.

    python -m venv .venv
    .venv/Scripts/activate      # Windows
    source .venv/bin/activate   # macOS / Linux
    pip install -r requirements.txt
    python main.py

Then in ULASA: Settings -> Local sidecar -> Test connection -> Use it.

Everything is lazy. Importing this file loads no model; the first /asr request
loads Whisper, the first /translate request loads IndicTrans2. A clinic that
only wants speech recognition never pays the translation model's memory cost.
"""

from __future__ import annotations

import io
import logging
import os
import tempfile
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
log = logging.getLogger("ulasa-sidecar")

# --------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------

# tiny / base / small / medium / large-v3. "small" is the honest default for a
# clinic laptop without a GPU: "medium" roughly triples the wait and "tiny"
# produces drafts that cost more to correct than to type.
WHISPER_MODEL = os.environ.get("ULASA_WHISPER_MODEL", "small")
WHISPER_DEVICE = os.environ.get("ULASA_WHISPER_DEVICE", "cpu")
WHISPER_COMPUTE = os.environ.get("ULASA_WHISPER_COMPUTE", "int8")

# The distilled IndicTrans2 checkpoints are ~1 GB and run on CPU. The full
# models are better and much heavier; a clinic with a GPU can point at them.
INDICTRANS_INDIC_EN = os.environ.get(
    "ULASA_INDICTRANS_MODEL", "ai4bharat/indictrans2-indic-en-dist-200M"
)

# Loopback only. Do not change this to 0.0.0.0 without understanding that it
# exposes recorded child speech to your whole network.
HOST = os.environ.get("ULASA_HOST", "127.0.0.1")
PORT = int(os.environ.get("ULASA_PORT", "8765"))

# ULASA's own origins. Add your deployment's origin if you self-host.
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "ULASA_ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if o.strip()
]

# Whisper's own language codes.
WHISPER_LANG = {
    "en-IN": "en", "en-US": "en", "en-GB": "en",
    "hi-IN": "hi", "ta-IN": "ta", "kn-IN": "kn", "te-IN": "te", "ml-IN": "ml",
}

# IndicTrans2 uses FLORES-style tags.
INDICTRANS_LANG = {
    "hi-IN": "hin_Deva",
    "kn-IN": "kan_Knda",
    "ta-IN": "tam_Taml",
    "te-IN": "tel_Telu",
    "ml-IN": "mal_Mlym",
    "en-IN": "eng_Latn",
    "en-US": "eng_Latn",
}

# Whisper's word error rate on these languages is not uniform, and a clinician
# deserves to know which drafts to distrust.
ASR_QUALITY_NOTE = {
    "en": "English drafts from local Whisper are usually usable with light correction.",
    "hi": "Hindi drafts are usually usable, but check case postpositions and aspect auxiliaries, which Whisper often drops or merges.",
    "ta": "Tamil drafts are a rough starting point. Whisper's Tamil is weak on agglutinated verb forms and sandhi at clause boundaries — expect to retype a substantial share.",
    "kn": "Kannada drafts are a rough starting point. Colloquial spoken forms are frequently normalised toward the written register, which will distort your error coding if left uncorrected.",
    "te": "Telugu drafts are a rough starting point. Verb endings carrying person, number and gender are often wrong — correct them before coding agreement errors.",
    "ml": "Malayalam drafts are the weakest of the six. Heavy sandhi and compounding mean word boundaries are frequently misplaced, which directly corrupts MLU-w. Treat the draft as a prompt for your own transcription rather than a transcript.",
}

app = FastAPI(title="ULASA local sidecar", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

_whisper: Any = None
_translator: Any = None


# --------------------------------------------------------------------------
# Health
# --------------------------------------------------------------------------

@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "ulasa-sidecar",
        "whisper_model": WHISPER_MODEL,
        "whisper_loaded": _whisper is not None,
        "translator_model": INDICTRANS_INDIC_EN,
        "translator_loaded": _translator is not None,
        "languages": sorted(WHISPER_LANG.keys()),
    }


# --------------------------------------------------------------------------
# Speech recognition
# --------------------------------------------------------------------------

def _load_whisper():
    global _whisper
    if _whisper is not None:
        return _whisper
    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:  # pragma: no cover
        raise HTTPException(
            status_code=503,
            detail="faster-whisper is not installed. Run: pip install -r requirements.txt",
        ) from exc

    log.info("Loading Whisper %s on %s (%s). First run downloads the model.",
             WHISPER_MODEL, WHISPER_DEVICE, WHISPER_COMPUTE)
    _whisper = WhisperModel(WHISPER_MODEL, device=WHISPER_DEVICE, compute_type=WHISPER_COMPUTE)
    return _whisper


@app.post("/asr")
async def asr(audio: UploadFile = File(...), language: str = Form("en-IN")) -> dict[str, Any]:
    """Transcribes an uploaded recording into time-stamped segments."""
    model = _load_whisper()
    whisper_lang = WHISPER_LANG.get(language)

    payload = await audio.read()
    if not payload:
        raise HTTPException(status_code=400, detail="The uploaded audio was empty.")

    suffix = os.path.splitext(audio.filename or "sample.webm")[1] or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(payload)
        path = tmp.name

    try:
        segments, info = model.transcribe(
            path,
            language=whisper_lang,
            vad_filter=True,
            # Utterance boundaries matter more here than in general
            # transcription: a merged pair of utterances silently doubles an
            # MLU. A short minimum silence splits more eagerly, and the
            # clinician merges back in the Studio, which is the cheaper error.
            vad_parameters={"min_silence_duration_ms": 400},
            beam_size=5,
        )

        out = [
            {
                "text": seg.text.strip(),
                "start": round(seg.start, 2),
                "end": round(seg.end, 2),
                "confidence": round(float(getattr(seg, "avg_logprob", 0.0)), 3),
            }
            for seg in segments
            if seg.text.strip()
        ]
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass

    detected = whisper_lang or getattr(info, "language", "unknown")
    note = ASR_QUALITY_NOTE.get(
        detected,
        "Draft from local Whisper. Review every line against the audio.",
    )

    return {
        "segments": out,
        "language": language,
        "detected_language": detected,
        "model_note": (
            f"Draft from local Whisper ({WHISPER_MODEL}). {note} "
            "Utterance boundaries are pause-based and will need correcting: a merged pair of "
            "utterances silently doubles the MLU for that line."
        ),
    }


# --------------------------------------------------------------------------
# Translation
# --------------------------------------------------------------------------

class TranslateRequest(BaseModel):
    text: str
    source: str = "hi-IN"
    target: str = "en-IN"


def _load_translator():
    global _translator
    if _translator is not None:
        return _translator
    try:
        import torch
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
    except ImportError as exc:  # pragma: no cover
        raise HTTPException(
            status_code=503,
            detail=(
                "transformers and torch are not installed. Run: pip install -r requirements.txt "
                "Translation is optional — every ULASA measure works without it."
            ),
        ) from exc

    log.info("Loading IndicTrans2 %s. First run downloads roughly 1 GB.", INDICTRANS_INDIC_EN)
    tokenizer = AutoTokenizer.from_pretrained(INDICTRANS_INDIC_EN, trust_remote_code=True)
    model = AutoModelForSeq2SeqLM.from_pretrained(INDICTRANS_INDIC_EN, trust_remote_code=True)
    model.eval()
    _translator = (tokenizer, model, torch)
    return _translator


@app.post("/translate")
def translate(request: TranslateRequest) -> dict[str, Any]:
    """
    Produces an English gloss of an Indic utterance.

    The gloss exists so an examiner or supervisor who does not speak the
    language can read the transcript, and so a parent summary can be drafted.
    ULASA's measure engine cannot accept it: the type system marks translated
    text with a brand that no measure function takes. Nothing computed from a
    translation is ever reported as the child's score.
    """
    source = INDICTRANS_LANG.get(request.source)
    target = INDICTRANS_LANG.get(request.target)
    if not source or not target:
        raise HTTPException(
            status_code=400,
            detail=f"No IndicTrans2 language tag for {request.source} -> {request.target}.",
        )
    if source == target:
        return {"text": request.text, "provider": "none", "note": "Source and target are the same."}

    tokenizer, model, torch = _load_translator()

    batch = tokenizer(
        [request.text],
        src_lang=source,
        tgt_lang=target,
        truncation=True,
        padding=True,
        return_tensors="pt",
    )
    with torch.inference_mode():
        generated = model.generate(**batch, max_length=256, num_beams=5)
    decoded = tokenizer.batch_decode(generated, skip_special_tokens=True)

    return {
        "text": decoded[0] if decoded else "",
        "provider": f"IndicTrans2 ({INDICTRANS_INDIC_EN})",
        "note": "Machine gloss. Never used to compute any score.",
    }


# --------------------------------------------------------------------------
# Transliteration
# --------------------------------------------------------------------------

class TransliterateRequest(BaseModel):
    text: str
    source: str = "hi-IN"


@app.post("/transliterate")
def transliterate(request: TransliterateRequest) -> dict[str, Any]:
    """
    Romanised Indic ("Hinglish", "Tanglish") to native script.

    Optional and best-effort. If indic-transliteration is not installed the
    text is returned unchanged rather than failing, because a missing
    transliterator should never block transcription.
    """
    try:
        from indic_transliteration import sanscript
        from indic_transliteration.sanscript import transliterate as _t
    except ImportError:
        return {
            "text": request.text,
            "provider": "none",
            "note": "indic-transliteration is not installed; the text was returned unchanged.",
        }

    scheme = {
        "hi-IN": sanscript.DEVANAGARI,
        "kn-IN": sanscript.KANNADA,
        "ta-IN": sanscript.TAMIL,
        "te-IN": sanscript.TELUGU,
        "ml-IN": sanscript.MALAYALAM,
    }.get(request.source)

    if scheme is None:
        return {"text": request.text, "provider": "none", "note": "No scheme for that language."}

    return {
        "text": _t(request.text, sanscript.ITRANS, scheme),
        "provider": "indic-transliteration (ITRANS)",
        "note": (
            "Rule-based ITRANS transliteration, not a learned model. It handles systematic "
            "romanisation well and casual spellings poorly. Check the output before accepting it."
        ),
    }


if __name__ == "__main__":
    import uvicorn

    log.info("ULASA sidecar on http://%s:%d — loopback only, nothing leaves this machine.", HOST, PORT)
    uvicorn.run(app, host=HOST, port=PORT, log_level="info")
