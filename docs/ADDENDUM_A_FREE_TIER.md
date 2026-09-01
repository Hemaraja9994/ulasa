# Addendum A — Free-tier and zero-cost architecture

The claim this document defends: **a complete, clinically usable language sample
analysis system can be built and operated at zero licence cost.** Paid services
add speed and convenience, nothing else.

SALT is a commercial product. CLAN and SUGAR already demonstrate that
language-sample analysis itself does not require a paid engine. The same
principle applies here: scoring, editing and reporting stay local; speech
recognition and translation are optional assistants.

---

## 1. Where the work actually happens

ULASA has **no backend**. The deployed application is a set of static files.
Every measure, parser, rubric and export runs in the clinician's browser.

This is not a compromise forced by the free tier. It is the correct
architecture for the problem:

- **Cost.** No server means no compute bill, no database bill, and no scaling
  cliff. A thousand clinicians cost the same to host as one.
- **Privacy.** Child speech never crosses a network. There is no server to
  breach, no log to subpoena, and no data-processing agreement to negotiate.
- **Offline.** A field clinician with no connectivity can transcribe and score.
- **Longevity.** A static site outlives the project's funding. Even if nobody
  maintains ULASA, a downloaded copy keeps working.

### What this means for local models

Local Whisper and local IndicTrans2 **cannot run inside a serverless function**:
no GPU, a ~250 MB bundle ceiling, short timeouts, and IndicTrans2 alone is over
a gigabyte of weights. Anyone claiming otherwise has not tried it.

They run where they belong — on the clinician's own machine, as a **sidecar**
process the browser talks to over loopback. See [`../sidecar/README.md`](../sidecar/README.md).

```
┌─────────────────────────┐         ┌──────────────────────────┐
│  Browser (static app)   │         │  Sidecar (optional)      │
│                         │         │  127.0.0.1:8765          │
│  • transcription studio │  HTTP   │                          │
│  • ALL measures         │ ──────► │  • faster-whisper (ASR)  │
│  • rubrics, reports     │  local  │  • IndicTrans2 (gloss)   │
│  • PDF/DOCX/CSV/CHAT    │  only   │  • ITRANS translit.      │
│  • localStorage/IDB     │         │                          │
└─────────────────────────┘         └──────────────────────────┘
         no network egress                no network egress
```

---

## 2. What stays free with no API key

A clinician can record or paste a sample, correct the transcript, and obtain:

- MLU in words, total words, number of different words, TTR, MATTR, MTLD, HD-D
- Intelligibility (utterance and word level), maze percentage, speaking rate
- Maze inventory split into repetitions, revisions, filled pauses, false starts
- Clausal-density heuristics and clinician-marked grammaticality (PGU)
- Per-language error inventories
- Code-mix ratio and switch points per 100 words
- Narrative, expository and persuasion rubrics
- PDF and DOCX reports, plus CHAT, SALT-style and CSV export

These are ordinary software. They do not need Google, Bhashini or Anuvaad.

---

## 3. Free assistance for Indian languages

| Function | Free path | Notes |
|---|---|---|
| Speech-to-text draft | Local faster-whisper / whisper.cpp | No key. Hindi and English usable; Tamil, Kannada, Telugu and Malayalam are drafts and are labelled as such per language. |
| Translation gloss | Local IndicTrans2 distilled models (AI4Bharat) | Covers scheduled Indian languages. Gloss only; never used to compute MLU. |
| Transliteration | IndicXlit / Aksharamukha / indic-transliteration | Local and free. |
| Public Indic APIs | Bhashini / ULCA, after free developer registration | Suitable for academic, government and non-commercial use. Official documentation treats the open APIs as proof-of-concept; charging end-users for Bhashini cycles would require a separate production agreement. |
| Optional Google | Translation: first 500,000 characters/month free. Speech-to-Text V1: 60 minutes/month. | Requires a billing account **even inside the free allowance.** Not the default. |

A typical 50-utterance sample is a few hundred words. Google's free translation
allowance would cover on the order of a hundred samples a month. The local
IndicTrans2 path has no monthly cap at all.

---

## 4. Rules the implementation actually enforces

These are not aspirations. Each corresponds to code.

**Default mode is local.** `resolveService()` returns `OfflineNoOpService`
unless the clinician has explicitly enabled something in Settings. The offline
service does not fail silently — it explains that local-only mode is on and that
every clinical measure works without a recogniser.

**Fallback is one-way.** `resolveService()` tries the local sidecar, then
Bhashini, then Google, then offline. An unavailable cloud provider falls back
*to* local. Nothing ever falls forward *to* a paid service. A local-only install
cannot start billing.

**Google is never auto-selected.** It sits last in the resolution order and
requires a key the clinician typed. Its ASR path is deliberately not wired into
the browser build at all: sending child audio to a billed cloud endpoint should
be a considered server-side decision, not a button in a local tool.

**Bhashini is not resold.** ULASA has no paid tier, and if one is ever added,
core scoring must not move behind it. Bhashini capacity in particular must never
be metered or charged for by ULASA.

**Translation never touches a score.** Enforced by the type system — see
[`MEASURES.md`](MEASURES.md) and the `GlossedText` brand in `src/core/types.ts`.

---

## 5. Hardware expectations

A modest clinic laptop, 8–16 GB RAM, is sufficient for manual transcription and
every score, because those run in the browser and are arithmetic over a few
thousand tokens.

Local ASR without a GPU is slower than real time — expect several minutes for a
ten-minute sample with the `small` Whisper model. The editor stays fully usable
while it runs, and a clinician who prefers to type is never worse off: manual
transcription is the reference path, not the fallback.

---

## 6. Product shape

- **Community (₹0)** — unlimited local samples, all measures, all reports, local
  Whisper and IndicTrans2, single user. This is the version students and most
  Indian school clinicians should use, and it is what this repository builds.
- **Clinic / Research (possible later)** — multi-user access, shared reference
  databases, audit-log retention, a key vault. Those are conveniences and may be
  charged for. **Core scoring must never be locked.**

This mirrors CLAN (free analysis) rather than SALT (paid licence), while leaving
room for a clinic edition that does not compromise the free one.
