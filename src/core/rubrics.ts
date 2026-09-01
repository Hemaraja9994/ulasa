/**
 * Macrostructure rubrics.
 *
 * These are clinician-scored overlays, not automatic measures. Narrative
 * macrostructure cannot be extracted reliably from surface text in any of the
 * six languages ULASA supports, and pretending otherwise would be the single
 * easiest way to produce a confident wrong number. The engine scores nothing
 * here; it stores what the clinician judged and computes the composite.
 *
 * The dimensions are analogues of SALT's Narrative Scoring Scheme, Expository
 * Scoring Scheme and Persuasion Scoring Scheme. They are written here in
 * general discourse terms rather than copied, and the anchors are adapted so
 * they do not assume English narrative conventions.
 */

export type RubricId = "narrative" | "expository" | "persuasion";

export interface RubricDimension {
  key: string;
  label: string;
  prompt: string;
  /** Short descriptions for scores 0, 1, 3 and 5; 2 and 4 are intermediate. */
  anchors: { 0: string; 1: string; 3: string; 5: string };
}

export interface Rubric {
  id: RubricId;
  label: string;
  description: string;
  dimensions: RubricDimension[];
}

export type RubricScores = {
  rubricId: RubricId;
  /** dimension key -> 0..5, or null if not scored. */
  scores: Record<string, number | null>;
  notes: string;
};

const NARRATIVE: Rubric = {
  id: "narrative",
  label: "Narrative scoring",
  description:
    "For story retells and personal narratives. Score each dimension 0–5 after reading the whole sample, not utterance by utterance.",
  dimensions: [
    {
      key: "introduction",
      label: "Introduction",
      prompt: "Does the speaker set the scene — who, where, when — before the events begin?",
      anchors: {
        0: "No orientation at all; the listener cannot tell who or where.",
        1: "A single vague reference, e.g. naming one character only.",
        3: "Characters and a general setting are given, but time or place is incomplete.",
        5: "Characters, place and time are established clearly and economically.",
      },
    },
    {
      key: "character",
      label: "Character development",
      prompt: "Are the main and secondary characters distinguished and maintained?",
      anchors: {
        0: "Characters are not identifiable.",
        1: "One character is named; others are referred to only as 'he' or 'that one'.",
        3: "Main character is clear; secondary characters are inconsistently maintained.",
        5: "Main and secondary characters are distinguished and consistently tracked.",
      },
    },
    {
      key: "mental_states",
      label: "Internal response",
      prompt:
        "Does the speaker express what characters thought, felt or wanted? Note that mental-state marking is grammatically different across these languages — Hindi uses experiencer-dative constructions, and Dravidian languages often use dative-subject forms. Score the function, not the English form.",
      anchors: {
        0: "No reference to any character's mental state.",
        1: "One generic state, e.g. 'he was happy'.",
        3: "Some mental states given, mostly for the main character.",
        5: "Mental states used across characters and tied to events.",
      },
    },
    {
      key: "conflict",
      label: "Conflict / problem",
      prompt: "Is the central problem stated clearly enough for the listener to follow?",
      anchors: {
        0: "No problem is presented.",
        1: "A problem is implied but never stated.",
        3: "The main problem is stated; subordinate problems are omitted.",
        5: "Main and subordinate problems are stated and related to each other.",
      },
    },
    {
      key: "resolution",
      label: "Resolution",
      prompt: "Are the problems resolved, and is the resolution connected back to the conflict?",
      anchors: {
        0: "No resolution.",
        1: "The story stops rather than resolves.",
        3: "The main problem is resolved; the link to the conflict is loose.",
        5: "Resolutions are explicit and tied to the problems raised.",
      },
    },
    {
      key: "cohesion",
      label: "Cohesion",
      prompt:
        "Do events connect logically and in order, with appropriate connectives? Use the language pack's connective list — फिर, ಆಮೇಲೆ, அப்புறம், తర్వాత, പിന്നെ are the expected devices, not 'and then'.",
      anchors: {
        0: "Events are unordered; the listener cannot reconstruct the sequence.",
        1: "Events listed with no connectives, or one connective repeated throughout.",
        3: "Mostly ordered with some connectives; a few abrupt transitions.",
        5: "Smooth, ordered, with varied and appropriate connective devices.",
      },
    },
    {
      key: "reference",
      label: "Referencing",
      prompt:
        "Can the listener always tell who is being referred to? All five Indian languages here are pro-drop, so an omitted subject is grammatical — score whether the referent is recoverable, not whether a pronoun is present.",
      anchors: {
        0: "Referents are consistently unclear.",
        1: "Frequent ambiguous reference; the listener must ask.",
        3: "Generally clear with occasional ambiguity.",
        5: "Reference is unambiguous throughout.",
      },
    },
    {
      key: "conclusion",
      label: "Conclusion",
      prompt: "Is there a clear ending, or does the sample simply stop?",
      anchors: {
        0: "No ending.",
        1: "Stops mid-event.",
        3: "The final event is given but not marked as an ending.",
        5: "A clear conclusion, wrapping up the narrative.",
      },
    },
  ],
};

const EXPOSITORY: Rubric = {
  id: "expository",
  label: "Expository scoring",
  description:
    "For explanations and procedural descriptions — how a game works, how something is made.",
  dimensions: [
    {
      key: "topic",
      label: "Topic statement",
      prompt: "Is the topic identified at the outset?",
      anchors: {
        0: "No topic given.",
        1: "Topic inferable only from context.",
        3: "Topic stated but not framed.",
        5: "Topic stated and framed for the listener.",
      },
    },
    {
      key: "structure",
      label: "Organisation",
      prompt: "Are steps or components presented in a usable order?",
      anchors: {
        0: "No discernible order.",
        1: "Fragments in arbitrary order.",
        3: "Mostly ordered with some backtracking.",
        5: "Clear, complete, logically ordered.",
      },
    },
    {
      key: "detail",
      label: "Supporting detail",
      prompt: "Is there enough specific detail for a naive listener to follow?",
      anchors: {
        0: "No detail.",
        1: "Vague generalities only.",
        3: "Some specifics; important steps assumed.",
        5: "Sufficient specific detail throughout.",
      },
    },
    {
      key: "vocabulary",
      label: "Topic vocabulary",
      prompt:
        "Does the speaker use the vocabulary the topic requires? Technical terms borrowed from English inside an Indic utterance are normal register in Indian classrooms and count as topic vocabulary.",
      anchors: {
        0: "No topic-specific vocabulary.",
        1: "Generic words substituted throughout ('thing', 'that one').",
        3: "Some topic vocabulary, gaps filled with generic terms.",
        5: "Consistent, accurate topic vocabulary.",
      },
    },
    {
      key: "cohesion",
      label: "Cohesion",
      prompt: "Are the steps linked with appropriate sequential and causal connectives?",
      anchors: {
        0: "No linking.",
        1: "One connective repeated.",
        3: "Some varied linking.",
        5: "Varied, appropriate sequential and causal links.",
      },
    },
    {
      key: "conclusion",
      label: "Closure",
      prompt: "Is the explanation brought to a close?",
      anchors: {
        0: "No closure.",
        1: "Stops abruptly.",
        3: "Ends on the final step without marking it.",
        5: "Explicit closure.",
      },
    },
  ],
};

const PERSUASION: Rubric = {
  id: "persuasion",
  label: "Persuasion scoring",
  description: "For upper-primary and secondary students asked to argue a position.",
  dimensions: [
    {
      key: "position",
      label: "Position",
      prompt: "Is a clear position taken?",
      anchors: {
        0: "No position.",
        1: "Position implied only.",
        3: "Position stated once.",
        5: "Position stated and maintained.",
      },
    },
    {
      key: "reasons",
      label: "Supporting reasons",
      prompt: "Are reasons given, and are they relevant to the position?",
      anchors: {
        0: "No reasons.",
        1: "One reason, restating the position.",
        3: "Two or more reasons, unevenly developed.",
        5: "Multiple relevant, developed reasons.",
      },
    },
    {
      key: "audience",
      label: "Audience awareness",
      prompt:
        "Does the speaker address the listener's likely objection? Note that honorific register (आप, ನೀವು, நீங்கள், మీరు, നിങ്ങൾ) is part of audience marking in all five Indian languages.",
      anchors: {
        0: "No audience awareness.",
        1: "Speaks only from own viewpoint.",
        3: "Some acknowledgement of the listener.",
        5: "Anticipates and answers objections; register fits the addressee.",
      },
    },
    {
      key: "counter",
      label: "Counter-argument",
      prompt: "Is an opposing view acknowledged?",
      anchors: {
        0: "None.",
        1: "Opposing view dismissed without statement.",
        3: "Opposing view stated.",
        5: "Opposing view stated and answered.",
      },
    },
    {
      key: "cohesion",
      label: "Cohesion",
      prompt: "Are argumentative connectives used to link claims and reasons?",
      anchors: {
        0: "No linking.",
        1: "Claims listed without links.",
        3: "Some causal linking.",
        5: "Varied, appropriate argumentative links.",
      },
    },
    {
      key: "conclusion",
      label: "Conclusion",
      prompt: "Is the argument closed with a restatement or call to action?",
      anchors: {
        0: "No conclusion.",
        1: "Stops.",
        3: "Weak restatement.",
        5: "Clear conclusion.",
      },
    },
  ],
};

export const RUBRICS: Record<RubricId, Rubric> = {
  narrative: NARRATIVE,
  expository: EXPOSITORY,
  persuasion: PERSUASION,
};

export function rubricFor(context: string): RubricId {
  if (context === "expository") return "expository";
  if (context === "persuasion") return "persuasion";
  return "narrative";
}

export interface RubricResult {
  scored: number;
  total: number;
  composite: number | null;
  maximum: number;
  /** Mean of the scored dimensions, comparable across partially scored rubrics. */
  mean: number | null;
}

export function scoreRubric(rubric: Rubric, scores: RubricScores): RubricResult {
  const values = rubric.dimensions
    .map((d) => scores.scores[d.key])
    .filter((v): v is number => typeof v === "number");

  return {
    scored: values.length,
    total: rubric.dimensions.length,
    composite: values.length ? values.reduce((a, b) => a + b, 0) : null,
    maximum: rubric.dimensions.length * 5,
    mean: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
  };
}

export function emptyScores(rubricId: RubricId): RubricScores {
  const rubric = RUBRICS[rubricId];
  return {
    rubricId,
    scores: Object.fromEntries(rubric.dimensions.map((d) => [d.key, null])),
    notes: "",
  };
}
