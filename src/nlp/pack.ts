import type { Bcp47 } from "@/core/types";

export type Family =
  | "Indo-Aryan" | "Dravidian" | "Munda" | "Tibeto-Burman" | "Germanic" | "isolate";

/**
 * Status of the language's mean-length-of-utterance-in-morphemes protocol.
 *
 *  published    — a peer-reviewed morpheme-counting protocol exists and is
 *                 implemented here; MLU-m may be reported as established.
 *  experimental — morpheme splitting is rule-guessed; MLU-m is labelled
 *                 experimental everywhere it appears.
 *  surface-only — do not attempt morpheme counts at all; report MLU-w.
 */
export type MorphemeProtocolStatus = "published" | "experimental" | "surface-only";

export interface LanguagePack {
  id: Bcp47;
  name: string;
  nativeName: string;
  script: string;
  family: Family;
  /** Left-to-right token split. Indic scripts are space-delimited at the word
   *  level, so a Unicode-aware whitespace split is correct; the hard problems
   *  are *inside* the word, not between words. */
  wordBoundary: RegExp;
  /** Notes shown in the UI explaining how a C-unit is defined for this language. */
  cUnitNotes: string;
  morphemeProtocol: MorphemeProtocolStatus;
  /** Closed-class items excluded from content-word counts. */
  functionWords: string[];
  /** Tokens that are, or reliably mark, a finite verb. Used for the
   *  verbs-per-utterance and clausal-density heuristics. */
  verbMarkers: string[];
  /** Suffix patterns that identify a finite verb in agglutinative languages. */
  verbSuffixes: RegExp[];
  /** Subordinators and coordinators that introduce an additional clause. */
  clauseMarkers: string[];
  /** Filled pauses and hesitation markers; maze candidates, never content. */
  mazeFillers: string[];
  /** Conjunctive/temporal devices scored in narrative cohesion. */
  narrativeConnectives: string[];
  /** Error labels offered in the coding palette, in this language's terms. */
  errorTaxonomy: { code: string; label: string }[];
  /** Languages this one is commonly code-mixed with. */
  codeMixPartners: Bcp47[];
  /** Shown prominently wherever measures are reported. */
  normativeNotes: string;
  references: string[];
}

/** Unicode-aware default: split on whitespace, strip transcript punctuation. */
export const DEFAULT_WORD_BOUNDARY = /\s+/u;

/** Punctuation stripped before a token is counted as a word. Danda (।) and
 *  double danda (॥) are included for Indic scripts. */
export const STRIP_PUNCT = /^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu;

export function normaliseToken(raw: string): string {
  return raw.replace(STRIP_PUNCT, "").trim();
}
