"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SUPPORTED_LANGUAGES, useActiveSample, useHydrated, useStore } from "@/store/useStore";
import { parseUtteranceText, countableWords } from "@/core/tokenise";
import { analysisSet, estimateClauses } from "@/core/analyse";
import { getPack } from "@/nlp/registry";
import { writeSaltText } from "@/core/io/salt";
import { Waveform } from "@/components/Waveform";
import { computeWaveform, deleteAudio, formatTime, loadAudio, saveAudio } from "@/lib/audio";
import { resolveService, ProviderUnavailable } from "@/integrations/languageService";
import type { Bcp47, Utterance } from "@/core/types";

/**
 * The Transcription Studio.
 *
 * Two views over the same utterance list:
 *   Transcript — a plain textarea using SALT-style conventions, for fast typing
 *   Coding     — one row per utterance for intelligibility, grammaticality,
 *                clause overrides and error codes
 *
 * The textarea is the fast path deliberately. A clinician transcribing 50
 * utterances wants to type, not to click through a form, and every convention
 * they already know from SALT works here unchanged.
 */

export default function Studio() {
  const sample = useActiveSample();
  const hydrated = useHydrated();
  const updateSample = useStore((s) => s.updateSample);
  const replaceUtterances = useStore((s) => s.replaceUtterances);
  const cloud = useStore((s) => s.cloud);
  const log = useStore((s) => s.log);

  const [view, setView] = useState<"transcript" | "coding">("transcript");
  const [draft, setDraft] = useState("");
  const [dirty, setDirty] = useState(false);
  const [asrState, setAsrState] = useState<{ busy: boolean; message: string | null }>({
    busy: false,
    message: null,
  });

  // --- audio ---------------------------------------------------------------
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [rate, setRate] = useState(1);

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
  }, [sample?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load stored audio for this sample.
  useEffect(() => {
    let revoked: string | null = null;
    (async () => {
      if (!sample?.audioKey) {
        setAudioUrl(null);
        setPeaks(null);
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
  }, [draft, pack, replaceUtterances, sample]);

  // Autosave two seconds after typing stops.
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(commitDraft, 2000);
    return () => clearTimeout(timer);
  }, [dirty, commitDraft]);

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
      mlu: targetLines.length
        ? Math.round((words.length / targetLines.length) * 100) / 100
        : 0,
    };
  }, [draft, pack, sample]);

  async function handleAudioUpload(file: File) {
    if (!sample) return;
    const key = `${sample.id}`;
    await saveAudio(key, file);
    updateSample(sample.id, { audioKey: key });
    log("attach_audio", `Attached audio "${file.name}" to "${sample.title}". Stored in this browser only.`);
  }

  async function runAsr() {
    if (!sample?.audioKey) return;
    setAsrState({ busy: true, message: null });
    try {
      const service = await resolveService(cloud);
      const blob = await loadAudio(sample.audioKey);
      if (!blob) throw new Error("The audio for this sample is no longer in this browser.");

      const result = await service.asr(blob, sample.language);
      log(
        "asr",
        `Speech recognition drafted ${result.segments.length} segment(s) using ${service.label}.`,
        service.external,
      );

      const targetCode = sample.speakers.find((s) => s.isTarget)?.code ?? "C";
      const lines = result.segments.map((seg) => `${targetCode} ${seg.text.trim()}`);
      setDraft((prev) => (prev.trim() ? prev + "\n" + lines.join("\n") : lines.join("\n")));
      setDirty(true);
      setAsrState({ busy: false, message: result.modelNote });
    } catch (error) {
      const message =
        error instanceof ProviderUnavailable
          ? error.message
          : error instanceof Error
            ? error.message
            : "Speech recognition failed.";
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

  if (!sample) {
    return (
      <EmptyState />
    );
  }

  const set = analysisSet(sample);

  return (
    <div className="space-y-5">
      {/* --- header ------------------------------------------------------- */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <input
            className="input"
            style={{ fontSize: "1.15rem", fontWeight: 600, border: "1px solid transparent", background: "transparent", padding: "0.1rem 0.2rem" }}
            value={sample.title}
            onChange={(e) => updateSample(sample.id, { title: e.target.value })}
            aria-label="Sample title"
          />
          <p className="mt-0.5 px-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
            {pack.name} · {pack.script} script · {sample.elicitationContext.replace(/_/g, " ")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="select"
            style={{ width: "auto" }}
            value={sample.language}
            onChange={(e) => updateSample(sample.id, { language: e.target.value as Bcp47 })}
            aria-label="Sample language"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
          <Link href="/analyse" className="btn btn-primary no-underline" onClick={commitDraft}>
            Analyse
          </Link>
        </div>
      </div>

      {/* --- live counts --------------------------------------------------- */}
      {liveCounts && (
        <div className="card grid grid-cols-2 divide-x sm:grid-cols-5" style={{ borderColor: "var(--border)" }}>
          <Stat label="Utterances" value={liveCounts.utterances} hint={liveCounts.utterances < 50 ? "below 50" : "at convention"} />
          <Stat label="Words" value={liveCounts.words} />
          <Stat label="Different words" value={liveCounts.types} />
          <Stat label="MLU-w" value={liveCounts.mlu} />
          <Stat label="Maze %" value={liveCounts.mazePct} />
        </div>
      )}

      {/* --- audio --------------------------------------------------------- */}
      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Media</h2>
          <div className="flex flex-wrap items-center gap-2">
            <label className="btn" style={{ cursor: "pointer" }}>
              {sample.audioKey ? "Replace audio" : "Attach audio"}
              <input
                type="file"
                accept="audio/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleAudioUpload(file);
                  e.target.value = "";
                }}
              />
            </label>
            {sample.audioKey && (
              <>
                <button className="btn" disabled={asrState.busy} onClick={() => void runAsr()}>
                  {asrState.busy ? "Drafting…" : "Draft with speech recognition"}
                </button>
                <button
                  className="btn"
                  onClick={async () => {
                    await deleteAudio(sample.audioKey!);
                    updateSample(sample.id, { audioKey: undefined });
                    log("delete_audio", `Deleted the audio for "${sample.title}". The transcript was kept.`);
                  }}
                >
                  Delete audio
                </button>
              </>
            )}
          </div>
        </div>

        {sample.audioKey ? (
          <div className="mt-3 space-y-2">
            <Waveform
              peaks={peaks}
              duration={duration}
              position={position}
              onSeek={(s) => {
                if (audioRef.current) audioRef.current.currentTime = s;
                setPosition(s);
              }}
            />
            <audio
              ref={audioRef}
              src={audioUrl ?? undefined}
              onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => {
                if (!duration) setDuration(e.currentTarget.duration);
              }}
              className="hidden"
            />
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <button
                className="btn"
                onClick={() => {
                  const el = audioRef.current;
                  if (!el) return;
                  if (el.paused) void el.play();
                  else el.pause();
                }}
              >
                Play / pause
              </button>
              <span className="mono" style={{ color: "var(--text-muted)" }}>
                {formatTime(position)} / {formatTime(duration)}
              </span>
              <label className="ml-2 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                Speed
                <select
                  className="select"
                  style={{ width: "auto", padding: "0.15rem 0.4rem" }}
                  value={rate}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setRate(value);
                    if (audioRef.current) audioRef.current.playbackRate = value;
                  }}
                >
                  {[0.5, 0.75, 1, 1.25, 1.5].map((r) => (
                    <option key={r} value={r}>{r}×</option>
                  ))}
                </select>
              </label>
              <button
                className="btn"
                onClick={() => {
                  if (duration) updateSample(sample.id, { elapsedSeconds: Math.round(duration) });
                }}
                title="Use the recording length as the sample's elapsed time, enabling rate measures."
              >
                Set elapsed time from audio
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Audio is optional. Every measure ULASA reports can be computed from a typed transcript.
            Attaching audio adds waveform navigation and, if you have enabled a recogniser, a draft
            transcript. Audio is stored in this browser and is never uploaded.
          </p>
        )}

        {asrState.message && (
          <div className="notice notice-warn mt-3">{asrState.message}</div>
        )}
      </section>

      {/* --- elapsed time -------------------------------------------------- */}
      {!sample.elapsedSeconds && (
        <div className="notice notice-warn">
          No elapsed time is set, so words and utterances per minute cannot be computed.{" "}
          <label className="ml-1 inline-flex items-center gap-1.5">
            Sample duration (mm:ss)
            <input
              className="input mono"
              style={{ width: "6rem", display: "inline-block" }}
              placeholder="10:00"
              onBlur={(e) => {
                const match = e.target.value.match(/^(\d+):(\d{1,2})$/);
                if (match) {
                  updateSample(sample.id, {
                    elapsedSeconds: Number(match[1]) * 60 + Number(match[2]),
                  });
                }
              }}
            />
          </label>
        </div>
      )}

      {/* --- view switch --------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg p-0.5" style={{ background: "var(--surface-2)" }}>
          {(["transcript", "coding"] as const).map((v) => (
            <button
              key={v}
              className="rounded-md px-3 py-1 text-sm"
              style={{
                fontWeight: view === v ? 600 : 450,
                background: view === v ? "var(--surface)" : "transparent",
                color: view === v ? "var(--text)" : "var(--text-muted)",
              }}
              onClick={() => {
                if (view === "transcript") commitDraft();
                setView(v);
              }}
            >
              {v === "transcript" ? "Transcript" : "Coding"}
            </button>
          ))}
        </div>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {dirty ? "Unsaved changes — saving shortly…" : `${set.length} utterances in the analysis set`}
        </span>
        {dirty && (
          <button className="btn" style={{ padding: "0.15rem 0.5rem", fontSize: "0.8rem" }} onClick={commitDraft}>
            Save now
          </button>
        )}
      </div>

      {view === "transcript" ? (
        <TranscriptView
          draft={draft}
          onChange={(value) => {
            setDraft(value);
            setDirty(true);
          }}
          scriptClass={pack.script === "Latin" ? "" : "indic"}
          speakerCodes={sample.speakers.map((s) => `${s.code} — ${s.role}${s.isTarget ? " (target)" : ""}`)}
          fillers={pack.mazeFillers}
        />
      ) : (
        <CodingView sampleId={sample.id} />
      )}

      <ConventionHelp />
    </div>
  );
}

// ---------------------------------------------------------------------------

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="px-3 py-2.5" style={{ borderColor: "var(--border)" }}>
      <div className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-xs" style={{ color: "var(--text-muted)" }}>{hint}</div>}
    </div>
  );
}

function TranscriptView({
  draft,
  onChange,
  scriptClass,
  speakerCodes,
  fillers,
}: {
  draft: string;
  onChange: (value: string) => void;
  scriptClass: string;
  speakerCodes: string[];
  fillers: string[];
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function wrapSelection(before: string, after: string) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value } = el;
    const next = value.slice(0, start) + before + value.slice(start, end) + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, end + before.length);
    });
  }

  function insert(text: string) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value } = el;
    onChange(value.slice(0, start) + text + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + text.length, start + text.length);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Mark:</span>
        <ToolButton onClick={() => wrapSelection("(", ")")} title="Wrap the selection as a maze (repetition, revision, filled pause or false start)">
          Maze ( )
        </ToolButton>
        <ToolButton onClick={() => insert("X")} title="Unintelligible word">Unintelligible X</ToolButton>
        <ToolButton onClick={() => insert("*")} title="Mark the next word as omitted">Omission *</ToolButton>
        <ToolButton onClick={() => wrapSelection("[", "]")} title="Attach an error or descriptive code">Code [ ]</ToolButton>
        <ToolButton onClick={() => insert("(:2.0)")} title="Silent pause in seconds">Pause (:2.0)</ToolButton>
        <ToolButton onClick={() => insert("/")} title="Bound-morpheme split; the surface spelling is preserved">Morpheme /</ToolButton>
      </div>

      {fillers.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Fillers in this language:</span>
          {fillers.slice(0, 10).map((f) => (
            <ToolButton key={f} onClick={() => insert(`(${f}) `)} title={`Insert "${f}" as a filled pause`}>
              {f}
            </ToolButton>
          ))}
        </div>
      )}

      <textarea
        ref={ref}
        className={`textarea mono ${scriptClass}`}
        style={{ minHeight: "26rem", fontSize: "0.95rem", lineHeight: 1.9 }}
        value={draft}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        aria-label="Transcript"
        placeholder={"C  I go to school in the bus.\nE  Who do you sit with?\nC  My friend (si) sits with me."}
      />

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        One utterance per line, beginning with a speaker code. Codes in this sample:{" "}
        {speakerCodes.join(" · ")}
      </p>
    </div>
  );
}

function ToolButton({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button className="btn" style={{ padding: "0.15rem 0.5rem", fontSize: "0.78rem" }} onClick={onClick} title={title}>
      {children}
    </button>
  );
}

function CodingView({ sampleId }: { sampleId: string }) {
  const sample = useStore((s) => s.samples.find((x) => x.id === sampleId))!;
  const replaceUtterances = useStore((s) => s.replaceUtterances);
  const pack = getPack(sample.language);

  function patch(id: string, changes: Partial<Utterance>) {
    replaceUtterances(
      sampleId,
      sample.utterances.map((u) => (u.id === id ? { ...u, ...changes } : u)),
    );
  }

  const target = sample.speakers.find((s) => s.isTarget);

  if (sample.utterances.length === 0) {
    return (
      <div className="card p-6 text-center" style={{ color: "var(--text-muted)" }}>
        Nothing to code yet. Type a transcript first.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Only the target speaker&apos;s utterances are scored. Marking grammaticality here is what
        enables the PGU measure; clause overrides replace the heuristic clause count.
      </p>
      <div className="space-y-1.5">
        {sample.utterances.map((u) => {
          const speaker = sample.speakers.find((s) => s.id === u.speakerId);
          const isTarget = speaker?.id === target?.id;
          return (
            <div
              key={u.id}
              className="card p-3"
              style={{ opacity: isTarget ? 1 : 0.62, borderColor: "var(--border)" }}
            >
              <div className="flex flex-wrap items-start gap-3">
                <span className="mono text-xs" style={{ color: "var(--text-muted)", minWidth: "1.8rem" }}>
                  {speaker?.code}
                </span>
                <p className={`flex-1 ${pack.script === "Latin" ? "" : "indic"}`} style={{ minWidth: "14rem" }}>
                  {u.text}
                </p>
              </div>

              {isTarget && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <label className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                    Grammatical
                    <select
                      className="select"
                      style={{ width: "auto", padding: "0.1rem 0.35rem", fontSize: "0.78rem" }}
                      value={u.grammaticality}
                      onChange={(e) => patch(u.id, { grammaticality: e.target.value as Utterance["grammaticality"] })}
                    >
                      <option value="unmarked">not marked</option>
                      <option value="grammatical">grammatical</option>
                      <option value="ungrammatical">ungrammatical</option>
                    </select>
                  </label>

                  <label className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                    Clauses
                    <input
                      className="input mono"
                      style={{ width: "3.4rem", padding: "0.1rem 0.35rem", fontSize: "0.78rem" }}
                      type="number"
                      min={0}
                      placeholder={String(estimateClauses(u, pack))}
                      value={u.clauseCountOverride ?? ""}
                      onChange={(e) =>
                        patch(u.id, {
                          clauseCountOverride: e.target.value === "" ? undefined : Number(e.target.value),
                        })
                      }
                    />
                  </label>

                  <label className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                    <input
                      type="checkbox"
                      checked={Boolean(u.isAbandoned)}
                      onChange={(e) => patch(u.id, { isAbandoned: e.target.checked })}
                    />
                    abandoned
                  </label>

                  <select
                    className="select"
                    style={{ width: "auto", padding: "0.1rem 0.35rem", fontSize: "0.78rem" }}
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      patch(u.id, { codes: [...new Set([...(u.codes ?? []), e.target.value])] });
                    }}
                  >
                    <option value="">add {pack.name} error code…</option>
                    {pack.errorTaxonomy.map((err) => (
                      <option key={err.code} value={err.code}>
                        {err.code} — {err.label}
                      </option>
                    ))}
                  </select>

                  {(u.codes ?? []).map((code) => (
                    <button
                      key={code}
                      className="badge badge-experimental"
                      title="Remove this code"
                      onClick={() => patch(u.id, { codes: (u.codes ?? []).filter((c) => c !== code) })}
                    >
                      {code} ×
                    </button>
                  ))}

                  {u.intelligibility !== "intelligible" && (
                    <span className="badge badge-unavailable">{u.intelligibility}</span>
                  )}
                  {u.mazes.length > 0 && (
                    <span className="badge badge-unavailable">
                      {u.mazes.length} maze{u.mazes.length === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConventionHelp() {
  return (
    <details className="card p-4">
      <summary className="cursor-pointer text-sm font-semibold">Transcription conventions</summary>
      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <Convention symbol="C  text" meaning="Speaker code at the start of the line, then the utterance." />
        <Convention symbol="(word word)" meaning="A maze. ULASA classifies it as a repetition, revision, filled pause or false start, and excludes it from word counts." />
        <Convention symbol="X  XX  XXX" meaning="Unintelligible: one word, two words, an unintelligible run." />
        <Convention symbol="*word" meaning="A word the clinician judged should have been present but was omitted." />
        <Convention symbol="word/morpheme" meaning="Bound-morpheme split. The surface spelling is never rewritten; the split is stored alongside it." />
        <Convention symbol="[E:CASE]" meaning="An error code from the active language pack, or any code you choose." />
        <Convention symbol="(:2.5)" meaning="A silent pause of 2.5 seconds." />
        <Convention symbol="+note" meaning="A clinician comment, excluded from every count." />
      </div>
      <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
        These are SALT&apos;s conventions plus the pause and comment forms, so a transcript typed in
        SALT can be pasted here unchanged.
      </p>
    </details>
  );
}

function Convention({ symbol, meaning }: { symbol: string; meaning: string }) {
  return (
    <div>
      <code className="mono" style={{ color: "var(--accent-text)" }}>{symbol}</code>
      <p style={{ color: "var(--text-muted)" }}>{meaning}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card p-8 text-center">
      <h1 className="text-lg font-semibold">No sample selected</h1>
      <p className="mt-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
        Choose a sample on the dashboard, or create a new one.
      </p>
      <Link href="/" className="btn btn-primary mt-4 no-underline">
        Go to the dashboard
      </Link>
    </div>
  );
}
