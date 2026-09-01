"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useActiveSample, useHydrated, useStore } from "@/store/useStore";
import { parseUtteranceText } from "@/core/tokenise";
import { analysisSet, estimateClauses } from "@/core/analyse";
import { getPack } from "@/nlp/registry";
import { Waveform } from "@/components/Waveform";
import { EmptyState } from "@/components/EmptyState";
import { LanguageBadge } from "@/components/LanguageBadge";
import { UtteranceTokens } from "@/components/UtteranceRow";
import { computeWaveform, formatTime, loadAudio, saveAudio } from "@/lib/audio";
import { resolveService, ProviderUnavailable } from "@/integrations/languageService";
import type { MazeKind, Utterance } from "@/core/types";

/**
 * The Studio: transcribe, segment, code.
 *
 * Three panes at desktop — utterance list, editor, code inspector — with the
 * editor as the pane that survives when the screen narrows. Below lg the list
 * becomes a sheet above the editor and the inspector a section below it: on a
 * phone the clinician is checking and correcting one utterance, not scanning
 * three columns.
 *
 * The bulk transcript textarea is kept as a second mode. It is the fast path
 * for typing fifty utterances from scratch, it accepts SALT conventions
 * unchanged, and it is where a speech-recognition draft lands. Orthography is
 * never rewritten in either mode.
 */

type Pane = "utterances" | "bulk";

export default function Studio() {
  const sample = useActiveSample();
  const hydrated = useHydrated();
  const updateSample = useStore((s) => s.updateSample);
  const replaceUtterances = useStore((s) => s.replaceUtterances);
  const cloud = useStore((s) => s.cloud);
  const log = useStore((s) => s.log);

  const [pane, setPane] = useState<Pane>("utterances");
  const [listFilter, setListFilter] = useState<"all" | "ci">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [dirty, setDirty] = useState(false);
  const [asrState, setAsrState] = useState<{ busy: boolean; message: string | null }>({ busy: false, message: null });

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [rate, setRate] = useState(1);

  const pack = useMemo(() => (sample ? getPack(sample.language) : getPack("en-IN")), [sample]);

  // Seed the bulk textarea from the stored utterances when the sample changes.
  useEffect(() => {
    if (!sample) return;
    setDraft(
      sample.utterances
        .map((u) => `${sample.speakers.find((s) => s.id === u.speakerId)?.code ?? "C"} ${u.text}`)
        .join("\n"),
    );
    setDirty(false);
    setSelectedId(sample.utterances[0]?.id ?? null);
  }, [sample?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Audio, only if this sample actually has some in IndexedDB.
  useEffect(() => {
    let revoked: string | null = null;
    (async () => {
      if (!sample?.audioKey) {
        setAudioUrl(null);
        setPeaks(null);
        return;
      }
      const blob = await loadAudio(sample.audioKey);
      if (!blob) {
        setAudioUrl(null);
        setPeaks(null);
        return;
      }
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
    const speakerByCode = new Map(sample.speakers.map((s) => [s.code.toUpperCase(), s]));
    const utterances: Utterance[] = [];

    draft.split(/\r?\n/).forEach((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const match = trimmed.match(/^([A-Za-z]{1,4})\s+(.*)$/);
      const code = match ? match[1].toUpperCase() : sample.speakers.find((s) => s.isTarget)?.code ?? "C";
      const text = match ? match[2] : trimmed;
      const speaker = speakerByCode.get(code) ?? sample.speakers.find((s) => s.isTarget)!;
      const parsed = parseUtteranceText(text, pack);
      const existing = sample.utterances[i];
      const sameLine = existing?.text === text;

      utterances.push({
        id: existing?.id ?? `utt-${i}-${Math.random().toString(36).slice(2, 7)}`,
        speakerId: speaker.id,
        text,
        tokens: parsed.tokens,
        mazes: parsed.mazes,
        intelligibility: parsed.intelligibility,
        grammaticality: sameLine ? existing.grammaticality : "unmarked",
        clauseCountOverride: sameLine ? existing.clauseCountOverride : undefined,
        isAbandoned: sameLine ? existing.isAbandoned : undefined,
        codes: parsed.codes,
        pauses: parsed.pauses,
        comment: parsed.comment,
        startTime: sameLine ? existing.startTime : undefined,
        endTime: sameLine ? existing.endTime : undefined,
        gloss: sameLine ? existing.gloss : undefined,
      });
    });

    replaceUtterances(sample.id, utterances);
    setDirty(false);
  }, [draft, pack, replaceUtterances, sample]);

  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(commitDraft, 2000);
    return () => clearTimeout(timer);
  }, [dirty, commitDraft]);

  async function runAsr() {
    if (!sample?.audioKey) return;
    setAsrState({ busy: true, message: null });
    try {
      const service = await resolveService(cloud);
      const blob = await loadAudio(sample.audioKey);
      if (!blob) throw new Error("The audio for this sample is no longer in this browser.");
      const result = await service.asr(blob, sample.language);
      log("asr", `Speech recognition drafted ${result.segments.length} segment(s) using ${service.label}.`, service.external);
      const targetCode = sample.speakers.find((s) => s.isTarget)?.code ?? "C";
      const lines = result.segments.map((seg) => `${targetCode} ${seg.text.trim()}`);
      setDraft((prev) => (prev.trim() ? prev + "\n" + lines.join("\n") : lines.join("\n")));
      setDirty(true);
      setPane("bulk");
      setAsrState({ busy: false, message: result.modelNote });
    } catch (error) {
      setAsrState({
        busy: false,
        message:
          error instanceof ProviderUnavailable || error instanceof Error
            ? error.message
            : "Speech recognition failed.",
      });
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
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Studio</h1>
        <EmptyState
          art="brackets"
          heading="No sample is open"
          body="Choose a sample on the Workbench, or create a new one and run an elicitation first."
          action={
            <Link href="/" className="btn btn-primary no-underline">
              Go to the Workbench
            </Link>
          }
        />
      </div>
    );
  }

  const set = analysisSet(sample);
  const setIds = new Set(set.map((u) => u.id));
  const visible = listFilter === "ci" ? sample.utterances.filter((u) => setIds.has(u.id)) : sample.utterances;
  const selected = sample.utterances.find((u) => u.id === selectedId) ?? null;
  const selectedIndex = selected ? sample.utterances.findIndex((u) => u.id === selected.id) : -1;
  const target = sample.speakers.find((s) => s.isTarget);

  function patch(id: string, changes: Partial<Utterance>) {
    replaceUtterances(
      sample!.id,
      sample!.utterances.map((u) => (u.id === id ? { ...u, ...changes } : u)),
    );
  }

  /** Re-parse an edited line so tokens, mazes and codes stay in step. */
  function setUtteranceText(id: string, text: string) {
    const parsed = parseUtteranceText(text, pack);
    patch(id, {
      text,
      tokens: parsed.tokens,
      mazes: parsed.mazes,
      intelligibility: parsed.intelligibility,
      codes: parsed.codes,
      pauses: parsed.pauses,
      comment: parsed.comment,
    });
  }

  /** Toolbar insert, in the SALT conventions the parser already understands. */
  function applyToSelection(before: string, after = "") {
    const el = editorRef.current;
    if (!el || !selected) return;
    const { selectionStart: start, selectionEnd: end, value } = el;
    const next = value.slice(0, start) + before + value.slice(start, end) + after + value.slice(end);
    setUtteranceText(selected.id, next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, end + before.length);
    });
  }

  function splitUtterance() {
    if (!selected || !editorRef.current) return;
    const el = editorRef.current;
    const head = el.value.slice(0, el.selectionStart).trim();
    const tail = el.value.slice(el.selectionStart).trim();
    if (!head || !tail) return;

    const index = sample!.utterances.findIndex((u) => u.id === selected.id);
    const headParsed = parseUtteranceText(head, pack);
    const tailParsed = parseUtteranceText(tail, pack);
    const next = [...sample!.utterances];
    next.splice(
      index,
      1,
      { ...selected, text: head, tokens: headParsed.tokens, mazes: headParsed.mazes, intelligibility: headParsed.intelligibility, codes: headParsed.codes },
      {
        ...selected,
        id: `utt-${Date.now().toString(36)}`,
        text: tail,
        tokens: tailParsed.tokens,
        mazes: tailParsed.mazes,
        intelligibility: tailParsed.intelligibility,
        codes: tailParsed.codes,
        grammaticality: "unmarked",
        clauseCountOverride: undefined,
      },
    );
    replaceUtterances(sample!.id, next);
  }

  const heuristicClauses = selected ? estimateClauses({ ...selected, clauseCountOverride: undefined }, pack) : 0;

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]" style={{ color: "var(--text)" }}>
            Studio
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
            Transcribe, segment, code. Orthography is never rewritten for you.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="num text-[12.5px]" style={{ color: "var(--text-muted)" }}>
            {dirty ? "Unsaved changes — saving shortly…" : `${sample.utterances.length} utterances · ${set.length} in the analysis set`}
          </span>
          <Link href="/analyse" className="btn btn-primary min-h-11 no-underline md:min-h-0" onClick={commitDraft}>
            Analyse sample
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Mode switch: utterance-by-utterance, or the bulk textarea. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg p-0.5" style={{ background: "var(--surface-2)" }}>
          {([
            ["utterances", "Utterances"],
            ["bulk", "Bulk transcript"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="rounded-md px-3 py-1 text-sm"
              style={{
                fontWeight: pane === id ? 600 : 450,
                background: pane === id ? "var(--surface)" : "transparent",
                color: pane === id ? "var(--text)" : "var(--text-muted)",
              }}
              onClick={() => {
                if (pane === "bulk") commitDraft();
                setPane(id);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {sample.audioKey && (
          <button type="button" className="btn" disabled={asrState.busy} onClick={() => void runAsr()}>
            {asrState.busy ? "Drafting…" : "Draft with speech recognition"}
          </button>
        )}
        <label className="btn cursor-pointer">
          {sample.audioKey ? "Replace audio" : "Attach audio"}
          <input
            type="file"
            accept="audio/*,video/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              await saveAudio(sample.id, file);
              updateSample(sample.id, { audioKey: sample.id });
              log("attach_audio", `Attached audio "${file.name}" to "${sample.title}". Stored in this browser only.`);
            }}
          />
        </label>
      </div>

      {asrState.message && <div className="notice notice-warn">{asrState.message}</div>}

      {pane === "bulk" ? (
        <BulkTranscript
          draft={draft}
          onChange={(v) => {
            setDraft(v);
            setDirty(true);
          }}
          onCommit={commitDraft}
          indic={pack.script !== "Latin"}
          speakers={sample.speakers.map((s) => `${s.code} — ${s.role}${s.isTarget ? " (target)" : ""}`)}
          fillers={pack.mazeFillers}
        />
      ) : sample.utterances.length === 0 ? (
        <EmptyState
          art="brackets"
          heading="Nothing transcribed yet"
          body="Switch to the bulk transcript to type the sample, one utterance per line beginning with a speaker code."
          action={
            <button type="button" className="btn btn-primary" onClick={() => setPane("bulk")}>
              Open the bulk transcript
            </button>
          }
        />
      ) : (
        <div className="grid items-start gap-3.5 lg:grid-cols-[290px_1fr_320px]">
          {/* Left — utterance list */}
          <div className="card max-h-[70vh] overflow-auto lg:max-h-[calc(100vh-220px)]">
            <div className="sticky top-0 flex items-center justify-between border-b px-3 py-2.5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <span className="meta-label">Utterances</span>
              <div className="flex gap-1" role="group" aria-label="Filter utterances">
                {([
                  ["all", "All"],
                  ["ci", "C&I"],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setListFilter(id)}
                    aria-pressed={listFilter === id}
                    className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                    style={
                      listFilter === id
                        ? { background: "var(--chrome-2)", color: "#FFF" }
                        : { background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--chip-neutral-text)" }
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <ul>
              {visible.map((u) => {
                const speaker = sample.speakers.find((s) => s.id === u.speakerId);
                const isTarget = speaker?.id === target?.id;
                const isSelected = u.id === selected?.id;
                const n = sample.utterances.findIndex((x) => x.id === u.id) + 1;
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(u.id)}
                      className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left"
                      style={{
                        borderBottom: "1px solid var(--row-rule)",
                        borderLeft: isSelected ? "3px solid var(--accent)" : "3px solid transparent",
                        background: isSelected ? "var(--accent-soft)" : undefined,
                      }}
                      aria-current={isSelected ? "true" : undefined}
                    >
                      <span className="mono num min-w-[26px] pt-1 text-[11px]" style={{ color: "var(--text-faint)" }}>
                        {String(n).padStart(3, "0")}
                      </span>
                      <span
                        className="mono mt-0.5 rounded px-1.5 py-px text-[10.5px] font-semibold"
                        style={
                          isTarget
                            ? { background: "var(--chrome-2)", color: "#FFF" }
                            : { background: "var(--chip-neutral)", color: "var(--chip-neutral-text)" }
                        }
                      >
                        {speaker?.code}
                      </span>
                      <span className="min-w-0 flex-1">
                        <UtteranceTokens utterance={u} lang={sample.language} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Centre — editor and audio */}
          <div className="flex flex-col gap-3.5">
            {selected && (
              <div className="card p-[18px]">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="meta-label">
                      Utterance {selectedIndex + 1} · speaker {sample.speakers.find((s) => s.id === selected.speakerId)?.code}
                    </span>
                    <LanguageBadge lang={sample.language} />
                  </div>
                  <span className="mono text-xs" style={{ color: "var(--text-faint)" }}>
                    {selected.startTime !== undefined && selected.endTime !== undefined
                      ? `${formatTime(selected.startTime)} → ${formatTime(selected.endTime)}`
                      : "no timecode"}
                  </span>
                </div>

                <div className="rounded-[10px] p-3.5" style={{ border: "1px solid var(--accent)", boxShadow: "0 0 0 3px var(--accent-soft)" }}>
                  <textarea
                    ref={editorRef}
                    className="indic-editor w-full resize-y bg-transparent outline-none"
                    style={{ color: "var(--text)", minHeight: "4.5rem" }}
                    value={selected.text}
                    spellCheck={false}
                    aria-label={`Utterance ${selectedIndex + 1} text`}
                    onChange={(e) => setUtteranceText(selected.id, e.target.value)}
                  />
                  {selected.tokens.length > 0 && (
                    <div className="mt-2.5 border-t pt-2.5" style={{ borderColor: "var(--border)" }}>
                      <div className="meta-label mb-1">As parsed</div>
                      <UtteranceTokens utterance={selected} lang={sample.language} />
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-[7px] border px-3 py-1.5 text-[12.5px] font-semibold"
                    style={{ borderColor: "var(--warn-border)", background: "var(--warn-soft)", color: "var(--warn-text)" }}
                    onClick={() => applyToSelection("(", ")")}
                    title="Wrap the selection as a maze — repetition, revision, filled pause or false start"
                  >
                    Mark maze
                  </button>
                  <button type="button" className="btn" onClick={splitUtterance} title="Split this utterance at the cursor into two C-units">
                    Split utterance
                  </button>
                  <button type="button" className="btn" onClick={() => applyToSelection("X")} title="A word heard but not identifiable">
                    Insert X (unintelligible)
                  </button>
                  <button type="button" className="btn" onClick={() => applyToSelection("*")} title="Mark the next word as omitted">
                    Mark * omission
                  </button>
                  <button type="button" className="btn" onClick={() => applyToSelection("/")} title="Bound-morpheme split; the surface spelling is preserved">
                    Add / morpheme split
                  </button>
                </div>

                <p className="mt-2.5 text-[11.5px]" style={{ color: "var(--text-faint)" }}>
                  SALT conventions, unchanged. Indic text is set at the size chosen in Settings so conjuncts and matras stay legible while you edit.
                </p>
              </div>
            )}

            {/* Audio only when this sample actually has some. */}
            {sample.audioKey && audioUrl && (
              <div className="card p-[18px]">
                <div className="mb-3 flex items-center justify-between">
                  <span className="meta-label">Audio · from IndexedDB</span>
                  <span className="mono text-xs" style={{ color: "var(--text-faint)" }}>
                    {formatTime(position)} / {formatTime(duration)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full"
                    style={{ background: "var(--accent)", border: "1px solid var(--accent)" }}
                    aria-label="Play or pause"
                    onClick={() => {
                      const el = audioRef.current;
                      if (!el) return;
                      if (el.paused) void el.play();
                      else el.pause();
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFF" aria-hidden="true">
                      <path d="M8 5l12 7-12 7z" />
                    </svg>
                  </button>
                  <div className="min-w-0 flex-1">
                    <Waveform
                      peaks={peaks}
                      duration={duration}
                      position={position}
                      height={44}
                      onSeek={(s) => {
                        if (audioRef.current) audioRef.current.currentTime = s;
                        setPosition(s);
                      }}
                    />
                  </div>
                  <select
                    className="select mono w-auto shrink-0 px-1.5 py-1 text-[11.5px]"
                    value={rate}
                    aria-label="Playback speed"
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setRate(v);
                      if (audioRef.current) audioRef.current.playbackRate = v;
                    }}
                  >
                    {[0.5, 0.75, 1, 1.25, 1.5].map((r) => (
                      <option key={r} value={r}>
                        {r}×
                      </option>
                    ))}
                  </select>
                </div>
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  className="hidden"
                  onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) => {
                    if (!duration) setDuration(e.currentTarget.duration);
                  }}
                />
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11.5px]" style={{ color: "var(--text-faint)" }}>
                  <button
                    type="button"
                    className="underline underline-offset-2"
                    onClick={() => duration && updateSample(sample.id, { elapsedSeconds: Math.round(duration) })}
                    title="Use the recording length as the sample's elapsed time, enabling the rate measures"
                  >
                    Set elapsed time from audio
                  </button>
                  <span className="ml-auto">Playback is local. Nothing streams anywhere.</span>
                </div>
              </div>
            )}
          </div>

          {/* Right — code inspector and gloss */}
          <div className="flex flex-col gap-3.5">
            <div className="card overflow-hidden">
              <div className="meta-label border-b px-3.5 py-2.5" style={{ borderColor: "var(--border)" }}>
                Code inspector
              </div>
              {selected ? (
                <div className="flex flex-col gap-3.5 p-3.5">
                  <Segmented
                    label="Intelligibility"
                    options={[
                      ["intelligible", "Intelligible"],
                      ["partial", "Partial"],
                      ["unintelligible", "Unintell."],
                    ]}
                    value={selected.intelligibility}
                    onChange={(v) => patch(selected.id, { intelligibility: v as Utterance["intelligibility"] })}
                  />

                  <Segmented
                    label="Grammaticality — feeds PGU"
                    options={[
                      ["grammatical", "Grammatical"],
                      ["ungrammatical", "Ungramm."],
                      ["unmarked", "Unmarked"],
                    ]}
                    value={selected.grammaticality}
                    onChange={(v) => patch(selected.id, { grammaticality: v as Utterance["grammaticality"] })}
                  />

                  <div>
                    <div className="mb-1.5 text-[11.5px]" style={{ color: "var(--text-muted)" }}>
                      Maze span{selected.mazes.length > 0 ? ` — ${selected.mazes.length} marked` : " — none marked"}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(["repetition", "revision", "filled_pause", "false_start"] as MazeKind[]).map((kind) => {
                        const on = selected.mazes.some((m) => m.kind === kind);
                        return (
                          <button
                            key={kind}
                            type="button"
                            aria-pressed={on}
                            onClick={() =>
                              patch(selected.id, {
                                mazes: on
                                  ? selected.mazes.filter((m) => m.kind !== kind)
                                  : [...selected.mazes, { kind, start: 0, end: Math.max(1, selected.tokens.length) }],
                              })
                            }
                            className="rounded-full px-2.5 py-1.5 text-xs"
                            style={
                              on
                                ? { background: "var(--warn-soft)", border: "1px solid var(--warn-border)", color: "var(--warn-text)", fontWeight: 600 }
                                : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }
                            }
                          >
                            {kind.replace("_", " ")}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 text-[11.5px]" style={{ color: "var(--text-muted)" }}>
                      Clause count — overrides the pack heuristic
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        className="input mono num w-20 text-center"
                        placeholder={String(heuristicClauses)}
                        value={selected.clauseCountOverride ?? ""}
                        aria-label="Clause count override"
                        onChange={(e) =>
                          patch(selected.id, {
                            clauseCountOverride: e.target.value === "" ? undefined : Number(e.target.value),
                          })
                        }
                      />
                      <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                        Heuristic said {heuristicClauses}.
                        {selected.clauseCountOverride === undefined ? " No override set." : " Your override wins."}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 text-[11.5px]" style={{ color: "var(--text-muted)" }}>
                      Error codes — {pack.name}
                    </div>
                    <div className="mb-1.5 flex flex-wrap gap-1.5">
                      {(selected.codes ?? []).map((code) => (
                        <button
                          key={code}
                          type="button"
                          className="mono rounded-md px-2 py-1 text-[11.5px]"
                          style={{ background: "var(--experimental-soft)", color: "var(--experimental-text)" }}
                          title="Remove this code"
                          onClick={() => patch(selected.id, { codes: (selected.codes ?? []).filter((c) => c !== code) })}
                        >
                          {code} ×
                        </button>
                      ))}
                    </div>
                    <select
                      className="select"
                      value=""
                      aria-label={`Add a ${pack.name} error code`}
                      onChange={(e) => {
                        if (!e.target.value) return;
                        patch(selected.id, { codes: [...new Set([...(selected.codes ?? []), e.target.value])] });
                      }}
                    >
                      <option value="">Add an error code…</option>
                      {pack.errorTaxonomy.map((err) => (
                        <option key={err.code} value={err.code}>
                          {err.code} — {err.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-[12.5px]" style={{ color: "var(--text-muted)" }}>
                    <input
                      type="checkbox"
                      checked={Boolean(selected.isAbandoned)}
                      onChange={(e) => patch(selected.id, { isAbandoned: e.target.checked })}
                    />
                    Abandoned or interrupted — excluded from the analysis set
                  </label>
                </div>
              ) : (
                <p className="p-3.5 text-[12.5px]" style={{ color: "var(--text-muted)" }}>
                  Select an utterance to code it.
                </p>
              )}
            </div>

            {/* Gloss: present in the type system as unanalysable, said plainly here. */}
            {selected?.gloss && (
              <div className="rounded-xl border p-3.5" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
                <div className="meta-label mb-2">Gloss — never analysed</div>
                <p className="text-[13.5px] leading-normal" style={{ color: "var(--chip-neutral-text)" }}>
                  {selected.gloss.text}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10.5px] font-bold tracking-wide"
                    style={{ background: "var(--experimental-soft)", color: "var(--experimental-text)" }}
                  >
                    {selected.gloss.provenance === "machine" ? "MACHINE GLOSS" : "GLOSS"}
                  </span>
                  <span className="text-[11.5px]" style={{ color: "var(--text-faint)" }}>
                    Excluded from every measure by type.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Segmented({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: [string, string][];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[11.5px]" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div className="flex gap-1.5" role="group" aria-label={label}>
        {options.map(([id, text]) => {
          const on = value === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(id)}
              className="flex-1 rounded-[7px] px-1 py-1.5 text-center text-[12.5px]"
              style={
                on
                  ? { background: "var(--accent-soft)", border: "1px solid var(--accent-border)", color: "var(--accent-text)", fontWeight: 600 }
                  : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }
              }
            >
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BulkTranscript({
  draft,
  onChange,
  onCommit,
  indic,
  speakers,
  fillers,
}: {
  draft: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  indic: boolean;
  speakers: string[];
  fillers: string[];
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function wrap(before: string, after: string) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value } = el;
    onChange(value.slice(0, start) + before + value.slice(start, end) + after + value.slice(end));
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
    <div className="card space-y-2.5 p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="meta-label">Mark</span>
        <Tool onClick={() => wrap("(", ")")} title="Wrap the selection as a maze">Maze ( )</Tool>
        <Tool onClick={() => insert("X")} title="Unintelligible word">Unintelligible X</Tool>
        <Tool onClick={() => insert("*")} title="Mark the next word as omitted">Omission *</Tool>
        <Tool onClick={() => wrap("[", "]")} title="Attach an error or descriptive code">Code [ ]</Tool>
        <Tool onClick={() => insert("(:2.0)")} title="Silent pause in seconds">Pause (:2.0)</Tool>
        <Tool onClick={() => insert("/")} title="Bound-morpheme split">Morpheme /</Tool>
      </div>

      {fillers.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="meta-label">Fillers</span>
          {fillers.slice(0, 10).map((f) => (
            <Tool key={f} onClick={() => insert(`(${f}) `)} title={`Insert "${f}" as a filled pause`}>
              {f}
            </Tool>
          ))}
        </div>
      )}

      <textarea
        ref={ref}
        className={`textarea mono ${indic ? "indic" : ""}`}
        style={{ minHeight: "26rem", fontSize: "0.95rem", lineHeight: 1.9 }}
        value={draft}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        spellCheck={false}
        aria-label="Transcript"
        placeholder={"C  I go to school in the bus.\nE  Who do you sit with?\nC  My friend (si) sits with me."}
      />

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        One utterance per line, beginning with a speaker code. Codes in this sample: {speakers.join(" · ")}
      </p>
    </div>
  );
}

function Tool({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button type="button" className="btn px-2 py-0.5 text-[0.78rem]" onClick={onClick} title={title}>
      {children}
    </button>
  );
}
