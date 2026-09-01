/**
 * Test and demonstration fixtures.
 *
 * These are original transcripts written for ULASA. They are not drawn from
 * SALT's reference databases, from CHILDES corpora, or from any copyrighted
 * stimulus set, and they contain no real child's speech.
 *
 * They are stored as SALT-style text so the same strings exercise the importer,
 * the measure engine and the sample gallery in the app.
 */

export interface Fixture {
  id: string;
  label: string;
  language: string;
  description: string;
  /** What this fixture is designed to exercise. */
  tests: string;
  text: string;
}

// ---------------------------------------------------------------------------

const EN_PRESCHOOL = `$ C, E
+ Title: English preschool conversation
+ Language: en-IN
+ Context: conversation
+ Elapsed: 11:20
=
E So tell me about your school.
C I go to school in the (bu bu) bus.
E Oh, a bus!
C The bus is yellow and it is very big.
C My friend Meera sits with me.
E What do you do there?
C We play in the ground.
C I like (um) running games.
C Sometimes we play hide and seek.
E That sounds fun.
C Yesterday I falled down and my knee was paining.
C Teacher put a bandage on it.
C It was not paining after that.
E Who is your teacher?
C Her name is Lakshmi ma'am.
C She teaches us rhymes.
C I know the twinkle twinkle rhyme.
E Can you tell me a rhyme?
C Twinkle twinkle little star.
C How I wonder what you are.
C I forgot the rest.
E That's alright.
C We have a drawing class also.
C I drawed a house and a tree.
C The house was having a red roof.
E What else did you draw?
C I drawed a sun in the corner.
C (And and) and some birds.
C Ma'am said it was very nice.
E Do you have lunch at school?
C Yes I bring a tiffin box.
C My mother puts idli and chutney.
C Sometimes she puts rice.
C I don't like the (veg) vegetables.
E Why not?
C Because they are not tasting good.
C I like idli more.
E What happens after lunch?
C We sleep for some time.
C Then we do numbers.
C I can count till hundred.
E That is a lot.
C One two three four five.
C Then it goes on and on.
E What do you do when you come home?
C I watch cartoon on the TV.
C My favourite is the one with the dog.
C He is always running behind the cat.
C And he never catches him.
E Then what?
C Then my mother says to do homework.
C I write the letters in my book.
C After that I can play again.
C My brother plays with me.
C He is smaller than me.
C Sometimes he is (bre bre) breaking my toys.
C Then I get angry on him.
E And then?
C Then amma tells us to stop fighting.
C We watch TV together.
E What do you watch?
C We watch the cartoon channel.
C My brother likes the one with the train.
C I think it is boring.
E Do you go outside in the evening?
C Sometimes I go to the park with appa.
C There is a slide and two swings.
C I can go on the big slide now.
C Before I was scared of it.
E What changed?
C Appa was holding me the first time.
C Now I go alone.
C My brother still needs holding.
E What about the weekend?
C On Sunday we go to my grandmother house.
C She lives near the temple.
C She makes payasam for us.
C It is sweet and I like it a lot.
C Sometimes my cousins also come.
C We play cricket in the street.
C I am not good at batting.
C But I can catch the ball.
E That is a good skill.
C That is all I can think.
`;

const HI_CONVERSATION = `$ C, E
+ Title: Hindi conversation with case marking and aspect
+ Language: hi-IN
+ Context: conversation
+ Elapsed: 09:45
=
E मुझे अपने स्कूल के बारे में बताओ।
C मैं स्कूल बस से जाता हूँ।
C बस पीली है।
C मेरे साथ मेरा दोस्त बैठता है।
E वहाँ क्या करते हो?
C हम मैदान में खेलते हैं।
C (मैं मैं) मैं दौड़ने वाला खेल खेलता हूँ।
C कल मैं गिर गया था।
C मेरे घुटने में दर्द हो रहा था।
C टीचर ने मुझे दवा लगाई।
E टीचर का नाम क्या है?
C उनका नाम लक्ष्मी मैडम है।
C वो हमें कविता सिखाती हैं।
C मुझे एक कविता आती है।
E सुनाओ ना।
C (मतलब) मुझे पूरी याद नहीं है।
E कोई बात नहीं।
C हमारी drawing /en की class /en भी होती है।
C मैंने एक घर बनाया था।
C घर की छत लाल थी।
C (और और) और मैंने सूरज भी बनाया।
C मैडम ने कहा कि बहुत अच्छा है।
E खाना कहाँ खाते हो?
C मैं टिफ़िन लेकर जाता हूँ।
C माँ इडली और चटनी देती है।
C कभी कभी चावल देती है।
C मुझे सब्ज़ी अच्छी नहीं लगती।
E क्यों नहीं?
C क्योंकि उसका स्वाद अच्छा नहीं है।
C इडली ज़्यादा अच्छी लगती है।
E खाने के बाद क्या होता है?
C थोड़ी देर हम सोते हैं।
C फिर हम गिनती करते हैं।
C मैं सौ तक गिन सकता हूँ।
C एक दो तीन चार पाँच।
E घर आकर क्या करते हो?
C मैं टीवी पर cartoon /en देखता हूँ।
C उसमें एक कुत्ता है।
C वो हमेशा बिल्ली के पीछे भागता है।
C लेकिन वो कभी नहीं पकड़ पाता।
E उसके बाद?
C फिर माँ homework /en करने को कहती है।
C मैं अपनी किताब में अक्षर लिखता हूँ।
C उसके बाद मैं खेल सकता हूँ।
C मेरा छोटा भाई मेरे साथ खेलता है।
C वो कभी कभी मेरे खिलौने तोड़ देता है।
C तब मुझे उस पर गुस्सा आता है।
E फिर क्या होता है?
C फिर माँ हमें लड़ने से मना करती है।
C हम साथ में टीवी देखते हैं।
C बस इतना ही।
`;

const TA_NARRATIVE = `$ C, E
+ Title: Tamil personal narrative
+ Language: ta-IN
+ Context: personal_narrative
+ Elapsed: 07:30
=
E ஒரு நாள் நடந்த விஷயத்தை சொல்லு.
C கடந்த வாரம் நாங்க கோவிலுக்கு போனோம்.
C அம்மா அப்பா நான் எல்லாரும் போனோம்.
C காலையில சீக்கிரம் எழுந்தேன்.
C அம்மா எனக்கு புது சட்டை போட்டாங்க.
E அப்புறம்?
C அப்புறம் நாங்க bus /en ல ஏறினோம்.
C bus /en ல ரொம்ப கூட்டமா இருந்தது.
C நான் ஜன்னல் பக்கத்துல உட்கார்ந்தேன்.
C வெளியில மரம் எல்லாம் ஓடுற மாதிரி இருந்தது.
E கோவில்ல என்ன பண்ணீங்க?
C கோவில்ல நிறைய பேர் இருந்தாங்க.
C நாங்க வரிசையில நின்னோம்.
C ரொம்ப நேரம் நின்னதுனால கால் வலிச்சது.
C அப்புறம் சாமி கும்பிட்டோம்.
C அம்மா எனக்கு பிரசாதம் கொடுத்தாங்க.
C அது ரொம்ப இனிப்பா இருந்தது.
E அதுக்கு அப்புறம்?
C அப்புறம் வெளியில வந்தோம்.
C அங்க ஒரு கடை இருந்தது.
C அப்பா எனக்கு பலூன் வாங்கி கொடுத்தாங்க.
C சிவப்பு பலூன் வாங்கினேன்.
C (அது அது) அது கையில இருந்து போயிடுச்சு.
C நான் அழுதேன்.
C அப்பா இன்னொரு பலூன் வாங்கி கொடுத்தாங்க.
C அப்புறம் நான் சிரிச்சேன்.
E வீட்டுக்கு எப்படி வந்தீங்க?
C வீட்டுக்கு auto /en ல வந்தோம்.
C நான் வழியில தூங்கிட்டேன்.
C வீட்டுக்கு வந்ததும் அம்மா சாப்பாடு போட்டாங்க.
C அன்னைக்கு ரொம்ப சந்தோஷமா இருந்தது.
`;

const KN_CONVERSATION = `$ C, E
+ Title: Kannada conversation
+ Language: kn-IN
+ Context: conversation
+ Elapsed: 08:15
=
E ನಿನ್ನ ಶಾಲೆಯ ಬಗ್ಗೆ ಹೇಳು.
C ನಾನು ಶಾಲೆಗೆ ಬಸ್ಸಿನಲ್ಲಿ ಹೋಗ್ತೀನಿ.
C ಬಸ್ಸು ಹಳದಿ ಬಣ್ಣ ಇದೆ.
C ನನ್ನ ಸ್ನೇಹಿತ ನನ್ನ ಜೊತೆ ಕೂತ್ಕೊಳ್ತಾನೆ.
E ಅಲ್ಲಿ ಏನು ಮಾಡ್ತೀರಾ?
C ನಾವು ಮೈದಾನದಲ್ಲಿ ಆಡ್ತೀವಿ.
C ನಂಗೆ ಓಡೋ ಆಟ ಇಷ್ಟ.
C ನಿನ್ನೆ ನಾನು ಬಿದ್ದೆ.
C ನನ್ನ ಮಂಡಿ ನೋವಾಯ್ತು.
C ಟೀಚರ್ ಔಷಧಿ ಹಚ್ಚಿದರು.
E ಟೀಚರ್ ಹೆಸರೇನು?
C ಅವರ ಹೆಸರು ಲಕ್ಷ್ಮಿ ಮೇಡಂ.
C ಅವರು ನಮಗೆ ಪದ್ಯ ಹೇಳಿಕೊಡ್ತಾರೆ.
C (ಅದು ಅದು) ಅದು ನಂಗೆ ಪೂರ್ತಿ ನೆನಪಿಲ್ಲ.
E ಪರವಾಗಿಲ್ಲ.
C ನಮಗೆ drawing /en class /en ಕೂಡ ಇದೆ.
C ನಾನು ಒಂದು ಮನೆ ಬರೆದೆ.
C ಮನೆಯ ಮೇಲ್ಛಾವಣಿ ಕೆಂಪಗಿತ್ತು.
C ಆಮೇಲೆ ಸೂರ್ಯನನ್ನೂ ಬರೆದೆ.
C ಮೇಡಂ ತುಂಬಾ ಚೆನ್ನಾಗಿದೆ ಅಂತ ಹೇಳಿದರು.
E ಊಟ ಎಲ್ಲಿ ಮಾಡ್ತೀಯ?
C ನಾನು ಡಬ್ಬಿ ತಗೊಂಡು ಹೋಗ್ತೀನಿ.
C ಅಮ್ಮ ಇಡ್ಲಿ ಚಟ್ನಿ ಹಾಕಿ ಕೊಡ್ತಾರೆ.
C ಕೆಲವೊಮ್ಮೆ ಅನ್ನ ಹಾಕ್ತಾರೆ.
C ನಂಗೆ ತರಕಾರಿ ಇಷ್ಟ ಇಲ್ಲ.
E ಯಾಕೆ?
C ಯಾಕಂದ್ರೆ ಅದರ ರುಚಿ ಚೆನ್ನಾಗಿಲ್ಲ.
E ಊಟ ಆದ ಮೇಲೆ ಏನು?
C ಸ್ವಲ್ಪ ಹೊತ್ತು ಮಲಗ್ತೀವಿ.
C ಆಮೇಲೆ ಲೆಕ್ಕ ಮಾಡ್ತೀವಿ.
C ನಾನು ನೂರರ ತನಕ ಎಣಿಸ್ತೀನಿ.
E ಮನೆಗೆ ಬಂದು ಏನು ಮಾಡ್ತೀಯ?
C ನಾನು ಟಿವಿಯಲ್ಲಿ cartoon /en ನೋಡ್ತೀನಿ.
C ಅದರಲ್ಲಿ ಒಂದು ನಾಯಿ ಇದೆ.
C ಅದು ಯಾವಾಗಲೂ ಬೆಕ್ಕಿನ ಹಿಂದೆ ಓಡ್ತದೆ.
C ಆದರೆ ಅದು ಎಂದೂ ಹಿಡಿಯೋಕೆ ಆಗಲ್ಲ.
E ಆಮೇಲೆ?
C ಆಮೇಲೆ ಅಮ್ಮ homework /en ಮಾಡು ಅಂತ ಹೇಳ್ತಾರೆ.
C ನಾನು ಪುಸ್ತಕದಲ್ಲಿ ಅಕ್ಷರ ಬರೀತೀನಿ.
C ಆಮೇಲೆ ನಾನು ಆಡೋಕೆ ಹೋಗ್ತೀನಿ.
C ನನ್ನ ತಮ್ಮ ನನ್ನ ಜೊತೆ ಆಡ್ತಾನೆ.
C ಅವನು ಕೆಲವೊಮ್ಮೆ ನನ್ನ ಆಟಿಕೆ ಒಡೀತಾನೆ.
C ಆಗ ನಂಗೆ ಕೋಪ ಬರುತ್ತೆ.
C ಆಮೇಲೆ ಅಮ್ಮ ಜಗಳ ಆಡಬೇಡಿ ಅಂತ ಹೇಳ್ತಾರೆ.
C ಅಷ್ಟೇ.
`;

const TE_NARRATIVE = `$ C, E
+ Title: Telugu personal narrative
+ Language: te-IN
+ Context: personal_narrative
+ Elapsed: 07:10
=
E ఒక రోజు జరిగిన విషయం చెప్పు.
C పోయిన వారం మేము గుడికి వెళ్ళాము.
C అమ్మ నాన్న నేను అందరం వెళ్ళాము.
C ఉదయం తొందరగా లేచాను.
C అమ్మ నాకు కొత్త బట్టలు వేసింది.
E తర్వాత?
C తర్వాత మేము bus /en ఎక్కాము.
C bus /en లో చాలా మంది ఉన్నారు.
C నేను కిటికీ దగ్గర కూర్చున్నాను.
C బయట చెట్లు పరిగెడుతున్నట్టు అనిపించింది.
E గుడిలో ఏం చేశారు?
C గుడిలో చాలా మంది ఉన్నారు.
C మేము వరుసలో నిలబడ్డాము.
C చాలా సేపు నిలబడటం వల్ల కాళ్ళు నొప్పి పెట్టాయి.
C తర్వాత దేవుడికి దండం పెట్టాము.
C అమ్మ నాకు ప్రసాదం ఇచ్చింది.
C అది చాలా తియ్యగా ఉంది.
E ఆ తర్వాత?
C తర్వాత మేము బయటికి వచ్చాము.
C అక్కడ ఒక దుకాణం ఉంది.
C నాన్న నాకు బెలూన్ కొన్నారు.
C నేను ఎర్ర బెలూన్ తీసుకున్నాను.
C (అది అది) అది చేతిలో నుండి ఎగిరిపోయింది.
C నేను ఏడ్చాను.
C నాన్న ఇంకో బెలూన్ కొన్నారు.
C తర్వాత నేను నవ్వాను.
E ఇంటికి ఎలా వచ్చారు?
C ఇంటికి auto /en లో వచ్చాము.
C నేను దారిలో నిద్రపోయాను.
C ఇంటికి వచ్చాక అమ్మ అన్నం పెట్టింది.
C ఆ రోజు చాలా సంతోషంగా ఉంది.
`;

const ML_CONVERSATION = `$ C, E
+ Title: Malayalam conversation
+ Language: ml-IN
+ Context: conversation
+ Elapsed: 08:40
=
E നിന്റെ സ്കൂളിനെ കുറിച്ച് പറയൂ.
C ഞാൻ സ്കൂളിൽ ബസ്സിൽ പോകുന്നു.
C ബസ്സിന് മഞ്ഞ നിറമാണ്.
C എന്റെ കൂട്ടുകാരൻ എന്റെ കൂടെ ഇരിക്കുന്നു.
E അവിടെ എന്ത് ചെയ്യും?
C ഞങ്ങൾ മൈതാനത്ത് കളിക്കുന്നു.
C എനിക്ക് ഓടുന്ന കളി ഇഷ്ടമാണ്.
C ഇന്നലെ ഞാൻ വീണു.
C എന്റെ കാൽമുട്ട് വേദനിച്ചു.
C ടീച്ചർ മരുന്ന് വെച്ചു.
E ടീച്ചറുടെ പേര് എന്താണ്?
C അവരുടെ പേര് ലക്ഷ്മി ടീച്ചർ എന്നാണ്.
C അവർ ഞങ്ങൾക്ക് കവിത പഠിപ്പിക്കുന്നു.
C (അത് അത്) അത് എനിക്ക് മുഴുവൻ ഓർമ്മയില്ല.
E സാരമില്ല.
C ഞങ്ങൾക്ക് drawing /en class /en ഉം ഉണ്ട്.
C ഞാൻ ഒരു വീട് വരച്ചു.
C വീടിന്റെ മേൽക്കൂര ചുവപ്പായിരുന്നു.
C പിന്നെ ഞാൻ സൂര്യനെയും വരച്ചു.
C ടീച്ചർ വളരെ നന്നായി എന്ന് പറഞ്ഞു.
E ഉച്ചഭക്ഷണം എവിടെ കഴിക്കും?
C ഞാൻ ചോറ്റുപാത്രം കൊണ്ടുപോകുന്നു.
C അമ്മ ഇഡ്ഡലിയും ചട്ണിയും തരും.
C ചിലപ്പോൾ ചോറ് തരും.
C എനിക്ക് പച്ചക്കറി ഇഷ്ടമല്ല.
E എന്തുകൊണ്ട്?
C കാരണം അതിന് നല്ല രുചിയില്ല.
E ഭക്ഷണത്തിന് ശേഷം എന്ത്?
C കുറച്ച് നേരം ഞങ്ങൾ ഉറങ്ങും.
C പിന്നെ ഞങ്ങൾ എണ്ണം പഠിക്കും.
C എനിക്ക് നൂറ് വരെ എണ്ണാൻ അറിയാം.
E വീട്ടിൽ വന്നിട്ട് എന്ത് ചെയ്യും?
C ഞാൻ ടിവിയിൽ cartoon /en കാണും.
C അതിൽ ഒരു പട്ടി ഉണ്ട്.
C അത് എപ്പോഴും പൂച്ചയുടെ പിന്നാലെ ഓടുന്നു.
C പക്ഷെ അതിന് ഒരിക്കലും പിടിക്കാൻ പറ്റില്ല.
E പിന്നെ?
C പിന്നെ അമ്മ homework /en ചെയ്യാൻ പറയും.
C ഞാൻ പുസ്തകത്തിൽ അക്ഷരം എഴുതും.
C അതിനുശേഷം ഞാൻ കളിക്കാൻ പോകും.
C എന്റെ അനിയൻ എന്റെ കൂടെ കളിക്കും.
C അവൻ ചിലപ്പോൾ എന്റെ കളിപ്പാട്ടം പൊട്ടിക്കും.
C അപ്പോൾ എനിക്ക് ദേഷ്യം വരും.
C പിന്നെ അമ്മ വഴക്കിടരുത് എന്ന് പറയും.
C അത്രമാത്രം.
`;

const BILINGUAL = `$ C, E
+ Title: Hindi–English bilingual sample with switch points
+ Language: hi-IN
+ Context: conversation
+ Elapsed: 04:00
=
E आज school /en में क्या हुआ?
C आज हमारा science /en का test /en था।
C मैंने सारे questions /en किए।
C teacher /en ने कहा कि तुमने अच्छा किया।
C फिर हमने lunch /en break /en में खेला।
C मेरे friend /en ने मुझे chocolate /en दी।
C वो बहुत tasty /en थी।
C उसके बाद हमारी computer /en class /en थी।
C मैंने keyboard /en पर typing /en की।
C sir /en ने एक game /en भी दिखाया।
C वो game /en बहुत easy /en था।
C फिर हम घर आ गए।
`;

const UNINTELLIGIBLE = `$ C, E
+ Title: Low-intelligibility sample
+ Language: en-IN
+ Context: play
+ Elapsed: 03:00
=
E What are you making?
C I am making a X.
C It has X X on the top.
C XXX
C Then you put the X here.
C And it goes X.
C Look at my X.
E That looks nice.
C X X X
C It is a big one.
C My X gave it to me.
`;

const SHORT_SAMPLE = `$ C, E
+ Title: Short sample (below the 50-utterance minimum)
+ Language: en-IN
+ Context: conversation
+ Elapsed: 02:00
=
E What did you do today?
C I played with my sister.
C We made a tower with blocks.
C It fell down.
C Then we made it again.
C It was taller this time.
`;

export const FIXTURES: Fixture[] = [
  {
    id: "en-preschool",
    label: "English preschool conversation",
    language: "en-IN",
    description: "64 child utterances, conversational, with mazes and two developmental errors (falled, drawed).",
    tests: "MLU-w, NDW, TTR/MTLD, maze classification, words per minute, error coding.",
    text: EN_PRESCHOOL,
  },
  {
    id: "hi-conversation",
    label: "Hindi conversation",
    language: "hi-IN",
    description: "Ergative ने, postpositional case marking, aspect auxiliaries, कि complements, three English insertions.",
    tests: "Postposition-inflated MLU-w, Hindi verb identification, code-mix ratio, clause markers.",
    text: HI_CONVERSATION,
  },
  {
    id: "kn-conversation",
    label: "Kannada conversation",
    language: "kn-IN",
    description: "Colloquial spoken register (ಹೋಗ್ತೀನಿ, ಯಾಕಂದ್ರೆ), quotative ಅಂತ, three English insertions.",
    tests: "Diglossic forms are not flagged as errors; Kannada PNG suffix cues; clausal density.",
    text: KN_CONVERSATION,
  },
  {
    id: "ta-narrative",
    label: "Tamil personal narrative",
    language: "ta-IN",
    description: "Agglutinative verb morphology, participial chaining, two English insertions.",
    tests: "Surface MLU-w understating complexity; Tamil verb suffix cues; narrative connectives.",
    text: TA_NARRATIVE,
  },
  {
    id: "te-narrative",
    label: "Telugu personal narrative",
    language: "te-IN",
    description: "Mahat/amahat verb agreement, verbal participles, quotative అని, two English insertions.",
    tests: "Telugu PNG suffix cues; narrative structure; code-mix switch points.",
    text: TE_NARRATIVE,
  },
  {
    id: "ml-conversation",
    label: "Malayalam conversation",
    language: "ml-IN",
    description: "No subject–verb agreement anywhere, quotative എന്ന്, heavy sandhi, three English insertions.",
    tests: "That the engine never proposes an agreement error for Malayalam; tense-only suffix cues.",
    text: ML_CONVERSATION,
  },
  {
    id: "bilingual",
    label: "Hindi–English bilingual",
    language: "hi-IN",
    description: "Dense insertional code-mixing typical of urban Indian classroom talk.",
    tests: "Code-mix ratio and switch points per 100 words; that mixing is reported, not penalised.",
    text: BILINGUAL,
  },
  {
    id: "unintelligible",
    label: "Low-intelligibility sample",
    language: "en-IN",
    description: "Heavy use of X and XXX markers.",
    tests: "Percent intelligible utterances and words; exclusion of unintelligible tokens from NDW.",
    text: UNINTELLIGIBLE,
  },
  {
    id: "short",
    label: "Short sample",
    language: "en-IN",
    description: "Five child utterances — far below the 50-utterance convention.",
    tests: "That the short-sample warning fires and blocks reference comparison.",
    text: SHORT_SAMPLE,
  },
];

export function getFixture(id: string): Fixture | undefined {
  return FIXTURES.find((f) => f.id === id);
}
