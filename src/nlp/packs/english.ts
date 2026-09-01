import type { LanguagePack } from "../pack";
import { DEFAULT_WORD_BOUNDARY } from "../pack";

/**
 * Indian English (en-IN). Deliberately not "American English with a flag":
 * Indian English has its own stable features (stative progressives, "itself"
 * as an emphatic, invariant tags) that are dialect, not error.
 */
export const ENGLISH: LanguagePack = {
  id: "en-IN",
  name: "English (India)",
  nativeName: "English",
  script: "Latin",
  family: "Germanic",
  wordBoundary: DEFAULT_WORD_BOUNDARY,
  cUnitNotes:
    "A C-unit is an independent clause with its modifiers, including any subordinate clauses. Coordinated independent clauses joined by and/but/so are separate C-units.",
  morphemeProtocol: "published",
  functionWords: [
    "a","an","the","and","or","but","so","if","of","to","in","on","at","for","with","from","by",
    "is","am","are","was","were","be","been","being","do","does","did","have","has","had",
    "i","you","he","she","it","we","they","me","him","her","us","them","my","your","his","its",
    "our","their","this","that","these","those","there","here","not","no","yes","can","could",
    "will","would","shall","should","may","might","must","as","than","then","too","very","just",
  ],
  verbMarkers: [
    // copulas, auxiliaries and modals
    "is","am","are","was","were","be","been","being","do","does","did","doing",
    "have","has","had","having","can","could","will","would","shall","should","must","may","might",
    // high-frequency lexical verbs: base, third-person -s, and irregular past
    "go","goes","went","gone","going","get","gets","got","gotten",
    "make","makes","made","say","says","said","tell","tells","told",
    "want","wants","like","likes","see","sees","saw","seen",
    "come","comes","came","take","takes","took","taken","give","gives","gave","given",
    "put","puts","play","plays","played","run","runs","ran","eat","eats","ate","eaten",
    "know","knows","knew","think","thinks","thought","let","lets",
    "look","looks","looked","need","needs","needed","sit","sits","sat",
    "teach","teaches","taught","sleep","sleeps","slept","forget","forgets","forgot","forgotten",
    "fall","falls","fell","fallen","bring","brings","brought","watch","watches","watched",
    "write","writes","wrote","written","read","reads","draw","draws","drew","drawn",
    "count","counts","counted","catch","catches","caught","break","breaks","broke","broken",
    "fight","fights","fought","stop","stops","stopped","live","lives","lived",
    "work","works","worked","find","finds","found","feel","feels","felt",
    "keep","keeps","kept","hold","holds","held","stand","stands","stood",
    "buy","buys","bought","send","sends","sent","leave","leaves","left","meet","meets","met",
    "hear","hears","heard","speak","speaks","spoke","wear","wears","wore","drink","drinks","drank",
  ],
  // -ing / -ed are strong finite-or-participial cues; the marker list above
  // carries the third-person -s and irregular pasts that no safe suffix rule
  // can reach. A bare /\w+s$/ is deliberately not used — it would match every
  // plural noun and roughly double the verb count.
  verbSuffixes: [/\w{2,}ing$/u, /\w{2,}ed$/u],
  clauseMarkers: [
    "because","that","which","who","whom","whose","when","while","after","before","since",
    "although","though","unless","until","if","whether","where","so","as","than",
  ],
  mazeFillers: ["um","umm","uh","er","erm","like","you know","i mean","actually","hmm","mm"],
  narrativeConnectives: [
    "then","and then","after that","next","finally","first","later","suddenly","because",
    "so","but","meanwhile","at last","one day",
  ],
  errorTaxonomy: [
    { code: "EW", label: "Word-level error" },
    { code: "EU", label: "Utterance-level error" },
    { code: "EO:V", label: "Omitted verb" },
    { code: "EO:AUX", label: "Omitted auxiliary" },
    { code: "EO:ART", label: "Omitted article" },
    { code: "E:AGR", label: "Subject–verb agreement" },
    { code: "E:TNS", label: "Tense marking" },
    { code: "E:PRO", label: "Pronoun form or reference" },
    { code: "E:PL", label: "Plural marking" },
    { code: "E:WO", label: "Word order" },
  ],
  codeMixPartners: ["hi-IN", "ta-IN", "kn-IN", "te-IN", "ml-IN", "mr-IN", "bn-IN"],
  normativeNotes:
    "Brown's 14 grammatical morphemes and SUGAR/SALT English norms apply to this pack. Indian English features such as stative progressives ('I am knowing'), invariant tags ('isn't it?'), and emphatic 'itself' are dialectal and must not be coded as errors.",
  references: [
    "Brown, R. (1973). A First Language.",
    "Pavelko, S. L., & Owens, R. E. (2017). SUGAR: Sampling Utterances and Grammatical Analysis Revised. LSHSS, 48, 197–206.",
    "Miller, J. F., & Iglesias, A. SALT transcription conventions.",
  ],
};
