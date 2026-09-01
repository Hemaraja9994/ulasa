import type { LanguagePack } from "../pack";
import { DEFAULT_WORD_BOUNDARY } from "../pack";

/**
 * Tamil (ta-IN), Tamil script.
 *
 * The central measurement problem: Tamil is agglutinative. A single
 * orthographic word such as போய்க்கொண்டிருந்தான் ("he was going") carries
 * root + aspect + tense + person-number-gender. Surface-token MLU-w therefore
 * systematically understates utterance complexity, in roughly the opposite
 * direction to the way Hindi postpositions overstate it. ULASA reports both the
 * surface MLU-w and an explicitly experimental morpheme-suggested figure, and
 * never presents the two as interchangeable.
 */
export const TAMIL: LanguagePack = {
  id: "ta-IN",
  name: "Tamil",
  nativeName: "தமிழ்",
  script: "Tamil",
  family: "Dravidian",
  wordBoundary: DEFAULT_WORD_BOUNDARY,
  cUnitNotes:
    "Tamil is SOV, pro-drop, and chains non-finite (participial and verbal-participle) clauses before a single final finite verb. Close the C-unit at the finite verb; each participial clause is a subordinate clause contributing to clausal density. The copula is frequently absent in equational clauses and this is grammatical.",
  morphemeProtocol: "experimental",
  functionWords: [
    "நான்", "நீ", "நீங்கள்", "அவன்", "அவள்", "அவர்", "அது", "இது", "நாம்", "நாங்கள்", "அவர்கள்",
    "எனக்கு", "உனக்கு", "என்", "உன்", "இங்கே", "அங்கே", "இப்போது", "அப்போது", "மற்றும்",
    "ஆனா", "ஆனால்", "அல்லது", "இல்லை", "ஆம்", "ஒரு", "எல்லாம்", "கொஞ்சம்", "ரொம்ப", "மட்டும்", "கூட", "தான்",
  ],
  verbMarkers: [
    "இருக்கு", "இருக்கிறது", "இருந்தது", "இருந்தான்", "இருந்தாள்", "ஆச்சு", "வேண்டும்", "முடியும்", "கூடாது",
    "போ", "போனான்", "போனாள்", "போச்சு", "வா", "வந்தான்", "வந்தாள்", "வந்தது", "சொன்னான்", "சொன்னாள்", "சொல்",
    "பண்ணு", "பண்ணினான்", "சாப்பிட்டான்", "சாப்பிடு", "விளையாடு", "விளையாடினான்", "பார்த்தான்", "பாரு",
    "கொடு", "கொடுத்தான்", "எடு", "எடுத்தான்", "ஓடு", "ஓடினான்", "அழு", "அழுதான்", "சிரி", "சிரித்தான்",
  ],
  // Person-number-gender terminations and common tense/aspect formatives.
  //
  // Spoken Tamil differs sharply from the written register, and a language
  // sample is spoken. The colloquial third-person plural -ஆங்க (போட்டாங்க),
  // the first-person plural -ஓம் (போனோம்), and the -ச்சு / -உச்சு perfective
  // (போயிடுச்சு) are the forms that actually occur; a pack matching only
  // literary endings would score most of a real Tamil sample as verbless.
  //
  // Deliberately excluded: bare -து. It is a productive nominaliser and would
  // match the pronouns அது and இது, inflating the verb count.
  //
  // Tamil sandhi means these are cues, not a parser.
  // TODO(language-pack): replace with a bundled finite-state morphological
  // analyser once one can ship locally with no API key.
  verbSuffixes: [
    /(ான்|ாள்|ார்|ாங்க|ார்கள்|ர்கள்)$/u,
    /(ேன்|ோம்|ீர்கள்|ாய்)$/u,
    /(கிறேன்|கிறான்|கிறாள்|கிறது|கிறார்|கிறோம்)$/u,
    /(ந்தான்|ந்தாள்|ந்தது|ந்தேன்|ந்தோம்|ந்தாங்க)$/u,
    /(ச்சு|ச்சது|ச்சேன்|ட்டேன்|ட்டோம்|ட்டான்|டுச்சு|ுச்சு|ிச்சு)$/u,
    /(வேன்|வான்|வாள்|வோம்|ணும்|லாம்)$/u,
  ],
  clauseMarkers: [
    "என்று", "என்னு", "னு", "ஆனால்", "போது", "பிறகு", "முன்", "அதனால்", "ஏன்னா", "ஏனென்றால்", "அப்புறம்", "விட",
  ],
  mazeFillers: ["அப்புறம்", "அது", "ம்ம்", "ஆ", "அந்த", "அதான்", "பா", "இல்ல"],
  narrativeConnectives: [
    "அப்புறம்", "பிறகு", "அதுக்கு அப்புறம்", "முதல்ல", "கடைசியா", "அதனால்", "ஏனென்றால்", "ஆனால்", "ஒரு நாள்", "திடீரென்று",
  ],
  errorTaxonomy: [
    { code: "E:CASE", label: "Case suffix error (-ஐ, -க்கு, -இல், -ஆல் …)" },
    { code: "EO:CASE", label: "Omitted case suffix" },
    { code: "E:PNG", label: "Person–number–gender agreement on the verb" },
    { code: "E:TNS", label: "Tense formative error" },
    { code: "E:ASP", label: "Aspect (கொண்டிரு / விடு) error" },
    { code: "E:QUOT", label: "Quotative என்று error or omission" },
    { code: "E:NONFIN", label: "Non-finite / participial clause formation" },
    { code: "E:HON", label: "Honorific level mismatch" },
    { code: "E:WO", label: "Word order deviating from SOV" },
  ],
  codeMixPartners: ["en-IN"],
  normativeNotes:
    "Do NOT apply English or Hindi morpheme conventions to Tamil. Surface-token MLU-w systematically understates complexity because tense, aspect and person-number-gender are affixed inside a single orthographic word; read it together with the experimental morpheme-suggested figure. Sandhi makes naive word counts unreliable at clause boundaries. Copula absence in equational clauses is grammatical. No adequately powered Tamil normative sample is bundled with ULASA.",
  references: [
    "Lehmann, T. (1989). A Grammar of Modern Tamil. Pondicherry Institute of Linguistics and Culture.",
    "Annamalai, E., & Steever, S. B. (1998). Modern Tamil. In The Dravidian Languages.",
    "AI4Bharat IndicNLP Suite, IIT Madras.",
  ],
};
