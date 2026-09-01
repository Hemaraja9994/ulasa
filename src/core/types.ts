/**
 * ULASA core domain model.
 *
 * Design rules for this file:
 *  - Pure data. No React, no browser APIs, no I/O.
 *  - The ULASA native JSON shape below is the single source of truth. SALT-style
 *    text and CHAT (.cha) are *projections* of it, produced by lossy writers in
 *    `src/core/io/`.
 *  - Anything derived from machine translation carries a provenance flag and is
 *    never accepted by the measure engine. See `GlossedText`.
 */

export type Bcp47 =
  | "en-IN" | "en-US" | "en-GB"
  | "hi-IN" | "ta-IN" | "kn-IN" | "te-IN" | "ml-IN" | "mr-IN"
  | "bn-IN" | "gu-IN" | "pa-IN" | "or-IN" | "as-IN" | "ur-IN"
  | "mixed" | "und";

export type ElicitationContext =
  | "play"
  | "conversation"
  | "narrative_retell"
  | "personal_narrative"
  | "expository"
  | "persuasion"
  | "picture_description"
  | "classroom"
  | "parent_child"
  | "other";

export type SpeakerRole = "child" | "examiner" | "parent" | "peer" | "teacher" | "other";

export interface Speaker {
  id: string;
  /** Short transcript label, e.g. "C", "E", "CHI", "MOT". */
  code: string;
  role: SpeakerRole;
  /** True for exactly one speaker: the person being assessed. */
  isTarget: boolean;
}

export type Intelligibility = "intelligible" | "partial" | "unintelligible";

/** Verbal facility sub-types, following SALT maze conventions. */
export type MazeKind = "repetition" | "revision" | "filled_pause" | "false_start";

export interface MazeSpan {
  kind: MazeKind;
  /** Token indices within the utterance, inclusive start, exclusive end. */
  start: number;
  end: number;
}

/**
 * A single orthographic token.
 *
 * `surface` is always the clinician's text, unmodified. ULASA never silently
 * rewrites orthography; morpheme splits live in `morphemes` alongside it.
 */
export interface Token {
  surface: string;
  /** Lemma if a language pack can supply one; otherwise undefined. */
  lemma?: string;
  pos?: string;
  /** Bound-morpheme decomposition. Present only where the pack's morpheme
   *  protocol status is "published" or the clinician entered `/` splits. */
  morphemes?: string[];
  /** Token-level language ID; drives code-mix metrics. */
  lang?: Bcp47;
  isMaze?: boolean;
  /** Marked with `*` in SALT convention: the clinician judged this omitted. */
  isOmission?: boolean;
  /** Marked `X` / `XX`: heard but not identifiable. */
  isUnintelligible?: boolean;
  errorCodes?: string[];
}

export type Grammaticality = "grammatical" | "ungrammatical" | "unmarked";

export interface Utterance {
  id: string;
  speakerId: string;
  /** Orthographic text in the original script, exactly as transcribed. */
  text: string;
  tokens: Token[];
  mazes: MazeSpan[];
  intelligibility: Intelligibility;
  /** Clinician judgement, feeding Percent Grammatical Utterances (PGU). */
  grammaticality: Grammaticality;
  /** Number of clauses the clinician accepted for this C-unit. When absent the
   *  engine falls back to the language pack's heuristic. */
  clauseCountOverride?: number;
  /** True when the utterance is abandoned or interrupted; excluded from the
   *  complete-and-intelligible analysis set. */
  isAbandoned?: boolean;
  /** Non-verbal turn (gesture, vocalisation); excluded from "verbal" set. */
  isNonVerbal?: boolean;
  /** Seconds from sample start. */
  startTime?: number;
  endTime?: number;
  /** Silent pauses in seconds observed inside or before this utterance. */
  pauses?: number[];
  codes?: string[];
  comment?: string;
  /** ASR confidence 0..1 when the draft came from a recogniser. */
  asrConfidence?: number;
  /** Machine or human-edited English/Hindi gloss. Never analysed. */
  gloss?: GlossedText;
}

/**
 * Translated text is branded so that it is a type error to hand a gloss to any
 * measure function. This is the code-level expression of the clinical rule
 * "do not compute the child's MLU on a translation".
 */
export interface GlossedText {
  readonly __brand: "gloss";
  text: string;
  targetLang: Bcp47;
  provenance: "machine" | "human-edited" | "human";
  provider?: string;
}

export function makeGloss(
  text: string,
  targetLang: Bcp47,
  provenance: GlossedText["provenance"],
  provider?: string,
): GlossedText {
  return { __brand: "gloss", text, targetLang, provenance, provider };
}

export interface Sample {
  id: string;
  caseId: string;
  title: string;
  language: Bcp47;
  /** Additional languages present in a bilingual or code-mixed sample. */
  secondaryLanguages?: Bcp47[];
  elicitationContext: ElicitationContext;
  /** Seconds of usable recorded/observed time; required for rate measures. */
  elapsedSeconds?: number;
  recordedAt?: string;
  speakers: Speaker[];
  utterances: Utterance[];
  /** Free-text clinician note about sample validity. */
  contextNote?: string;
  audioKey?: string;
}

export interface CaseRecord {
  id: string;
  /** De-identified code. ULASA never requires a legal name. */
  code: string;
  ageYears?: number;
  ageMonths?: number;
  grade?: string;
  sex?: "male" | "female" | "other" | "undisclosed";
  languages: Bcp47[];
  dialect?: string;
  region?: string;
  consentRecorded: boolean;
  createdAt: string;
  notes?: string;
}

/** Which utterances a measure was computed over. SALT's C&I analysis set. */
export type AnalysisSetKind = "all" | "complete_intelligible_verbal";

export interface MeasureValue {
  key: string;
  label: string;
  value: number | null;
  unit?: string;
  /** "established" = well-defined for this language; "experimental" = the
   *  language pack has no published protocol and the number is exploratory. */
  status: "established" | "experimental" | "unavailable";
  note?: string;
}

export interface MeasureGroup {
  id: string;
  label: string;
  measures: MeasureValue[];
}

export interface AnalysisResult {
  sampleId: string;
  language: Bcp47;
  analysisSet: AnalysisSetKind;
  analysisSetSize: number;
  groups: MeasureGroup[];
  warnings: string[];
  computedAt: string;
}
