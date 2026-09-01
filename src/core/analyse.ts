import type {
  AnalysisResult,
  MeasureGroup,
  MeasureValue,
  Sample,
  Token,
  Utterance,
} from "./types";
import { countableWords } from "./tokenise";
import type { LanguagePack } from "@/nlp/pack";
import { normaliseToken } from "@/nlp/pack";
import { getPack } from "@/nlp/registry";
import {
  hdd,
  mattr,
  mlu,
  mtld,
  ndw,
  ndwFirstN,
  percent,
  ratio,
  round,
  sdUtteranceLength,
  ttr,
} from "./measures";

/**
 * Composes the pure measures in measures.ts into a clinical Standard Measures
 * report, applying the active language pack's rules.
 *
 * Two invariants hold throughout:
 *
 *  1. A measure that the language pack cannot support honestly is emitted with
 *     status "experimental" or "unavailable" and a note — never silently
 *     computed with English assumptions.
 *  2. Nothing in this file ever reads `utterance.gloss`. Machine translation is
 *     for the examiner's comprehension, not for scoring. The `GlossedText`
 *     brand in types.ts makes that a compile-time guarantee, not a convention.
 */

const MIN_ANALYSIS_SET = 50; // SALT / SUGAR convention for a stable sample

// ---------------------------------------------------------------------------
// Language-aware token predicates
// ---------------------------------------------------------------------------

export function isVerb(token: Token, pack: LanguagePack): boolean {
  const w = normaliseToken(token.surface).toLowerCase();
  if (!w) return false;
  if (pack.verbMarkers.some((v) => v.toLowerCase() === w)) return true;
  return pack.verbSuffixes.some((re) => re.test(w));
}

export function isFunctionWord(token: Token, pack: LanguagePack): boolean {
  const w = normaliseToken(token.surface).toLowerCase();
  return pack.functionWords.some((f) => f.toLowerCase() === w);
}

export function countVerbs(utterance: Utterance, pack: LanguagePack): number {
  return utterance.tokens.filter(
    (t) => !t.isMaze && !t.isUnintelligible && !t.isOmission && isVerb(t, pack),
  ).length;
}

/**
 * Clause count for one C-unit.
 *
 * Heuristic, and labelled as such wherever it surfaces. A clause is anchored by
 * a predicate, so the count starts from the number of verb-like tokens; an
 * overt subordinator that has no verb of its own (common in the Dravidian
 * languages, where a participial clause may be a single inflected word) adds
 * one. The result is floored at 1 because a verbless equational clause
 * (grammatical in Tamil, Kannada, Telugu, Malayalam and Hindi) is still a
 * clause.
 *
 * A clinician can override any utterance's clause count in the Studio, and the
 * override always wins.
 */
export function estimateClauses(utterance: Utterance, pack: LanguagePack): number {
  if (typeof utterance.clauseCountOverride === "number") {
    return Math.max(0, utterance.clauseCountOverride);
  }

  const verbs = countVerbs(utterance, pack);
  const markers = utterance.tokens.filter((t) => {
    if (t.isMaze || t.isUnintelligible) return false;
    const w = normaliseToken(t.surface).toLowerCase();
    return pack.clauseMarkers.some((m) => m.toLowerCase() === w);
  }).length;

  // Subordinators beyond the verbs they head do not each add a clause; take the
  // larger of "one clause per verb" and "one matrix plus one per subordinator".
  return Math.max(1, verbs, markers > 0 ? markers + 1 : 1);
}

// ---------------------------------------------------------------------------
// Analysis-set selection
// ---------------------------------------------------------------------------

/**
 * The complete-and-intelligible verbal analysis set, following SALT's C&I
 * convention: the target speaker's verbal utterances that are neither
 * abandoned/interrupted nor unintelligible.
 */
export function analysisSet(sample: Sample): Utterance[] {
  const target = sample.speakers.find((s) => s.isTarget);
  if (!target) return [];
  return sample.utterances.filter(
    (u) =>
      u.speakerId === target.id &&
      !u.isAbandoned &&
      !u.isNonVerbal &&
      u.intelligibility !== "unintelligible" &&
      countableWords(u.tokens).length > 0,
  );
}

export function targetUtterances(sample: Sample): Utterance[] {
  const target = sample.speakers.find((s) => s.isTarget);
  if (!target) return [];
  return sample.utterances.filter((u) => u.speakerId === target.id);
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function analyseSample(sample: Sample): AnalysisResult {
  const pack = getPack(sample.language);
  const warnings: string[] = [];

  const all = targetUtterances(sample);
  const set = analysisSet(sample);

  if (set.length === 0) {
    return {
      sampleId: sample.id,
      language: sample.language,
      analysisSet: "complete_intelligible_verbal",
      analysisSetSize: 0,
      groups: [],
      warnings: [
        "No complete, intelligible, verbal utterances from the target speaker. Check that one speaker is marked as the target and that the transcript is not empty.",
      ],
      computedAt: new Date().toISOString(),
    };
  }

  if (set.length < MIN_ANALYSIS_SET) {
    warnings.push(
      `The analysis set contains ${set.length} utterances. Convention (SALT, SUGAR) is a minimum of ${MIN_ANALYSIS_SET} complete and intelligible utterances. Treat every measure below as provisional and do not compare this sample to any reference set.`,
    );
  }

  if (sample.language === "mixed" || sample.language === "und") {
    warnings.push(
      "No single language pack applies to this sample, so English's universal machinery was used for word-level counts. Verb, clause and error measures are unreliable — set a primary language, or analyse each language separately.",
    );
  }

  warnings.push(pack.normativeNotes);

  // --- word inventories -----------------------------------------------------
  const wordsPerUtterance = set.map((u) => countableWords(u.tokens).length);
  const allWords = set.flatMap((u) => countableWords(u.tokens));
  const lowerWords = allWords.map((w) => w.toLowerCase());
  const wordsWithMazes = set.flatMap((u) => countableWords(u.tokens, true));

  // --- maze inventory -------------------------------------------------------
  const mazeTokens = set.flatMap((u) =>
    u.tokens.filter((t) => t.isMaze && !t.isUnintelligible),
  );
  const mazeSpans = set.flatMap((u) => u.mazes);
  const mazeKinds = {
    repetition: mazeSpans.filter((m) => m.kind === "repetition").length,
    revision: mazeSpans.filter((m) => m.kind === "revision").length,
    filled_pause: mazeSpans.filter((m) => m.kind === "filled_pause").length,
    false_start: mazeSpans.filter((m) => m.kind === "false_start").length,
  };

  // --- intelligibility (computed over ALL target utterances, not the set) ---
  const allTargetTokens = all.flatMap((u) => u.tokens);
  const intelligibleUtterances = all.filter((u) => u.intelligibility === "intelligible").length;
  const unintelligibleWords = allTargetTokens.filter((t) => t.isUnintelligible).length;
  const totalWordSlots = allTargetTokens.filter((t) => !t.isOmission).length;

  // --- syntax ---------------------------------------------------------------
  const verbCounts = set.map((u) => countVerbs(u, pack));
  const clauseCounts = set.map((u) => estimateClauses(u, pack));
  const totalClauses = clauseCounts.reduce((a, b) => a + b, 0);
  const utterancesWithVerbs = verbCounts.filter((v) => v > 0).length;

  // --- morphemes ------------------------------------------------------------
  const morphemeCounts = set.map((u) =>
    u.tokens
      .filter((t) => !t.isMaze && !t.isUnintelligible && !t.isOmission)
      .reduce((acc, t) => acc + (t.morphemes?.length ?? 1), 0),
  );
  const hasAnySplit = set.some((u) => u.tokens.some((t) => (t.morphemes?.length ?? 0) > 1));

  // --- grammaticality -------------------------------------------------------
  const marked = set.filter((u) => u.grammaticality !== "unmarked");
  const grammatical = set.filter((u) => u.grammaticality === "grammatical").length;

  // --- errors ---------------------------------------------------------------
  const errorCodes = new Map<string, number>();
  for (const u of set) {
    for (const code of u.codes ?? []) {
      if (code.startsWith("E")) errorCodes.set(code, (errorCodes.get(code) ?? 0) + 1);
    }
    for (const t of u.tokens) {
      for (const code of t.errorCodes ?? []) {
        errorCodes.set(code, (errorCodes.get(code) ?? 0) + 1);
      }
    }
  }
  const utterancesWithErrors = set.filter(
    (u) =>
      (u.codes ?? []).some((c) => c.startsWith("E")) ||
      u.tokens.some((t) => (t.errorCodes?.length ?? 0) > 0) ||
      u.tokens.some((t) => t.isOmission),
  ).length;

  // --- code-mixing ----------------------------------------------------------
  const langTagged = set.flatMap((u) =>
    u.tokens
      .filter((t) => !t.isMaze && !t.isUnintelligible && !t.isOmission && t.lang)
      .map((t) => t.lang!),
  );
  const matrixLang = pack.id;
  const otherLangTokens = langTagged.filter((l) => l !== matrixLang).length;
  const switchPoints = countSwitchPoints(set, matrixLang);

  // --- discourse ------------------------------------------------------------
  const examinerQuestions = sample.utterances.filter(
    (u) =>
      !sample.speakers.find((s) => s.id === u.speakerId)?.isTarget &&
      /[?？]\s*$/.test(u.text.trim()),
  ).length;
  const responses = countResponsesToQuestions(sample);

  // --- rate -----------------------------------------------------------------
  const minutes = sample.elapsedSeconds ? sample.elapsedSeconds / 60 : null;
  if (!sample.elapsedSeconds) {
    warnings.push(
      "No elapsed time was recorded for this sample, so speaking rate (words and utterances per minute) cannot be computed. Enter the sample duration in the Studio to enable rate measures.",
    );
  }

  const pauses = set.flatMap((u) => u.pauses ?? []);

  // --- assemble -------------------------------------------------------------
  const groups: MeasureGroup[] = [
    {
      id: "length",
      label: "Transcript length",
      measures: [
        m("total_utterances", "Total utterances (target speaker)", all.length, "utterances"),
        m("analysis_set", "Complete & intelligible verbal utterances", set.length, "utterances"),
        m("ntw", "Total words (mazes excluded)", allWords.length, "words"),
        m("ntw_with_mazes", "Total words including mazes", wordsWithMazes.length, "words"),
        m(
          "elapsed",
          "Elapsed time",
          sample.elapsedSeconds ? round(sample.elapsedSeconds / 60, 1) : null,
          "minutes",
          sample.elapsedSeconds ? "established" : "unavailable",
        ),
      ],
    },
    {
      id: "intelligibility",
      label: "Intelligibility",
      measures: [
        m(
          "pct_intelligible_utterances",
          "Intelligible utterances",
          round(percent(intelligibleUtterances, all.length)),
          "%",
        ),
        m(
          "pct_intelligible_words",
          "Intelligible words",
          round(percent(totalWordSlots - unintelligibleWords, totalWordSlots)),
          "%",
        ),
        m("unintelligible_words", "Unintelligible word tokens", unintelligibleWords, "tokens"),
      ],
    },
    {
      id: "syntax",
      label: "Syntax & morphology",
      measures: [
        m("mlu_w", "MLU in words", round(mlu(wordsPerUtterance)), "words/utterance"),
        m(
          "sd_utterance_length",
          "SD of utterance length",
          round(sdUtteranceLength(wordsPerUtterance)),
          "words",
        ),
        mluMorphemes(pack, morphemeCounts, hasAnySplit),
        m(
          "mean_verbs",
          "Mean verbs per utterance",
          round(mlu(verbCounts)),
          "verbs/utterance",
          pack.id === "en-IN" ? "established" : "experimental",
          pack.id === "en-IN"
            ? undefined
            : `Verb identification for ${pack.name} uses the pack's marker list and suffix cues, not a morphological analyser.`,
        ),
        m(
          "pct_with_verbs",
          "Utterances containing a verb",
          round(percent(utterancesWithVerbs, set.length)),
          "%",
          pack.id === "en-IN" ? "established" : "experimental",
          pack.id === "en-IN"
            ? undefined
            : `Depends on the same ${pack.name} verb cues as the measure above. A verbless equational clause is grammatical in ${pack.name}, so a figure below 100% is not in itself a finding.`,
        ),
        m(
          "clausal_density",
          "Clausal density (clauses per C-unit)",
          round(ratio(totalClauses, set.length)),
          "clauses/C-unit",
          "experimental",
          "Heuristic: predicate count plus overt subordinators, floored at one clause. Override any utterance's clause count in the Studio to correct it.",
        ),
        m(
          "wps",
          "Words per sentence (SUGAR WPS)",
          round(mlu(wordsPerUtterance)),
          "words",
          pack.id === "en-IN" ? "established" : "experimental",
          pack.id === "en-IN"
            ? undefined
            : `SUGAR's WPS was normed on English conversation for ages 3;0–7;11. The arithmetic is the same here, but no SUGAR norm applies to ${pack.name} — read this as a descriptive count, not a normed score.`,
        ),
        m(
          "pgu",
          "Grammatical utterances (PGU)",
          marked.length === 0 ? null : round(percent(grammatical, marked.length)),
          "%",
          marked.length === 0 ? "unavailable" : "established",
          marked.length === 0
            ? "No utterances have been marked grammatical or ungrammatical yet. Mark them in the Studio to enable PGU."
            : `Based on the ${marked.length} of ${set.length} utterances you have marked.`,
        ),
      ],
    },
    {
      id: "semantics",
      label: "Semantics & lexical diversity",
      measures: [
        m("ndw", "Number of Different Words (NDW)", ndw(lowerWords), "types"),
        m(
          "ndw_50",
          "NDW in the first 50 words",
          ndwFirstN(lowerWords, 50),
          "types",
          lowerWords.length >= 50 ? "established" : "unavailable",
          lowerWords.length >= 50 ? undefined : "Sample is shorter than 50 words.",
        ),
        m("ttr", "Type-Token Ratio (TTR)", round(ttr(lowerWords), 3), "ratio", "established",
          "TTR falls as samples lengthen. Compare only against samples of similar length, or use MTLD."),
        m("mattr", "Moving-average TTR (window 50)", round(mattr(lowerWords, 50), 3), "ratio"),
        m("mtld", "MTLD", round(mtld(lowerWords), 1), "index", "established",
          "Length-robust lexical diversity. Preferred over TTR for samples of 50 words or more."),
        m("hdd", "HD-D (vocd-D analogue)", round(hdd(lowerWords), 3), "index", "established",
          "Deterministic hypergeometric form of vocd-D, so repeated runs give identical values."),
        m(
          "content_ratio",
          "Content-word ratio",
          round(
            percent(
              set
                .flatMap((u) => u.tokens)
                .filter(
                  (t) =>
                    !t.isMaze && !t.isUnintelligible && !t.isOmission && !isFunctionWord(t, pack),
                ).length,
              allWords.length,
            ),
          ),
          "%",
          "experimental",
          `Uses the ${pack.name} closed-class list, which is hand-written rather than derived from a tagger.`,
        ),
      ],
    },
    {
      id: "fluency",
      label: "Verbal facility & fluency",
      measures: [
        m(
          "maze_pct",
          "Maze words as a share of all words",
          round(percent(mazeTokens.length, wordsWithMazes.length)),
          "%",
        ),
        m("mazes_per_utterance", "Mazes per utterance", round(ratio(mazeSpans.length, set.length)), "mazes/utterance"),
        m("maze_repetitions", "Repetitions", mazeKinds.repetition, "mazes"),
        m("maze_revisions", "Revisions", mazeKinds.revision, "mazes"),
        m("maze_filled_pauses", "Filled pauses", mazeKinds.filled_pause, "mazes"),
        m("maze_false_starts", "False starts", mazeKinds.false_start, "mazes"),
        m("abandoned", "Abandoned or interrupted utterances", all.filter((u) => u.isAbandoned).length, "utterances"),
        m("silent_pauses", "Silent pauses recorded", pauses.length, "pauses"),
        m(
          "mean_pause",
          "Mean silent pause",
          pauses.length ? round(pauses.reduce((a, b) => a + b, 0) / pauses.length, 1) : null,
          "seconds",
          pauses.length ? "established" : "unavailable",
        ),
        m(
          "wpm",
          "Words per minute",
          minutes ? round(ratio(wordsWithMazes.length, minutes)) : null,
          "wpm",
          minutes ? "established" : "unavailable",
        ),
        m(
          "upm",
          "Utterances per minute",
          minutes ? round(ratio(all.length, minutes)) : null,
          "upm",
          minutes ? "established" : "unavailable",
        ),
      ],
    },
    {
      id: "discourse",
      label: "Discourse",
      measures: [
        m("mean_turn_length", "Mean turn length", round(mlu(wordsPerUtterance)), "words"),
        m("examiner_questions", "Examiner questions", examinerQuestions, "questions"),
        m(
          "pct_responses",
          "Responses to examiner questions",
          examinerQuestions ? round(percent(responses, examinerQuestions)) : null,
          "%",
          examinerQuestions ? "established" : "unavailable",
        ),
      ],
    },
    {
      id: "errors",
      label: "Errors & omissions",
      measures: [
        m(
          "pct_with_errors",
          "Utterances with a coded error or omission",
          round(percent(utterancesWithErrors, set.length)),
          "%",
        ),
        m("omissions", "Omission markers", set.flatMap((u) => u.tokens).filter((t) => t.isOmission).length, "tokens"),
        ...[...errorCodes.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([code, count]) =>
            m(
              `error_${code}`,
              `${code} — ${pack.errorTaxonomy.find((e) => e.code === code)?.label ?? "clinician code"}`,
              count,
              "instances",
            ),
          ),
      ],
    },
    {
      id: "codemix",
      label: "Code-mixing",
      measures: [
        m("matrix_language", "Matrix language", null, pack.nativeName, "established",
          `Token-level language tagging is by script. Tokens in ${pack.script} script count as ${pack.name}.`),
        m(
          "codemix_ratio",
          "Tokens from another language",
          round(percent(otherLangTokens, allWords.length)),
          "%",
        ),
        m(
          "switch_points",
          "Switch points per 100 words",
          round(ratio(switchPoints * 100, allWords.length)),
          "per 100 words",
        ),
        m(
          "codemix_note",
          "Interpretation",
          null,
          undefined,
          "established",
          "Code-mixing is typical community practice across Indian languages and is not, by itself, a language disorder. Report it descriptively.",
        ),
      ],
    },
  ];

  return {
    sampleId: sample.id,
    language: sample.language,
    analysisSet: "complete_intelligible_verbal",
    analysisSetSize: set.length,
    groups,
    warnings,
    computedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function m(
  key: string,
  label: string,
  value: number | null,
  unit?: string,
  status: MeasureValue["status"] = "established",
  note?: string,
): MeasureValue {
  return { key, label, value, unit, status, note };
}

/**
 * MLU-m is emitted only when the pack's morpheme protocol allows it, and its
 * status always reflects that protocol. For the five Indian languages here the
 * protocol is "experimental", so the number appears with an explicit caution
 * rather than sitting next to MLU-w as if the two were equally well founded.
 */
function mluMorphemes(
  pack: LanguagePack,
  morphemeCounts: number[],
  hasAnySplit: boolean,
): MeasureValue {
  if (pack.morphemeProtocol === "surface-only") {
    return m("mlu_m", "MLU in morphemes", null, "morphemes/utterance", "unavailable",
      `${pack.name} has no morpheme-counting protocol in ULASA. Report MLU in words.`);
  }

  if (!hasAnySplit) {
    return m("mlu_m", "MLU in morphemes", null, "morphemes/utterance", "unavailable",
      "No bound-morpheme splits have been entered. Use the morpheme helper in the Studio, or type splits as word/morpheme, to enable MLU-m.");
  }

  const status = pack.morphemeProtocol === "published" ? "established" : "experimental";
  const note =
    pack.morphemeProtocol === "published"
      ? undefined
      : `EXPERIMENTAL. ${pack.name} has no published clinical morpheme-counting protocol comparable to Brown's for English. This figure reflects the splits you entered and is not comparable to published English MLU-m norms.`;

  return m("mlu_m", "MLU in morphemes", round(mlu(morphemeCounts)), "morphemes/utterance", status, note);
}

function countSwitchPoints(utterances: Utterance[], matrix: string): number {
  let switches = 0;
  for (const u of utterances) {
    let previous: string | null = null;
    for (const t of u.tokens) {
      if (t.isMaze || t.isUnintelligible || t.isOmission || !t.lang) continue;
      const current = t.lang === matrix ? "matrix" : "other";
      if (previous !== null && current !== previous) switches++;
      previous = current;
    }
  }
  return switches;
}

function countResponsesToQuestions(sample: Sample): number {
  const target = sample.speakers.find((s) => s.isTarget);
  if (!target) return 0;
  let responses = 0;
  for (let i = 0; i < sample.utterances.length - 1; i++) {
    const current = sample.utterances[i];
    const next = sample.utterances[i + 1];
    const currentSpeaker = sample.speakers.find((s) => s.id === current.speakerId);
    if (currentSpeaker?.isTarget) continue;
    if (!/[?？]\s*$/.test(current.text.trim())) continue;
    if (next.speakerId === target.id && next.intelligibility !== "unintelligible") {
      responses++;
    }
  }
  return responses;
}
