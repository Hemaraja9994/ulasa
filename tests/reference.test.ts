import { describe, expect, it } from "vitest";
import { parseReferenceSet, REFERENCE_TEMPLATE, zScore } from "@/core/reference";

/**
 * ULASA ships no norms. A z-score exists only against a reference set the
 * clinic imported, and only for measures that set covers.
 */
describe("local reference sets", () => {
  const valid = {
    name: "Clinic EN 4;0–4;11",
    language: "en-IN",
    ageRange: "4;0–4;11",
    n: 38,
    measures: { mlu_w: { mean: 5.6, sd: 1.1 }, maze_pct: { mean: 3, sd: 1.5 } },
  };

  it("accepts a well-formed set", () => {
    const { set, errors } = parseReferenceSet(valid, "ref-1");
    expect(errors).toEqual([]);
    expect(set?.measures.mlu_w).toEqual({ mean: 5.6, sd: 1.1 });
    expect(set?.source).toBe("built locally");
  });

  it("rejects a set with no n, no language or a non-positive SD", () => {
    const { set, errors } = parseReferenceSet({ ...valid, n: 0, language: "", measures: { mlu_w: { mean: 5, sd: 0 } } }, "x");
    expect(set).toBeNull();
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });

  it("rejects the blank template until the clinic fills in n", () => {
    expect(parseReferenceSet(REFERENCE_TEMPLATE, "t").set).toBeNull();
  });

  it("computes z only for covered measures", () => {
    const { set } = parseReferenceSet(valid, "ref-1");
    expect(zScore(set, "mlu_w", 5.89)).toBe(0.3);
    expect(zScore(set, "ndw", 180)).toBeNull();
    expect(zScore(null, "mlu_w", 5.89)).toBeNull();
    expect(zScore(set, "mlu_w", null)).toBeNull();
  });
});
