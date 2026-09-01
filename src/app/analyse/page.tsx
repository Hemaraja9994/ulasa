"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useActiveSample, useHydrated, useStore } from "@/store/useStore";
import { analyseSample, analysisSet, targetUtterances } from "@/core/analyse";
import { countableWords } from "@/core/tokenise";
import { getPack } from "@/nlp/registry";
import { MetricTile } from "@/components/MetricTile";
import { EmptyState } from "@/components/EmptyState";
import { formatTime } from "@/lib/audio";
import type { AnalysisSetKind, MeasureValue } from "@/core/types";

/**
 * Analyse — the measures, as computed, with their status attached.
 *
 * The grid is driven by `AnalysisResult.groups`, not a hardcoded list, so a
 * measure added to the engine appears here without an edit. Experimental
 * measures sit inline with the rest rather than in a separate band: a
 * clinician reads the grid, so the badge and the value colour have to carry
 * the distinction where the eye already is.
 *
 * No norms are applied anywhere on this screen. ULASA reports; the clinician
 * interprets.
 */

/** Measures whose value is a mean over utterances have a real series to draw. */
function seriesFor(key: string, wordsPerUtterance: number[], mazesPerUtterance: number[]): number[] | undefined {
  switch (key) {
    case "mlu_w":
    case "wps":
    case "mean_turn_length":
    case "sd_utterance_length":
      return wordsPerUtterance;
    case "mazes_per_utterance":
    case "maze_pct":
      return mazesPerUtterance;
    default:
      return undefined;
  }
}

function captionFor(key: string): string | undefined {
  switch (key) {
    case "mlu_w":
    case "wps":
    case "mean_turn_length":
      return "Words per utterance, in order";
    case "sd_utterance_length":
      return "The spread this number describes";
    case "mazes_per_utterance":
    case "maze_pct":
      return "Maze words per utterance, in order";
    default:
      return undefined;
  }
}

export default function Analyse() {
  const sample = useActiveSample();
  const hydrated = useHydrated();
  const analysisSetKind = useStore((s) => s.analysisSetKind);
  const setAnalysisSetKind = useStore((s) => s.setAnalysisSetKind);

  const result = useMemo(() => (sample ? analyseSample(sample) : null), [sample]);

  const detail = useMemo(() => {
    if (!sample) return null;
    const set = analysisSet(sample);
    const all = targetUtterances(sample);
    const chosen = analysisSetKind === "all" ? all : set;
    const wordsPerUtterance = chosen.map((u) => countableWords(u.tokens).length);
    const mazesPerUtterance = chosen.map(
      (u) => countableWords(u.tokens, true).length - countableWords(u.tokens).length,
    );
    const mazeKinds = chosen.flatMap((u) => u.mazes);
    return {
      set,
      all,
      wordsPerUtterance,
      mazesPerUtterance,
      words: wordsPerUtterance.reduce((a, b) => a + b, 0),
      mazeWords: mazesPerUtterance.reduce((a, b) => a + b, 0),
      mazeCounts: {
        repetition: mazeKinds.filter((m) => m.kind === "repetition").length,
        revision: mazeKinds.filter((m) => m.kind === "revision").length,
        filled_pause: mazeKinds.filter((m) => m.kind === "filled_pause").length,
        false_start: mazeKinds.filter((m) => m.kind === "false_start").length,
      },
    };
  }, [sample, analysisSetKind]);

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
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Analyse</h1>
        <EmptyState
          art="bars"
          heading="No sample is open"
          body="Open a sample from the Workbench to compute its measures. Everything is computed in this browser."
          action={
            <Link href="/" className="btn btn-primary no-underline">
              Go to the Workbench
            </Link>
          }
        />
      </div>
    );
  }

  if (!result || !detail || result.analysisSetSize === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Analyse</h1>
        <EmptyState
          art="bars"
          heading="Nothing to analyse yet"
          body={
            result?.warnings[0] ??
            "This sample has no complete, intelligible, verbal utterances from the target speaker. Transcribe it in the Studio first."
          }
          action={
            <Link href="/studio" className="btn btn-primary no-underline">
              Open the Studio
            </Link>
          }
        />
      </div>
    );
  }

  const pack = getPack(sample.language);
  const computedAt = new Date(result.computedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const measures: MeasureValue[] = result.groups.flatMap((g) => g.measures);
  const histogram = buildHistogram(detail.wordsPerUtterance);
  const maxBin = Math.max(1, ...histogram.map((b) => b.count));
  const mazeTotal = Math.max(1, ...Object.values(detail.mazeCounts));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]" style={{ color: "var(--text)" }}>
            Analyse
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
            Computed at {computedAt} in this browser. No norms are applied — ULASA reports, the clinician interprets.
          </p>
        </div>
        <Link href="/report" className="btn btn-primary min-h-12 w-full no-underline sm:w-auto md:min-h-0">
          Build report
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>

      {/* Analysis-set switch */}
      <div className="card flex flex-wrap items-center justify-between gap-4 px-[18px] py-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="meta-label">Analysis set</span>
          <div className="flex gap-1 rounded-[9px] p-[3px]" style={{ background: "var(--bg)" }} role="group" aria-label="Analysis set">
            {([
              ["complete_intelligible_verbal", `Complete & intelligible verbal · ${detail.set.length}`],
              ["all", `All utterances · ${detail.all.length}`],
            ] as [AnalysisSetKind, string][]).map(([kind, label]) => {
              const on = analysisSetKind === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setAnalysisSetKind(kind)}
                  className="min-h-11 rounded-[7px] px-3 text-[13px] md:min-h-0 md:py-1.5"
                  style={
                    on
                      ? { background: "var(--surface)", border: "1px solid var(--border-strong)", fontWeight: 600, color: "var(--text)" }
                      : { color: "var(--text-muted)" }
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="num flex flex-wrap items-center gap-4 text-[12.5px]" style={{ color: "var(--text-muted)" }} aria-live="polite">
          <span>{detail.words} words</span>
          <span>{sample.elapsedSeconds ? `${formatTime(sample.elapsedSeconds)} elapsed` : "no elapsed time"}</span>
          <span>
            {sample.speakers.length} speaker{sample.speakers.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Warnings, never behind a disclosure. */}
      {result.warnings.length > 0 && (
        <div className="notice notice-warn flex items-start gap-3">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="mt-0.5 shrink-0" aria-hidden="true">
            <path d="M12 3l9 17H3z" />
            <path d="M12 9v5M12 17.5v.5" />
          </svg>
          <ul className="space-y-1.5 text-[13.5px] leading-normal">
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Metric small multiples, driven by the engine's own groups. */}
      {result.groups.map((group) => (
        <section key={group.id} className="space-y-2">
          <h2 className="meta-label">{group.label}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {group.measures.map((measure) => (
              <MetricTile
                key={measure.key}
                measure={measure}
                series={seriesFor(measure.key, detail.wordsPerUtterance, detail.mazesPerUtterance)}
                seriesCaption={captionFor(measure.key)}
              />
            ))}
          </div>
        </section>
      ))}

      {/* Two charts, both from the real analysis set. */}
      <div className="grid gap-3.5 md:grid-cols-2">
        <div className="card p-[18px]">
          <h2 className="mb-3 text-[15px] font-semibold" style={{ color: "var(--text)" }}>
            Utterance length distribution
          </h2>
          <div className="flex h-[120px] items-end gap-1">
            {histogram.map((bin) => (
              <div key={bin.label} className="flex flex-1 flex-col items-center justify-end gap-1">
                <span
                  className="w-full rounded-t-[2px]"
                  style={{ background: "var(--accent)", height: `${(bin.count / maxBin) * 100}%`, minHeight: bin.count > 0 ? 2 : 0 }}
                  title={`${bin.count} utterance${bin.count === 1 ? "" : "s"} of ${bin.label} words`}
                />
                <span className="mono num text-[10px]" style={{ color: "var(--text-faint)" }}>
                  {bin.label}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs" style={{ color: "var(--text-faint)" }}>
            Words per C-unit
            {measureValue(measures, "sd_utterance_length") !== null
              ? ` · SD ${measureValue(measures, "sd_utterance_length")}`
              : ""}{" "}
            — length variability, not a deficit marker.
          </p>
        </div>

        <div className="card p-[18px]">
          <h2 className="mb-3 text-[15px] font-semibold" style={{ color: "var(--text)" }}>
            Verbal facility — maze composition
          </h2>
          <div className="flex flex-col gap-2.5">
            {(
              [
                ["Repetition", detail.mazeCounts.repetition],
                ["Revision", detail.mazeCounts.revision],
                ["Filled pause", detail.mazeCounts.filled_pause],
                ["False start", detail.mazeCounts.false_start],
              ] as [string, number][]
            ).map(([label, n]) => (
              <div key={label}>
                <div className="mb-1 flex justify-between text-[13px]">
                  <span>{label}</span>
                  <span className="mono num" style={{ color: "var(--text-muted)" }}>
                    {n}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--bg)" }}>
                  <div className="h-2 rounded-full" style={{ background: "var(--warn)", width: `${(n / mazeTotal) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs" style={{ color: "var(--text-faint)" }}>
            {detail.mazeWords} maze words across {detail.words + detail.mazeWords} — mazes are excluded from MLU and from the diversity counts.
          </p>
        </div>
      </div>

      <p className="text-xs" style={{ color: "var(--text-faint)" }}>
        Language pack: {pack.name} · morpheme protocol {pack.morphemeProtocol}.
      </p>
    </div>
  );
}

function measureValue(measures: MeasureValue[], key: string): number | null {
  return measures.find((m) => m.key === key)?.value ?? null;
}

/** 14 bins across the observed range, as in the design. */
function buildHistogram(values: number[]): { label: string; count: number }[] {
  if (values.length === 0) return [];
  const max = Math.max(...values);
  const binCount = 14;
  const width = Math.max(1, Math.ceil(max / binCount));
  return Array.from({ length: binCount }, (_, i) => {
    const lo = i * width;
    const hi = lo + width;
    return {
      label: width === 1 ? String(lo + 1) : `${lo + 1}`,
      count: values.filter((v) => v > lo && v <= hi).length,
    };
  });
}
