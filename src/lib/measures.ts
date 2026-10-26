import type { AnalysisResult, MeasureValue } from "@/core/types";

/** Looks a measure up by key across all groups of an analysis. */
export function findMeasure(analysis: AnalysisResult | null, key: string): MeasureValue | null {
  if (!analysis) return null;
  for (const group of analysis.groups) {
    const found = group.measures.find((m) => m.key === key);
    if (found) return found;
  }
  return null;
}

export type StatusLabel = "Established" | "Descriptive" | "Experimental" | "Unavailable";

/**
 * The badge a measure carries. Code-mixing figures are "Descriptive": they are
 * reported as community practice and are never read as a deficit.
 */
export function statusLabel(m: MeasureValue): StatusLabel {
  if (m.status === "unavailable" || m.value === null) return "Unavailable";
  if (m.status === "experimental") return "Experimental";
  if (m.key === "codemix_ratio" || m.key === "switch_points") return "Descriptive";
  return "Established";
}

/** Measures reported to two decimals by clinical convention (MLU 4.00, not 4). */
const TWO_DP = new Set([
  "mlu_w", "mlu_m", "sd_utterance_length", "mean_verbs", "clausal_density", "wps",
  "mean_turn_length", "mazes_per_utterance",
]);

/** Display form of a value: fixed decimals where convention expects them, "—" when unavailable. */
export function displayValue(m: MeasureValue | null): string {
  if (!m || m.value === null) return "—";
  const v = TWO_DP.has(m.key) ? m.value.toFixed(2) : String(m.value);
  return m.unit === "%" ? `${v}%` : v;
}
