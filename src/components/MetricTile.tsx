"use client";

import type { MeasureValue } from "@/core/types";

/**
 * One measure, rendered honestly.
 *
 * Experimental measures sit inline with the clinical ones rather than in a
 * separate band — a clinician reads the grid, not a legend — so the badge and
 * the value colour are the only two differentiators, and both are always
 * present. A null value prints an em dash and the reason, never `0` or `NaN`:
 * "we did not compute this" and "we computed zero" are different findings.
 *
 * The sparkline is drawn only when the caller can supply a real per-utterance
 * series for this measure. The prototype generated its sparklines from
 * `Math.sin` for shape; a decorative line that reads as data has no place on a
 * clinical screen, so a measure with no underlying series simply has no line.
 */

function Sparkline({ series, experimental }: { series: number[]; experimental: boolean }) {
  const max = Math.max(...series);
  const min = Math.min(...series);
  const span = max - min || 1;
  const points = series
    .map((v, i) => {
      const x = series.length === 1 ? 50 : (i / (series.length - 1)) * 100;
      const y = 20 - ((v - min) / span) * 16;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width="100%" height="22" viewBox="0 0 100 22" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={experimental ? "var(--experimental)" : "var(--accent)"}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        opacity=".6"
      />
    </svg>
  );
}

export function MetricTile({
  measure,
  series,
  seriesCaption,
}: {
  measure: MeasureValue;
  /** Real per-utterance values behind this measure, where one exists. */
  series?: number[];
  seriesCaption?: string;
}) {
  const experimental = measure.status === "experimental";
  const unavailable = measure.value === null;

  return (
    <div className="card flex flex-col gap-2 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold leading-tight" style={{ color: "var(--text)" }}>
            {measure.label}
          </div>
          <div className="mono mt-0.5 text-[11px]" style={{ color: "var(--text-faint)" }}>
            {measure.key}
          </div>
        </div>
        {experimental && (
          <span
            className="shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold tracking-wide"
            style={{ background: "var(--experimental-soft)", color: "var(--experimental-text)" }}
            title="The language pack has no published protocol for this measure. It is exploratory and not comparable to any norm table."
          >
            EXPERIMENTAL
          </span>
        )}
        {measure.status === "unavailable" && !experimental && (
          <span
            className="badge badge-unavailable shrink-0 text-[9.5px]"
            title={measure.note ?? "Not available for this sample."}
          >
            N/A
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span
          className="num text-[30px] font-semibold leading-none"
          style={{ color: unavailable ? "var(--text-faint)" : experimental ? "var(--experimental)" : "var(--text)" }}
        >
          {unavailable ? "—" : measure.value}
        </span>
        {!unavailable && measure.unit && (
          <span className="text-[11.5px]" style={{ color: "var(--text-muted)" }}>
            {measure.unit}
          </span>
        )}
      </div>

      {measure.note && (
        <p className="text-[11.5px] leading-snug" style={{ color: "var(--text-muted)" }}>
          {measure.note}
        </p>
      )}

      {!unavailable && series && series.length > 1 && (
        <div>
          <Sparkline series={series} experimental={experimental} />
          {seriesCaption && (
            <div className="text-[11px]" style={{ color: "var(--text-faint)" }}>
              {seriesCaption}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
