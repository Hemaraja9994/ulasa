import type { LanguagePack } from "../pack";
import { DEFAULT_WORD_BOUNDARY } from "../pack";

/**
 * Telugu (te-IN), Telugu script.
 *
 * Dravidian, agglutinative, SOV, pro-drop. The finite verb agrees with the
 * subject in person, number and gender, and Telugu additionally distinguishes
 * a masculine vs non-masculine (mahat / amahat) category in the third person
 * that has no English analogue. Surface MLU-w understates complexity for the
 * same reason as Tamil and Kannada.
 *
 * Telugu is diglossic. Spoken Telugu contracts heavily (వెళ్తున్నాడు →
 * వెళ్తన్నాడు, ఏమిటి → ఏంటి). Those are register, not error.
 */
export const TELUGU: LanguagePack = {
  id: "te-IN",
  name: "Telugu",
  nativeName: "తెలుగు",
  script: "Telugu",
  family: "Dravidian",
  wordBoundary: DEFAULT_WORD_BOUNDARY,
  cUnitNotes:
    "Telugu is SOV and pro-drop. Close the C-unit at the finite verb. Verbal participles (చేసి, వచ్చి) chain events before one final finite verb and count as subordinate clauses, not separate C-units. The quotative అని introduces complement clauses; అంటే introduces an explanatory clause.",
  morphemeProtocol: "experimental",
  functionWords: [
    // pronouns
    "నేను", "నువ్వు", "మీరు", "అతను", "వాడు", "ఆమె", "ఆవిడ", "అది", "ఇది", "వాళ్ళు", "వారు",
    "మేము", "మనం", "నాకు", "నీకు", "వాడికి", "ఆమెకు", "మాకు", "నా", "నీ", "వాడి", "మా", "మీ",
    "ఎవరు", "ఏమిటి", "ఏంటి", "ఎక్కడ", "ఎప్పుడు", "ఎలా",
    // postpositions and particles
    "మీద", "కింద", "తో", "దగ్గర", "లోపల", "బయట", "గురించి", "వైపు", "వరకు", "నుండి", "నుంచి",
    "మరియు", "లేదా", "కానీ", "కూడా", "మాత్రమే", "లేదు", "కాదు", "అవును", "ఒక", "ఒకటి",
    "అన్నీ", "కొంచెం", "చాలా", "ఇక్కడ", "అక్కడ", "ఇప్పుడు", "అప్పుడు",
  ],
  verbMarkers: [
    // copulas and existentials
    "ఉంది", "ఉన్నాయి", "ఉన్నాడు", "ఉన్నది", "ఉన్నారు", "ఉండేది", "అయ్యింది", "అయింది", "అవుతుంది",
    // high-frequency verbs: stems and common finite forms
    "వెళ్ళు", "వెళ్ళాడు", "వెళ్ళింది", "వెళ్ళారు", "వెళ్తున్నాడు", "వెళ్ళాను",
    "రా", "వచ్చాడు", "వచ్చింది", "వచ్చారు", "వచ్చాను", "వస్తున్నాడు",
    "చెయ్యి", "చేశాడు", "చేసింది", "చేశారు", "చేశాను", "చేస్తున్నాడు",
    "తిను", "తిన్నాడు", "తింటున్నాడు", "ఆడు", "ఆడాడు", "ఆడుతున్నాడు",
    "చూడు", "చూశాడు", "చూసింది", "చూస్తున్నాడు",
    "చెప్పు", "చెప్పాడు", "చెప్పింది", "చెప్పారు",
    "ఇవ్వు", "ఇచ్చాడు", "తీసుకున్నాడు", "పరిగెత్తాడు", "కూర్చున్నాడు", "పడుకున్నాడు",
    "రాశాడు", "చదివాడు", "విన్నాడు", "తాగాడు", "పడ్డాడు", "లేచాడు",
    "కావాలి", "వద్దు", "తెలుసు",
  ],
  // Past/present/future terminations with mahat–amahat and person marking,
  // plus the contracted spoken progressive. Cues, not a parser.
  // TODO(language-pack): replace with a bundled morphological analyser.
  verbSuffixes: [
    /(ాడు|ింది|ారు|ాను|ావు|ాము|తున్నాను|తున్నాడు|తున్నది|తున్నారు|తుంది|తాడు|తారు|తాను|ేను|ాలి|వచ్చు)$/u,
  ],
  clauseMarkers: [
    "అని", "అంటే", "ఎందుకంటే", "కాబట్టి", "అందుకే", "అప్పుడు", "తర్వాత", "ముందు",
    "అయితే", "ఐతే", "కానీ", "లేదా", "మరియు", "ఎప్పుడైతే", "గనుక",
  ],
  mazeFillers: ["అది", "ఆ", "అంటే", "ఏంటంటే", "మ్మ్", "అబ్బా", "ఆఁ", "అదే", "కదా"],
  narrativeConnectives: [
    "తర్వాత", "ఆ తర్వాత", "అప్పుడు", "మొదట", "చివరికి", "అందుకే", "ఎందుకంటే", "కానీ",
    "ఒక రోజు", "అకస్మాత్తుగా", "ఆ తరువాత",
  ],
  errorTaxonomy: [
    { code: "E:CASE", label: "Case suffix error (-ని/-ను, -కి/-కు, -తో, -లో …)" },
    { code: "EO:CASE", label: "Omitted case suffix" },
    { code: "E:PNG", label: "Person–number–gender agreement on the verb" },
    { code: "E:MAHAT", label: "Mahat / amahat (masculine vs non-masculine) selection" },
    { code: "E:TNS", label: "Tense formative error" },
    { code: "E:ASP", label: "Aspect / compound-verb (కొను, వేయు) error" },
    { code: "E:QUOT", label: "Quotative అని error or omission" },
    { code: "E:NONFIN", label: "Verbal-participle chain formation (చేసి, వచ్చి)" },
    { code: "E:HON", label: "Honorific level (నువ్వు / మీరు) mismatch" },
    { code: "E:WO", label: "Word order deviating from SOV" },
    { code: "E:NEG", label: "Negation (లేదు / కాదు / వద్దు) selection" },
  ],
  codeMixPartners: ["en-IN", "hi-IN", "kn-IN", "ta-IN", "ur-IN"],
  normativeNotes:
    "Do NOT apply English or Hindi morpheme conventions to Telugu. Surface MLU-w understates complexity because tense, aspect and person-number-gender are affixed inside one orthographic word; read it with the experimental morpheme-suggested figure. Telugu is diglossic and spoken contractions (ఏంటి, వెళ్తన్నాడు) are the expected sampling register, not errors. The mahat/amahat distinction has no English analogue and must not be scored against English gender categories. Pro-drop means a missing subject is grammatical. No adequately powered Telugu normative sample is bundled with ULASA.",
  references: [
    "Krishnamurti, Bh., & Gwynn, J. P. L. (1985). A Grammar of Modern Telugu. Oxford University Press.",
    "Krishnamurti, Bh. (2003). The Dravidian Languages. Cambridge University Press.",
    "AI4Bharat IndicNLP Suite, IIT Madras.",
  ],
};
