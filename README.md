# ULASA

**Universal Language Assessment and Sample Analysis** — clinician-grade language
sample analysis for **English, Hindi, Kannada, Tamil, Telugu and Malayalam**.

Runs entirely in the browser. No account, no upload, no licence fee, no server
bill.

---

## Why this exists

Language Sample Analysis is a gold-standard, ecologically valid measure of
spoken language. The existing tools leave a gap:

| Tool | Strength | Gap |
|---|---|---|
| SALT 24 | Standardised elicitation, 50+ measures, peer databases | Commercial; English/Spanish-centric conventions; almost no Indian-language support |
| CLAN / CHAT | Free, 40+ languages, deep morphosyntax | Command-line culture; weak Indic morphological parsers; not clinician-report oriented |
| SUGAR | Fast 50-utterance workflow, free | English conversation only, ages 3–7; a Word protocol, not software |
| Bhashini / IndicTrans2 | Strong Indic ASR and MT | Not clinical LSA systems |

ULASA aims at the missing product: a SALT-grade clinical workflow, with
Indian-language morphology treated as a first-class problem rather than an
afterthought, at zero cost.

## What is free, permanently, with no key and no account

Everything clinical:

- Transcription studio with SALT-compatible conventions and live counts
- **Length** — MLU in words, total words, SD of utterance length
- **Lexical diversity** — NDW, NDW-50, TTR, MATTR, **MTLD**, **HD-D**
- **Intelligibility** — percent intelligible utterances and words
- **Verbal facility** — maze rate, repetitions / revisions / filled pauses /
  false starts, silent pauses, words and utterances per minute
- **Syntax** — clausal density, verbs per utterance, percent grammatical
  utterances, words per sentence
- **Errors** — per-language error taxonomies with an inventory
- **Code-mixing** — mix ratio and switch points per 100 words
- Narrative, expository and persuasion rubrics
- Performance report drafting
- Export to **PDF, DOCX, CSV, CHAT (.cha), SALT-style text and ULASA JSON**

None of that needs Google, Bhashini or an internet connection. It is ordinary
software running on the clinician's own machine.

## What is optional

| Function | Free path | Notes |
|---|---|---|
| Speech-to-text draft | Local sidecar — faster-whisper | No key. English and Hindi usable; other languages are drafts. |
| Translation gloss | Local sidecar — IndicTrans2 (AI4Bharat) | No key, no monthly cap. Gloss only; never used to compute a score. |
| Transliteration | indic-transliteration (ITRANS) | Local and free. |
| Public Indic APIs | Bhashini / ULCA | Free developer registration. Academic and non-commercial use. ULASA never resells Bhashini capacity. |
| Commercial fallback | Google Cloud | Requires your own billing account even inside the free allowance. Never the default, never auto-selected. |

Cloud services are **off** until you switch them on. If a free quota runs out,
ULASA falls back to the local path — it never starts billing quietly.

See [`docs/ADDENDUM_A_FREE_TIER.md`](docs/ADDENDUM_A_FREE_TIER.md).

## Analyse a sample in five minutes

1. Open the app. Click a demonstration sample — say **Kannada conversation**.
2. You land in the **Studio**. The transcript is already there; counts update as
   you type.
3. Click **Analyse**. You get MLU-w, NDW, MTLD, maze rate, clausal density and
   the rest, each labelled *established* or *experimental* for that language.
4. Click **Draft the report**, then **DOCX** or **PDF**.

No sign-up at any point.

## Running it locally

```bash
npm install
npm run dev
```

```bash
npm test
```

96 golden tests cover the measure math, the transcription conventions, the
SALT/CHAT round trip, and the language-specific behaviour of all six packs.

## The language packs

Six hand-written packs, not machine-translated word lists. Each carries its own
function-word list, verb inventory, clause markers, hesitation markers,
narrative connectives and error taxonomy.

| Language | Script | Family | MLU-m protocol |
|---|---|---|---|
| English (India) | Latin | Germanic | published |
| हिन्दी Hindi | Devanagari | Indo-Aryan | experimental |
| ಕನ್ನಡ Kannada | Kannada | Dravidian | experimental |
| தமிழ் Tamil | Tamil | Dravidian | experimental |
| తెలుగు Telugu | Telugu | Dravidian | experimental |
| മലയാളം Malayalam | Malayalam | Dravidian | experimental |

### What "language-true" means in practice

- **Hindi** writes case postpositions as separate words, which inflates MLU-w.
  ULASA says so next to the number.
- **Tamil, Kannada, Telugu** pack tense, aspect and person-number-gender inside
  one orthographic word, which deflates MLU-w. ULASA says so too.
- **Malayalam finite verbs carry no subject agreement at all.** Its error
  taxonomy therefore has no agreement code, while Tamil's, Kannada's and
  Telugu's do — a test enforces this.
- **Kannada and Telugu are diglossic.** Spoken forms are the expected sampling
  register and are never coded as errors against the written standard.
- All five Indian languages are **pro-drop**: a missing subject is grammatical,
  never an omission.
- **Code-mixing is measured, not penalised.** It is ordinary community practice.
- Where a language has no published clinical morpheme protocol, MLU-m is
  labelled **experimental** wherever it appears. English norms are never applied
  silently.

## Two rules enforced in code, not in documentation

**1. A translation is never scored.** Machine-translated text is wrapped in a
branded `GlossedText` type that no measure function accepts. Computing an
English MLU on a Hindi child's translated transcript is a type error, not a
policy someone might forget. A test attaches a gloss to every utterance in a
sample and asserts the measures do not move.

**2. A measure that cannot be computed honestly says so.** Every measure carries
a status of `established`, `experimental` or `unavailable`, and anything not
established must supply a written reason. A test walks every measure of every
fixture and fails if an experimental measure has no note, or if any value is
`NaN` or `Infinity` rather than an explicit null.

## Privacy

Child speech is sensitive, so the architecture is local-first by construction,
not by promise:

- Transcripts and reports live in this browser's local storage
- Audio lives in IndexedDB and can be deleted separately from the transcript
- There is no ULASA server to upload to
- Every action that sends data off the device is written to an audit log
- De-identified by default: ULASA never asks for a name

See [`docs/ETHICS_AND_PRIVACY.md`](docs/ETHICS_AND_PRIVACY.md).

## What ULASA is not

It **does not diagnose**. It quantifies language production to support a
qualified professional's judgement.

It bundles **no normative data for any Indian language**, because none of
adequate power exists in the public domain. Until that changes, use it for
criterion-referenced profiles, intra-child progress, and locally built reference
sets. Every report carries this caution.

It bundles **no copyrighted stimuli** — no Frog-story sequences, no SALT
reference databases. The demonstration transcripts are original.

## Deployment

The build produces static assets only — no serverless functions, no database, no
runtime compute. It fits inside any static host's free tier.

```bash
npm run build
```

## Licence

Apache-2.0. See [`LICENSE`](LICENSE).

## Acknowledgements

Constructs implemented here follow the published literature on SALT (Miller &
Iglesias), CHAT/CLAN (MacWhinney, TalkBank), SUGAR (Pavelko & Owens), MTLD
(McCarthy & Jarvis) and HD-D. Indic language resources draw on the descriptive
grammars cited in each language pack and on AI4Bharat's open models. None of
those projects endorses ULASA.
