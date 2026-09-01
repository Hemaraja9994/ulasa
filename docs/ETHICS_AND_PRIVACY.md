# Ethics and privacy

## ULASA does not diagnose

It quantifies language production to support a qualified professional's
judgement. Every report carries this statement.

## No Indian normative data is bundled

There is no adequately powered public normative sample for Hindi, Kannada,
Tamil, Telugu or Malayalam language production. ULASA bundles none and fabricates
none.

Until that changes, use:

- **Criterion-referenced profiles** — what the child does, described
- **Intra-child progress** — baseline against follow-up, same protocol
- **Locally built reference sets** — a clinic or university collecting matched
  samples under its own ethics approval

Applying an English or Spanish norm to a Kannada sample is not conservative. It
is wrong in a direction the language guarantees: agglutination deflates MLU-w,
so a typical Kannada-speaking child would look impaired.

## Local by construction

| Data | Where it lives |
|---|---|
| Transcripts, cases, rubrics, reports | This browser's `localStorage` |
| Audio | This browser's IndexedDB, deletable separately |
| Anything else | Nowhere. There is no ULASA server. |

Clearing browser data erases everything. The JSON export is lossless — use it
for anything that must survive.

## Cloud calls

Off by default. When enabled:

- Every call is written to the audit log and flagged **external**
- Phone numbers, email addresses and long ID numbers are redacted first — a
  pattern-based safety net, not a guarantee
- Fallback runs one way only: cloud → local, never local → cloud
- Google is never auto-selected and its ASR path is not wired into the browser
  build at all

## De-identification

ULASA never asks for a name. Cases are a code, an age and a language. If you
type a name into a transcript, it is in your local storage and in your exports —
that is your decision, and the software cannot undo it.

## API keys

Keys entered in Settings are stored in this browser's `localStorage`. That is
convenient and it is not a secret store. **On a shared clinic machine, leave the
cloud switched off and use the local sidecar.**

## DPDP Act alignment

- **Purpose limitation** — data is used for the assessment it was collected for
- **Data minimisation** — de-identified by default, audio deletable separately
- **Storage limitation** — retention is under the clinician's direct control
- **Data-subject rights** — export is lossless JSON; deletion is immediate and
  local

Because processing is local, most obligations that attach to a data fiduciary
operating a service do not arise. The clinician holds the data throughout.

## Consent

Record consent on the assessment before collecting. ULASA provides the flag; the
clinical and legal obligation is yours.

## Copyright

ULASA bundles no copyrighted stimuli — no Frog-story sequences, no SALT
reference databases, no published picture sets. Demonstration transcripts are
original and contain no real child's speech. Where a protocol needs a picture,
it describes the kind of scene and leaves the choice to the clinic.

## Interpretation cautions carried into every report

- Dialect variation is not disorder
- Code-mixing is typical community practice, not disorder
- A short sample makes every measure provisional
- Translation artefacts never enter a score, by construction
- Diglossia (Kannada, Telugu) means spoken forms are the expected register
- Pro-drop means a missing subject is grammatical in all five Indian languages
