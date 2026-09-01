"use client";

import { del, get, set } from "idb-keyval";

/**
 * Audio lives in IndexedDB, not in the persisted Zustand store.
 *
 * A ten-minute recording is tens of megabytes; localStorage caps out around
 * five. Keeping blobs in IndexedDB also means the audio can be deleted
 * independently of the transcript, which is what a clinician wants when a
 * consent window closes but the analysis must be retained.
 */

const PREFIX = "ulasa-audio-";

export async function saveAudio(key: string, blob: Blob): Promise<void> {
  await set(PREFIX + key, blob);
}

export async function loadAudio(key: string): Promise<Blob | undefined> {
  return get<Blob>(PREFIX + key);
}

export async function deleteAudio(key: string): Promise<void> {
  await del(PREFIX + key);
}

/**
 * Downsamples an audio file to a peak-per-pixel envelope for the waveform.
 * Decoding happens once; the resulting Float32Array is small enough to keep in
 * component state.
 */
export async function computeWaveform(blob: Blob, buckets = 1200): Promise<{ peaks: Float32Array; duration: number }> {
  const AudioCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtor();
  try {
    const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
    const channel = buffer.getChannelData(0);
    const blockSize = Math.max(1, Math.floor(channel.length / buckets));
    const peaks = new Float32Array(buckets);

    for (let i = 0; i < buckets; i++) {
      const start = i * blockSize;
      let peak = 0;
      for (let j = 0; j < blockSize && start + j < channel.length; j++) {
        const value = Math.abs(channel[start + j]);
        if (value > peak) peak = value;
      }
      peaks[i] = peak;
    }
    return { peaks, duration: buffer.duration };
  } finally {
    void ctx.close();
  }
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
