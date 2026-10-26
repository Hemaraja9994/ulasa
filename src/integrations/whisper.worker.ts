/// <reference lib="webworker" />
/**
 * In-browser Whisper (transformers.js, ONNX Runtime Web). Runs in a worker so
 * the Studio stays responsive. Audio arrives as 16 kHz mono Float32 and never
 * leaves this browser; only the model weights are fetched (from the Hugging
 * Face CDN) and the browser caches them after the first download.
 *
 * Pattern adapted from xenova/whisper-web (MIT).
 */
import { pipeline, env } from "@huggingface/transformers";

env.allowLocalModels = false;

type Device = "webgpu" | "wasm";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let asr: any = null;
let loadedKey = "";

interface RunMessage {
  type: "run";
  model: string;
  language: string;
  audio: Float32Array;
}

async function hasWebGpu(): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gpu = (self.navigator as any).gpu;
    if (!gpu) return false;
    return !!(await gpu.requestAdapter());
  } catch {
    return false;
  }
}

async function load(model: string): Promise<Device> {
  const preferGpu = await hasWebGpu();
  const devices: Device[] = preferGpu ? ["webgpu", "wasm"] : ["wasm"];
  let lastError: unknown = null;
  for (const device of devices) {
    const key = `${model}|${device}`;
    if (asr && loadedKey === key) return device;
    try {
      asr = await pipeline("automatic-speech-recognition", model, {
        device,
        dtype: device === "webgpu" ? { encoder_model: "fp32", decoder_model_merged: "q4" } : "q8",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        progress_callback: (p: any) => self.postMessage({ type: "progress", data: p }),
      });
      loadedKey = key;
      return device;
    } catch (e) {
      lastError = e;
      asr = null;
      loadedKey = "";
    }
  }
  throw lastError ?? new Error("Could not load the speech model.");
}

self.addEventListener("message", async (event: MessageEvent<RunMessage>) => {
  const msg = event.data;
  if (msg?.type !== "run") return;
  try {
    const t0 = performance.now();
    const device = await load(msg.model);
    const loadMs = Math.round(performance.now() - t0);
    self.postMessage({ type: "status", data: { stage: "transcribing", device } });
    const t1 = performance.now();
    const out = await asr(msg.audio, {
      language: msg.language,
      task: "transcribe",
      return_timestamps: true,
      chunk_length_s: 30,
      stride_length_s: 5,
    });
    const runMs = Math.round(performance.now() - t1);
    const chunks = Array.isArray(out?.chunks) && out.chunks.length
      ? out.chunks
      : [{ text: out?.text ?? "", timestamp: [0, null] }];
    self.postMessage({
      type: "result",
      data: {
        device,
        loadMs,
        runMs,
        segments: chunks.map((c: { text: string; timestamp: [number | null, number | null] }) => ({
          text: c.text,
          start: c.timestamp?.[0] ?? 0,
          end: c.timestamp?.[1] ?? c.timestamp?.[0] ?? 0,
        })),
      },
    });
  } catch (e) {
    self.postMessage({ type: "error", data: e instanceof Error ? e.message : String(e) });
  }
});

export {};
