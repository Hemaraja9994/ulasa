# Measures

Every measure ULASA reports, the formula behind it, and the caveats that apply
to each of the six supported languages.

Implementation: pure functions in [`src/core/measures.ts`](../src/core/measures.ts),
composed with language-pack knowledge in [`src/core/analyse.ts`](../src/core/analyse.ts).
Golden tests: [`tests/measures.test.ts`](../tests/measures.test.ts) and
[`tests/fixtures.test.ts`](../tests/fixtures.test.ts).

---

## Status labels

Every measure carries one of three statuses, shown in the UI and in every export.

| Status | Meaning |
|---|---|
| `established` | Well-defined for this language, with a published basis. |
| `experimental` | Computed, but resting on a heuristic or on a protocol that has not been validated for this language. **Must carry a written explanation** — a test fails the build if one is missing. |
| `unavailable` | Could not be computed honestly. Reported as `—`, never as `0`. |

A measure that cannot be computed returns `null`, never `NaN`, `Infinity` or a
silently wrong zero. A test walks every measure of every fixture to enforce this.

---

## The analysis set

Measures are computed over the **complete and intelligible verbal** set,
following SALT's C&I convention: the target speaker's utterances that are

- not abandoned or interrupted,
- not non-verbal,
- not wholly unintelligible, and
- not empty after mazes and unintelligible tokens are removed.

Intelligibility percentages are the exception — they are computed over *all*
target utterances, since excluding unintelligible utterances before measuring
intelligibility would guarantee 100%.

**Convention: 50 utterances minimum.** Below that, ULASA warns that every figure
is provisional and should not be compared against any reference set.

---

## Transcript length

| Measure | Formula |
|---|---|
| Total utterances | Count of target-speaker utterances |
| Analysis set | Count of C&I verbal utterances |
| Total words (NTW) | Word tokens excluding mazes, unintelligible tokens and omission markers |
| Total words with mazes | As above, including maze words |
| Elapsed time | Clinician-entered, or taken from the attached audio |

Mazes are excluded from word counts by SALT convention: they are verbal
facility, not content.

## Intelligibility

- **% intelligible utterances** = fully intelligible ÷ all target utterances
- **% intelligible words** = (word slots − unintelligible tokens) ÷ word slots

`X` marks one unintelligible word, `XX` two, `XXX` an unintelligible run.

## Syntax and morphology

### MLU in words (MLU-w)

`total words in the analysis set ÷ number of utterances in the analysis set`

The primary length measure for **all six languages**, because it is the one that
does not require a morpheme protocol.

**It is not comparable across languages**, and ULASA says so in the report:

- **Hindi** writes case postpositions (`ने`, `को`, `से`, `में`, `पर`, `का`) as
  separate orthographic words. A Hindi MLU-w runs *higher* than an English one
  expressing the same content.
- **Tamil, Kannada, Telugu, Malayalam** pack tense, aspect and (except in
  Malayalam) person-number-gender inside a single word. Their MLU-w runs
  *lower* for the same content.

Comparing a Tamil MLU-w against an English norm is not conservative — it is
wrong in a known direction.

### MLU in morphemes (MLU-m)

`total morphemes ÷ utterances`, where morphemes come from clinician-entered
`word/morpheme` splits.

Emitted **only** when the language pack's morpheme protocol permits it, and its
status always reflects that protocol:

| Language | Protocol | MLU-m status |
|---|---|---|
| English | published (Brown, 1973) | `established` |
| Hindi, Kannada, Tamil, Telugu, Malayalam | experimental | `experimental`, always with a caution |

If no splits have been entered, MLU-m is `unavailable` rather than guessed.

### SD of utterance length

Sample standard deviation (n−1) of the per-utterance word counts. A high value
means variable utterance length, which is clinically different from a uniformly
short sample with the same mean.

### Mean verbs per utterance, % utterances with a verb

Verb identification uses the language pack's `verbMarkers` list plus
`verbSuffixes` regular expressions. It is a cue system, **not a morphological
analyser**, so both measures are `experimental` for the five Indian languages.

A figure below 100% for `% utterances with a verb` is expected in all five
Indian languages: verbless equational clauses are grammatical.

### Clausal density (Subordination Index analogue)

`total clauses ÷ C-units`

The clause count per utterance is `max(1, verb count, subordinator count + 1)`,
floored at 1 so a verbless equational clause still counts as a clause.

**Always `experimental`.** It is a heuristic. The clinician can override the
clause count on any utterance in the Studio, and the override always wins.

### Percent Grammatical Utterances (PGU)

`utterances marked grammatical ÷ utterances marked either way`

`unavailable` until the clinician marks at least one utterance. ULASA never
guesses grammaticality — there is no reliable automatic judge for any of these
languages, and a wrong automatic judgement would propagate into a clinical
record.

### Words per sentence (SUGAR WPS)

Arithmetically identical to MLU-w. Reported separately because SUGAR clinicians
look for it by name. `established` for English only; for the other five it is
`experimental`, with a note that SUGAR's norms (English conversation, ages
3;0–7;11) do not apply.

---

## Semantics and lexical diversity

| Measure | Notes |
|---|---|
| **NDW** | Distinct lowercased word types. |
| **NDW-50** | NDW over the first 50 words. `unavailable` below 50 words — reporting a smaller number would read as poorer diversity when the real problem is sample length. |
| **TTR** | types ÷ tokens. Falls systematically as samples lengthen; ULASA always attaches that caution. |
| **MATTR** | Mean TTR across every 50-token window (Covington & McFall, 2010). |
| **MTLD** | McCarthy & Jarvis (2010). Mean of a forward and reverse pass; each counts complete "factors" where TTR falls to 0.720, plus a fractional trailing factor. Where TTR never reaches the threshold, MTLD is reported as the token count. **Preferred over TTR for samples of 50+ words.** |
| **HD-D** | McCarthy & Jarvis (2007). Hypergeometric probability that each type appears in a random 42-token draw, scaled. |
| **Content-word ratio** | Tokens not in the pack's closed-class list. `experimental` — the list is hand-written, not tagger-derived. |

**Why HD-D and not vocd-D.** vocd-D fits a curve to random samples, so it gives a
slightly different answer every run. That is unacceptable for a number entering
a clinical record, and it makes golden testing impossible. HD-D is the
deterministic hypergeometric equivalent.

---

## Verbal facility and fluency

| Measure | Formula |
|---|---|
| Maze words % | maze word tokens ÷ all word tokens including mazes |
| Mazes per utterance | maze spans ÷ analysis-set utterances |
| Repetitions / revisions / filled pauses / false starts | Counts by classified maze kind |
| Abandoned utterances | Count |
| Silent pauses, mean pause | From `(:2.5)` markers |
| Words per minute | words including mazes ÷ elapsed minutes |
| Utterances per minute | utterances ÷ elapsed minutes |

Rate measures are `unavailable` without an elapsed time, and the Studio prompts
for one.

**Maze classification** (`src/core/tokenise.ts`):

- **filled pause** — every token in the maze is in the pack's filler list
  (`um`, `मतलब`, `ಅಂದ್ರೆ`, `அப்புறம்`, `అంటే`, `പിന്നെ`)
- **repetition** — the maze content reappears immediately after it
- **false start** — nothing recoverable follows
- **revision** — anything else

---

## Discourse

- Mean turn length in words
- Examiner questions (utterances from a non-target speaker ending in `?`)
- **% responses to questions** — target-speaker utterance immediately following
  an examiner question, not wholly unintelligible

## Errors and omissions

- **% utterances with a coded error or omission**
- Omission-marker count (`*word`)
- A per-code inventory, using the active language pack's taxonomy

Error taxonomies are written per language. The clearest example: **Malayalam has
no subject–verb agreement code**, because Malayalam finite verbs do not agree
with the subject. Tamil, Kannada and Telugu all have one. A test enforces this.

## Code-mixing

- **Mix ratio** — % of word tokens tagged as a language other than the matrix
- **Switch points per 100 words** — transitions between matrix and non-matrix

Token-level language ID is **by script**: a Latin-script token inside a
Devanagari or Dravidian-script sample is an insertion (in practice English).
Romanised Indic ("Hinglish", "Tanglish") is deliberately *not* auto-detected as
Indic — that needs a transliteration model, and the Studio offers an explicit
"normalise to native script" action instead.

**Code-mixing is reported descriptively and never enters the error inventory.**
It is typical community practice across Indian languages, not a disorder. A test
asserts that the dense bilingual fixture produces a 0% error rate.

---

## Macrostructure rubrics

Clinician-scored 0–5 across narrative, expository and persuasion dimensions.
ULASA computes the composite and the mean; it scores nothing itself.

A partially scored rubric reports the mean rather than a composite, because a
partial composite is not comparable to a complete one.

---

## The translation guardrail

> **Never compute a measure on a translation and report it as the speaker's.**

Enforced by the type system rather than by discipline. Translated text is
`GlossedText`, a branded interface:

```ts
export interface GlossedText {
  readonly __brand: "gloss";
  text: string;
  targetLang: Bcp47;
  provenance: "machine" | "human-edited" | "human";
  provider?: string;
}
```

No measure function accepts it. Passing a gloss to the analysis engine is a
compile error, not a review comment someone might miss.

The regression test attaches a long English gloss to every utterance of the
Hindi fixture and asserts that the serialised measure output is byte-identical.
If any measure ever reads the translation, that test fails.

---

## References

- Brown, R. (1973). *A First Language.* Harvard University Press.
- Covington, M. A., & McFall, J. D. (2010). Cutting the Gordian knot: the moving-average type-token ratio. *Journal of Quantitative Linguistics*, 17(2).
- McCarthy, P. M., & Jarvis, S. (2007). vocd: a theoretical and empirical evaluation. *Language Testing*, 24(4).
- McCarthy, P. M., & Jarvis, S. (2010). MTLD, vocd-D, and HD-D. *Behavior Research Methods*, 42(2).
- Pavelko, S. L., & Owens, R. E. (2017). SUGAR. *LSHSS*, 48(3).
- MacWhinney, B. (2000). *The CHILDES Project.* Lawrence Erlbaum.
- Miller, J. F., & Iglesias, A. SALT transcription conventions and Standard Measures Report.

Per-language grammatical references are cited inside each pack file in
[`src/nlp/packs/`](../src/nlp/packs/).
