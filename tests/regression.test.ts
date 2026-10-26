import { describe, expect, it } from "vitest";
import { parseSaltText } from "@/core/io/salt";
import { analyseSample, analysisSet } from "@/core/analyse";
import { parseUtteranceText } from "@/core/tokenise";
import { FIXTURES, getFixture } from "@/data/fixtures";
import { getPack } from "@/nlp/registry";

/**
 * Regression snapshot over all built-in synthetic transcripts. If a change to
 * the tokeniser or measures moves any of these numbers, this fails and the
 * change must be justified and the expected values updated deliberately.
 */
const EXPECTED: Record<string, Record<string, number | null>> = {
  "en-preschool": {
    "setSize": 64,
    "ntw": 377,
    "mlu_w": 5.89,
    "ndw": 180,
    "ttr": 0.477,
    "mtld": 64.8,
    "codemix_ratio": 0,
    "switch_points": 0,
    "pct_intelligible_utterances": 100,
    "unintelligible_words": 0
  },
  "hi-conversation": {
    "setSize": 40,
    "ntw": 227,
    "mlu_w": 5.68,
    "ndw": 134,
    "ttr": 0.59,
    "mtld": 75.7,
    "codemix_ratio": 1.76,
    "switch_points": 3.52,
    "pct_intelligible_utterances": 100,
    "unintelligible_words": 0
  },
  "kn-conversation": {
    "setSize": 36,
    "ntw": 144,
    "mlu_w": 4,
    "ndw": 107,
    "ttr": 0.743,
    "mtld": 156.9,
    "codemix_ratio": 2.78,
    "switch_points": 4.17,
    "pct_intelligible_utterances": 100,
    "unintelligible_words": 0
  },
  "ta-narrative": {
    "setSize": 26,
    "ntw": 106,
    "mlu_w": 4.08,
    "ndw": 69,
    "ttr": 0.651,
    "mtld": 69.6,
    "codemix_ratio": 2.83,
    "switch_points": 4.72,
    "pct_intelligible_utterances": 100,
    "unintelligible_words": 0
  },
  "te-narrative": {
    "setSize": 26,
    "ntw": 107,
    "mlu_w": 4.12,
    "ndw": 72,
    "ttr": 0.673,
    "mtld": 68.6,
    "codemix_ratio": 2.8,
    "switch_points": 4.67,
    "pct_intelligible_utterances": 100,
    "unintelligible_words": 0
  },
  "ml-conversation": {
    "setSize": 36,
    "ntw": 143,
    "mlu_w": 3.97,
    "ndw": 107,
    "ttr": 0.748,
    "mtld": 159,
    "codemix_ratio": 2.8,
    "switch_points": 4.2,
    "pct_intelligible_utterances": 100,
    "unintelligible_words": 0
  },
  "bilingual": {
    "setSize": 11,
    "ntw": 60,
    "mlu_w": 5.45,
    "ndw": 51,
    "ttr": 0.85,
    "mtld": 112,
    "codemix_ratio": 28.33,
    "switch_points": 46.67,
    "pct_intelligible_utterances": 100,
    "unintelligible_words": 0
  },
  "unintelligible": {
    "setSize": 1,
    "ntw": 5,
    "mlu_w": 5,
    "ndw": 5,
    "ttr": 1,
    "mtld": null,
    "codemix_ratio": 0,
    "switch_points": 0,
    "pct_intelligible_utterances": 11.11,
    "unintelligible_words": 11
  },
  "short": {
    "setSize": 5,
    "ntw": 24,
    "mlu_w": 4.8,
    "ndw": 19,
    "ttr": 0.792,
    "mtld": 32.3,
    "codemix_ratio": 0,
    "switch_points": 0,
    "pct_intelligible_utterances": 100,
    "unintelligible_words": 0
  }
};

function measures(id: string) {
  const f = getFixture(id)!;
  const { sample } = parseSaltText(f.text, { language: f.language as never });
  const r = analyseSample(sample);
  const out: Record<string, number | null> = { setSize: r.analysisSetSize };
  for (const g of r.groups) for (const m of g.measures) out[m.key] = m.value;
  return { out, sample };
}

describe("fixture regression snapshot", () => {
  it("covers all 9 built-in fixtures", () => {
    expect(FIXTURES.map((f) => f.id).sort()).toEqual(Object.keys(EXPECTED).sort());
    expect(FIXTURES.length).toBe(9);
  });

  it.each(Object.keys(EXPECTED))("%s key metrics are unchanged", (id) => {
    const { out } = measures(id);
    for (const [key, want] of Object.entries(EXPECTED[id])) {
      if (want === null) expect(out[key], key).toBeNull();
      else expect(out[key], key).toBeCloseTo(want, 2);
    }
  });
});

describe("whitespace-separated language tags are annotations, not words", () => {
  it("attaches '/en' to the preceding word", () => {
    const p = parseUtteranceText("आज हमारा science /en का test /en था।", getPack("hi-IN"));
    expect(p.tokens.map((t) => t.surface)).toEqual(["आज", "हमारा", "science", "का", "test", "था।"]);
    const science = p.tokens[2];
    expect(science.langTag).toBe("en");
    expect(science.lang).toBe("en-IN");
    expect(p.tokens.some((t) => t.surface.startsWith("/"))).toBe(false);
  });

  it("Hindi–English sample: MTLD 112.0 (was 45.6 when tags counted), NTW 60, MLU 5.45", () => {
    const { out } = measures("bilingual");
    expect(out.mtld).toBeCloseTo(112.0, 1);
    expect(out.ntw).toBe(60);
    expect(out.mlu_w).toBeCloseTo(5.45, 2);
    expect(out.codemix_ratio).toBeCloseTo(28.33, 2);
  });
});

describe("C&I analysis set follows SALT", () => {
  it("excludes utterances with any unintelligible segment (low-intel sample → 1)", () => {
    const { out, sample } = measures("unintelligible");
    expect(out.setSize).toBe(1);
    expect(analysisSet(sample).map((u) => u.text.trim())).toEqual(["It is a big one."]);
  });

  it("still offers the looser partial-inclusive set on request (→ 7)", () => {
    const { sample } = measures("unintelligible");
    expect(analysisSet(sample, { includePartial: true }).length).toBe(7);
  });
});
