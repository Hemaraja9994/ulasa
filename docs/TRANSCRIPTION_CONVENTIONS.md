# Transcription conventions

ULASA uses SALT's conventions plus two additions, so a transcript typed in SALT
can be pasted here unchanged.

## The line

```
C  I go to school in the bus.
E  Who do you sit with?
C  My friend (si) sits with me.
```

Speaker code, whitespace, then the utterance. One utterance per line.

Codes ULASA recognises as the client: `C`, `CHI`, `P`, `CLI`.
As the examiner: `E`, `EXA`, `INV`, `SLP`. As a parent: `M`, `MOT`, `F`, `FAT`, `PAR`.

## Symbols

| Symbol | Meaning |
|---|---|
| `(word word)` | A maze. Classified automatically as a repetition, revision, filled pause or false start, and excluded from word counts. |
| `X` `XX` `XXX` | Unintelligible: one word, two words, an unintelligible run. Case-sensitive, so a Roman `x` inside romanised Indic text is not swallowed. |
| `*word` | An omission the clinician judged should have been present. |
| `word/morpheme` | A bound-morpheme split. **The surface spelling is never rewritten** — the split is stored alongside it. |
| `[E:CASE]` | An error or descriptive code. |
| `(:2.5)` | A silent pause of 2.5 seconds. |
| `+note` | A clinician comment, excluded from every count. |

## Metadata lines

```
$ C, E
+ Title: Case 014 baseline
+ Language: kn-IN
+ Context: conversation
+ Elapsed: 10:30
= a free comment line, ignored
```

## Indian-language extensions

### Code-mixing

Token language is tagged **by script**. A Latin-script token inside a
Devanagari, Kannada, Tamil, Telugu or Malayalam sample is an insertion:

```
C  ನಾನು ಟಿವಿಯಲ್ಲಿ cartoon ನೋಡ್ತೀನಿ.
```

Romanised Indic is *not* auto-detected as Indic. Use the Studio's transliteration
action to normalise it to native script first, or the code-mix figures will be
wrong.

### Agglutinative tokens

In Tamil, Kannada, Telugu and Malayalam, one orthographic word may carry a root
plus several affixes. Record the surface form; add a split only if you intend to
compute MLU-m, and read the experimental caution first:

```
C  அவன் வீட்டுக்கு போனான்.          surface — always correct
C  அவன் வீட்டுக்கு போ/ன்/ஆன்.        split — enables experimental MLU-m
```

### Case marking

Hindi postpositions are separate words and are counted as such. Kannada, Tamil,
Telugu and Malayalam case suffixes are inside the word and are not, unless you
split them.

### Reduplication

`thoda-thoda`, `ಸ್ವಲ್ಪ ಸ್ವಲ್ಪ`, `கொஞ்சம் கொஞ்சம்` are a grammatical device in
all these languages, **not a maze**. Do not wrap them in parentheses. Use a code
if you want to track them.

### Pro-drop

All five Indian languages omit subjects freely. An absent subject is
**grammatical** — never mark it `*`.

### Honorifics

`तू / तुम / आप`, `ನೀನು / ನೀವು`, `நீ / நீங்கள்`, `నువ్వు / మీరు`,
`നീ / നിങ്ങൾ` differ in register, not correctness. Code a mismatch only when it
is genuinely inappropriate to the addressee.

## Round-tripping

| Format | Direction | Preserved | Lost |
|---|---|---|---|
| ULASA JSON | both | everything | — |
| SALT text | both | speakers, text, mazes, codes, pauses | gloss, grammaticality marks, timing |
| CHAT `.cha` | both | speakers, text, timing, morpheme tiers | grammaticality marks, clause overrides |

Every export reports what it had to drop. The CHAT writer also states plainly
that it emits a subset, not full CHAT — run CLAN's `CHECK` before using it in a
TalkBank workflow.
