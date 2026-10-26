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
