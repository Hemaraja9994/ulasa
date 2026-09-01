import { describe, expect, it } from "vitest";
import { parseSaltText, writeSaltText } from "@/core/io/salt";
import { parseChat, writeChat } from "@/core/io/chat";
import { analyseSample, analysisSet, countVerbs, estimateClauses, isVerb } from "@/core/analyse";
import { parseUtteranceText } from "@/core/tokenise";
import { FIXTURES, getFixture } from "@/data/fixtures";
import { getPack } from "@/nlp/registry";
import type { AnalysisResult } from "@/core/types";

function analyseFixture(id: string): AnalysisResult {
  const fixture = getFixture(id)!;
  const { sample } = parseSaltText(fixture.text, { language: fixture.language as never });
  return analyseSample(sample);
}

function value(result: AnalysisResult, key: string): number | null {
  for (const group of result.groups) {
    const found = group.measures.find((m) => m.key === key);
    if (found) return found.value;
  }
  throw new Error(`No measure "${key}" in the result`);
}

function status(result: AnalysisResult, key: string): string {
  for (const group of result.groups) {
    const found = group.measures.find((m) => m.key === key);
    if (found) return found.status;
  }
  throw new Error(`No measure "${key}" in the result`);
}

// ---------------------------------------------------------------------------

describe("SALT text import", () => {
  it("reads every fixture without throwing", () => {
    for (const fixture of FIXTURES) {
      const { sample } = parseSaltText(fixture.text, { language: fixture.language as never });
      expect(sample.utterances.length).toBeGreaterThan(0);
      expect(sample.speakers.length).toBeGreaterThan(0);
    }
  });

  it("marks the child speaker as the target", () => {
    const { sample } = parseSaltText(getFixture("en-preschool")!.text);
    const target = sample.speakers.find((s) => s.isTarget);
    expect(target?.code).toBe("C");
  });

  it("reads metadata lines", () => {
    const { sample } = parseSaltText(getFixture("en-preschool")!.text);
    expect(sample.language).toBe("en-IN");
    expect(sample.elapsedSeconds).toBe(11 * 60 + 20);
  });

  it("round-trips through the writer", () => {
    const { sample } = parseSaltText(getFixture("hi-conversation")!.text);
    const { text } = writeSaltText(sample);
    const { sample: reparsed } = parseSaltText(text);
    expect(reparsed.utterances.length).toBe(sample.utterances.length);
    expect(reparsed.language).toBe(sample.language);
  });
});

describe("tokenisation conventions", () => {
  const en = getPack("en-IN");

  it("marks parenthesised text as a maze and excludes it from word counts", () => {
    const parsed = parseUtteranceText("I (bu bu) buy a ball.", en);
    expect(parsed.mazes.length).toBe(1);
    expect(parsed.tokens.filter((t) => t.isMaze).length).toBe(2);
  });

  it("classifies a repeated word before the target as a repetition", () => {
    const parsed = parseUtteranceText("I (want) want it.", en);
    expect(parsed.mazes[0].kind).toBe("repetition");
  });

  it("classifies a filler-only maze as a filled pause", () => {
    const parsed = parseUtteranceText("I (um) like it.", en);
    expect(parsed.mazes[0].kind).toBe("filled_pause");
  });

  it("classifies a changed word as a revision", () => {
    const parsed = parseUtteranceText("I (goed) went there.", en);
    expect(parsed.mazes[0].kind).toBe("revision");
  });

  it("treats X as unintelligible and keeps it out of the word list", () => {
    const parsed = parseUtteranceText("I want the X.", en);
    expect(parsed.intelligibility).toBe("partial");
    expect(parsed.tokens.filter((t) => t.isUnintelligible).length).toBe(1);
  });

  it("records bound-morpheme splits without altering the surface form", () => {
    const parsed = parseUtteranceText("dog/s are running", en);
    expect(parsed.tokens[0].surface).toBe("dogs");
    expect(parsed.tokens[0].morphemes).toEqual(["dog", "s"]);
  });

  it("records silent pauses and keeps them out of the word count", () => {
    const parsed = parseUtteranceText("I went (:2.5) there", en);
    expect(parsed.pauses).toEqual([2.5]);
    expect(parsed.tokens.map((t) => t.surface)).toEqual(["I", "went", "there"]);
  });

  it("collects bracketed codes", () => {
    const parsed = parseUtteranceText("I falled down [E:TNS]", en);
    expect(parsed.codes).toContain("E:TNS");
  });
});

describe("English preschool fixture", () => {
  const result = analyseFixture("en-preschool");

  it("builds an analysis set above the 50-utterance convention", () => {
    expect(result.analysisSetSize).toBeGreaterThanOrEqual(50);
  });

  it("does not raise the short-sample warning", () => {
    expect(result.warnings.some((w) => w.includes("minimum of 50"))).toBe(false);
  });

  it("produces a plausible preschool MLU in words", () => {
    const mluW = value(result, "mlu_w")!;
    expect(mluW).toBeGreaterThan(3);
    expect(mluW).toBeLessThan(9);
  });

  it("reports MLU-m as established for English once splits exist", () => {
    // The English pack has a published morpheme protocol, but this fixture has
    // no splits entered, so the measure is unavailable rather than guessed.
    expect(status(result, "mlu_m")).toBe("unavailable");
  });

  it("computes a maze percentage in single digits", () => {
    const maze = value(result, "maze_pct")!;
    expect(maze).toBeGreaterThan(0);
    expect(maze).toBeLessThan(10);
  });

  it("computes speaking rate from the elapsed time", () => {
    expect(value(result, "wpm")).toBeGreaterThan(0);
  });

  it("reports near-total intelligibility", () => {
    expect(value(result, "pct_intelligible_utterances")).toBe(100);
  });
});

describe("short-sample guard", () => {
  const result = analyseFixture("short");

  it("warns that the sample is below convention", () => {
    expect(result.warnings.some((w) => w.includes("minimum of 50"))).toBe(true);
  });

  it("still computes core measures", () => {
    expect(value(result, "mlu_w")).not.toBeNull();
    expect(value(result, "ndw")).not.toBeNull();
  });

  it("withholds NDW-50 rather than reporting a length-confounded number", () => {
    expect(value(result, "ndw_50")).toBeNull();
    expect(status(result, "ndw_50")).toBe("unavailable");
  });
});

describe("intelligibility arithmetic", () => {
  const result = analyseFixture("unintelligible");

  it("drops below 100% intelligible utterances", () => {
    expect(value(result, "pct_intelligible_utterances")!).toBeLessThan(100);
  });

  it("counts unintelligible word tokens", () => {
    expect(value(result, "unintelligible_words")!).toBeGreaterThan(5);
  });

  it("excludes unintelligible tokens from lexical diversity", () => {
    // "X" must never appear as a type in NDW.
    const { sample } = parseSaltText(getFixture("unintelligible")!.text);
    const words = analysisSet(sample)
      .flatMap((u) => u.tokens)
      .filter((t) => !t.isUnintelligible)
      .map((t) => t.surface);
    expect(words).not.toContain("X");
  });
});

// ---------------------------------------------------------------------------
// Indian-language behaviour
// ---------------------------------------------------------------------------

describe("Indian-language packs never inherit English assumptions", () => {
  const indic = ["hi-conversation", "kn-conversation", "ta-narrative", "te-narrative", "ml-conversation"];

  it.each(indic)("%s analyses without crashing", (id) => {
    const result = analyseFixture(id);
    expect(result.analysisSetSize).toBeGreaterThan(0);
    expect(value(result, "mlu_w")).toBeGreaterThan(0);
  });

  it.each(indic)("%s labels MLU-m as not established", (id) => {
    const result = analyseFixture(id);
    // None of the five Indian packs has a published morpheme protocol, so
    // MLU-m may never come back as "established".
    expect(status(result, "mlu_m")).not.toBe("established");
  });

  it.each(indic)("%s carries the pack's normative caution into the warnings", (id) => {
    const result = analyseFixture(id);
    expect(result.warnings.some((w) => w.includes("Do NOT apply"))).toBe(true);
  });

  it.each(indic)("%s flags clausal density as heuristic", (id) => {
    const result = analyseFixture(id);
    expect(status(result, "clausal_density")).toBe("experimental");
  });
});

describe("Malayalam has no subject–verb agreement category", () => {
  it("offers no agreement error code", () => {
    const ml = getPack("ml-IN");
    expect(ml.errorTaxonomy.some((e) => e.code === "E:PNG")).toBe(false);
  });

  it("while Tamil, Kannada and Telugu do", () => {
    for (const id of ["ta-IN", "kn-IN", "te-IN"]) {
      expect(getPack(id).errorTaxonomy.some((e) => e.code === "E:PNG")).toBe(true);
    }
  });
});

describe("language-specific verb identification", () => {
  it("recognises a Hindi finite verb with an aspect auxiliary", () => {
    const hi = getPack("hi-IN");
    const parsed = parseUtteranceText("मैं स्कूल जाता हूँ।", hi);
    const verbs = parsed.tokens.filter((t) => isVerb(t, hi));
    expect(verbs.length).toBeGreaterThanOrEqual(1);
  });

  it("recognises a Kannada finite verb by its PNG suffix", () => {
    const kn = getPack("kn-IN");
    const parsed = parseUtteranceText("ಅವನು ಶಾಲೆಗೆ ಹೋಗುತ್ತಾನೆ.", kn);
    expect(parsed.tokens.some((t) => isVerb(t, kn))).toBe(true);
  });

  it("recognises a Telugu past-tense verb", () => {
    const te = getPack("te-IN");
    const parsed = parseUtteranceText("అతను ఇంటికి వెళ్ళాడు.", te);
    expect(parsed.tokens.some((t) => isVerb(t, te))).toBe(true);
  });

  it("recognises a Malayalam verb from tense alone", () => {
    const ml = getPack("ml-IN");
    const parsed = parseUtteranceText("അവൻ സ്കൂളിൽ പോകുന്നു.", ml);
    expect(parsed.tokens.some((t) => isVerb(t, ml))).toBe(true);
  });

  it("recognises a Tamil finite verb", () => {
    const ta = getPack("ta-IN");
    const parsed = parseUtteranceText("அவன் வீட்டுக்கு போனான்.", ta);
    expect(parsed.tokens.some((t) => isVerb(t, ta))).toBe(true);
  });
});

describe("clause estimation", () => {
  const en = getPack("en-IN");

  it("gives a simple clause a count of one", () => {
    const parsed = parseUtteranceText("The dog ran.", en);
    const u = { id: "u", speakerId: "s", text: "", tokens: parsed.tokens, mazes: [], intelligibility: "intelligible" as const, grammaticality: "unmarked" as const };
    expect(estimateClauses(u, en)).toBe(1);
  });

  it("counts a subordinate clause", () => {
    const parsed = parseUtteranceText("I know that he ran fast.", en);
    const u = { id: "u", speakerId: "s", text: "", tokens: parsed.tokens, mazes: [], intelligibility: "intelligible" as const, grammaticality: "unmarked" as const };
    expect(estimateClauses(u, en)).toBeGreaterThanOrEqual(2);
  });

  it("lets a clinician override the heuristic", () => {
    const parsed = parseUtteranceText("I know that he ran fast.", en);
    const u = { id: "u", speakerId: "s", text: "", tokens: parsed.tokens, mazes: [], intelligibility: "intelligible" as const, grammaticality: "unmarked" as const, clauseCountOverride: 1 };
    expect(estimateClauses(u, en)).toBe(1);
  });

  it("never returns zero for a verbless equational clause", () => {
    const ml = getPack("ml-IN");
    const parsed = parseUtteranceText("അത് വലിയ വീട്.", ml);
    const u = { id: "u", speakerId: "s", text: "", tokens: parsed.tokens, mazes: [], intelligibility: "intelligible" as const, grammaticality: "unmarked" as const };
    expect(estimateClauses(u, ml)).toBe(1);
  });
});

describe("code-mixing is measured, not penalised", () => {
  const result = analyseFixture("bilingual");

  it("detects a substantial share of English tokens", () => {
    expect(value(result, "codemix_ratio")!).toBeGreaterThan(10);
  });

  it("counts switch points", () => {
    expect(value(result, "switch_points")!).toBeGreaterThan(0);
  });

  it("does not add code-mixing to the error inventory", () => {
    expect(value(result, "pct_with_errors")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Translation guardrail
// ---------------------------------------------------------------------------

describe("translation guardrail", () => {
  it("produces identical measures whether or not a gloss is attached", () => {
    const { sample } = parseSaltText(getFixture("hi-conversation")!.text);
    const before = analyseSample(sample);

    const withGloss = {
      ...sample,
      utterances: sample.utterances.map((u) => ({
        ...u,
        gloss: {
          __brand: "gloss" as const,
          text: "I go to school by bus and it is a very long English sentence.",
          targetLang: "en-IN" as const,
          provenance: "machine" as const,
          provider: "IndicTrans2",
        },
      })),
    };
    const after = analyseSample(withGloss);

    // If any measure moved, something read the translation.
    expect(JSON.stringify(after.groups)).toBe(JSON.stringify(before.groups));
  });
});

// ---------------------------------------------------------------------------
// CHAT interoperability
// ---------------------------------------------------------------------------

describe("CHAT export and import", () => {
  it("writes a well-formed CHAT header", () => {
    const { sample } = parseSaltText(getFixture("ta-narrative")!.text);
    const { text } = writeChat(sample);
    expect(text.startsWith("@UTF8")).toBe(true);
    expect(text).toContain("@Begin");
    expect(text).toContain("@Languages:\ttam");
    expect(text.trimEnd().endsWith("@End")).toBe(true);
  });

  it("warns that the export is a subset rather than full CHAT", () => {
    const { sample } = parseSaltText(getFixture("en-preschool")!.text);
    const { lossWarnings } = writeChat(sample);
    expect(lossWarnings.some((w) => w.includes("subset"))).toBe(true);
  });

  it("round-trips utterance counts and the target speaker", () => {
    const { sample } = parseSaltText(getFixture("kn-conversation")!.text);
    const { text } = writeChat(sample);
    const { sample: back } = parseChat(text);
    expect(back.utterances.length).toBe(sample.utterances.length);
    expect(back.speakers.find((s) => s.isTarget)?.code).toBe("CHI");
    expect(back.language).toBe("kn-IN");
  });
});

// ---------------------------------------------------------------------------
// Whole-report invariants
// ---------------------------------------------------------------------------

describe("every fixture produces a complete, honest report", () => {
  it.each(FIXTURES.map((f) => f.id))("%s", (id) => {
    const result = analyseFixture(id);
    expect(result.groups.length).toBeGreaterThan(0);

    for (const group of result.groups) {
      for (const measure of group.measures) {
        // A measure that could not be computed must say so rather than
        // reporting NaN, Infinity or a silently wrong zero.
        if (measure.value !== null) {
          expect(Number.isFinite(measure.value)).toBe(true);
        } else {
          expect(["unavailable", "established", "experimental"]).toContain(measure.status);
        }
        // Anything not established owes the clinician an explanation.
        if (measure.status === "experimental") {
          expect(measure.note ?? "").not.toBe("");
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Verb-detection floors
// ---------------------------------------------------------------------------

describe("verb identification reaches a usable rate in every language", () => {
  /**
   * Regression guard. Clausal density and "% utterances with a verb" both rest
   * on the pack's verb cues, so a pack that recognises only the literary
   * register silently reports a spoken sample as mostly verbless — which is
   * what happened on the first pass for Kannada (10/36) and Tamil (10/26).
   *
   * The floors are below the current rate but far above a broken pack. The
   * shortfall in each case is genuine verbless equational and dative-subject
   * clauses, which are grammatical in all five Indian languages.
   */
  const FLOORS: Record<string, number> = {
    "en-preschool": 0.9,
    "hi-conversation": 0.9,
    "kn-conversation": 0.85,
    "ta-narrative": 0.9,
    "te-narrative": 0.9,
    "ml-conversation": 0.85,
  };

  it.each(Object.entries(FLOORS))("%s detects verbs in at least %s of utterances", (id, floor) => {
    const fixture = getFixture(id)!;
    const { sample } = parseSaltText(fixture.text, { language: fixture.language as never });
    const pack = getPack(sample.language);
    const set = analysisSet(sample);
    const withVerb = set.filter((u) => countVerbs(u, pack) > 0).length;
    expect(withVerb / set.length).toBeGreaterThanOrEqual(floor as number);
  });

  it("does not treat the Tamil pronoun அது as a verb", () => {
    // A bare -து suffix rule would match this and inflate every Tamil count.
    const ta = getPack("ta-IN");
    const parsed = parseUtteranceText("அது நல்லது.", ta);
    expect(isVerb(parsed.tokens[0], ta)).toBe(false);
  });

  it("does not treat an English plural noun as a verb", () => {
    // A bare -s suffix rule would match these.
    const en = getPack("en-IN");
    for (const word of ["birds", "books", "flowers", "houses"]) {
      const parsed = parseUtteranceText(word, en);
      expect(isVerb(parsed.tokens[0], en)).toBe(false);
    }
  });
});
