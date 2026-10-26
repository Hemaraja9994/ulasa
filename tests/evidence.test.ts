import { describe, expect, it } from "vitest";
import { parseSaltText } from "@/core/io/salt";
import { analyseSample, analysisSet } from "@/core/analyse";
import { FIXTURES, getFixture } from "@/data/fixtures";
import type { AnalysisResult, MeasureValue, Sample } from "@/core/types";

/**
 * Evidence links each number on the Analyse screen to the utterances behind
 * it. These tests hold the links to the measures' own arithmetic: a measure's
 * evidence must point at exactly the tokens it counted.
 */

function load(id: string): { sample: Sample; result: AnalysisResult } {
  const fixture = getFixture(id)!;
  const { sample } = parseSaltText(fixture.text, { language: fixture.language as never });
  return { sample, result: analyseSample(sample) };
}

function measure(result: AnalysisResult, key: string): MeasureValue {
  for (const g of result.groups) {
    const m = g.measures.find((x) => x.key === key);
    if (m) return m;
  }
  throw new Error(`No measure "${key}"`);
}

function evidenceTokens(sample: Sample, m: MeasureValue) {
  const byId = new Map(sample.utterances.map((u) => [u.id, u]));
  return (m.evidence ?? []).flatMap((e) => (e.tokenIdx ?? []).map((i) => byId.get(e.utteranceId)!.tokens[i]));
}

describe("maze evidence", () => {
  it("points at the single Kannada maze and nothing else", () => {
    const { sample, result } = load("kn-conversation");
    const m = measure(result, "maze_pct");
    expect(m.evidence).toHaveLength(1);
    const utt = sample.utterances.find((u) => u.id === m.evidence![0].utteranceId)!;
    expect(utt.text).toContain("(ಅದು ಅದು)");
    expect(m.evidence![0].tokenIdx).toEqual([0, 1]);
    // ಅದು is on the Kannada pack's filler list, so the tokeniser classifies
    // this maze as a filled pause; the per-kind evidence follows that.
    expect(measure(result, "maze_filled_pauses").evidence).toEqual(m.evidence);
    expect(measure(result, "maze_repetitions").evidence).toEqual([]);
  });

  it("covers exactly the maze tokens the percentage counts, in every fixture", () => {
    for (const f of FIXTURES) {
      const { sample, result } = load(f.id);
      if (result.groups.length === 0) continue;
      const set = analysisSet(sample);
      const counted = set.flatMap((u) => u.tokens.filter((t) => t.isMaze && !t.isUnintelligible)).length;
      const toks = evidenceTokens(sample, measure(result, "maze_pct"));
      expect(toks.length, f.id).toBe(counted);
      expect(toks.every((t) => t.isMaze), f.id).toBe(true);
    }
  });
});

describe("code-mix evidence", () => {
  it("highlights only Latin-script insertions in an Indian-language sample", () => {
    const { sample, result } = load("kn-conversation");
    const m = measure(result, "codemix_ratio");
    const toks = evidenceTokens(sample, m);
    expect(toks.length).toBeGreaterThan(0);
    expect(toks.every((t) => /^[A-Za-z]/.test(t.surface))).toBe(true);
    // 2.78% of 144 words = 4 insertions
    expect(toks.map((t) => t.surface.replace(/[.,]$/, ""))).toEqual(["drawing", "class", "cartoon", "homework"]);
  });

  it("agrees with the ratio's numerator in every fixture", () => {
    for (const f of FIXTURES) {
      const { sample, result } = load(f.id);
      if (result.groups.length === 0) continue;
      const ntw = measure(result, "ntw").value!;
      const ratio = measure(result, "codemix_ratio").value ?? 0;
      const toks = evidenceTokens(sample, measure(result, "codemix_ratio"));
      expect(Math.round((toks.length / ntw) * 10000) / 100, f.id).toBeCloseTo(ratio, 1);
    }
  });

  it("is empty for a monolingual English sample", () => {
    const { result } = load("en-preschool");
    expect(measure(result, "codemix_ratio").evidence ?? []).toHaveLength(0);
  });
});

describe("evidence on other measures", () => {
  it("ties length measures to every utterance in the analysis set", () => {
    const { sample, result } = load("kn-conversation");
    const ids = analysisSet(sample).map((u) => u.id);
    expect(measure(result, "mlu_w").evidence!.map((e) => e.utteranceId)).toEqual(ids);
  });

  it("gives unavailable measures no evidence", () => {
    const { result } = load("kn-conversation");
    expect(measure(result, "mlu_m").status).toBe("unavailable");
    expect(measure(result, "mlu_m").evidence).toBeUndefined();
    expect(measure(result, "pgu").evidence).toBeUndefined();
  });

  it("ties PGU to the marked utterances once coding starts", () => {
    const { sample } = load("kn-conversation");
    const set = analysisSet(sample);
    const marked = new Set([set[0].id, set[1].id]);
    const coded = {
      ...sample,
      utterances: sample.utterances.map((u) =>
        marked.has(u.id) ? { ...u, grammaticality: "grammatical" as const } : u,
      ),
    };
    const pgu = measure(analyseSample(coded), "pgu");
    expect(pgu.value).toBe(100);
    expect(pgu.evidence!.map((e) => e.utteranceId)).toEqual([set[0].id, set[1].id]);
  });
});
