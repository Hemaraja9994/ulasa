# ULASA local sidecar

Free speech recognition and translation on your own machine. No API key, no
account, no quota, no network egress.

**You do not need this.** Every clinical measure ULASA reports — MLU, NDW, TTR,
MTLD, intelligibility, maze rate, speaking rate, clausal density, the rubrics,
and every export — is computed in the browser from a typed transcript. The
sidecar only saves typing.

## Install

```bash
cd sidecar
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

The first `/asr` request downloads the Whisper model (~500 MB for `small`); the
first `/translate` request downloads IndicTrans2 (~1 GB). After that it works
fully offline.

Then in ULASA: **Settings → Local sidecar → Test connection → Use it.**

## What it does

| Endpoint | Model | Notes |
|---|---|---|
| `POST /asr` | faster-whisper | Time-stamped draft segments. |
| `POST /translate` | IndicTrans2 (AI4Bharat) | English gloss. Never scored. |
| `POST /transliterate` | indic-transliteration | Romanised Indic → native script. |
| `GET /health` | — | Used by the Settings connection test. |

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `ULASA_WHISPER_MODEL` | `small` | `tiny`/`base`/`small`/`medium`/`large-v3` |
| `ULASA_WHISPER_DEVICE` | `cpu` | Set `cuda` if you have a GPU |
| `ULASA_WHISPER_COMPUTE` | `int8` | `float16` on GPU |
| `ULASA_PORT` | `8765` | |
| `ULASA_ALLOWED_ORIGINS` | localhost:3000 | Add your deployed ULASA origin |

## How good is the speech recognition, honestly

Whisper's accuracy is not uniform across these six languages, and the sidecar
returns a per-language caution with every draft:

- **English, Hindi** — usually usable with light correction.
- **Tamil, Kannada, Telugu** — a rough starting point. Agglutinated verb forms
  and colloquial spoken register are frequently wrong.
- **Malayalam** — the weakest. Heavy sandhi means word boundaries are often
  misplaced, and a misplaced word boundary directly corrupts MLU in words.

Utterance segmentation is pause-based in all languages and always needs
correcting. Two utterances merged into one silently doubles the MLU for that
line, which is the single most damaging transcription error in language sample
analysis. Correct boundaries before you trust any number.

## Privacy

The service binds to `127.0.0.1` only. Do not change `ULASA_HOST` to `0.0.0.0`
without understanding that it exposes recorded child speech to your whole
network.
