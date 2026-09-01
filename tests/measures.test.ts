import { describe, expect, it } from "vitest";
import { hdd, mattr, mlu, mtld, ndw, ndwFirstN, percent, ratio, sdUtteranceLength, ttr } from "@/core/measures";

/**
 * Golden tests for the pure measure math. Every expected value here is
 * hand-computable from the input, so a regression is unambiguous.
 */

describe("ttr", () => {
  it("is 1 when every word is unique", () => {
    expect(ttr(["a", "b", "c"])).toBe(1);
  });

  it("counts repeated words once in the numerator", () => {
    // 2 types / 4 tokens
    expect(ttr(["a", "a", "b", "b"])).toBe(0.5);
  });

  it("returns null rather than NaN on an empty sample", () => {
    expect(ttr([])).toBeNull();
  });
});

describe("ndw and ndwFirstN", () => {
  it("counts distinct words", () => {
    expect(ndw(["dog", "cat", "dog"])).toBe(2);
  });

  it("returns null when the sample is shorter than the window", () => {
    // Reporting a smaller number here would read as poorer diversity when the
    // real situation is an unusably short sample.
    expect(ndwFirstN(["a", "b"], 50)).toBeNull();
  });

  it("uses only the first N words when long enough", () => {
    const words = [...Array(50).fill("same"), "unique"];
    expect(ndwFirstN(words, 50)).toBe(1);
  });
});

describe("mattr", () => {
  it("returns null when shorter than one window", () => {
    expect(mattr(["a", "b"], 50)).toBeNull();
  });

  it("is 1 for an all-unique sequence", () => {
    const words = Array.from({ length: 60 }, (_, i) => `w${i}`);
    expect(mattr(words, 50)).toBeCloseTo(1, 10);
  });

  it("is 1/window for a single repeated word", () => {
    const words = Array(60).fill("same");
    expect(mattr(words, 50)).toBeCloseTo(0.02, 10);
  });
});

describe("mtld", () => {
  it("returns null for samples too short to be meaningful", () => {
    expect(mtld(["a", "b", "c"])).toBeNull();
  });

  it("is high for fully diverse text", () => {
    const words = Array.from({ length: 100 }, (_, i) => `w${i}`);
    // TTR never falls to 0.72, so no full factor completes and MTLD is large.
    const value = mtld(words)!;
    expect(value).toBeGreaterThanOrEqual(100);
  });

  it("is low for a single repeated word", () => {
    const words = Array(100).fill("same");
    // TTR crosses the threshold almost immediately and keeps resetting.
    const value = mtld(words)!;
    expect(value).toBeLessThan(5);
  });

  it("orders diverse text above repetitive text", () => {
    const diverse = Array.from({ length: 200 }, (_, i) => `w${i % 100}`);
    const repetitive = Array.from({ length: 200 }, (_, i) => `w${i % 5}`);
    expect(mtld(diverse)!).toBeGreaterThan(mtld(repetitive)!);
  });

  it("is symmetric under the forward/reverse average", () => {
    const words = "the cat sat on the mat and the dog ran to the park with a ball".split(" ");
    const forwardThenReverse = mtld(words);
    const reversed = mtld([...words].reverse());
    expect(forwardThenReverse).toBeCloseTo(reversed!, 10);
  });
});

describe("hdd", () => {
  it("returns null when the sample is smaller than the draw", () => {
    expect(hdd(Array(10).fill("a"), 42)).toBeNull();
  });

  it("approaches 1 when every token is a distinct type", () => {
    const words = Array.from({ length: 100 }, (_, i) => `w${i}`);
    // Every one of the 42 drawn tokens is a new type, so the index is ~1.
    expect(hdd(words, 42)!).toBeGreaterThan(0.95);
  });

  it("is near 1/42 when the text is one repeated word", () => {
    const words = Array(100).fill("same");
    expect(hdd(words, 42)!).toBeCloseTo(1 / 42, 6);
  });

  it("is deterministic across repeated runs", () => {
    const words = "a b c d e f g h i j".repeat(10).trim().split(/\s+/);
    expect(hdd(words)).toBe(hdd(words));
  });
});

describe("mlu and sdUtteranceLength", () => {
  it("averages utterance lengths", () => {
    expect(mlu([2, 4, 6])).toBe(4);
  });

  it("returns null on an empty analysis set", () => {
    expect(mlu([])).toBeNull();
  });

  it("uses the sample standard deviation (n-1)", () => {
    // mean 4; deviations -2,0,2; sum sq 8; /2 = 4; sqrt = 2
    expect(sdUtteranceLength([2, 4, 6])).toBeCloseTo(2, 10);
  });

  it("returns null for a single utterance", () => {
    expect(sdUtteranceLength([5])).toBeNull();
  });
});

describe("ratio and percent", () => {
  it("returns null instead of Infinity when the denominator is zero", () => {
    expect(ratio(5, 0)).toBeNull();
    expect(percent(5, 0)).toBeNull();
  });

  it("computes percentages", () => {
    expect(percent(1, 4)).toBe(25);
  });
});
