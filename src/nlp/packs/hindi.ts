import type { LanguagePack } from "../pack";
import { DEFAULT_WORD_BOUNDARY } from "../pack";

/**
 * Hindi (hi-IN), Devanagari.
 *
 * Clinical caution encoded here: Hindi marks case with postpositions that are
 * written as separate orthographic words (राम ने, घर में). Counting them as
 * words inflates MLU-w relative to a language that affixes the same material.
 * ULASA reports MLU-w as the primary figure and exposes a postposition count
 * so a clinician can see how much of the length is case marking.
 */
export const HINDI: LanguagePack = {
  id: "hi-IN",
  name: "Hindi",
  nativeName: "हिन्दी",
  script: "Devanagari",
  family: "Indo-Aryan",
  wordBoundary: DEFAULT_WORD_BOUNDARY,
  cUnitNotes:
    "Hindi is SOV and pro-drop. A C-unit is one finite predicate with its arguments and any subordinate clauses. 'कि' complements and 'क्योंकि/जब/अगर' clauses attach to the matrix C-unit rather than forming new ones. Absence of an overt subject is normal and is never an omission error.",
  // Hindi morpheme counting for MLU-m has no single agreed clinical protocol
  // comparable to Brown's for English. We split conservatively and label the
  // result experimental everywhere it is displayed.
  morphemeProtocol: "experimental",
  functionWords: [
    // postpositions / case markers
    "ने", "को", "से", "में", "पर", "का", "की", "के", "तक", "लिए", "साथ", "बाद", "पहले", "पास", "ऊपर", "नीचे", "बिना",
    // pronouns
    "मैं", "मुझे", "मेरा", "मेरी", "मेरे", "तू", "तुम", "तुम्हें", "तुम्हारा", "आप", "आपका", "वह", "वो", "उस", "उसे",
    "उसका", "उसकी", "उसके", "ये", "यह", "इस", "इसे", "हम", "हमें", "हमारा", "वे", "उन", "उन्हें", "उनका", "कौन", "क्या",
    // determiners, conjunctions, particles
    "और", "या", "लेकिन", "भी", "ही", "तो", "न", "नहीं", "मत", "बहुत", "थोड़ा", "सब", "कुछ", "कोई", "एक", "यहाँ", "वहाँ",
  ],
  verbMarkers: [
    // copulas
    "है", "हैं", "हूँ", "हूं", "हो", "था", "थी", "थे", "थीं",
    // aspect auxiliaries
    "रहा", "रही", "रहे", "चुका", "चुकी", "चुके", "गया", "गयी", "गई", "गए", "गये",
    // high-frequency light and main verbs (stems and common finite forms)
    "कर", "करता", "करती", "करते", "किया", "करना", "करूँगा", "करेगा", "करेंगे",
    "दे", "देता", "देती", "देते", "दिया", "देना", "ले", "लेता", "लेती", "लेते", "लिया", "लेना",
    "जा", "जाता", "जाती", "जाते", "जाना", "आ", "आता", "आती", "आते", "आया", "आना",
    "खा", "खाता", "खाती", "खाते", "खाया", "पी", "पीता", "पिया", "देख", "देखता", "देखा", "देखना",
    "बोल", "बोला", "कह", "कहा", "खेल", "खेला", "सो", "सोया", "बैठ", "बैठा", "चल", "चला", "भाग", "भागा",
    "बना", "बनाया", "रख", "रखा", "पढ़", "पढ़ा", "लिख", "लिखा", "सुन", "सुना", "मिल", "मिला", "हुआ", "होता", "होगा",
  ],
  // Participial and infinitival endings. Deliberately narrow: over-matching
  // would inflate the verb count and therefore clausal density.
  verbSuffixes: [/(ता|ती|ते|या|यी|ये|ना|नी|ने|ेगा|ेगी|ेंगे|ूँगा)$/u],
  clauseMarkers: [
    "कि", "क्योंकि", "जब", "तब", "अगर", "यदि", "तो", "जो", "जिस", "जिसे", "जहाँ", "जैसे", "ताकि", "मगर", "लेकिन", "फिर",
  ],
  mazeFillers: ["मतलब", "यानी", "अच्छा", "वो", "वोह", "अं", "उम्म", "हम्म", "ऐसे", "na", "yaar"],
  narrativeConnectives: [
    "फिर", "उसके बाद", "तब", "पहले", "आखिर में", "अंत में", "इसलिए", "क्योंकि", "लेकिन", "एक दिन", "अचानक", "जब",
  ],
  errorTaxonomy: [
    { code: "E:PP", label: "Postposition / case-marker error (ने, को, से, में …)" },
    { code: "EO:PP", label: "Omitted postposition" },
    { code: "E:ERG", label: "Ergative ने misuse in perfective" },
    { code: "E:AGR:G", label: "Gender agreement" },
    { code: "E:AGR:N", label: "Number agreement" },
    { code: "E:ASP", label: "Aspect auxiliary (रहा/चुका) error" },
    { code: "E:TNS", label: "Tense marking" },
    { code: "E:HON", label: "Honorific level (तू/तुम/आप) mismatch" },
    { code: "E:WO", label: "Word order deviating from SOV" },
    { code: "E:LV", label: "Light-verb construction error" },
  ],
  codeMixPartners: ["en-IN", "ur-IN", "pa-IN", "mr-IN"],
  normativeNotes:
    "Do NOT apply Brown's English morphemes to Hindi. Case postpositions are written separately and inflate MLU-w; interpret alongside the postposition count. Pro-drop means a missing subject is grammatical, not an omission. Hindi–English code-mixing is typical community practice, not an error. No adequately powered Hindi normative sample is bundled with ULASA — interpret descriptively or against a locally built reference set.",
  references: [
    "Koul, O. N. (2008). Modern Hindi Grammar. Dunwoody Press.",
    "Kidwai, A. (2000). XP-Adjunction in Universal Grammar: Scrambling and Binding in Hindi-Urdu.",
    "AI4Bharat IndicNLP / IndicPOS resources, IIT Madras.",
  ],
};
