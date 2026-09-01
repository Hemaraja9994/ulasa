import { describe, expect, it } from "vitest";
import { parseSaltText } from "@/core/io/salt";
import { analyseSample } from "@/core/analyse";
import { draftPerformanceReport, pickExemplars } from "@/reports/interpret";
import { FIXTURES, getFixture } from "@/data/fixtures";

describe("performance report drafting", () => {
  it.each(FIXTURES.map((f) => f.id))("drafts a report for %s without throwing", (id) => {
    const fixture = getFixture(id)!;
    const { sample } = parseSaltText(fixture.text, { language: fixture.language as never });
    const analysis = analyseSample(sample);
    const text = draftPerformanceReport(sample, analysis, null);
    expect(text.length).toBeGreaterThan(200);
    expect(text).not.toContain("undefined");
    expect(text).not.toContain("NaN");
  });

  it("picks exemplars in the original script", () => {
    const { sample } = parseSaltText(getFixture("kn-conversation")!.text, { language: "kn-IN" });
    const ex = pickExemplars(sample);
    expect(ex.length).toBeGreaterThan(0);
    expect(ex[0].text).toMatch(/[ಀ-೿]/); // Kannada block
  });

  it("carries the pack's normative caution into the prose", () => {
    const { sample } = parseSaltText(getFixture("ml-conversation")!.text, { language: "ml-IN" });
    const text = draftPerformanceReport(sample, analyseSample(sample), null);
    expect(text).toContain("Do NOT apply");
  });
});
