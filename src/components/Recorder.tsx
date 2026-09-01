"use client";

import { useEffect, useRef, useState } from "react";
import { saveAudio } from "@/lib/audio";

/**
 * On-device capture.
 *
 * MediaRecorder writes to a Blob in this tab; the Blob goes to IndexedDB via
 * `saveAudio`. There is no upload path in this component and no ASR call —
 * the mic stream never leaves the browser. The level meter is driven by a real
 * AnalyserNode rather than a generated waveform: a meter that moves when the
 * room is silent would be worse than no meter at all.
 */

const BAR_COUNT = 40;

export function Recorder({
  audioKey,
  onRecorded,
}: {
  audioKey: string;
  onRecorded?: (seconds: number) => void;
}) {
  const [state, setState] = useState<"idle" | "recording" | "error">("idle");
  const [levels, setLevels] = useState<number[]>(() => Array(BAR_COUNT).fill(0));
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      void audioCtxRef.current?.close();
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        await saveAudio(audioKey, blob);
        onRecorded?.(Math.round((Date.now() - startedAtRef.current) / 1000));
        stream.getTracks().forEach((t) => t.stop());
      };

      // Live level meter from the same stream.
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (const v of data) peak = Math.max(peak, Math.abs(v - 128) / 128);
        setLevels((prev) => [...prev.slice(1), peak]);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

      startedAtRef.current = Date.now();
      recorder.start();
      recorderRef.current = recorder;
      setState("recording");
    } catch {
      setState("error");
      setError("No microphone is available, or permission was declined. You can still transcribe by hand in the Studio.");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    void audioCtxRef.current?.close();
    audioCtxRef.current = null;
    setLevels(Array(BAR_COUNT).fill(0));
    setState("idle");
  }

  return (
    <div className="card p-[18px]">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="meta-label">Recorder</span>
        {state === "recording" && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--danger-text)" }}>
            <span className="h-2 w-2 rounded-full" style={{ background: "var(--danger)" }} />
            Recording
          </span>
        )}
      </div>

      <div className="flex h-[46px] items-end gap-[2px] py-1.5" aria-hidden="true">
        {levels.map((lv, i) => (
          <span
            key={i}
            className="flex-1 rounded-[1px]"
            style={{ background: "var(--signal, #2BC0AC)", height: `${Math.max(2, lv * 100)}%`, opacity: state === "recording" ? 1 : 0.3 }}
          />
        ))}
      </div>

      <button
        type="button"
        className={`btn mt-2 min-h-11 w-full ${state === "recording" ? "btn-danger" : "btn-primary"}`}
        onClick={state === "recording" ? stop : start}
      >
        {state === "recording" ? "Stop recording" : "Start recording"}
      </button>

      <p className="mt-2 text-[12.5px] leading-normal" style={{ color: "var(--text-muted)" }}>
        Audio is written to IndexedDB in this browser. It is never uploaded and never leaves with the transcript export unless you ask.
      </p>

      {error && (
        <p className="mt-2 text-[12.5px]" style={{ color: "var(--warn-text)" }}>
          {error}
        </p>
      )}

      <div
        className="mt-3 flex items-center gap-2 rounded-lg px-[11px] py-[9px]"
        style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-border)" }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3l8 4v6c0 5-4 7.5-8 9-4-1.5-8-4-8-9V7l8-4z" />
        </svg>
        <span className="text-[12.5px] font-semibold" style={{ color: "var(--accent-text)" }}>
          On-device capture · no ASR armed
        </span>
      </div>
    </div>
  );
}
