/**
 * Plain-language glossary for the measures ULASA reports.
 *
 * Keys match MeasureValue.key from src/core/analyse.ts. Definitions describe
 * what the number means; how ULASA computes it lives in the engine. The
 * references are the commonly cited origin of each measure, plus SALT
 * conventions where ULASA follows them. They are pointers for further
 * reading, not claims of equivalence with any commercial tool.
 */

export interface GlossaryEntry {
  key: string;
  term: string;
  short: string;
  detail?: string;
  reference?: string;
}

export const SALT_DOCS_URL = "https://www.saltsoftware.com";

export const GLOSSARY: GlossaryEntry[] = [
  {
    key: "analysis_set",
    term: "Analysis set (C&I verbal utterances)",
    short: "Utterances from the target speaker that are complete, fully intelligible and verbal.",
    detail:
      "Most length and lexical measures are computed on this set only. Abandoned, interrupted, partly or wholly unintelligible and non-verbal utterances are excluded. A minimum of about 50 utterances is the usual convention for a reliable sample.",
    reference: "SALT transcription conventions; Pavelko & Owens (2017), SUGAR.",
  },
  {
    key: "total_utterances",
    term: "Total utterances",
    short: "Every utterance attributed to the target speaker, before any exclusions.",
  },
  {
    key: "elapsed",
    term: "Elapsed time",
    short: "Length of the recorded sample in minutes, from the transcript header; needed for rate measures.",
  },
  {
    key: "ntw",
    term: "Number of Total Words (NTW)",
    short: "All words in the analysis set, with mazes (repetitions, revisions, filled pauses) removed.",
    reference: "SALT conventions.",
  },
  {
    key: "ntw_with_mazes",
    term: "Total words including mazes",
    short: "NTW plus the words that sit inside mazes; the difference indicates how much talk was disrupted.",
  },
  {
    key: "mlu_w",
    term: "MLU in words (MLU-w)",
    short: "Mean number of words per utterance in the analysis set.",
    detail:
      "A general index of utterance length and grammatical complexity. Word-based MLU is preferred for agglutinative languages, where morpheme counting has no agreed protocol.",
    reference: "Brown (1973), A First Language; SALT conventions.",
  },
  {
    key: "mlu_m",
    term: "MLU in morphemes (MLU-m)",
    short: "Mean number of morphemes (free + bound) per utterance.",
    detail:
      "Only reported when bound-morpheme splits have been entered. For the Indian-language packs the status is experimental because there is no published morpheme-counting protocol.",
    reference: "Brown (1973).",
  },
  {
    key: "sd_utterance_length",
    term: "SD of utterance length",
    short: "Spread of utterance lengths around the MLU; a very low value can mean repetitive, formulaic output.",
  },
  {
    key: "ndw",
    term: "Number of Different Words (NDW)",
    short: "Count of distinct word types in the analysis set.",
    detail: "Sensitive to sample size: compare NDW only between samples of similar length, or use a fixed-length window.",
    reference: "Miller (1981); SALT conventions.",
  },
  {
    key: "ttr",
    term: "Type-Token Ratio (TTR)",
    short: "Different words divided by total words.",
    detail: "Falls as samples get longer, so it is not comparable across samples of different sizes. Prefer MATTR, MTLD or HD-D.",
    reference: "Templin (1957).",
  },
  {
    key: "mattr",
    term: "Moving-Average TTR (MATTR)",
    short: "TTR averaged over a sliding 50-word window, which removes most of the length effect.",
    reference: "Covington & McFall (2010).",
  },
  {
    key: "mtld",
    term: "MTLD",
    short: "Measure of Textual Lexical Diversity: average run length of words before TTR drops below 0.72.",
    reference: "McCarthy & Jarvis (2010).",
  },
  {
    key: "hdd",
    term: "HD-D (vocd-D analogue)",
    short: "Lexical diversity from the hypergeometric probability of each word appearing in a 42-word draw.",
    reference: "McCarthy & Jarvis (2007); Malvern & Richards (vocd).",
  },
  {
    key: "pct_intelligible_utterances",
    term: "Intelligible utterances",
    short: "Percentage of target-speaker utterances that are fully intelligible.",
    reference: "SALT conventions.",
  },
  {
    key: "pct_intelligible_words",
    term: "% intelligible words",
    short: "Share of word tokens that were transcribable.",
  },
  {
    key: "unintelligible_words",
    term: "Unintelligible word tokens",
    short: "Number of X / XXX markers in the target speaker's utterances.",
  },
  {
    key: "mean_verbs",
    term: "Mean verbs per utterance",
    short: "Average number of verbs identified per utterance by the language pack (experimental outside English).",
  },
  {
    key: "pct_with_verbs",
    term: "% utterances with a verb",
    short: "Share of utterances containing at least one verb.",
  },
  {
    key: "clausal_density",
    term: "Clausal density (clauses per C-unit)",
    short: "Estimated clauses per C-unit, an index of syntactic complexity (similar in spirit to the subordination index).",
    reference: "Scott (1988); SALT Subordination Index.",
  },
  {
    key: "wps",
    term: "Words per sentence (SUGAR WPS)",
    short: "Mean words per sentence-level unit, as defined in the SUGAR protocol.",
    reference: "Pavelko & Owens (2017), SUGAR.",
  },
  {
    key: "pgu",
    term: "% grammatical utterances (PGU)",
    short: "Share of utterances marked for grammaticality that contain no grammatical error.",
    reference: "Eisenberg & Guo (2013).",
  },
  {
    key: "content_ratio",
    term: "Content-word ratio",
    short: "Proportion of content words (nouns, verbs, adjectives, adverbs) among all words.",
  },
  {
    key: "mazes_per_utterance",
    term: "Mazes per utterance",
    short: "Average number of mazes (false starts, repetitions, revisions, filled pauses) per utterance.",
    reference: "Loban (1976); SALT maze conventions.",
  },
  {
    key: "maze_pct",
    term: "% maze words",
    short: "Words inside mazes as a percentage of all words including mazes.",
    reference: "SALT conventions.",
  },
  {
    key: "maze_repetitions",
    term: "Repetitions",
    short: "Mazes where a sound, word or phrase is repeated, e.g. (the the).",
  },
  {
    key: "maze_revisions",
    term: "Revisions",
    short: "Mazes where the speaker changes what they started to say.",
  },
  {
    key: "maze_filled_pauses",
    term: "Filled pauses",
    short: "Fillers such as um, uh, er inside mazes.",
  },
  {
    key: "maze_false_starts",
    term: "False starts",
    short: "Mazes where an utterance is begun and abandoned before restarting.",
  },
  {
    key: "abandoned",
    term: "Abandoned / interrupted utterances",
    short: "Utterances left incomplete (>) or cut off by another speaker (^).",
    reference: "SALT conventions.",
  },
  {
    key: "silent_pauses",
    term: "Silent pauses",
    short: "Timed pauses marked in the transcript.",
  },
  {
    key: "mean_pause",
    term: "Mean silent pause",
    short: "Average length of marked silent pauses, in seconds.",
  },
  {
    key: "wpm",
    term: "Words per minute (WPM)",
    short: "Total words divided by elapsed sample time; an index of verbal fluency/rate.",
    reference: "SALT conventions.",
  },
  {
    key: "upm",
    term: "Utterances per minute",
    short: "Target-speaker utterances divided by elapsed sample time.",
  },
  {
    key: "mean_turn_length",
    term: "Mean turn length",
    short: "Average words per conversational turn by the target speaker.",
  },
  {
    key: "examiner_questions",
    term: "Examiner questions",
    short: "Number of questions asked by the examiner; high values can shorten child responses.",
  },
  {
    key: "pct_responses",
    term: "Responses to examiner questions",
    short: "Share of examiner questions that received a response from the target speaker.",
  },
  {
    key: "pct_with_errors",
    term: "Utterances with a coded error or omission",
    short: "Share of analysis-set utterances containing at least one coded error or omission marker.",
  },
  {
    key: "omissions",
    term: "Omission markers",
    short: "Obligatory words or bound morphemes coded as omitted.",
  },
  {
    key: "codemix_ratio",
    term: "Tokens from another language",
    short: "Percentage of words tagged as coming from a language other than the sample's matrix language.",
  },
  {
    key: "switch_points",
    term: "Switch points per 100 words",
    short: "Language switches per 100 words, normalising code-switching for sample length.",
  },
  {
    key: "matrix_language",
    term: "Matrix language",
    short: "The language that supplies the grammatical frame of the sample.",
  },
];

export const GLOSSARY_BY_KEY: Record<string, GlossaryEntry> = Object.fromEntries(
  GLOSSARY.map((g) => [g.key, g]),
);
