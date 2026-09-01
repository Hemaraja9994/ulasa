import type { LanguagePack } from "../pack";
import { DEFAULT_WORD_BOUNDARY } from "../pack";

/**
 * Kannada (kn-IN), Kannada script.
 *
 * Dravidian, agglutinative, SOV, pro-drop. Like Tamil and Telugu, Kannada
 * inflects the finite verb for person, number and gender, so a single
 * orthographic word carries material that English spreads across several
 * words. Surface MLU-w therefore understates complexity and must be read
 * alongside the experimental morpheme-suggested figure.
 *
 * Kannada is strongly diglossic: the spoken register (ಆಡುಭಾಷೆ) differs
 * systematically from the written register (ಗ್ರಂಥಿಕ). Language samples are
 * spoken, so colloquial forms (ಮಾಡಿದ್ನಿ, ಯಾಕಂದ್ರೆ, ಅಂತ) are listed here
 * alongside their literary counterparts and must not be coded as errors.
 */
export const KANNADA: LanguagePack = {
  id: "kn-IN",
  name: "Kannada",
  nativeName: "ಕನ್ನಡ",
  script: "Kannada",
  family: "Dravidian",
  wordBoundary: DEFAULT_WORD_BOUNDARY,
  cUnitNotes:
    "Kannada is SOV and pro-drop. Close the C-unit at the finite verb. Non-finite verbal participles (ಮಾಡಿ, ಬಂದು) chain several events before one final finite verb; each chained participle is a subordinate clause for clausal density, not a separate C-unit. The quotative ಅಂತ / ಎಂದು introduces a complement clause.",
  morphemeProtocol: "experimental",
  functionWords: [
    // pronouns
    "ನಾನು", "ನೀನು", "ನೀವು", "ಅವನು", "ಅವಳು", "ಅವರು", "ಅದು", "ಇದು", "ನಾವು", "ಅವು",
    "ನನಗೆ", "ನಿನಗೆ", "ಅವನಿಗೆ", "ಅವಳಿಗೆ", "ನಮಗೆ", "ನನ್ನ", "ನಿನ್ನ", "ಅವನ", "ಅವಳ", "ನಮ್ಮ", "ನಿಮ್ಮ",
    "ಯಾರು", "ಏನು", "ಎಲ್ಲಿ", "ಯಾವ", "ಹೇಗೆ",
    // postpositions and particles
    "ಮೇಲೆ", "ಕೆಳಗೆ", "ಜೊತೆ", "ಹತ್ತಿರ", "ಒಳಗೆ", "ಹೊರಗೆ", "ಬಗ್ಗೆ", "ಕಡೆ", "ವರೆಗೆ",
    "ಮತ್ತು", "ಅಥವಾ", "ಆದರೆ", "ಸಹ", "ಕೂಡ", "ಮಾತ್ರ", "ಇಲ್ಲ", "ಅಲ್ಲ", "ಹೌದು", "ಒಂದು",
    "ಎಲ್ಲಾ", "ಸ್ವಲ್ಪ", "ತುಂಬಾ", "ಬಹಳ", "ಇಲ್ಲಿ", "ಅಲ್ಲಿ", "ಈಗ", "ಆಗ",
  ],
  verbMarkers: [
    // copulas and existentials
    "ಇದೆ", "ಇವೆ", "ಇದ್ದಾನೆ", "ಇದ್ದಾಳೆ", "ಇದ್ದಾರೆ", "ಇತ್ತು", "ಇದ್ದರು", "ಆಗಿದೆ", "ಆಯಿತು", "ಆಯ್ತು",
    // high-frequency verbs: stems and common finite forms
    "ಹೋಗು", "ಹೋದ", "ಹೋದನು", "ಹೋದಳು", "ಹೋದರು", "ಹೋಗ್ತಾನೆ", "ಹೋಗುತ್ತಾನೆ",
    "ಬಾ", "ಬಂದ", "ಬಂದನು", "ಬಂದಳು", "ಬಂದರು", "ಬರುತ್ತಾನೆ",
    "ಮಾಡು", "ಮಾಡಿದ", "ಮಾಡಿದನು", "ಮಾಡಿದಳು", "ಮಾಡುತ್ತಾನೆ", "ಮಾಡ್ತಾನೆ",
    "ತಿನ್ನು", "ತಿಂದ", "ತಿಂದನು", "ತಿನ್ನುತ್ತಾನೆ",
    "ಆಡು", "ಆಡಿದ", "ಆಡಿದನು", "ಆಡುತ್ತಾನೆ",
    "ನೋಡು", "ನೋಡಿದ", "ನೋಡಿದನು", "ನೋಡುತ್ತಾನೆ",
    "ಹೇಳು", "ಹೇಳಿದ", "ಹೇಳಿದನು", "ಹೇಳಿದಳು", "ಹೇಳುತ್ತಾನೆ",
    "ಕೊಡು", "ಕೊಟ್ಟ", "ಕೊಟ್ಟನು", "ತೆಗೆ", "ತೆಗೆದ", "ಓಡು", "ಓಡಿದ", "ಕುಳಿತ", "ಕೂತ",
    "ಬರೆದ", "ಓದಿದ", "ಕೇಳಿದ", "ಕುಡಿದ", "ಮಲಗಿದ", "ಬಿದ್ದ", "ಎದ್ದ",
    "ಬೇಕು", "ಬೇಡ", "ಆಗುತ್ತದೆ", "ಗೊತ್ತು", "ಆಗಲ್ಲ", "ಗೊತ್ತಿಲ್ಲ",
  ],
  // Person-number-gender terminations and tense formatives.
  //
  // The colloquial contractions matter more here than the literary forms: in a
  // spoken sample the written -ುತ್ತಾನೆ is realised as -ತಾನೆ, and the first
  // person -ುತ್ತೇನೆ / -ುತ್ತೇವೆ as -ತೀನಿ / -ತೀವಿ. A pack that recognised only
  // the written register would score most of a real Kannada sample as verbless.
  // Cues, not a parser.
  // TODO(language-pack): replace with a bundled morphological analyser.
  verbSuffixes: [
    /(ುತ್ತೇನೆ|ುತ್ತಾನೆ|ುತ್ತಾಳೆ|ುತ್ತಾರೆ|ುತ್ತದೆ|ುತ್ತೀಯ|ುತ್ತೆ|ುತ್ತಾವೆ)$/u,
    /(ತ್ತೇನೆ|ತ್ತಾನೆ|ತ್ತಾಳೆ|ತ್ತಾರೆ|ತ್ತದೆ|ತ್ತೆ)$/u,
    /(ತೀನಿ|ತೀವಿ|ತೀಯ|ತಾನೆ|ತಾಳೆ|ತಾರೆ|ತಾವೆ|ತದೆ)$/u,
    /(ದನು|ದಳು|ದರು|ದೆನು|ದೆವು|ದೆ|ಿದ|ಿತು|ಿತ್ತು|ಾಯ್ತು|ಾಯಿತು|ಿದ್ನಿ|ಿದ್ರು|ಿದ್ವಿ)$/u,
    /(ಬೇಕು|ಬೇಡ|ಿಲ್ಲ|ಲ್ಲ)$/u,
  ],
  clauseMarkers: [
    "ಅಂತ", "ಎಂದು", "ಏಕೆಂದರೆ", "ಯಾಕಂದ್ರೆ", "ಕಾಬಟ್ಟಿ", "ಕಾರಣ", "ಆದ್ದರಿಂದ",
    "ಆಗ", "ಮೇಲೆ", "ನಂತರ", "ಮೊದಲು", "ಇದ್ದರೆ", "ಅಂದರೆ", "ಆದರೆ", "ಅಥವಾ", "ಮತ್ತು", "ಆಮೇಲೆ",
  ],
  mazeFillers: ["ಅದು", "ಆಮೇಲೆ", "ಅಂದ್ರೆ", "ಏನು", "ಮ್ಮ್", "ಅಃ", "ಸರಿ", "ಅದೇ", "ಅಲ್ವಾ"],
  narrativeConnectives: [
    "ಆಮೇಲೆ", "ನಂತರ", "ಆ ನಂತರ", "ಮೊದಲು", "ಕೊನೆಗೆ", "ಅದಕ್ಕೆ", "ಏಕೆಂದರೆ", "ಆದರೆ",
    "ಒಂದು ದಿನ", "ಇದ್ದಕ್ಕಿದ್ದಂತೆ", "ಆಗ",
  ],
  errorTaxonomy: [
    { code: "E:CASE", label: "Case suffix error (-ನ್ನು, -ಗೆ/-ಕ್ಕೆ, -ಇಂದ, -ಅಲ್ಲಿ …)" },
    { code: "EO:CASE", label: "Omitted case suffix" },
    { code: "E:PNG", label: "Person–number–gender agreement on the verb" },
    { code: "E:TNS", label: "Tense formative error" },
    { code: "E:ASP", label: "Aspect / compound-verb (ಬಿಡು, ಕೊಳ್ಳು) error" },
    { code: "E:QUOT", label: "Quotative ಅಂತ / ಎಂದು error or omission" },
    { code: "E:NONFIN", label: "Verbal-participle chain formation (ಮಾಡಿ, ಬಂದು)" },
    { code: "E:HON", label: "Honorific level (ನೀನು / ನೀವು) mismatch" },
    { code: "E:WO", label: "Word order deviating from SOV" },
    { code: "E:NEG", label: "Negation (ಇಲ್ಲ / ಅಲ್ಲ) selection" },
  ],
  codeMixPartners: ["en-IN", "hi-IN", "te-IN", "ta-IN"],
  normativeNotes:
    "Do NOT apply English or Hindi morpheme conventions to Kannada. Surface MLU-w understates complexity because tense, aspect and person-number-gender are affixed inside one orthographic word; read it with the experimental morpheme-suggested figure. Kannada is diglossic: spoken forms (ಮಾಡಿದ್ನಿ, ಯಾಕಂದ್ರೆ, ಅಂತ) are the expected register in a language sample and must not be coded as errors against the written standard. Pro-drop means a missing subject is grammatical. No adequately powered Kannada normative sample is bundled with ULASA.",
  references: [
    "Sridhar, S. N. (1990). Kannada. Descriptive Grammars Series, Routledge.",
    "Schiffman, H. F. (1983). A Reference Grammar of Spoken Kannada.",
    "AI4Bharat IndicNLP Suite, IIT Madras.",
    "All India Institute of Speech and Hearing (AIISH), Mysuru — Kannada clinical language resources.",
  ],
};
