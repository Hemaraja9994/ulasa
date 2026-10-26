import type { Bcp47, GlossedText } from "@/core/types";
import {
  ProviderUnavailable,
  type LanguageService,
  type TranscriptDraft,
} from "@/integrations/languageService";

export type WhisperSize = "tiny" | "base" | "small";

export const WHISPER_MODELS: Record<WhisperSize, { id: string; label: string; approxMb: number }> = {
  tiny: { id: "onnx-community/whisper-tiny", label: "Tiny — fastest (~40 MB)", approxMb: 40 },
  base: { id: "onnx-community/whisper-base", label: "Base — balanced (~80 MB)", approxMb: 80 },
  small: { id: "onnx-community/whisper-small", label: "Small — most accurate, slow (~250 MB)", approxMb: 250 },
};

const WHISPER_LANG: Record<string, string> = {
  "en-IN": "en", "en-US": "en", "en-GB": "en",
  "hi-IN": "hi", "kn-IN": "kn", "ta-IN": "ta", "te-IN": "te", "ml-IN": "ml",
};

export function whisperLanguage(lang: Bcp47): string {
  return WHISPER_LANG[lang] ?? "en";
}

export interface AsrProgress {
  stage: "decoding" | "downloading" | "loading" | "transcribing";
  /** 0..100 when known (model download). */
  percent?: number;
  file?: string;
  device?: string;
}

/** Decodes any browser-playable audio/video to 16 kHz mono Float32. */
export async function decodeTo16kMono(blob: Blob): Promise<Float32Array> {
  const buf = await blob.arrayBuffer();
  const Ctx: typeof AudioContext =
    window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx({ sampleRate: 16000 });
  try {
    const decoded = await ctx.decodeAudioData(buf);
    if (decoded.numberOfChannels === 1) return decoded.getChannelData(0).slice();
    const out = new Float32Array(decoded.length);
    for (let c = 0; c < decoded.numberOfChannels; c++) {
      const ch = decoded.getChannelData(c);
      for (let i = 0; i < ch.length; i++) out[i] += ch[i] / decoded.numberOfChannels;
    }
    return out;
  } finally {
    void ctx.close();
  }
}

let worker: Worker | null = null;
function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./whisper.worker.ts", import.meta.url), { type: "module" });
  }
  return worker;
}

/**
 * Whisper running inside the browser (transformers.js). Audio is processed on
 * this device; only model weights are downloaded, once, from the Hugging Face CDN.
 */
export class BrowserWhisperService implements LanguageService {
  readonly id = "browser-whisper" as const;
  readonly external = false;
  readonly label: string;

  constructor(
    private readonly size: WhisperSize = "base",
    private readonly onProgress?: (p: AsrProgress) => void,
  ) {
    this.label = `In-browser Whisper ${size} (on this device)`;
  }

  async available() {
    return typeof window !== "undefined" && typeof Worker !== "undefined" && typeof WebAssembly !== "undefined";
  }

  async asr(audio: Blob, lang: Bcp47): Promise<TranscriptDraft> {
    this.onProgress?.({ stage: "decoding" });
    let pcm: Float32Array;
    try {
      pcm = await decodeTo16kMono(audio);
    } catch {
      throw new ProviderUnavailable(
        "browser-whisper",
        "This browser could not decode the attached audio. Try a WAV, MP3 or M4A file.",
      );
    }
    const model = WHISPER_MODELS[this.size];
    const w = getWorker();
    const files: Record<string, { loaded: number; total: number }> = {};

    const result = await new Promise<{ device: string; loadMs: number; runMs: number; segments: TranscriptDraft["segments"] }>(
      (resolve, reject) => {
        const onMessage = (e: MessageEvent) => {
          const { type, data } = e.data ?? {};
          if (type === "progress") {
            if (data?.status === "progress" && data.file) {
              files[data.file] = { loaded: data.loaded ?? 0, total: data.total ?? 0 };
              const totals = Object.values(files).reduce(
                (a, f) => ({ loaded: a.loaded + f.loaded, total: a.total + f.total }),
                { loaded: 0, total: 0 },
              );
              this.onProgress?.({
                stage: "downloading",
                file: data.file,
                percent: totals.total ? Math.min(100, Math.round((totals.loaded / totals.total) * 100)) : undefined,
              });
            } else if (data?.status === "ready") {
              this.onProgress?.({ stage: "loading", percent: 100 });
            }
          } else if (type === "status") {
            this.onProgress?.({ stage: "transcribing", device: data?.device });
          } else if (type === "result") {
            w.removeEventListener("message", onMessage);
            resolve(data);
          } else if (type === "error") {
            w.removeEventListener("message", onMessage);
            reject(new ProviderUnavailable("browser-whisper", `In-browser speech recognition failed: ${data}`));
          }
        };
        w.addEventListener("message", onMessage);
        w.postMessage({ type: "run", model: model.id, language: whisperLanguage(lang), audio: pcm }, [pcm.buffer]);
      },
    );

    const lowResource = whisperLanguage(lang) !== "en";
    return {
      segments: result.segments,
      language: lang,
      provider: "browser-whisper",
      isDraft: true,
      modelNote: `Draft from Whisper ${this.size} running in this browser (${result.device}; model ready in ${(result.loadMs / 1000).toFixed(1)} s, transcribed in ${(result.runMs / 1000).toFixed(1)} s). Audio did not leave this device. Check every line before analysis.${lowResource ? " Whisper is weak on Indian languages (especially Kannada, Telugu and Malayalam): it may output the wrong script, English, or repeated text — treat this as a rough starting point and use the Small model or the local sidecar for better drafts." : ""}`,
    };
  }

  async translate(): Promise<GlossedText> {
    throw new ProviderUnavailable(
      "browser-whisper",
      "Translation is not available in the browser. Enable the local sidecar in Settings for offline IndicTrans2 translation, or type a gloss yourself. Translation never affects any score.",
    );
  }

  async transliterate(text: string) {
    return text;
  }
}
