"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useActiveSample, useHydrated } from "@/store/useStore";
import { analyseSample, analysisSet } from "@/core/analyse";
import { countableWords } from "@/core/tokenise";
import { getPack } from "@/nlp/registry";
import { GLOSSARY_BY_KEY } from "@/data/glossary";
import { UtteranceTokens } from "@/components/UtteranceTokens";
import { displayValue, findMeasure, statusLabel } from "@/lib/measures";
import type { AnalysisResult, MeasureValue, Sample } from "@/core/types";
import type { LanguagePack } from "@/nlp/pack";

/**
 * Analyse: every number is tied to the utterances behind it.
 *
 * Selecting a measure highlights its evidence (from MeasureValue.evidence) in
 * the transcript and in the words-per-utterance histogram. Unavailable
 * measures highlight nothing, because nothing was counted.
 */

const MIN_SET = 50;

/** The curated view. Every other measure is one toggle away under "All measures". */
const KEY_GROUPS: { label: string; keys: string[] }[] = [
  { label: "Length", keys: ["mlu_w", "mlu_m"] },
  { label: "Lexical diversity", keys: ["ndw", "ttr", "mattr", "mtld"] },
  { label: "Fluency & discourse", keys: ["maze_pct", "codemix_ratio", "clausal_density", "pgu"] },
];

const HINTS: Record<string, string> = {
  mlu_w: "Mean words per utterance",
  mlu_m: "Needs morpheme splits",
  ndw: "Distinct word types",
  ttr: "Types ÷ tokens",
  mattr: "50-word moving window",
  mtld: "Length-robust diversity",
  maze_pct: "Mazes ÷ all words",
  codemix_ratio: "Insertions ÷ words",
  clausal_density: "Clauses per utterance",
  pgu: "Needs grammaticality marks",
};

/** Measures that are labels or prose rather than numbers; kept out of the list. */
const NOT_LISTED = new Set(["matrix_language", "codemix_note"]);

const MAZE_KIND: Record<string, string> = {
  repetition: "repetition",
  revision: "revision",
  filled_pause: "filled pause",
  false_start: "false start",
};

export default function Analyse() {
  const sample = useActiveSample();
  const hydrated = useHydrated();
  const analysis = useMemo(() => (sample ? analyseSample(sample) : null), [sample]);

  if (!hydrated) {
    return <div className="card p-8 text-center" style={{ color: "var(--text-muted)" }} aria-busy="true">Loading…</div>;
  }
  if (!sample || !analysis) {
    return (
      <div className="card p-8 text-center">
        <h1 className="text-lg font-semibold">No sample selected</h1>
        <Link href="/" className="btn btn-primary mt-4 no-underline">Go to Home</Link>
      </div>
    );
  }
  return <Workspace key={sample.id} sample={sample} analysis={analysis} />;
}

function Workspace({ sample, analysis }: { sample: Sample; analysis: AnalysisResult }) {
  const pack = getPack(sample.language);
  const isIndic = pack.script !== "Latin";
  const [selected, setSelected] = useState(isIndic ? "codemix_ratio" : "mlu_w");
  const [view, setView] = useState<"key" | "all">("key");
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const set = useMemo(() => analysisSet(sample), [sample]);
  const setIds = useMemo(() => new Set(set.map((u) => u.id)), [set]);
  const target = sample.speakers.find((s) => s.isTarget);

  // C1, C2 … numbering over the target speaker's utterances.
  const labels = useMemo(() => {
    const map = new Map<string, string>();
    let n = 0;
    for (const u of sample.utterances) if (u.speakerId === target?.id) map.set(u.id, `C${++n}`);
    return map;
  }, [sample, target]);

  const current = findMeasure(analysis, selected);
  const evidence = useMemo(() => {
    const byUtt = new Map<string, Set<number> | null>();
    for (const e of current?.evidence ?? []) byUtt.set(e.utteranceId, e.tokenIdx ? new Set(e.tokenIdx) : null);
    return byUtt;
  }, [current]);

  // Bring the first piece of evidence into view when the selection changes.
  useEffect(() => {
    const first = current?.evidence?.[0]?.utteranceId;
    if (first && current?.evidence && current.evidence.length < set.length) {
      rowRefs.current[first]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [current, set.length]);

  if (analysis.groups.length === 0) {
    return (
      <div className="notice notice-warn">
        <strong>Nothing to analyse yet.</strong>
        <ul className="mt-1 list-disc pl-5">{analysis.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        <Link href="/studio" className="btn mt-3 no-underline">Back to Studio</Link>
      </div>
    );
  }

  const short = analysis.analysisSetSize < MIN_SET;
  // The short-sample warning is shown as the banner; the rest are listed beneath it.
  const otherWarnings = analysis.warnings.filter((w) => !w.startsWith("The analysis set contains"));
  const lengths = sample.utterances.map((u) => countableWords(u.tokens).length);
  const maxLen = Math.max(1, ...lengths);

  return (
    <div className="flex flex-col gap-[18px]">
      {short && (
        <div className="flex items-start gap-3 rounded-[10px] border px-4 py-3" style={{ background: "var(--warn-soft)", borderColor: "var(--warn-border)", color: "var(--warn-text)", fontSize: 13.5, lineHeight: 1.5 }} role="status">
          <span className="flex-none font-bold">{analysis.analysisSetSize} of {MIN_SET}</span>
          <span>
            The analysis set is below the 50-utterance convention (SALT, SUGAR). Every figure is provisional and
            reference comparison is turned off for this sample.
          </span>
        </div>
      )}
      {otherWarnings.length > 0 && (
        <details className="panel px-4 py-2.5" style={{ fontSize: 13 }}>
          <summary className="cursor-pointer font-semibold" style={{ color: "var(--text-muted)" }}>
            Read before interpreting · {otherWarnings.length} note{otherWarnings.length === 1 ? "" : "s"}
          </summary>
          <ul className="mb-1 mt-2 list-disc space-y-1 pl-5" style={{ color: "var(--text-muted)", lineHeight: 1.55 }}>
            {otherWarnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </details>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_440px]">
        {/* --- transcript ---------------------------------------------------- */}
        <section className="panel order-2 flex min-w-0 flex-col lg:order-1" aria-label="Transcript with evidence">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-[18px] py-3" style={{ borderColor: "var(--border)" }}>
            <span className="font-semibold" style={{ fontSize: 14 }}>Transcript</span>
            <div className="flex flex-wrap items-center gap-3.5" style={{ fontSize: 12, color: "var(--text-muted)" }}>
              <Legend swatch={{ background: "var(--saffron-soft)", border: "1px solid var(--saffron)" }} label="Maze" />
              <Legend swatch={{ background: "var(--accent-soft)", border: "1px solid var(--accent)" }} label={isIndic ? "English insertion" : "Other-language word"} />
              <span className="flex items-center gap-1.5"><span className="h-[3px] w-3.5 rounded-sm" style={{ background: "var(--border-strong)" }} />Words per utterance</span>
            </div>
          </div>
          <div className="h-[640px] max-h-[70vh] overflow-auto py-2">
            {sample.utterances.map((u, i) => {
              const isTarget = u.speakerId === target?.id;
              const inSet = setIds.has(u.id);
              const hit = evidence.has(u.id);
              const tokenHits = evidence.get(u.id);
              const spk = sample.speakers.find((s) => s.id === u.speakerId);
              return (
                <div
                  key={u.id}
                  ref={(el) => { rowRefs.current[u.id] = el; }}
                  className="grid items-center gap-2 px-[18px] py-[3px]"
                  style={{
                    gridTemplateColumns: "40px 26px minmax(0,1fr) 72px",
                    opacity: isTarget ? (inSet ? 1 : 0.7) : 0.5,
                    background: hit && tokenHits ? "var(--bg)" : "transparent",
                  }}
                >
                  <span className="mono text-right" style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{labels.get(u.id) ?? ""}</span>
                  <span className="mono font-semibold" style={{ fontSize: 12, color: isTarget ? "var(--accent)" : "var(--text-muted)" }}>{spk?.code}</span>
                  <div className="flex min-w-0 items-center gap-2">
                    <UtteranceTokens
                      tokens={u.tokens}
                      matrixLang={pack.id}
                      highlight={(t, idx) => (tokenHits?.has(idx) ? (t.isMaze ? "maze" : "mix") : null)}
                    />
                    {isTarget && !inSet && (
                      <span className="flag flex-none" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }} title="Not in the complete-and-intelligible analysis set">
                        excluded
                      </span>
                    )}
                  </div>
                  {isTarget ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="h-1 rounded-sm" style={{ width: Math.round((lengths[i] / maxLen) * 48), background: hit ? "var(--accent)" : "var(--border-strong)" }} />
                      <span className="mono w-4 text-right" style={{ fontSize: 11, color: "var(--text-muted)" }}>{lengths[i]}</span>
                    </div>
                  ) : <span />}
                </div>
              );
            })}
          </div>
        </section>

        {/* --- detail + measure list ----------------------------------------- */}
        <aside className="order-1 flex min-w-0 flex-col gap-4 lg:order-2">
          {current && (
            <DetailCard
              measure={current}
              analysis={analysis}
              sample={sample}
              pack={pack}
              labels={labels}
              bars={set.map((u) => ({ id: u.id, len: countableWords(u.tokens).length, hit: evidence.has(u.id) }))}
            />
          )}

          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-[18px] py-2.5">
              <span className="font-semibold" style={{ fontSize: 13.5 }}>Measures</span>
              <div className="seg" role="group" aria-label="Measures shown" style={{ padding: 2 }}>
                <button type="button" className="seg-btn" style={{ padding: "4px 10px", fontSize: 12.5 }} aria-pressed={view === "key"} onClick={() => setView("key")}>Key measures</button>
                <button type="button" className="seg-btn" style={{ padding: "4px 10px", fontSize: 12.5 }} aria-pressed={view === "all"} onClick={() => setView("all")}>All measures</button>
              </div>
            </div>
            <MeasureList analysis={analysis} view={view} selected={selected} onSelect={setSelected} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: React.CSSProperties; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-[3px]" style={swatch} />
      {label}
    </span>
  );
}

function MeasureList({
  analysis,
  view,
  selected,
  onSelect,
}: {
  analysis: AnalysisResult;
  view: "key" | "all";
  selected: string;
  onSelect: (key: string) => void;
}) {
  const groups =
    view === "key"
      ? KEY_GROUPS.map((g) => ({
          label: g.label,
          measures: g.keys.map((k) => findMeasure(analysis, k)).filter((m): m is MeasureValue => m !== null),
        }))
      : analysis.groups.map((g) => ({ label: g.label, measures: g.measures.filter((m) => !NOT_LISTED.has(m.key)) }));

  return (
    <div>
      {groups.map((g) => (
        <div key={g.label}>
          <div className="caps px-[18px] py-2" style={{ background: "var(--surface-2)" }}>{g.label}</div>
          {g.measures.map((m) => {
            const on = m.key === selected;
            const missing = m.value === null;
            return (
              <button
                key={m.key}
                type="button"
                aria-pressed={on}
                onClick={() => onSelect(m.key)}
                className="measure-row flex w-full items-center justify-between gap-3 border-0 px-[18px] py-2.5 text-left"
                style={{
                  borderTop: "1px solid var(--surface-2)",
                  borderLeft: `3px solid ${on ? "var(--accent)" : "transparent"}`,
                  background: on ? "var(--bg)" : "var(--surface)",
                }}
              >
                <span className="flex min-w-0 flex-col gap-px">
                  <span style={{ fontSize: 14, fontWeight: on ? 600 : 500 }}>{view === "key" ? shortLabel(m) : m.label}</span>
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{HINTS[m.key] && view === "key" ? HINTS[m.key] : m.unit ?? ""}</span>
                </span>
                <span className="flex flex-none items-center gap-2">
                  {m.status === "experimental" && <span className="pill-exp rounded-full">Exp.</span>}
                  <span className="tnum font-semibold" style={{ fontSize: 15, color: missing ? "var(--text-muted)" : "var(--text)" }}>
                    {displayValue(m)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Compact labels for the curated list; the engine's labels are longer. */
function shortLabel(m: MeasureValue): string {
  const map: Record<string, string> = {
    mlu_w: "MLU in words",
    mlu_m: "MLU in morphemes",
    ndw: "Number of different words",
    ttr: "Type–token ratio",
    mattr: "MATTR",
    mtld: "MTLD",
    maze_pct: "Maze words",
    codemix_ratio: "Code-mix ratio",
    clausal_density: "Clausal density",
    pgu: "Percent grammatical utterances",
  };
  return map[m.key] ?? m.label;
}

function DetailCard({
  measure,
  analysis,
  sample,
  pack,
  labels,
  bars,
}: {
  measure: MeasureValue;
  analysis: AnalysisResult;
  sample: Sample;
  pack: LanguagePack;
  labels: Map<string, string>;
  bars: { id: string; len: number; hit: boolean }[];
}) {
  const status = statusLabel(measure);
  const missing = measure.value === null;
  const maxBar = Math.max(1, ...bars.map((b) => b.len));
  const note =
    measure.note ??
    (measure.key === "codemix_ratio" || measure.key === "switch_points" ? findMeasure(analysis, "codemix_note")?.note : undefined) ??
    GLOSSARY_BY_KEY[measure.key]?.short;
  const glossary = GLOSSARY_BY_KEY[measure.key];

  return (
    <div className="panel flex flex-col gap-3 p-5" aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium" style={{ fontSize: 13, color: "var(--text-muted)" }}>
          {shortLabel(measure)}
          {glossary && (
            <Link href={`/glossary#${measure.key}`} className="glossary-tip ml-1.5" title={glossary.short} aria-label={`What is ${measure.label}?`}>?</Link>
          )}
        </span>
        <span className={`status status-${status.toLowerCase()}`}>{status}</span>
      </div>
      <div className="tnum font-semibold" style={{ fontSize: 44, letterSpacing: "-0.03em", lineHeight: 1, color: missing ? "var(--text-muted)" : "var(--text)" }}>
        {missing ? "—" : displayValue({ ...measure, unit: undefined })}
        {!missing && measure.unit === "%" && <span style={{ fontSize: 18, fontWeight: 500, color: "var(--text-muted)" }}>%</span>}
        {!missing && measure.unit && measure.unit !== "%" && (
          <span className="ml-1.5" style={{ fontSize: 14, fontWeight: 500, letterSpacing: 0, color: "var(--text-muted)" }}>{measure.unit}</span>
        )}
      </div>
      <div style={{ fontSize: 13.5 }}>{subLine(measure, analysis, sample, pack, labels)}</div>
      {note && (
        <div className="border-t pt-2.5" style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--text-muted)", borderColor: "var(--surface-2)" }}>{note}</div>
      )}
      <div className="flex h-16 items-end gap-0.5 pt-2" role="img" aria-label="Words per utterance across the analysis set; highlighted bars are this measure's evidence">
        {bars.map((b) => (
          <div
            key={b.id}
            className="flex-1 rounded-t-sm"
            title={`${labels.get(b.id)} · ${b.len} words`}
            style={{ height: `${Math.max(2, (b.len / maxBar) * 56)}px`, background: b.hit ? "var(--accent)" : "var(--border-strong)" }}
          />
        ))}
      </div>
      <div className="mono flex justify-between" style={{ fontSize: 11, color: "var(--text-muted)" }}>
        <span>{labels.get(bars[0]?.id ?? "")}</span>
        <span>Words per {sample.speakers.find((s) => s.isTarget)?.role ?? "target"} utterance</span>
        <span>{labels.get(bars[bars.length - 1]?.id ?? "")}</span>
      </div>
    </div>
  );
}

/** One line saying where the number came from, built from the engine's own values. */
function subLine(m: MeasureValue, a: AnalysisResult, sample: Sample, pack: LanguagePack, labels: Map<string, string>): string {
  const v = (key: string) => findMeasure(a, key)?.value ?? null;
  const ev = m.evidence ?? [];
  const where = (ids: string[]) => {
    const names = ids.map((id) => labels.get(id) ?? "").filter(Boolean);
    return names.length > 4 ? `${names.slice(0, 4).join(", ")} and ${names.length - 4} more` : names.join(", ");
  };
  if (m.value === null) {
    if (m.key === "pgu") return `0 of ${a.analysisSetSize} utterances marked · mark them in Code`;
    return "Not computed for this sample";
  }
  switch (m.key) {
    case "mlu_w":
      return `${v("ntw")} words across ${a.analysisSetSize} utterances · SD ${v("sd_utterance_length") ?? "—"}`;
    case "ndw":
      return `${v("ndw")} types in ${v("ntw")} tokens`;
    case "ttr":
      return `${v("ndw")} ÷ ${v("ntw")}`;
    case "maze_pct": {
      if (ev.length === 0) return "No mazes in the analysis set";
      const byId = new Map(sample.utterances.map((u) => [u.id, u]));
      const spans = ev.flatMap((e) => byId.get(e.utteranceId)?.mazes ?? []);
      const kinds = [...new Set(spans.map((s) => MAZE_KIND[s.kind]))].join(", ");
      return `${spans.length} maze${spans.length === 1 ? "" : "s"} (${kinds}) in ${where(ev.map((e) => e.utteranceId))}`;
    }
    case "codemix_ratio": {
      const k = ev.reduce((n, e) => n + (e.tokenIdx?.length ?? 0), 0);
      return `${k} insertion${k === 1 ? "" : "s"} in ${v("ntw")} words · ${v("switch_points")} switch points per 100 words · matrix ${pack.nativeName}`;
    }
    case "pgu":
      return `${ev.length} of ${a.analysisSetSize} utterances marked`;
    case "clausal_density":
      return "Clauses ÷ C-units, heuristic; override per utterance in Code";
    default:
      if (ev.length === 0) return "No utterances contribute to this figure";
      if (ev.length === a.analysisSetSize) return `Computed over all ${ev.length} utterances in the analysis set`;
      return `Drawn from ${ev.length} utterance${ev.length === 1 ? "" : "s"}: ${where(ev.map((e) => e.utteranceId))}`;
  }
}
