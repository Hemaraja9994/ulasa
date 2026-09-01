import type { LanguagePack } from "../pack";
import { DEFAULT_WORD_BOUNDARY } from "../pack";

/**
 * Malayalam (ml-IN), Malayalam script.
 *
 * Dravidian, agglutinative, SOV, pro-drop — but with one typological property
 * that materially changes clinical coding: **Malayalam finite verbs do not
 * agree with the subject in person, number or gender.** പോയി is "went" for
 * I, you, he, she and they alike. Any error palette that offers a
 * subject–verb agreement code for Malayalam is importing a category the
 * language does not have, so this pack deliberately omits E:PNG where Tamil,
 * Kannada and Telugu include it.
 *
 * Malayalam also has unusually heavy sandhi and compounding, which pushes even
 * more material inside a single orthographic word than its sister languages.
 * Surface MLU-w understates complexity correspondingly.
 */
export const MALAYALAM: LanguagePack = {
  id: "ml-IN",
  name: "Malayalam",
  nativeName: "മലയാളം",
  script: "Malayalam",
  family: "Dravidian",
  wordBoundary: DEFAULT_WORD_BOUNDARY,
  cUnitNotes:
    "Malayalam is SOV and pro-drop. Close the C-unit at the finite verb. Verbal participles (ചെയ്ത്, വന്ന്) and the -മ്പോൾ / -ിട്ട് forms chain events before one final finite verb and count as subordinate clauses. The quotative എന്ന് introduces complement clauses; the relativiser എന്ന forms relative clauses. Because the verb carries no agreement, the subject is often recoverable only from discourse — do not code a missing subject as an omission.",
  morphemeProtocol: "experimental",
  functionWords: [
    // pronouns
    "ഞാൻ", "നീ", "നിങ്ങൾ", "അവൻ", "അവൾ", "അവർ", "അത്", "ഇത്", "ഞങ്ങൾ", "നമ്മൾ", "അവ",
    "എനിക്ക്", "നിനക്ക്", "അവന്", "അവൾക്ക്", "ഞങ്ങൾക്ക്", "എന്റെ", "നിന്റെ", "അവന്റെ", "അവളുടെ",
    "ഞങ്ങളുടെ", "നിങ്ങളുടെ", "ആര്", "എന്ത്", "എവിടെ", "എപ്പോൾ", "എങ്ങനെ",
    // postpositions and particles
    "മുകളിൽ", "താഴെ", "കൂടെ", "അടുത്ത്", "അകത്ത്", "പുറത്ത്", "കുറിച്ച്", "വരെ", "നിന്ന്",
    "ഒപ്പം", "അല്ലെങ്കിൽ", "പക്ഷെ", "പക്ഷേ", "കൂടി", "മാത്രം", "ഇല്ല", "അല്ല", "അതെ", "ഒരു",
    "എല്ലാം", "കുറച്ച്", "ഒരുപാട്", "വളരെ", "ഇവിടെ", "അവിടെ", "ഇപ്പോൾ", "അപ്പോൾ",
  ],
  verbMarkers: [
    // copulas and existentials
    "ആണ്", "ആയിരുന്നു", "ഉണ്ട്", "ഉണ്ടായിരുന്നു", "ഇല്ല", "അല്ല", "ആകും", "ആയി",
    // high-frequency verbs: stems and common finite forms
    "പോ", "പോയി", "പോകുന്നു", "പോകും", "പോയിരുന്നു",
    "വാ", "വന്നു", "വരുന്നു", "വരും",
    "ചെയ്യ്", "ചെയ്തു", "ചെയ്യുന്നു", "ചെയ്യും",
    "തിന്നു", "തിന്നുന്നു", "കഴിച്ചു", "കഴിക്കുന്നു",
    "കളിച്ചു", "കളിക്കുന്നു", "കണ്ടു", "കാണുന്നു", "കാണും",
    "പറഞ്ഞു", "പറയുന്നു", "പറയും", "കൊടുത്തു", "കൊടുക്കുന്നു",
    "എടുത്തു", "ഓടി", "ഓടുന്നു", "ഇരുന്നു", "ഇരിക്കുന്നു", "കിടന്നു",
    "എഴുതി", "വായിച്ചു", "കേട്ടു", "കുടിച്ചു", "വീണു", "എഴുന്നേറ്റു",
    "വേണം", "വേണ്ട", "അറിയാം", "പറ്റും",
  ],
  // Tense/aspect terminations only — there is no agreement morphology to match.
  // -ഉ / -ി / -ഞ്ഞു / -ത്തു mark past, -ുന്നു present, -ും future.
  // TODO(language-pack): replace with a bundled morphological analyser.
  verbSuffixes: [
    /(ുന്നു|ുന്ന|ുകയാണ്|ിരുന്നു|ഞ്ഞു|ച്ചു|ത്തു|ട്ടു|ന്നു|ുമ്പോൾ|ിട്ട്|ണം|ും|ി)$/u,
  ],
  clauseMarkers: [
    "എന്ന്", "എന്ന", "എന്നാൽ", "കാരണം", "അതുകൊണ്ട്", "അപ്പോൾ", "ശേഷം", "മുമ്പ്",
    "എങ്കിൽ", "പക്ഷെ", "പക്ഷേ", "അല്ലെങ്കിൽ", "മ്പോൾ", "അതിനുശേഷം", "എന്നിട്ട്",
  ],
  mazeFillers: ["അത്", "പിന്നെ", "ആ", "മ്മ്", "എന്നു വച്ചാൽ", "അതായത്", "അല്ലേ", "ഉം"],
  narrativeConnectives: [
    "പിന്നെ", "അതിനുശേഷം", "അപ്പോൾ", "ആദ്യം", "അവസാനം", "അതുകൊണ്ട്", "കാരണം",
    "പക്ഷെ", "ഒരു ദിവസം", "പെട്ടെന്ന്", "എന്നിട്ട്",
  ],
  errorTaxonomy: [
    { code: "E:CASE", label: "Case suffix error (-എ/-യെ, -ന്/-ക്ക്, -ഇൽ, -ഓട് …)" },
    { code: "EO:CASE", label: "Omitted case suffix" },
    { code: "E:TNS", label: "Tense formative error (-ി / -ഉന്നു / -ഉം)" },
    { code: "E:ASP", label: "Aspect / compound-verb (കൊണ്ടിരിക്കുക, കളയുക) error" },
    { code: "E:QUOT", label: "Quotative എന്ന് error or omission" },
    { code: "E:REL", label: "Relative-participle / എന്ന clause formation" },
    { code: "E:NONFIN", label: "Verbal-participle chain formation (ചെയ്ത്, വന്ന്)" },
    { code: "E:SANDHI", label: "Sandhi or compounding at a word boundary" },
    { code: "E:HON", label: "Honorific level (നീ / നിങ്ങൾ / താങ്കൾ) mismatch" },
    { code: "E:WO", label: "Word order deviating from SOV" },
    { code: "E:NEG", label: "Negation (ഇല്ല / അല്ല / വേണ്ട) selection" },
    // NOTE: no E:PNG code. Malayalam finite verbs carry no subject agreement,
    // so a subject–verb agreement error is not a possible error type here.
  ],
  codeMixPartners: ["en-IN", "ta-IN", "kn-IN", "hi-IN"],
  normativeNotes:
    "Do NOT apply English, Hindi or Tamil morpheme conventions to Malayalam. Critically, Malayalam finite verbs do NOT agree with the subject in person, number or gender — never code a subject–verb agreement error, and never treat an unmarked verb as an omission. Heavy sandhi and compounding place more material inside a single orthographic word than in Tamil or Kannada, so surface MLU-w understates complexity; read it with the experimental morpheme-suggested figure. Pro-drop means a missing subject is grammatical. No adequately powered Malayalam normative sample is bundled with ULASA.",
  references: [
    "Asher, R. E., & Kumari, T. C. (1997). Malayalam. Descriptive Grammars Series, Routledge.",
    "Jayaseelan, K. A. (2001). IP-internal topic and focus phrases (Malayalam).",
    "Krishnamurti, Bh. (2003). The Dravidian Languages. Cambridge University Press.",
    "AI4Bharat IndicNLP Suite, IIT Madras.",
  ],
};
