"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type InputMethod, SUPPORTED_LANGUAGES, useActiveSample, useHydrated, useStore } from "@/store/useStore";
import { parseUtteranceText, countableWords } from "@/core/tokenise";
import { getPack } from "@/nlp/registry";
import { Waveform } from "@/components/Waveform";
import { Dropzone } from "@/components/Dropzone";
import { computeWaveform, deleteAudio, formatTime, loadAudio, saveAudio } from "@/lib/audio";
import { resolveService, ProviderUnavailable } from "@/integrations/languageService";
import { formatDraftLines } from "@/integrations/asrFormat";
import { WHISPER_MODELS, type AsrProgress, type WhisperSize } from "@/integrations/browserWhisper";
import { INPUT_METHODS } from "@/lib/inputMethods";
import { CONTEXT_LABELS, formatDuration } from "@/lib/format";
import { useSampleActions } from "@/lib/useSampleActions";
import type { Bcp47, ElicitationContext, Utterance } from "@/core/types";

/**
 * The Transcription Studio.
 *
 * A plain textarea using SALT-style conventions, for fast typing. A clinician
 * transcribing 50 utterances wants to type, not to click through a form, and
 * every convention they already know from SALT works here unchanged. Coding
 * (grammaticality, clauses, error codes) lives on its own step, /code.
 */

const MIN_SET = 50;

const MARKS: { label: string; tip: string; wrap?: [string, string]; insert?: string }[] = [
  { label: "( )", tip: "Maze: wrap the selection (repetition, revision, filled pause, false start)", wrap: ["(", ")"] },
  { label: "X", tip: "Unintelligible word", insert: "X" },
  { label: "*", tip: "Omission: mark the next word as omitted", insert: "*" },
  { label: "[ ]", tip: "Error or descriptive code", wrap: ["[", "]"] },
  { label: "(:2.0)", tip: "Silent pause in seconds", insert: "(:2.0)" },
  { label: "/", tip: "Bound-morpheme split; the surface spelling is preserved", insert: "/" },
  { label: "+", tip: "Clinician comment, excluded from every count", insert: " +" },
];

const CONVENTIONS: [string, string][] = [
  ["C  text", "Speaker code, then the utterance"],
  ["(word)", "Maze, excluded from word counts"],
  ["X  XXX", "Unintelligible word / run"],
  ["*word", "Omitted word"],
  ["word/m", "Bound-morpheme split"],
  ["[E:CASE]", "Error code from the pack"],
  ["(:2.5)", "Silent pause in seconds"],
  ["+note", "Comment, never counted"],
];

export default function Studio() {
  const sample = useActiveSample();
  const hydrated = useHydrated();
  const updateSample = useStore((s) => s.updateSample);
  const replaceUtterances = useStore((s) => s.replaceUtterances);
  const cloud = useStore((s) => s.cloud);
  const setCloud = useStore((s) => s.setCloud);
  const log = useStore((s) => s.log);
  const method = useStore((s) => s.inputMethod);
  const setMethod = useStore((s) => s.setInputMethod);
  const { importFiles } = useSampleActions();

  const [draft, setDraft] = useState("");
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const [importNotes, setImportNotes] = useState<string[]>([]);
  const [asrState, setAsrState] = useState<{ busy: boolean; message: string | null }>({ busy: false, message: null });
  const [asrProgress, setAsrProgress] = useState<AsrProgress | null>(null);
  const [asrDraftNote, setAsrDraftNote] = useState<string | null>(null);
  const whisperSize: WhisperSize = cloud.whisperModel ?? "base";

  // --- audio ---------------------------------------------------------------
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);

  // --- live recording --------------------------------------------------------
  const recorderRef = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [recError, setRecError] = useState<string | null>(null);

  const pack = useMemo(() => (sample ? getPack(sample.language) : getPack("en-IN")), [sample]);

  // Seed the textarea from the stored utterances whenever the sample changes.
  useEffect(() => {
    if (!sample) return;
    const lines = sample.utterances.map((u) => {
      const speaker = sample.speakers.find((s) => s.id === u.speakerId);
      return `${speaker?.code ?? "C"} ${u.text}`;
    });
    setDraft(lines.join("\n"));
    setDirty(false);
    setSavedAt(null);
  }, [sample?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load stored audio for this sample.
  useEffect(() => {
    let revoked: string | null = null;
    (async () => {
      if (!sample?.audioKey) {
        setAudioUrl(null);
        setPeaks(null);
        setDuration(0);
        return;
      }
      const blob = await loadAudio(sample.audioKey);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      revoked = url;
      setAudioUrl(url);
      try {
        const { peaks: p, duration: d } = await computeWaveform(blob);
        setPeaks(p);
        setDuration(d);
      } catch {
        setPeaks(null);
      }
    })();
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [sample?.audioKey]);

  const commitDraft = useCallback(() => {
    if (!sample) return;
    const lines = draft.split(/\r?\n/);
    const utterances: Utterance[] = [];
    const speakerByCode = new Map(sample.speakers.map((s) => [s.code.toUpperCase(), s]));

    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const match = trimmed.match(/^([A-Za-z]{1,4})\s+(.*)$/);
      const code = match ? match[1].toUpperCase() : sample.speakers.find((s) => s.isTarget)?.code ?? "C";
      const text = match ? match[2] : trimmed;
      const speaker = speakerByCode.get(code) ?? sample.speakers.find((s) => s.isTarget)!;

      const parsed = parseUtteranceText(text, pack);
      // Preserve any coding the clinician already applied to this line.
      const existing = sample.utterances[i];
      utterances.push({
        id: existing?.id ?? `utt-${i}-${Math.random().toString(36).slice(2, 7)}`,
        speakerId: speaker.id,
        text,
        tokens: parsed.tokens,
        mazes: parsed.mazes,
        intelligibility: parsed.intelligibility,
        grammaticality: existing?.text === text ? existing.grammaticality : "unmarked",
        clauseCountOverride: existing?.text === text ? existing.clauseCountOverride : undefined,
        isAbandoned: existing?.text === text ? existing.isAbandoned : undefined,
        codes: parsed.codes,
        pauses: parsed.pauses,
        comment: parsed.comment,
        startTime: existing?.text === text ? existing.startTime : undefined,
        endTime: existing?.text === text ? existing.endTime : undefined,
        gloss: existing?.text === text ? existing.gloss : undefined,
      });
    });

    replaceUtterances(sample.id, utterances);
    setDirty(false);
    setSavedAt(Date.now());
  }, [draft, pack, replaceUtterances, sample]);

  // Autosave two seconds after typing stops.
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(commitDraft, 2000);
    return () => clearTimeout(timer);
  }, [dirty, commitDraft]);

  // Leaving the Studio (stepper, nav) must not lose the last two seconds of typing.
  const pending = useRef({ dirty, commitDraft });
  pending.current = { dirty, commitDraft };
  useEffect(() => () => {
    if (pending.current.dirty) pending.current.commitDraft();
  }, []);

  // Keep "Saved n s ago" fresh.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  const liveCounts = useMemo(() => {
    if (!sample) return null;
    const parsedLines = draft
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const match = l.match(/^([A-Za-z]{1,4})\s+(.*)$/);
        const code = match ? match[1].toUpperCase() : "C";
        const text = match ? match[2] : l;
        return { code, parsed: parseUtteranceText(text, pack) };
      });

    const targetCode = sample.speakers.find((s) => s.isTarget)?.code.toUpperCase() ?? "C";
    const targetLines = parsedLines.filter((l) => l.code === targetCode);
    const words = targetLines.flatMap((l) => countableWords(l.parsed.tokens));
    const withMazes = targetLines.flatMap((l) => countableWords(l.parsed.tokens, true));
    const mazeWords = withMazes.length - words.length;

    return {
      utterances: targetLines.length,
      words: words.length,
      types: new Set(words.map((w) => w.toLowerCase())).size,
      mazePct: withMazes.length ? Math.round((mazeWords / withMazes.length) * 1000) / 10 : 0,
      mlu: targetLines.length ? Math.round((words.length / targetLines.length) * 100) / 100 : 0,
    };
  }, [draft, pack, sample]);

  async function attachAudio(blob: Blob, label: string) {
    if (!sample) return;
    // A new key per attachment, so replacing audio reloads the waveform.
    const key = `${sample.id}-${Date.now().toString(36)}`;
    await saveAudio(key, blob);
    if (sample.audioKey) await deleteAudio(sample.audioKey);
    updateSample(sample.id, { audioKey: key });
    log("attach_audio", `Attached ${label} to "${sample.title}". Stored in this browser only.`);
  }

  async function startRecording() {
    setRecError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        void attachAudio(blob, "a live recording");
        setRecording(false);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecSeconds(0);
      setRecording(true);
    } catch {
      setRecError("The browser did not allow microphone access. Check the site permission and try again.");
    }
  }

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  // Stop the microphone if the clinician navigates away mid-recording.
  useEffect(() => () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  async function runAsr() {
    if (!sample?.audioKey) return;
    setAsrState({ busy: true, message: null });
    setAsrProgress(null);
    try {
      const service = await resolveService(cloud, { onAsrProgress: setAsrProgress });
      const blob = await loadAudio(sample.audioKey);
      if (!blob) throw new Error("The audio for this sample is no longer in this browser.");

      const result = await service.asr(blob, sample.language);
      log("asr", `Speech recognition drafted ${result.segments.length} segment(s) using ${service.label}.`, service.external);

      const targetCode = sample.speakers.find((s) => s.isTarget)?.code ?? "C";
      const lines = formatDraftLines(result.segments, targetCode);
      setDraft((prev) => (prev.trim() ? prev + "\n" + lines.join("\n") : lines.join("\n")));
      setDirty(true);
      setAsrProgress(null);
      setAsrDraftNote(result.modelNote);
      setAsrState({ busy: false, message: null });
    } catch (error) {
      const message =
        error instanceof ProviderUnavailable
          ? error.message
          : error instanceof Error
            ? error.message
            : "Speech recognition failed.";
      setAsrProgress(null);
      setAsrState({ busy: false, message });
    }
  }

  if (!hydrated) {
    return (
      <div className="card p-8 text-center" style={{ color: "var(--text-muted)" }} aria-busy="true">
        Loading…
      </div>
    );
  }

  if (!sample) return <EmptyState />;

  const isIndic = pack.script !== "Latin";
  const n = liveCounts?.utterances ?? 0;
  const remaining = Math.max(0, MIN_SET - n);
  const saveStatus = dirty
    ? "Unsaved changes · saving shortly"
    : savedAt
      ? `Saved ${Math.max(1, Math.round((Date.now() - savedAt) / 1000))} s ago`
      : "All changes saved";

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="seg max-w-full self-start overflow-x-auto" role="group" aria-label="Input method">
          {INPUT_METHODS.map((m) => (
            <button key={m.id} type="button" className="seg-btn" aria-pressed={method === m.id} onClick={() => setMethod(m.id as InputMethod)}>
              {m.label}
            </button>
          ))}
        </div>

        {/* --- media ------------------------------------------------------ */}
        <section className="panel flex flex-col gap-3 px-[18px] py-4" aria-label="Media">
          {method === "import" ? (
            <>
              <Dropzone onFiles={(files) => void importFiles(files, { caseId: sample.caseId, language: sample.language }).then(setImportNotes)} />
              <p className="m-0" style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5 }}>
                Each imported file becomes a new sample under case {sample.caseId === "unassigned" ? "“unassigned”" : sample.caseId}.
                CHAT headers are mapped to speakers; dependent tiers such as %mor are kept but not scored.
              </p>
              {importNotes.length > 0 && (
                <ul className="notice notice-warn m-0 list-disc pl-8" style={{ fontSize: 13 }}>
                  {importNotes.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full border-0"
                    style={{ background: sample.audioKey ? "var(--accent)" : "var(--surface-2)", color: "var(--on-accent)", cursor: sample.audioKey ? "pointer" : "not-allowed" }}
                    aria-label={playing ? "Pause" : "Play"}
                    disabled={!sample.audioKey}
                    onClick={() => {
                      const el = audioRef.current;
                      if (!el) return;
                      if (el.paused) void el.play();
                      else el.pause();
                    }}
                  >
                    {playing ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={sample.audioKey ? "currentColor" : "var(--text-muted)"} aria-hidden="true"><path d="M7 4v16l13-8z" /></svg>
                    )}
                  </button>
                  <div className="flex flex-col" style={{ lineHeight: 1.3 }}>
                    <span className="font-semibold" style={{ fontSize: 14 }}>
                      {recording ? `Recording · ${formatTime(recSeconds)}` : sample.audioKey ? "Attached audio" : "No audio attached"}
                    </span>
                    {sample.audioKey && (
                      <span className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {formatTime(position)} / {formatTime(duration)} · {rate}×
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {method === "audio" && (
                    <label className="btn" style={{ cursor: "pointer", fontSize: 13.5, padding: "7px 12px" }}>
                      {sample.audioKey ? "Replace audio" : "Upload audio"}
                      <input
                        type="file"
                        accept="audio/*,video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void attachAudio(file, `audio "${file.name}"`);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                  {method === "record" && (
                    <button type="button" className={recording ? "btn btn-danger" : "btn"} style={{ fontSize: 13.5, padding: "7px 12px" }} onClick={() => (recording ? recorderRef.current?.stop() : void startRecording())}>
                      {recording ? "Stop and attach" : sample.audioKey ? "Record again" : "Start recording"}
                    </button>
                  )}
                  {sample.audioKey && (
                    <>
                      {!cloud.sidecarEnabled && (cloud.asrEngine ?? "whisper") === "whisper" && (
                        <select
                          className="select"
                          style={{ width: "auto", fontSize: 13.5, padding: "6px 10px" }}
                          value={whisperSize}
                          disabled={asrState.busy}
                          onChange={(e) => setCloud({ whisperModel: e.target.value as WhisperSize })}
                          aria-label="Speech model size"
                          title="In-browser Whisper model. Downloaded once, then cached by the browser."
                        >
                          {(Object.keys(WHISPER_MODELS) as WhisperSize[]).map((k) => (
                            <option key={k} value={k}>{WHISPER_MODELS[k].label}</option>
                          ))}
                        </select>
                      )}
                      <button type="button" className="btn" style={{ fontSize: 13.5, padding: "7px 12px" }} disabled={asrState.busy} onClick={() => void runAsr()}>
                        {asrState.busy ? "Drafting…" : "Draft with speech recognition"}
                      </button>
                      <button
                        type="button"
                        className="btn"
                        style={{ fontSize: 13.5, padding: "7px 12px" }}
                        title="Use the recording length as the sample's elapsed time, enabling rate measures."
                        onClick={() => duration && updateSample(sample.id, { elapsedSeconds: Math.round(duration) })}
                      >
                        Set elapsed time from audio
                      </button>
                    </>
                  )}
                </div>
              </div>

              {sample.audioKey && (
                <>
                  <Waveform
                    peaks={peaks}
                    duration={duration}
                    position={position}
                    height={56}
                    onSeek={(s) => {
                      if (audioRef.current) audioRef.current.currentTime = s;
                      setPosition(s);
                    }}
                  />
                  <audio
                    ref={audioRef}
                    src={audioUrl ?? undefined}
                    onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onLoadedMetadata={(e) => {
                      if (!duration) setDuration(e.currentTarget.duration);
                      e.currentTarget.playbackRate = rate;
                    }}
                    className="hidden"
                  />
                  <div className="flex flex-wrap items-center gap-3" style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                    <label className="flex items-center gap-1.5">
                      Speed
                      <select
                        className="select"
                        style={{ width: "auto", padding: "2px 6px", fontSize: 12.5 }}
                        value={rate}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          setRate(value);
                          if (audioRef.current) audioRef.current.playbackRate = value;
                        }}
                      >
                        {[0.5, 0.75, 1, 1.25, 1.5].map((r) => <option key={r} value={r}>{r}×</option>)}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="link-btn"
                      style={{ fontSize: 12.5, color: "var(--danger-text)" }}
                      onClick={async () => {
                        await deleteAudio(sample.audioKey!);
                        updateSample(sample.id, { audioKey: undefined });
                        log("delete_audio", `Deleted the audio for "${sample.title}". The transcript was kept.`);
                      }}
                    >
                      Delete audio (keeps the transcript)
                    </button>
                  </div>
                </>
              )}

              <p className="m-0" style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5 }}>
                {method === "type" && "Audio is optional. Every measure can be computed from a typed transcript."}
                {method === "audio" && `Stored in IndexedDB on this device. Speech recognition runs Whisper in this browser by default (or the local sidecar if enabled in Settings); ${pack.name} output is a draft to correct.`}
                {method === "record" && "Recording to this browser. Stop to attach it to the sample. Nothing is uploaded."}
              </p>
              {recError && <div className="notice notice-warn">{recError}</div>}
            </>
          )}
          {asrState.busy && (
            <div className="flex flex-col gap-1.5" role="status" aria-live="polite">
              <p className="m-0" style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {asrProgress?.stage === "downloading"
                  ? `Downloading speech model (first use only, then cached)… ${asrProgress.percent ?? 0}%`
                  : asrProgress?.stage === "loading"
                    ? "Loading speech model…"
                    : asrProgress?.stage === "transcribing"
                      ? `Transcribing on this device${asrProgress.device ? ` (${asrProgress.device})` : ""}… long recordings take a while.`
                      : "Preparing audio…"}
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    background: "var(--accent)",
                    width: `${asrProgress?.stage === "downloading" ? asrProgress.percent ?? 2 : asrProgress?.stage === "transcribing" || asrProgress?.stage === "loading" ? 100 : 5}%`,
                    opacity: asrProgress?.stage === "transcribing" ? 0.5 : 1,
                  }}
                />
              </div>
            </div>
          )}
          {asrDraftNote && (
            <div className="notice notice-warn" style={{ fontSize: 13.5 }}>
              <strong>Draft — check before analysis.</strong> {asrDraftNote}{" "}
              <button type="button" className="link-btn underline" onClick={() => setAsrDraftNote(null)}>Dismiss</button>
            </div>
          )}
          {asrState.message && <div className="notice notice-warn">{asrState.message}</div>}
        </section>

        {/* --- editor ----------------------------------------------------- */}
        <TranscriptEditor
          draft={draft}
          onChange={(value) => {
            setDraft(value);
            setDirty(true);
          }}
          isIndic={isIndic}
          packName={pack.name}
          fillers={pack.mazeFillers}
          speakerCodes={sample.speakers.map((s) => `${s.code} = ${s.role}${s.isTarget ? " (target)" : ""}`).join(" · ")}
          status={saveStatus}
          onSaveNow={dirty ? commitDraft : undefined}
        />
      </div>

      {/* --- right rail --------------------------------------------------- */}
      <aside className="flex flex-col gap-4">
        <section className="panel flex flex-col gap-3.5 p-[18px]" aria-label="Live counts">
          <span className="caps">Live counts · {sample.speakers.find((s) => s.isTarget)?.role ?? "target"}</span>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <span style={{ fontSize: 13.5, color: "var(--text-muted)" }}>Utterances</span>
              <span className="tnum font-semibold" style={{ fontSize: 26 }}>
                {n}
                <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-muted)" }}> / {MIN_SET}</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }} role="progressbar" aria-valuenow={n} aria-valuemin={0} aria-valuemax={MIN_SET} aria-label="Utterances towards the 50-utterance convention">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, (n / MIN_SET) * 100)}%`, background: remaining > 0 ? "var(--saffron)" : "var(--accent)" }} />
            </div>
            <span style={{ fontSize: 12, color: remaining > 0 ? "var(--warn-text)" : "var(--text-muted)" }}>
              {remaining > 0 ? `${remaining} more to reach the 50-utterance convention` : "At or above the 50-utterance convention"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg" style={{ background: "var(--surface-2)" }}>
            {[
              ["Words", liveCounts?.words ?? 0],
              ["Different words", liveCounts?.types ?? 0],
              ["MLU-w", (liveCounts?.mlu ?? 0).toFixed(2)],
              ["Maze words", `${liveCounts?.mazePct ?? 0}%`],
            ].map(([label, value], i) => (
              <div key={label as string} className={`py-2.5 ${i % 2 ? "pl-3" : ""}`} style={{ background: "var(--surface)" }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</div>
                <div className="tnum font-semibold" style={{ fontSize: 19 }}>{value}</div>
              </div>
            ))}
          </div>
        </section>

        <SampleDetails />

        <section className="panel flex flex-col gap-2.5 p-[18px]" aria-label="Conventions">
          <span className="caps">Conventions</span>
          {CONVENTIONS.map(([s, m]) => (
            <div key={s} className="grid grid-cols-[86px_1fr] gap-2.5" style={{ fontSize: 12.5, lineHeight: 1.45 }}>
              <code className="mono font-medium" style={{ color: "var(--accent-text)" }}>{s}</code>
              <span style={{ color: "var(--text-muted)" }}>{m}</span>
            </div>
          ))}
          <span className="border-t pt-2" style={{ fontSize: 12, color: "var(--text-muted)", borderColor: "var(--surface-2)" }}>
            SALT conventions, so a SALT transcript pastes in unchanged.
          </span>
        </section>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------

function TranscriptEditor({
  draft,
  onChange,
  isIndic,
  packName,
  fillers,
  speakerCodes,
  status,
  onSaveNow,
}: {
  draft: string;
  onChange: (value: string) => void;
  isIndic: boolean;
  packName: string;
  fillers: string[];
  speakerCodes: string;
  status: string;
  onSaveNow?: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function apply(before: string, after = "") {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value } = el;
    const next = value.slice(0, start) + before + value.slice(start, end) + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      // Wrapping keeps the wrapped text selected; inserting leaves the caret after it.
      if (after) el.setSelectionRange(start + before.length, end + before.length);
      else el.setSelectionRange(start + before.length, start + before.length);
    });
  }

  return (
    <section className="panel flex flex-col overflow-hidden" aria-label="Transcript editor">
      <div className="flex flex-wrap items-center gap-1.5 border-b px-3.5 py-2.5" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
        <span className="mr-1 font-semibold" style={{ fontSize: 12, color: "var(--text-muted)" }}>Mark</span>
        {MARKS.map((k) => (
          <button
            key={k.label}
            type="button"
            title={k.tip}
            aria-label={k.tip}
            className="mark-btn mono"
            onClick={() => (k.wrap ? apply(k.wrap[0], k.wrap[1]) : apply(k.insert!))}
          >
            {k.label}
          </button>
        ))}
        {fillers.length > 0 && (
          <>
            <span className="mx-1.5 h-[18px] w-px" style={{ background: "var(--border)" }} aria-hidden="true" />
            <span className="mr-1 font-semibold" style={{ fontSize: 12, color: "var(--text-muted)" }}>{packName} fillers</span>
            {fillers.slice(0, 6).map((f) => (
              <button key={f} type="button" className="filler-btn" title={`Insert "${f}" as a filled pause`} onClick={() => apply(`(${f}) `)}>
                {f}
              </button>
            ))}
          </>
        )}
      </div>
      <textarea
        ref={ref}
        className={`mono ${isIndic ? "indic" : ""}`}
        style={{ border: 0, resize: "vertical", minHeight: 470, padding: "14px 18px", fontSize: 15, lineHeight: 1.95, color: "var(--text)", background: "var(--surface)", outline: "none" }}
        value={draft}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        aria-label="Transcript"
        placeholder={"C I go to school in the bus.\nE Who do you sit with?\nC My friend (si) sits with me."}
      />
      <div className="flex flex-wrap justify-between gap-2 border-t px-4 py-[9px]" style={{ borderColor: "var(--border)", fontSize: 12, color: "var(--text-muted)" }}>
        <span>One utterance per line, starting with a speaker code. {speakerCodes}</span>
        <span className="flex items-center gap-2" aria-live="polite">
          {status}
          {onSaveNow && <button type="button" className="link-btn" style={{ fontSize: 12 }} onClick={onSaveNow}>Save now</button>}
        </span>
      </div>
    </section>
  );
}

function SampleDetails() {
  const sample = useActiveSample()!;
  const updateSample = useStore((s) => s.updateSample);
  const [durationText, setDurationText] = useState(formatDuration(sample.elapsedSeconds) ?? "");

  useEffect(() => setDurationText(formatDuration(sample.elapsedSeconds) ?? ""), [sample.elapsedSeconds]);

  const labelStyle: React.CSSProperties = { fontSize: 12.5, color: "var(--text-muted)" };
  return (
    <section className="panel flex flex-col gap-3 p-[18px]" aria-label="Sample details">
      <span className="caps">Sample</span>
      <label className="flex flex-col gap-1 font-medium" style={labelStyle}>
        Title
        <input className="input" style={{ fontSize: 14 }} value={sample.title} onChange={(e) => updateSample(sample.id, { title: e.target.value })} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 font-medium" style={labelStyle}>
          Case ID
          <input
            className="input"
            style={{ fontSize: 14 }}
            value={sample.caseId === "unassigned" ? "" : sample.caseId}
            placeholder="unassigned"
            onChange={(e) => updateSample(sample.id, { caseId: e.target.value.trim() ? e.target.value : "unassigned" })}
          />
        </label>
        <label className="flex flex-col gap-1 font-medium" style={labelStyle}>
          Duration (mm:ss)
          <input
            className="input mono"
            style={{ fontSize: 14 }}
            placeholder="10:00"
            value={durationText}
            onChange={(e) => setDurationText(e.target.value)}
            onBlur={() => {
              const match = durationText.trim().match(/^(\d+):(\d{1,2})$/);
              if (match) updateSample(sample.id, { elapsedSeconds: Number(match[1]) * 60 + Number(match[2]) });
              else if (!durationText.trim()) updateSample(sample.id, { elapsedSeconds: undefined });
            }}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 font-medium" style={labelStyle}>
        Language pack
        <select className="select" style={{ fontSize: 14 }} value={sample.language} onChange={(e) => updateSample(sample.id, { language: e.target.value as Bcp47 })}>
          {SUPPORTED_LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 font-medium" style={labelStyle}>
        Elicitation context
        <select className="select" style={{ fontSize: 14 }} value={sample.elicitationContext} onChange={(e) => updateSample(sample.id, { elicitationContext: e.target.value as ElicitationContext })}>
          {Object.entries(CONTEXT_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
      </label>
      {!sample.elapsedSeconds && (
        <span style={{ fontSize: 12, color: "var(--warn-text)" }}>No duration yet, so words and utterances per minute stay unavailable.</span>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="card p-8 text-center">
      <h1 className="text-lg font-semibold">No sample selected</h1>
      <p className="mt-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
        Choose a sample on Home, or create a new one.
      </p>
      <Link href="/" className="btn btn-primary mt-4 no-underline">
        Go to Home
      </Link>
    </div>
  );
}
