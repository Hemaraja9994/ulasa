import type { Bcp47 } from "./types";

/**
 * A local reference set: means and SDs a clinic built from its own samples.
 *
 * ULASA bundles no norms for any language. A z-score appears only when a clinic
 * has imported a set for the sample's language; otherwise every comparison is
 * intra-child change. Pure data, no browser APIs.
 */
export interface ReferenceSet {
  id: string;
  name: string;
  language: Bcp47;
  /** Free text, e.g. "4;0–4;11". */
  ageRange: string;
  /** Number of children the set was built from. */
  n: number;
  /** Where the numbers came from, e.g. "built locally". */
  source?: string;
  /** Keyed by measure key as emitted by analyseSample (mlu_w, ndw, …). */
  measures: Record<string, { mean: number; sd: number }>;
}

/** Validates an imported JSON reference set. Returns the set or a list of problems. */
export function parseReferenceSet(
  raw: unknown,
  id: string,
): { set: ReferenceSet | null; errors: string[] } {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { set: null, errors: ["The file is not a JSON object."] };
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.name !== "string" || !o.name.trim()) errors.push("“name” is missing.");
  if (typeof o.language !== "string" || !o.language.trim()) errors.push("“language” is missing (e.g. \"en-IN\").");
  if (typeof o.n !== "number" || !Number.isFinite(o.n) || o.n < 1) errors.push("“n” must be a positive number.");
  const measures: ReferenceSet["measures"] = {};
  if (!o.measures || typeof o.measures !== "object" || Array.isArray(o.measures)) {
    errors.push("“measures” must be an object of { key: { mean, sd } }.");
  } else {
    for (const [key, v] of Object.entries(o.measures as Record<string, unknown>)) {
      const mv = v as { mean?: unknown; sd?: unknown } | null;
      if (!mv || typeof mv.mean !== "number" || typeof mv.sd !== "number" || !(mv.sd > 0)) {
        errors.push(`Measure “${key}” needs a numeric mean and a positive sd.`);
        continue;
      }
      measures[key] = { mean: mv.mean, sd: mv.sd };
    }
    if (Object.keys(measures).length === 0 && errors.length === 0) errors.push("“measures” is empty.");
  }
  if (errors.length > 0) return { set: null, errors };
  return {
    set: {
      id,
      name: (o.name as string).trim(),
      language: (o.language as string).trim() as Bcp47,
      ageRange: typeof o.ageRange === "string" ? o.ageRange : "",
      n: o.n as number,
      source: typeof o.source === "string" ? o.source : "built locally",
      measures,
    },
    errors: [],
  };
}

/** z for one value against a set, or null when the set does not cover the measure. */
export function zScore(set: ReferenceSet | null, key: string, value: number | null): number | null {
  if (!set || value === null) return null;
  const ref = set.measures[key];
  if (!ref || !(ref.sd > 0)) return null;
  return Math.round(((value - ref.mean) / ref.sd) * 10) / 10;
}

/** A blank template clinicians can fill in and import. */
export const REFERENCE_TEMPLATE = {
  name: "Clinic EN 4;0–4;11",
  language: "en-IN",
  ageRange: "4;0–4;11",
  n: 0,
  source: "built locally",
  measures: {
    mlu_w: { mean: 0, sd: 1 },
    ndw: { mean: 0, sd: 1 },
    mattr: { mean: 0, sd: 1 },
    maze_pct: { mean: 0, sd: 1 },
    wpm: { mean: 0, sd: 1 },
    pct_with_errors: { mean: 0, sd: 1 },
    pct_intelligible_utterances: { mean: 0, sd: 1 },
    pgu: { mean: 0, sd: 1 },
  },
};
