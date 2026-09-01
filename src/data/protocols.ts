import type { Bcp47, ElicitationContext } from "@/core/types";

/**
 * Elicitation protocols.
 *
 * Adapted from SALT's elicitation kits and SUGAR's conversational technique,
 * localised for Indian classrooms and clinics. Prompts are given in all six
 * supported languages so an examiner is not translating on the fly — an
 * improvised translation changes the task, and a changed task changes the
 * sample.
 *
 * Stimuli are described, not bundled. ULASA ships no Frog-story pictures and no
 * other copyrighted stimulus set; where a picture sequence is needed the
 * protocol says what kind of scene to use and leaves the choice to the clinic.
 */

export interface Protocol {
  id: string;
  context: ElicitationContext;
  label: string;
  ageRange: string;
  duration: string;
  minimumSet: string;
  purpose: string;
  supports: string[];
  dos: string[];
  donts: string[];
  prompts: Record<Bcp47 | string, string[]>;
}

export const PROTOCOLS: Protocol[] = [
  {
    id: "conversation",
    context: "conversation",
    label: "Conversation (SUGAR-style)",
    ageRange: "3;0 – 12;0",
    duration: "10–15 minutes of talk",
    minimumSet: "50 complete and intelligible utterances",
    purpose:
      "The default sample. Process questions — asking how or why something happens rather than what it is — pull multi-clause answers rather than one-word labels.",
    supports: ["MLU-w", "NDW / MTLD", "Words per sentence", "Clausal density", "Maze rate", "Speaking rate"],
    dos: [
      "Ask open, process-oriented questions: how it works, why it happened, what happened next.",
      "Wait. A silence of five seconds often produces the longest utterance in the sample.",
      "Follow the child's topic even if it leaves your list.",
      "Let the child use whichever language or mix they choose, and record what they chose.",
    ],
    donts: [
      "Do not ask yes/no or one-word questions; they depress MLU and the sample stops being comparable.",
      "Do not correct grammar or vocabulary during the sample.",
      "Do not fill silences with a new question.",
      "Do not insist on one language; forcing monolingual output makes the sample unrepresentative.",
    ],
    prompts: {
      "en-IN": [
        "Tell me about your school.",
        "How do you get there in the morning?",
        "What is the best thing that happened this week?",
        "Tell me how you play that game.",
        "What happens when it rains here?",
      ],
      "hi-IN": [
        "मुझे अपने स्कूल के बारे में बताओ।",
        "सुबह तुम वहाँ कैसे जाते हो?",
        "इस हफ़्ते की सबसे अच्छी बात क्या थी?",
        "वो खेल कैसे खेलते हैं, मुझे बताओ।",
        "जब यहाँ बारिश होती है तो क्या होता है?",
      ],
      "kn-IN": [
        "ನಿನ್ನ ಶಾಲೆಯ ಬಗ್ಗೆ ಹೇಳು.",
        "ಬೆಳಿಗ್ಗೆ ನೀನು ಅಲ್ಲಿಗೆ ಹೇಗೆ ಹೋಗ್ತೀಯ?",
        "ಈ ವಾರದ ಅತ್ಯಂತ ಒಳ್ಳೆಯ ಸಂಗತಿ ಏನು?",
        "ಆ ಆಟ ಹೇಗೆ ಆಡ್ತಾರೆ ಅಂತ ಹೇಳು.",
        "ಇಲ್ಲಿ ಮಳೆ ಬಂದಾಗ ಏನಾಗುತ್ತೆ?",
      ],
      "ta-IN": [
        "உன் பள்ளியை பத்தி சொல்லு.",
        "காலையில அங்க எப்படி போவே?",
        "இந்த வாரம் நடந்த சந்தோஷமான விஷயம் என்ன?",
        "அந்த விளையாட்டு எப்படி விளையாடுவாங்க சொல்லு.",
        "இங்க மழை பெஞ்சா என்ன ஆகும்?",
      ],
      "te-IN": [
        "నీ స్కూల్ గురించి చెప్పు.",
        "ఉదయం అక్కడికి ఎలా వెళ్తావు?",
        "ఈ వారంలో జరిగిన మంచి విషయం ఏమిటి?",
        "ఆ ఆట ఎలా ఆడతారో చెప్పు.",
        "ఇక్కడ వర్షం పడితే ఏం జరుగుతుంది?",
      ],
      "ml-IN": [
        "നിന്റെ സ്കൂളിനെ കുറിച്ച് പറയൂ.",
        "രാവിലെ അവിടെ എങ്ങനെ പോകും?",
        "ഈ ആഴ്ചയിൽ നടന്ന ഏറ്റവും നല്ല കാര്യം എന്താണ്?",
        "ആ കളി എങ്ങനെ കളിക്കും എന്ന് പറയൂ.",
        "ഇവിടെ മഴ പെയ്താൽ എന്ത് സംഭവിക്കും?",
      ],
    },
  },
  {
    id: "personal_narrative",
    context: "personal_narrative",
    label: "Personal narrative",
    ageRange: "4;0 – 16;0",
    duration: "5–10 minutes",
    minimumSet: "One complete narrative; 50 utterances if combined with conversation",
    purpose:
      "Elicits macrostructure — orientation, complication, resolution — without a picture stimulus, so it travels between clinics and languages unchanged.",
    supports: ["Narrative rubric", "Clausal density", "Cohesion devices", "Referencing"],
    dos: [
      "Model one short narrative of your own first, then hand over.",
      "Use a minimal encourager once the child starts: 'and then?', 'mm-hm'.",
      "Let the child finish before asking anything.",
    ],
    donts: [
      "Do not ask comprehension questions during the narrative.",
      "Do not supply the next event when the child pauses.",
      "Do not choose a topic that assumes a particular family structure or festival.",
    ],
    prompts: {
      "en-IN": [
        "Tell me about a time you got hurt.",
        "Tell me about a day you will always remember.",
        "Tell me what happened the last time you went somewhere new.",
      ],
      "hi-IN": [
        "मुझे उस समय के बारे में बताओ जब तुम्हें चोट लगी थी।",
        "किसी ऐसे दिन के बारे में बताओ जो तुम्हें हमेशा याद रहेगा।",
        "पिछली बार जब तुम कहीं नई जगह गए थे, तब क्या हुआ था?",
      ],
      "kn-IN": [
        "ನಿನಗೆ ಪೆಟ್ಟಾದ ಒಂದು ಸಂದರ್ಭದ ಬಗ್ಗೆ ಹೇಳು.",
        "ಯಾವಾಗಲೂ ನೆನಪಿರುವ ಒಂದು ದಿನದ ಬಗ್ಗೆ ಹೇಳು.",
        "ಕೊನೆಯ ಸಲ ಹೊಸ ಜಾಗಕ್ಕೆ ಹೋದಾಗ ಏನಾಯ್ತು?",
      ],
      "ta-IN": [
        "உனக்கு அடிபட்ட ஒரு சமயத்தை பத்தி சொல்லு.",
        "எப்பவும் ஞாபகம் இருக்குற ஒரு நாளை பத்தி சொல்லு.",
        "கடைசியா புது இடத்துக்கு போனப்போ என்ன நடந்துச்சு?",
      ],
      "te-IN": [
        "నీకు దెబ్బ తగిలిన ఒక సందర్భం గురించి చెప్పు.",
        "ఎప్పటికీ గుర్తుండిపోయే ఒక రోజు గురించి చెప్పు.",
        "చివరిసారి కొత్త చోటికి వెళ్ళినప్పుడు ఏం జరిగింది?",
      ],
      "ml-IN": [
        "നിനക്ക് പരിക്ക് പറ്റിയ ഒരു സന്ദർഭത്തെ കുറിച്ച് പറയൂ.",
        "എപ്പോഴും ഓർമ്മയിൽ നിൽക്കുന്ന ഒരു ദിവസത്തെ കുറിച്ച് പറയൂ.",
        "അവസാനമായി പുതിയ ഒരു സ്ഥലത്ത് പോയപ്പോൾ എന്ത് സംഭവിച്ചു?",
      ],
    },
  },
  {
    id: "narrative_retell",
    context: "narrative_retell",
    label: "Story retell",
    ageRange: "4;0 – 12;0",
    duration: "5–10 minutes",
    minimumSet: "One complete retell",
    purpose:
      "Holds content constant across children, which makes macrostructure comparable in a way that free narrative cannot be.",
    supports: ["Narrative rubric", "Story-grammar checklist", "Referencing", "Cohesion"],
    dos: [
      "Use a wordless picture sequence the clinic owns or has created, or an orally presented story.",
      "Present the story once, then remove it before the retell if you are testing recall.",
      "Record which stimulus you used; a retell is only comparable against the same stimulus.",
    ],
    donts: [
      "Do not use a copyrighted picture-book sequence you do not have rights to.",
      "Do not prompt with story-grammar questions during the retell.",
      "Do not use a stimulus whose setting is unfamiliar — an unfamiliar scene depresses the score for reasons that have nothing to do with language.",
    ],
    prompts: {
      "en-IN": [
        "I am going to tell you a story. Listen carefully, and then you tell it back to me.",
        "Now you tell me the story, from the beginning.",
      ],
      "hi-IN": [
        "मैं तुम्हें एक कहानी सुनाऊँगी। ध्यान से सुनो, फिर तुम मुझे सुनाना।",
        "अब तुम मुझे शुरू से कहानी सुनाओ।",
      ],
      "kn-IN": [
        "ನಾನು ನಿಂಗೆ ಒಂದು ಕಥೆ ಹೇಳ್ತೀನಿ. ಗಮನವಿಟ್ಟು ಕೇಳು, ಆಮೇಲೆ ನೀನು ನಂಗೆ ಹೇಳು.",
        "ಈಗ ನೀನು ಮೊದಲಿಂದ ಕಥೆ ಹೇಳು.",
      ],
      "ta-IN": [
        "நான் உனக்கு ஒரு கதை சொல்றேன். கவனமா கேளு, அப்புறம் நீ எனக்கு சொல்லு.",
        "இப்போ நீ ஆரம்பத்துல இருந்து கதை சொல்லு.",
      ],
      "te-IN": [
        "నేను నీకు ఒక కథ చెప్తాను. శ్రద్ధగా విను, తర్వాత నువ్వు నాకు చెప్పు.",
        "ఇప్పుడు నువ్వు మొదటి నుండి కథ చెప్పు.",
      ],
      "ml-IN": [
        "ഞാൻ നിനക്ക് ഒരു കഥ പറയാം. ശ്രദ്ധിച്ച് കേൾക്കൂ, പിന്നെ നീ എനിക്ക് പറയണം.",
        "ഇപ്പോൾ നീ തുടക്കം മുതൽ കഥ പറയൂ.",
      ],
    },
  },
  {
    id: "expository",
    context: "expository",
    label: "Expository explanation",
    ageRange: "7;0 – 18;0",
    duration: "3–6 minutes",
    minimumSet: "One complete explanation",
    purpose:
      "Explanation places heavier syntactic demands than conversation and separates children who converse adequately but cannot sustain academic language.",
    supports: ["Clausal density", "Expository rubric", "Topic vocabulary", "Content-word ratio"],
    dos: [
      "Choose a topic the child genuinely knows well.",
      "Say the listener does not know the topic, so the child must be explicit.",
      "Accept English technical terms inside an Indic utterance — that is normal Indian classroom register.",
    ],
    donts: [
      "Do not pick a school subject the child is failing.",
      "Do not prompt for the next step.",
    ],
    prompts: {
      "en-IN": [
        "Explain the rules of your favourite game to someone who has never played it.",
        "Explain how you make something you know how to make.",
        "Explain how to get from your house to your school.",
      ],
      "hi-IN": [
        "अपने पसंदीदा खेल के नियम किसी ऐसे व्यक्ति को समझाओ जिसने वो कभी नहीं खेला।",
        "जो चीज़ तुम बनाना जानते हो, वो कैसे बनाते हैं समझाओ।",
        "अपने घर से स्कूल तक कैसे पहुँचते हैं, समझाओ।",
      ],
      "kn-IN": [
        "ನಿನಗೆ ಇಷ್ಟವಾದ ಆಟದ ನಿಯಮಗಳನ್ನು ಎಂದೂ ಆಡದವರಿಗೆ ವಿವರಿಸು.",
        "ನೀನು ಮಾಡಲು ಗೊತ್ತಿರುವ ಒಂದು ವಸ್ತುವನ್ನು ಹೇಗೆ ಮಾಡ್ತೀಯ ಅಂತ ವಿವರಿಸು.",
        "ನಿನ್ನ ಮನೆಯಿಂದ ಶಾಲೆಗೆ ಹೇಗೆ ಹೋಗಬೇಕು ಅಂತ ವಿವರಿಸು.",
      ],
      "ta-IN": [
        "உனக்கு பிடிச்ச விளையாட்டோட விதிகளை, அதை விளையாடாதவங்களுக்கு விளக்கு.",
        "நீ செய்யத் தெரிஞ்ச ஒரு விஷயத்தை எப்படி செய்யறே சொல்லு.",
        "உன் வீட்டுல இருந்து பள்ளிக்கு எப்படி போறது விளக்கு.",
      ],
      "te-IN": [
        "నీకు ఇష్టమైన ఆట నియమాలను, ఎప్పుడూ ఆడని వాళ్ళకి వివరించు.",
        "నీకు చేయడం తెలిసిన ఒక వస్తువును ఎలా చేస్తావో వివరించు.",
        "నీ ఇంటి నుండి స్కూల్‌కి ఎలా వెళ్ళాలో వివరించు.",
      ],
      "ml-IN": [
        "നിനക്ക് ഇഷ്ടമുള്ള കളിയുടെ നിയമങ്ങൾ, ഒരിക്കലും കളിക്കാത്ത ഒരാൾക്ക് വിശദീകരിക്കൂ.",
        "നിനക്ക് ഉണ്ടാക്കാൻ അറിയാവുന്ന ഒരു സാധനം എങ്ങനെ ഉണ്ടാക്കും എന്ന് വിശദീകരിക്കൂ.",
        "നിന്റെ വീട്ടിൽ നിന്ന് സ്കൂളിലേക്ക് എങ്ങനെ പോകും എന്ന് വിശദീകരിക്കൂ.",
      ],
    },
  },
  {
    id: "picture_description",
    context: "picture_description",
    label: "Picture description",
    ageRange: "3;0 – adult",
    duration: "2–4 minutes",
    minimumSet: "Whatever the picture yields; pair with another task",
    purpose:
      "A constrained, repeatable elicitation for progress monitoring and for adults with acquired language disorders.",
    supports: ["NDW", "Content-word ratio", "Maze rate", "Utterances with verbs"],
    dos: [
      "Use a busy, culturally familiar scene — a market, a classroom, a railway station, a festival.",
      "Use the same picture at baseline and follow-up.",
      "Ask once, then stay quiet.",
    ],
    donts: [
      "Do not use the Cookie Theft picture with children unfamiliar with its setting; substitute an India-contextual scene.",
      "Do not name objects for the speaker.",
    ],
    prompts: {
      "en-IN": ["Tell me everything you see happening in this picture."],
      "hi-IN": ["इस तस्वीर में जो कुछ हो रहा है, वो सब मुझे बताओ।"],
      "kn-IN": ["ಈ ಚಿತ್ರದಲ್ಲಿ ಏನೆಲ್ಲಾ ನಡೀತಿದೆ ಅಂತ ಎಲ್ಲಾ ಹೇಳು."],
      "ta-IN": ["இந்த படத்துல என்னென்ன நடக்குதுன்னு எல்லாம் சொல்லு."],
      "te-IN": ["ఈ బొమ్మలో ఏమేమి జరుగుతుందో అంతా చెప్పు."],
      "ml-IN": ["ഈ ചിത്രത്തിൽ എന്തെല്ലാം നടക്കുന്നു എന്ന് എല്ലാം പറയൂ."],
    },
  },
  {
    id: "bilingual",
    context: "conversation",
    label: "Bilingual protocol",
    ageRange: "3;0 – 18;0",
    duration: "Two sessions of 10 minutes",
    minimumSet: "50 utterances per language where possible",
    purpose:
      "Most Indian children are multilingual. Sampling one language only will underestimate ability, sometimes severely. Run the same task in each language and analyse them separately.",
    supports: ["Separate and pooled measures", "Code-mix ratio", "Switch points per 100 words"],
    dos: [
      "Run the same task in each language, ideally with a different interlocutor for each.",
      "Record which language the examiner used and which the child chose.",
      "Analyse each language with its own pack, then compare.",
      "Report code-mixing descriptively.",
    ],
    donts: [
      "Do not compute one MLU across a mixed transcript and report it as the child's MLU.",
      "Do not treat code-mixing as an error; it is typical community practice.",
      "Do not translate one transcript and score the translation. ULASA blocks this in code.",
    ],
    prompts: {
      "en-IN": ["Use the conversation prompts above, in each language in turn."],
      "hi-IN": ["ऊपर दिए गए बातचीत के प्रश्न, हर भाषा में बारी-बारी से पूछें।"],
      "kn-IN": ["ಮೇಲಿನ ಸಂಭಾಷಣೆಯ ಪ್ರಶ್ನೆಗಳನ್ನು ಪ್ರತಿ ಭಾಷೆಯಲ್ಲೂ ಸರದಿಯಂತೆ ಕೇಳಿ."],
      "ta-IN": ["மேலே உள்ள உரையாடல் கேள்விகளை ஒவ்வொரு மொழியிலும் முறையே கேளுங்கள்."],
      "te-IN": ["పైన ఉన్న సంభాషణ ప్రశ్నలను ప్రతి భాషలోనూ వరుసగా అడగండి."],
      "ml-IN": ["മുകളിലുള്ള സംഭാഷണ ചോദ്യങ്ങൾ ഓരോ ഭാഷയിലും മാറി മാറി ചോദിക്കുക."],
    },
  },
];
