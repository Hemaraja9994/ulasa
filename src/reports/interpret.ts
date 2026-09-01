import type { AnalysisResult, Sample } from "@/core/types";
import { analysisSet } from "@/core/analyse";
import { countableWords } from "@/core/tokenise";
import { getPack } from "@/nlp/registry";
import { RUBRICS, scoreRubric, type RubricScores } from "@/core/rubrics";

/**
 * Drafts the prose Performance Report.
 *
 * This is template composition over the computed measures — deterministic,
 * local, and inspectable. No language model is involved, nothing is sent
 * anywhere, and every sentence traces to a number the clinician can see on the
 * Analyse page.
 *
 * The draft is a starting point. Every paragraph is editable, and the report
 * says so, because a generated paragraph that reads fluently is exactly the
 * kind of thing that gets pasted into a clinical record unread.
 */

function find(analysis: AnalysisResult, key: string): number | null {
  for (const group of analysis.groups) {
    const m = group.measures.find((x) => x.key === key);
    if (m) return m.value;
  }
  return null;
}

function fmt(value: number | null, unit = ""): string {
  if (value === null) return "not available";
  return `${value}${unit ? " " + unit : ""}`;
}

export interface Exemplar {
  text: string;
  gloss?: string;
  reason: string;
}

/**
 * Picks utterances worth quoting: the longest, one carrying a maze, and one
 * carrying a coded error. Exemplars are shown in the original script.
 */
export function pickExemplars(sample: Sample, limit = 4): Exemplar[] {
  const set = analysisSet(sample);
  if (set.length === 0) return [];

  const byLength = [...set].sort(
    (a, b) => countableWords(b.tokens).length - countableWords(a.tokens).length,
  );

  const picks: Exemplar[] = [];
  const used = new Set<string>();

  const push = (id: string, text: string, gloss: string | undefined, reason: string) => {
    if (used.has(id) || picks.length >= limit) return;
    used.add(id);
    picks.push({ text, gloss, reason });
  };

  const longest = byLength[0];
  if (longest) {
    push(longest.id, longest.text, longest.gloss?.text,
      `Longest utterance in the analysis set (${countableWords(longest.tokens).length} words).`);
  }

  const median = byLength[Math.floor(byLength.length / 2)];
  if (median) {
    push(median.id, median.text, median.gloss?.text, "Typical of the sample's median length.");
  }

  const withMaze = set.find((u) => u.mazes.length > 0);
  if (withMaze) push(withMaze.id, withMaze.text, withMaze.gloss?.text, "Contains a maze.");

  const withError = set.find(
    (u) => (u.codes ?? []).some((c) => c.startsWith("E")) || u.tokens.some((t) => t.isOmission),
  );
  if (withError) {
    push(withError.id, withError.text, withError.gloss?.text, "Carries a clinician-coded error.");
  }

  return picks;
}

export function draftPerformanceReport(
  sample: Sample,
  analysis: AnalysisResult,
  rubric?: RubricScores | null,
): string {
  const pack = getPack(sample.language);
  const paragraphs: string[] = [];

  // --- 1. Sample context and validity --------------------------------------
  const setSize = analysis.analysisSetSize;
  const totalWords = find(analysis, "ntw");
  const elapsed = find(analysis, "elapsed");
  const intelligibleUtterances = find(analysis, "pct_intelligible_utterances");

  let validity = `A ${sample.elicitationContext.replace(/_/g, " ")} sample was collected in ${pack.name}. `;
  validity += `The analysis set comprises ${setSize} complete and intelligible verbal utterances containing ${fmt(totalWords)} words`;
  validity += elapsed !== null ? `, recorded over ${elapsed} minutes. ` : ". ";
  if (intelligibleUtterances !== null) {
    validity +=
      intelligibleUtterances >= 95
        ? `Intelligibility was high (${intelligibleUtterances}% of utterances fully intelligible), so the measures below rest on a sound transcript. `
        : `Intelligibility was ${intelligibleUtterances}% at the utterance level. Where a substantial share of the sample is unintelligible, lexical and syntactic measures are computed over what could be transcribed and will understate the child's output. `;
  }
  if (setSize < 50) {
    validity += `The sample falls short of the 50-utterance convention, so every figure below should be read as provisional and should not be compared with any reference set. Collecting a further sample is the first recommendation.`;
  }
  paragraphs.push(validity.trim());

  // --- 2. Syntax and morphology --------------------------------------------
  const mluW = find(analysis, "mlu_w");
  const sd = find(analysis, "sd_utterance_length");
  const clausal = find(analysis, "clausal_density");
  const withVerbs = find(analysis, "pct_with_verbs");
  const pgu = find(analysis, "pgu");

  let syntax = `Utterance length averaged ${fmt(mluW, "words")} (MLU in words)`;
  syntax += sd !== null ? `, with a standard deviation of ${sd} words, indicating ${sd > 3 ? "a wide range of utterance lengths" : "fairly uniform utterance lengths"}. ` : ". ";

  if (pack.family === "Dravidian") {
    syntax += `Because ${pack.name} is agglutinative, a single orthographic word carries tense, aspect and — where the language marks it — person, number and gender. Surface MLU in words therefore understates syntactic complexity relative to English, and must not be compared against English MLU norms. `;
  } else if (pack.id === "hi-IN") {
    syntax += `Because Hindi writes case postpositions as separate words, MLU in words runs higher than it would for a language that affixes the same material. Read it alongside the utterance exemplars rather than against English norms. `;
  }

  if (clausal !== null) {
    syntax += `Clausal density was ${clausal} clauses per C-unit, computed heuristically from predicate and subordinator counts. `;
  }
  if (withVerbs !== null) {
    syntax += `${withVerbs}% of utterances contained an identifiable verb. `;
    if (pack.id !== "en-IN") {
      syntax += `A figure below 100% is expected here: verbless equational clauses are grammatical in ${pack.name}. `;
    }
  }
  syntax +=
    pgu === null
      ? `Percent Grammatical Utterances has not been computed because no utterances have been marked grammatical or ungrammatical yet.`
      : `${pgu}% of the utterances the clinician marked were judged grammatical.`;
  paragraphs.push(syntax.trim());

  // --- 3. Semantics --------------------------------------------------------
  const ndwValue = find(analysis, "ndw");
  const mtldValue = find(analysis, "mtld");
  const ttrValue = find(analysis, "ttr");

  let semantics = `The sample contained ${fmt(ndwValue)} different words. `;
  if (mtldValue !== null) {
    semantics += `Lexical diversity, measured with MTLD, was ${mtldValue}. MTLD is reported in preference to type-token ratio because it does not fall systematically as a sample lengthens. `;
  } else if (ttrValue !== null) {
    semantics += `The sample was too short for MTLD, so type-token ratio (${ttrValue}) is reported instead; interpret it only against samples of a similar length. `;
  }
  paragraphs.push(semantics.trim());

  // --- 4. Verbal facility --------------------------------------------------
  const mazePct = find(analysis, "maze_pct");
  const wpm = find(analysis, "wpm");
  const repetitions = find(analysis, "maze_repetitions");
  const revisions = find(analysis, "maze_revisions");
  const fillers = find(analysis, "maze_filled_pauses");

  let fluency = "";
  if (mazePct !== null) {
    fluency += `Maze words accounted for ${mazePct}% of all words produced`;
    const parts: string[] = [];
    if (repetitions) parts.push(`${repetitions} repetition${repetitions === 1 ? "" : "s"}`);
    if (revisions) parts.push(`${revisions} revision${revisions === 1 ? "" : "s"}`);
    if (fillers) parts.push(`${fillers} filled pause${fillers === 1 ? "" : "s"}`);
    fluency += parts.length ? ` (${parts.join(", ")}). ` : ". ";
  }
  if (wpm !== null) fluency += `Speaking rate was ${wpm} words per minute. `;
  if (fluency) paragraphs.push(fluency.trim());

  // --- 5. Code-mixing ------------------------------------------------------
  const mixRatio = find(analysis, "codemix_ratio");
  const switches = find(analysis, "switch_points");
  if (mixRatio !== null && mixRatio > 1) {
    paragraphs.push(
      `${mixRatio}% of word tokens came from a language other than ${pack.name}, with ${fmt(switches)} switch points per 100 words. Code-mixing of this kind is ordinary community practice across Indian languages and is reported here descriptively. It is not evidence of a language disorder, and it should not be targeted for remediation on its own.`,
    );
  }

  // --- 6. Macrostructure ---------------------------------------------------
  if (rubric) {
    const def = RUBRICS[rubric.rubricId];
    const result = scoreRubric(def, rubric);
    if (result.composite !== null) {
      const weakest = def.dimensions
        .filter((d) => typeof rubric.scores[d.key] === "number")
        .sort((a, b) => (rubric.scores[a.key] as number) - (rubric.scores[b.key] as number))
        .slice(0, 2);
      paragraphs.push(
        `On the ${def.label.toLowerCase()} rubric the sample scored ${result.composite} of ${result.maximum} across ${result.scored} scored dimensions. The lowest-scoring dimensions were ${weakest.map((d) => d.label.toLowerCase()).join(" and ")}, which are the natural starting points for macrostructure goals.`,
      );
    }
  }

  // --- 7. Cautions ---------------------------------------------------------
  paragraphs.push(
    `Cautions. ${pack.normativeNotes} Dialect variation, the elicitation context, and sample length all affect the figures above. This report describes language production; it does not diagnose.`,
  );

  // --- 8. Goals ------------------------------------------------------------
  paragraphs.push(suggestGoals(analysis, pack.name, setSize));

  paragraphs.push(
    `This draft was assembled from the computed measures by ULASA. Edit every paragraph before it enters a clinical record.`,
  );

  return paragraphs.join("\n\n");
}

function suggestGoals(analysis: AnalysisResult, languageName: string, setSize: number): string {
  const goals: string[] = [];

  const mluW = find(analysis, "mlu_w");
  const clausal = find(analysis, "clausal_density");
  const ndwValue = find(analysis, "ndw");
  const mazePct = find(analysis, "maze_pct");
  const pgu = find(analysis, "pgu");

  if (setSize < 50) {
    goals.push(
      "Collect a second sample of at least 50 complete and intelligible utterances before setting quantitative targets.",
    );
  }
  if (clausal !== null && clausal < 1.2) {
    goals.push(
      `Increase clausal density from ${clausal} to a target agreed with the family, by eliciting utterances that link two events with ${languageName} subordinators during a retell task.`,
    );
  }
  if (mluW !== null && mluW < 4) {
    goals.push(
      `Increase mean utterance length from ${mluW} words, working through expansion and recast of the child's own utterances rather than imitation drills.`,
    );
  }
  if (ndwValue !== null && ndwValue < 100) {
    goals.push(
      `Broaden expressive vocabulary; the sample yielded ${ndwValue} different words. Re-measure NDW on a length-equated sample so the comparison is fair.`,
    );
  }
  if (mazePct !== null && mazePct > 8) {
    goals.push(
      `Reduce maze rate from ${mazePct}% of words, using slowed-rate and planning strategies in a low-demand context first.`,
    );
  }
  if (pgu !== null && pgu < 80) {
    goals.push(
      `Raise percent grammatical utterances from ${pgu}%, targeting the specific error codes recorded in the error inventory rather than grammaticality in general.`,
    );
  }

  if (goals.length === 0) {
    goals.push(
      "No measure fell into a range that suggests an automatic goal. Set goals from the clinician's own observation of the sample and the family's priorities.",
    );
  }

  return (
    "Suggested goals, to be edited and agreed with the family. " +
    goals.map((g, i) => `(${i + 1}) ${g}`).join(" ")
  );
}
