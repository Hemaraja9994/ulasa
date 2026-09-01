"use client";

import { useEffect, useRef } from "react";

/**
 * Waveform drawn to a canvas from a pre-computed peak envelope.
 *
 * Hand-rolled rather than pulled from a library: the whole surface is one
 * canvas, a playhead and a click handler, and avoiding the dependency keeps the
 * offline bundle small enough to work on a field laptop over a poor connection.
 */
export function Waveform({
  peaks,
  duration,
  position,
  onSeek,
  height = 72,
}: {
  peaks: Float32Array | null;
  duration: number;
  position: number;
  onSeek: (seconds: number) => void;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const styles = getComputedStyle(document.documentElement);
    const wave = styles.getPropertyValue("--border-strong").trim() || "#c9ccc9";
    const played = styles.getPropertyValue("--accent").trim() || "#1f6f5c";

    const mid = height / 2;
    const playedRatio = duration > 0 ? position / duration : 0;

    for (let x = 0; x < width; x++) {
      const peak = peaks[Math.floor((x / width) * peaks.length)] ?? 0;
      const amplitude = Math.max(1, peak * (height / 2) * 0.94);
      ctx.fillStyle = x / width <= playedRatio ? played : wave;
      ctx.fillRect(x, mid - amplitude, 1, amplitude * 2);
    }

    // Playhead
    if (duration > 0) {
      ctx.fillStyle = played;
      ctx.fillRect(Math.min(width - 2, playedRatio * width), 0, 2, height);
    }
  }, [peaks, duration, position, height]);

  return (
    <canvas
      ref={canvasRef}
      role="slider"
      tabIndex={0}
      aria-label="Audio position"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(position)}
      style={{
        width: "100%",
        height,
        display: "block",
        cursor: peaks ? "pointer" : "default",
        borderRadius: 6,
        background: "var(--surface-2)",
      }}
      onClick={(e) => {
        if (!peaks || duration <= 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        onSeek(((e.clientX - rect.left) / rect.width) * duration);
      }}
      onKeyDown={(e) => {
        if (duration <= 0) return;
        if (e.key === "ArrowLeft") onSeek(Math.max(0, position - 2));
        if (e.key === "ArrowRight") onSeek(Math.min(duration, position + 2));
      }}
    />
  );
}
