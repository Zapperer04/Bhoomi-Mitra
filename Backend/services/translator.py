# services/translator.py

SUPPORTED_LANGS = {
    "en": "English",
    "hi": "Hindi",
    "bn": "Bengali",
    "ta": "Tamil",
    "te": "Telugu",
    "mr": "Marathi",
    "gu": "Gujarati",
}

TEXTS = {
    "WELCOME": {
        "en": "👋 Hello! I am Bhoomi Mitra. How can I help you?",
        "hi": "👋 नमस्ते! मैं भूमि मित्र हूँ। मैं आपकी कैसे सहायता कर सकता हूँ?",
        "bn": "👋 নমস্কার! আমি ভূমি মিত্র। আমি কীভাবে সাহায্য করতে পারি?",
        "ta": "👋 வணக்கம்! நான் பூமி மித்ரா. நான் எப்படி உதவலாம்?",
        "te": "👋 నమస్తే! నేను భూమి మిత్ర. నేను ఎలా సహాయపడగలను?",
    },
    "MSP_MENU": {
        "en": "🌾 MSP (Minimum Support Price)",
        "hi": "🌾 न्यूनतम समर्थन मूल्य (MSP)",
        "bn": "🌾 ন্যূনতম সহায়ক মূল্য (MSP)",
        "ta": "🌾 குறைந்தபட்ச ஆதரவு விலை (MSP)",
        "te": "🌾 కనీస మద్దతు ధర (MSP)",
    },
    "WEATHER_MENU": {
        "en": "🌦️ Weather",
        "hi": "🌦️ मौसम",
        "bn": "🌦️ আবহাওয়া",
        "ta": "🌦️ வானிலை",
        "te": "🌦️ వాతావరణం",
    },
    "ADVISORY_MENU": {
        "en": "🌱 Crop Advisory",
        "hi": "🌱 फसल सलाह",
        "bn": "🌱 ফসল পরামর্শ",
        "ta": "🌱 பயிர் ஆலோசனை",
        "te": "🌱 పంట సలహా",
    },
    "FERTILIZER_MENU": {
        "en": "🧪 Fertilizer Recommendation",
        "hi": "🧪 खाद सिफारिश",
        "bn": "🧪 সার সুপারিশ",
        "ta": "🧪 உர பரிந்துரை",
        "te": "🧪 ఎరువు సిఫార్సు"
    },
    "SCHEME_MENU": {
        "en": "🏛️ Government Schemes",
        "hi": "🏛️ सरकारी योजनाएं",
        "bn": "🏛️ সরকারি প্রকল্প",
        "ta": "🏛️ அரசு திட்டங்கள்",
        "te": "🏛️ ప్రభుత్వ పథకాలు",
    },
    "SELECT_WEATHER_CITY": {
        "en": "Select a city for weather",
        "hi": "मौसम के लिए शहर चुनें",
        "bn": "আবহাওয়ার জন্য শহর নির্বাচন করুন",
        "ta": "வானிலைக்கான நகரத்தைத் தேர்ந்தெடுக்கவும்",
        "te": "వాతావరణానికి నగరాన్ని ఎంచుకోండి",
    },
    "OTHER_CITY": {
        "en": "Other city",
        "hi": "अन्य शहर",
        "bn": "অন্য শহর",
        "ta": "மற்ற நகரம்",
        "te": "ఇతర నగరం",
    },
    "ENTER_CITY": {
        "en": "Enter your city name",
        "hi": "अपने शहर का नाम दर्ज करें",
        "bn": "আপনার শহরের নাম লিখুন",
        "ta": "உங்கள் நகரத்தின் பெயரை உள்ளிடவும்",
        "te": "మీ నగరపు పేరును నమోదు చేయండి",
    },
    "BACK": {
        "en": "⬅️ Back",
        "hi": "⬅️ वापस",
        "bn": "⬅️ ফিরে যান",
        "ta": "⬅️ திரும்ப",
        "te": "⬅️ వెనక్కి",
    },
    "MAIN_MENU": {
        "en": "🏠 Main Menu",
        "hi": "🏠 मुख्य मेनू",
        "bn": "🏠 প্রধান মেনু",
        "ta": "🏠 முதன்மை மெனு",
        "te": "🏠 ప్రధాన మెను",
    },
    "SELECT_MSP_CROP": {
        "en": "Select crop for MSP",
        "hi": "MSP के लिए फसल चुनें",
        "bn": "MSP এর জন্য ফসল নির্বাচন করুন",
        "ta": "MSPக்கான பயிரை தேர்ந்தெடுக்கவும்",
        "te": "MSP కోసం పంటను ఎంచుకోండి",
    },
    "MSP_NOT_AVAILABLE": {
        "en": "MSP not available for {crop}.",
        "hi": "{crop} के लिए MSP उपलब्ध नहीं है।",
        "bn": "{crop} এর জন্য MSP উপলব্ধ নয়।",
        "ta": "{crop}க்கான MSP கிடைக்கவில்லை.",
        "te": "{crop} కోసం MSP అందుబాటులో లేదు.",
    },
    "MSP_RESULT": {
        "en": "🌾 MSP for {crop} is ₹{price} per quintal.",
        "hi": "🌾 {crop} का MSP ₹{price} प्रति क्विंटल है।",
        "bn": "🌾 {crop} এর MSP ₹{price} প্রতি কুইন্টাল।",
        "ta": "🌾 {crop}-க்கான MSP ₹{price} ஒரு குவிண்டல்.",
        "te": "🌾 {crop} యొక్క MSP ₹{price} ప్రతి క్వింటల్.",
    },
    "SELECT_ADVISORY_CROP": {
        "en": "Select a crop for advisory",
        "hi": "सलाह के लिए फसल चुनें",
        "bn": "পরামর্শের জন্য ফসল নির্বাচন করুন",
        "ta": "ஆலோசனைக்கான பயிரை தேர்ந்தெடுக்கவும்",
        "te": "సలహా కోసం పంటను ఎంచుకోండి"
    },
    "SELECT_CROP_STAGE": {
        "en": "Select crop stage",
        "hi": "फसल की अवस्था चुनें",
        "bn": "ফসলের পর্যায় নির্বাচন করুন",
        "ta": "பயிர் நிலையைக் தேர்ந்தெடுக்கவும்",
        "te": "పంట దశను ఎంచుకోండి"
    },
    "STAGE_SOWING": {
        "en": "🌱 Sowing",
        "hi": "🌱 बुवाई",
        "bn": "🌱 বপন",
        "ta": "🌱 விதைப்பு",
        "te": "🌱 విత్తడం"
    },
    "STAGE_GROWTH": {
        "en": "🌿 Growth",
        "hi": "🌿 वृद्धि",
        "bn": "🌿 বৃদ্ধি",
        "ta": "🌿 வளர்ச்சி",
        "te": "🌿 వృద్ధి"
    },
    "STAGE_HARVEST": {
        "en": "🌾 Harvest",
        "hi": "🌾 कटाई",
        "bn": "🌾 ফসল কাটা",
        "ta": "🌾 அறுவடை",
        "te": "🌾 కోత"
    },
    "SELECT_FERTILIZER_CROP": {
        "en": "Select a crop for fertilizer recommendation",
        "hi": "खाद सिफारिश के लिए फसल चुनें",
        "bn": "সারের সুপারিশের জন্য ফসল নির্বাচন করুন",
        "ta": "உர பரிந்துரைக்கான பயிரை தேர்ந்தெடுக்கவும்",
        "te": "ఎరువు సిఫార్సు కోసం పంటను ఎంచుకోండి"
    },
    "SELECT_SCHEME_TYPE": {
        "en": "Select scheme category",
        "hi": "योजना श्रेणी चुनें",
        "bn": "স্কিমের ধরন নির্বাচন করুন",
        "ta": "திட்ட வகையை தேர்ந்தெடுக்கவும்",
        "te": "పథక రకాన్ని ఎంచుకోండి"
    },
    "SCHEME_CROP_BASED": {
        "en": "🌾 Crop-based schemes",
        "hi": "🌾 फसल आधारित योजनाएं",
        "bn": "🌾 ফসল ভিত্তিক প্রকল্প",
        "ta": "🌾 பயிர் அடிப்படையிலான திட்டங்கள்",
        "te": "🌾 పంట ఆధారిత పథకాలు"
    },
    "SCHEME_GENERAL": {
        "en": "🏛️ General schemes",
        "hi": "🏛️ सामान्य योजनाएं",
        "bn": "🏛️ সাধারণ প্রকল্প",
        "ta": "🏛️ பொது திட்டங்கள்",
        "te": "🏛️ సాధారణ పథకాలు"
    },
    "SELECT_SCHEME_CROP": {
        "en": "Select crop for schemes",
        "hi": "योजनाओं के लिए फसल चुनें",
        "bn": "স্কিমের জন্য ফসল নির্বাচন করুন",
        "ta": "திட்டங்களுக்கு பயிரை தேர்ந்தெடுக்கவும்",
        "te": "పథకాల కోసం పంటను ఎంచుకోండి"
    }
}

# ---------- CROP LABELS ----------

CROP_LABELS = {
    "wheat":     {"en": "Wheat",     "hi": "गेहूं",     "bn": "গম",    "ta": "கோதுமை",          "te": "గోధుమ"},
    "rice":      {"en": "Rice",      "hi": "चावल",      "bn": "চাল",   "ta": "அரிசி",            "te": "బియ్యం"},
    "paddy":     {"en": "Paddy",     "hi": "धान",       "bn": "ধান",   "ta": "நெல்",             "te": "వరి"},
    "maize":     {"en": "Maize",     "hi": "मक्का",     "bn": "ভুট্টা","ta": "மக்காச்சோளம்",     "te": "మొక్కజొన్న"},
    "barley":    {"en": "Barley",    "hi": "जौ",        "bn": "যব",    "ta": "யவம்",             "te": "యవలు"},
    "jowar":     {"en": "Jowar",     "hi": "ज्वार",     "bn": "জোয়ার","ta": "சோளம்",            "te": "జొన్న"},
    "bajra":     {"en": "Bajra",     "hi": "बाजरा",     "bn": "বাজরা", "ta": "கம்பு",            "te": "సజ్జ"},
    "ragi":      {"en": "Ragi",      "hi": "रागी",      "bn": "রাগি",  "ta": "கேழ்வரகு",         "te": "రాగి"},
    "gram":      {"en": "Gram",      "hi": "चना",       "bn": "ছোলা",  "ta": "கடலை",            "te": "సెనగ"},
    "tur":       {"en": "Tur",       "hi": "अरहर",      "bn": "অড়হর", "ta": "துவரை",            "te": "కందిపప్పు"},
    "moong":     {"en": "Moong",     "hi": "मूंग",      "bn": "মুগ",   "ta": "பாசிப்பயறு",       "te": "పెసర"},
    "urad":      {"en": "Urad",      "hi": "उड़द",      "bn": "উড়দ",  "ta": "உளுந்து",          "te": "మినుములు"},
    "lentil":    {"en": "Masur",     "hi": "मसूर",      "bn": "মসুর",  "ta": "மசூர்",            "te": "కందులు"},
    "groundnut": {"en": "Groundnut", "hi": "मूंगफली",   "bn": "বাদাম", "ta": "நிலக்கடலை",        "te": "వేరుశెనగ"},
    "soybean":   {"en": "Soybean",   "hi": "सोयाबीन",   "bn": "সয়াবিন","ta": "சோயாபீன்",         "te": "సోయాబీన్"},
    "sunflower": {"en": "Sunflower", "hi": "सूरजमुखी",  "bn": "সূর্যমুখী","ta": "சூரியகாந்தி",   "te": "సూర్యకాంతి"},
    "sesame":    {"en": "Sesame",    "hi": "तिल",       "bn": "তিল",   "ta": "எள்ளு",            "te": "నువ్వులు"},
    "mustard":   {"en": "Mustard",   "hi": "सरसों",     "bn": "সরিষা", "ta": "கடுகு",            "te": "ఆవాలు"},
    "cotton":    {"en": "Cotton",    "hi": "कपास",      "bn": "তুলা",  "ta": "பருத்தி",          "te": "పత్తి"},
    "sugarcane": {"en": "Sugarcane", "hi": "गन्ना",     "bn": "আখ",    "ta": "கரும்பு",          "te": "చెరకు"},
    "potato":    {"en": "Potato",    "hi": "आलू",       "bn": "আলু",   "ta": "உருளைக்கிழங்கு",  "te": "ఆలుగడ్డ"},
    "tomato":    {"en": "Tomato",    "hi": "टमाटर",     "bn": "টমেটো", "ta": "தக்காளி",          "te": "టమాటా"},
}

# ---------- CITY LABELS ----------

CITY_LABELS = {
    "delhi":     {"en": "Delhi",     "hi": "दिल्ली",    "bn": "দিল্লি",    "ta": "டெல்லி",      "te": "ఢిల్లీ"},
    "mumbai":    {"en": "Mumbai",    "hi": "मुंबई",     "bn": "মুম্বাই",   "ta": "மும்பை",      "te": "ముంబై"},
    "kolkata":   {"en": "Kolkata",   "hi": "कोलकाता",   "bn": "কলকাতা",    "ta": "கொல்கத்தா",   "te": "కోల్కతా"},
    "chennai":   {"en": "Chennai",   "hi": "चेन्नई",    "bn": "চেন্নাই",   "ta": "சென்னை",      "te": "చెన్నై"},
    "bengaluru": {"en": "Bengaluru", "hi": "बेंगलुरु",  "bn": "বেনগালুরু", "ta": "பெங்களூரு",   "te": "బెంగళూరు"},
    "hyderabad": {"en": "Hyderabad", "hi": "हैदराबाद",  "bn": "হায়দরাবাদ", "ta": "ஹைதராபாத்",  "te": "హైదరాబాద్"},
    "pune":      {"en": "Pune",      "hi": "पुणे",      "bn": "পুণে",      "ta": "புனே",        "te": "పుణె"},
    "jaipur":    {"en": "Jaipur",    "hi": "जयपुर",     "bn": "জয়পুর",    "ta": "ஜெய்ப்பூர்",  "te": "జైపూర్"},
}

# ---------- DASHBOARD UI STRINGS ----------

DASHBOARD_STRINGS = {
    # ── COMMON ────────────────────────────────────────────────────────────────
    "qty_requested":      {"en": "Qty Requested",        "hi": "अनुरोधित मात्रा",      "bn": "অনুরোধিত পরিমাণ",    "ta": "கோரிய அளவு",               "te": "అభ్యర్థించిన పరిమాణం", "mr": "विनंती प्रमाण",        "gu": "વિનંતી જથ્થો"},
    "offered_price":      {"en": "Offered Price",         "hi": "प्रस्तावित मूल्य",     "bn": "প্রস্তাবিত মূল্য",    "ta": "வழங்கிய விலை",             "te": "ప్రతిపాదిత ధర",        "mr": "प्रस्तावित किंमत",     "gu": "ઓફર કરેલ ભાવ"},
    "listed_price":       {"en": "Your Listed Price",     "hi": "आपका सूचीबद्ध मूल्य",  "bn": "আপনার তালিকা মূল্য",  "ta": "உங்கள் பட்டியல் விலை",     "te": "మీ జాబితా ధర",         "mr": "तुमची सूचीबद्ध किंमत","gu": "તમારી સૂચિ કિંમત"},
    "open_chat":          {"en": "💬 Open Chat",           "hi": "💬 चैट खोलें",          "bn": "💬 চ্যাট খুলুন",      "ta": "💬 அரட்டை திற",            "te": "💬 చాట్ తెరవండి",      "mr": "💬 चॅट उघडा",          "gu": "💬 ચૅટ ખોલો"},
    "msg_contractor":     {"en": "💬 Message Contractor",  "hi": "💬 ठेकेदार को मैसेज",   "bn": "💬 ঠিকাদারকে বার্তা", "ta": "💬 ஒப்பந்தகாரருக்கு",       "te": "💬 కాంట్రాక్టర్‌కు",   "mr": "💬 कंत्राटदाराला संदेश","gu": "💬 કોન્ટ્રાક્ટરને સંદેશ"},
    "your_message":       {"en": "Your message",          "hi": "आपका संदेश",            "bn": "আপনার বার্তা",        "ta": "உங்கள் செய்தி",            "te": "మీ సందేశం",             "mr": "तुमचा संदेश",          "gu": "તમારો સંદેશ"},
    "farmer_contact":     {"en": "Farmer Contact",        "hi": "किसान संपर्क",          "bn": "কৃষক যোগাযোগ",        "ta": "விவசாயி தொடர்பு",          "te": "రైతు పరిచయం",          "mr": "शेतकरी संपर्क",        "gu": "ખેડૂત સંપર્ક"},
    "contractor_lbl":     {"en": "Contractor",            "hi": "ठेकेदार",               "bn": "ঠিকাদার",             "ta": "ஒப்பந்தகாரர்",             "te": "కాంట్రాక్టర్",          "mr": "कंत्राटदार",           "gu": "કોન્ટ્રાક્ટર"},
    "message_lbl":        {"en": "Message",               "hi": "संदेश",                 "bn": "বার্তা",              "ta": "செய்தி",                   "te": "సందేశం",                "mr": "संदेश",                 "gu": "સંદેશ"},
    "crop_lbl":           {"en": "Crop",                  "hi": "फसल",                   "bn": "ফসল",                 "ta": "பயிர்",                    "te": "పంట",                   "mr": "फसल",                  "gu": "પાક"},
    "quintals":           {"en": "Quintals",              "hi": "क्विंटल",               "bn": "কুইন্টাল",            "ta": "குவிண்டல்",                "te": "క్వింటళ్ళు",            "mr": "क्विंटल",              "gu": "ક્વિન્ટલ"},
    "quintal_short":      {"en": "Quintal",               "hi": "क्विंटल",               "bn": "কুইন্টাল",            "ta": "குவிண்டல்",                "te": "క్వింటల్",              "mr": "क्विंटल",              "gu": "ક્વિન્ટલ"},
    "available_lbl":      {"en": "Available",             "hi": "उपलब्ध",                "bn": "পাওয়া যাচ্ছে",       "ta": "கிடைக்கிறது",              "te": "అందుబాటులో",            "mr": "उपलब्ध",               "gu": "ઉપલબ્ધ"},
    "location_lbl":       {"en": "Location",              "hi": "स्थान",                 "bn": "স্থান",               "ta": "இடம்",                     "te": "స్థానం",                "mr": "स्थान",                 "gu": "સ્થળ"},
    "price_lbl":          {"en": "Price",                 "hi": "मूल्य",                 "bn": "মূল্য",               "ta": "விலை",                     "te": "ధర",                    "mr": "किंमत",                 "gu": "ભાવ"},
    "quantity_lbl":       {"en": "Quantity",              "hi": "मात्रा",                "bn": "পরিমাণ",              "ta": "அளவு",                     "te": "పరిమాణం",               "mr": "प्रमाण",                "gu": "જથ્થો"},
    "status_lbl":         {"en": "Status",                "hi": "स्थिति",                "bn": "অবস্থা",              "ta": "நிலை",                     "te": "స్థితి",                "mr": "स्थिती",                "gu": "સ્થિતિ"},
    # ── STATUS LABELS ────────────────────────────────────────────────────────
    "status_pending":     {"en": "⏳ PENDING",                    "hi": "⏳ लंबित",                       "bn": "⏳ অপেক্ষমাণ",         "ta": "⏳ நிலுவையில்",                   "te": "⏳ పెండింగ్",        "mr": "⏳ प्रलंबित",        "gu": "⏳ બાકી"},
    "status_negotiating": {"en": "💬 FARMER WANTS TO NEGOTIATE",  "hi": "💬 किसान बातचीत करना चाहता है",  "bn": "💬 কৃষক আলোচনা চান",   "ta": "💬 விவசாயி பேசல் விரும்புகிறார்",  "te": "💬 రైతు చర్చించాలని కోరుతున్నారు", "mr": "💬 शेतकरी वाटाघाटी करू इच्छितो", "gu": "💬 ખેડૂત વાટાઘાટ કરવા ઇચ્છે છે"},
    "status_accepted":    {"en": "✅ ACCEPTED",                   "hi": "✅ स्वीकृत",                      "bn": "✅ গৃহীত",              "ta": "✅ ஏற்கப்பட்டது",                  "te": "✅ ఆమోదించబడింది",   "mr": "✅ स्वीकृत",         "gu": "✅ સ્વીકૃત"},
    "status_rejected":    {"en": "❌ REJECTED",                   "hi": "❌ अस्वीकृत",                     "bn": "❌ প্রত্যাখ্যাত",       "ta": "❌ நிராகரிக்கப்பட்டது",            "te": "❌ తిరస్కరించబడింది","mr": "❌ नाकारलेले",        "gu": "❌ નકારેલ"},
    "fstatus_accepted":   {"en": "✓ ACCEPTED",                   "hi": "✓ स्वीकृत",                      "bn": "✓ গৃহীত",              "ta": "✓ ஏற்கப்பட்டது",                  "te": "✓ ఆమోదించబడింది",   "mr": "✓ स्वीकृत",         "gu": "✓ સ્વીકૃત"},
    "fstatus_negotiating":{"en": "💬 NEGOTIATING",                "hi": "💬 बातचीत",                      "bn": "💬 আলোচনা",            "ta": "💬 பேச்சுவார்த்தை",                "te": "💬 చర్చలు",         "mr": "💬 वाटाघाटी",        "gu": "💬 વાટાઘાટ"},
    "fstatus_pending":    {"en": "⏳ PENDING",                    "hi": "⏳ लंबित",                       "bn": "⏳ অপেক্ষমাণ",         "ta": "⏳ நிலுவையில்",                   "te": "⏳ పెండింగ్",        "mr": "⏳ प्रलंबित",        "gu": "⏳ બાકી"},
    "fstatus_rejected":   {"en": "✗ REJECTED",                   "hi": "✗ अस्वीकृत",                     "bn": "✗ প্রত্যাখ্যাত",       "ta": "✗ நிராகரிக்கப்பட்டது",            "te": "✗ తిరస్కరించబడింది","mr": "✗ नाकारलेले",        "gu": "✗ નકારેલ"},
    # ── FARMER ACTIONS ───────────────────────────────────────────────────────
    "remove_listing":     {"en": "Remove Listing",  "hi": "लिस्टिंग हटाएं",        "bn": "তালিকা সরান",         "ta": "பட்டியலை நீக்கு",        "te": "జాబితా తొలగించు",  "mr": "यादी काढा",          "gu": "યાદી દૂર કરો"},
    "accept_btn":         {"en": "Accept",          "hi": "स्वीकार करें",           "bn": "গ্রহণ করুন",          "ta": "ஏற்கவும்",               "te": "ఆమోదించు",         "mr": "स्वीकारा",           "gu": "સ્વીકારો"},
    "negotiate_btn":      {"en": "Negotiate",       "hi": "बातचीत करें",            "bn": "আলোচনা করুন",         "ta": "பேச்சுவார்த்தை",         "te": "చర్చించు",          "mr": "वाटाघाटी करा",       "gu": "વાટાઘાટ કરો"},
    "reject_btn":         {"en": "Reject",          "hi": "अस्वीकार करें",          "bn": "প্রত্যাখ্যান করুন",   "ta": "நிராகரி",                "te": "తిరస్కరించు",       "mr": "नाकारा",             "gu": "નકારો"},
    "final_accept_btn":   {"en": "Final Accept",    "hi": "अंतिम स्वीकृति",         "bn": "চূড়ান্ত গ্রহণ",       "ta": "இறுதி ஏற்பு",            "te": "తుది ఆమోదం",       "mr": "अंतिम स्वीकृती",    "gu": "અંતિમ સ્વીકૃતિ"},
    "continue_chat_btn":  {"en": "Continue Chat",   "hi": "चैट जारी रखें",          "bn": "চ্যাট চালিয়ে যান",    "ta": "அரட்டை தொடரவும்",        "te": "చాట్ కొనసాగించు",  "mr": "चॅट सुरू ठेवा",     "gu": "ચૅટ ચાલુ રાખો"},
    "sold_to":            {"en": "Sold to",         "hi": "बेचा गया",               "bn": "বিক্রি হয়েছে",        "ta": "விற்கப்பட்டது",          "te": "అమ్మబడింది",        "mr": "विकले",              "gu": "વેચ્યું"},
    "requested_qty":      {"en": "Requested Qty",   "hi": "अनुरोधित मात्रा",        "bn": "অনুরোধিত পরিমাণ",     "ta": "கோரிய அளவு",             "te": "అభ్యర్థించిన పరిమాణం","mr": "विनंती केलेले प्रमाण","gu": "વિનંતી કરેલ જથ્થો"},
    "accepted_lbl":       {"en": "ACCEPTED",        "hi": "स्वीकृत",                "bn": "গৃহীত",               "ta": "ஏற்கப்பட்டது",           "te": "ఆమోదించబడింది",    "mr": "स्वीकृत",            "gu": "સ્વીકૃત"},
    "negotiating_lbl":    {"en": "NEGOTIATING",     "hi": "बातचीत जारी",            "bn": "আলোচনা চলছে",         "ta": "பேச்சுவார்த்தை",         "te": "చర్చలు జరుగుతున్నాయి","mr": "वाटाघाटी सुरू",    "gu": "વાટાઘાટ ચાલુ"},
    "pending_lbl":        {"en": "PENDING",         "hi": "लंबित",                  "bn": "অপেক্ষমাণ",           "ta": "நிலுவையில்",             "te": "పెండింగ్",          "mr": "प्रलंबित",           "gu": "બાકી"},
    "rejected_lbl":       {"en": "REJECTED",        "hi": "अस्वीकृत",               "bn": "প্রত্যাখ্যাত",         "ta": "நிராகரிக்கப்பட்டது",     "te": "తిరస్కరించబడింది",  "mr": "नाकारलेले",          "gu": "નકારેલ"},
    # ── CONTRACTOR ACTIONS ───────────────────────────────────────────────────
    "show_interest_btn":  {"en": "Show Interest",          "hi": "रुचि दिखाएं",          "bn": "আগ্রহ দেখান",        "ta": "ஆர்வம் காட்டு",         "te": "ఆసక్తి చూపించు",   "mr": "रस दाखवा",           "gu": "રસ બતાવો"},
    "resubmit_btn":       {"en": "🔄 Re-submit Interest",  "hi": "🔄 रुचि फिर भेजें",    "bn": "🔄 আবার আগ্রহ পাঠান", "ta": "🔄 மீண்டும் அனுப்பவும்", "te": "🔄 మళ్ళీ ఆసక్తి పంపు","mr": "🔄 पुन्हा रस पाठवा", "gu": "🔄 ફરી રસ મોકલો"},
    "interest_shown":     {"en": "✓ Interest Shown",       "hi": "✓ रुचि दिखाई",         "bn": "✓ আগ্রহ দেখানো হয়েছে","ta": "✓ ஆர்வம் காட்டப்பட்டது","te": "✓ ఆసక్తి చూపబడింది", "mr": "✓ रस दाखवला",        "gu": "✓ રસ બતાવ્યો"},
    "farmer_name_lbl":    {"en": "Farmer",                 "hi": "किसान",                 "bn": "কৃষক",               "ta": "விவசாயி",                "te": "రైతు",              "mr": "शेतकरी",             "gu": "ખેડૂત"},
    "all_locations":      {"en": "All Locations",          "hi": "सभी स्थान",             "bn": "সব স্থান",           "ta": "எல்லா இடங்கள்",         "te": "అన్ని స్థలాలు",     "mr": "सर्व स्थाने",        "gu": "બધા સ્થળો"},
    "no_crops":           {"en": "No crops available for sale at the moment.", "hi": "अभी कोई फसल उपलब्ध नहीं।",           "bn": "এখন কোনো ফসল নেই।",    "ta": "இப்போது பயிர் இல்லை.",  "te": "ప్రస్తుతం పంటలు లేవు.",    "mr": "सध्या कोणतीही फसल विक्रीसाठी नाही.", "gu": "હાલ કોઈ પાક વેચાણ માટે ઉપલબ્ધ નથી."},
    "no_interests":       {"en": "No interests yet. Browse crops above!",     "hi": "अभी कोई रुचि नहीं। ऊपर फसलें देखें!", "bn": "এখনও কোনো আগ্রহ নেই।", "ta": "இன்னும் ஆர்வம் இல்லை.", "te": "ఇంకా ఆసక్తులు లేవు.",      "mr": "अजून कोणताही रस नाही.",              "gu": "હજુ કોઈ રસ નથી."},
    "failed_crops":       {"en": "Failed to load crops. Please refresh.",     "hi": "फसलें लोड नहीं हुईं।",                "bn": "ফসল লোড হয়নি।",        "ta": "பயிர்கள் ஏற்றப்படவில்லை.", "te": "పంటలు లోడ్ కాలేదు.",      "mr": "फसल लोड झाली नाही.",                 "gu": "પાક લોડ થઈ શક્યો નહીં."},
}

# ---------- HELPERS ----------

def get_text(key: str, lang: str = "en") -> str:
    lang = lang if lang in SUPPORTED_LANGS else "en"
    return TEXTS.get(key, {}).get(lang) or TEXTS.get(key, {}).get("en") or key


def get_crop_label(crop: str, lang: str = "en") -> str:
    crop = crop.lower().strip()
    lang = lang if lang in SUPPORTED_LANGS else "en"
    return CROP_LABELS.get(crop, {}).get(lang) or CROP_LABELS.get(crop, {}).get("en") or crop


def get_city_label(city_key: str, lang: str = "en") -> str:
    city_key = city_key.lower().strip()
    lang = lang if lang in SUPPORTED_LANGS else "en"
    return CITY_LABELS.get(city_key, {}).get(lang) or CITY_LABELS.get(city_key, {}).get("en") or city_key.title()


def normalize_city_input(text: str):
    if not text:
        return None
    text = text.strip().lower()
    if text in CITY_LABELS:
        return text
    for canonical, labels in CITY_LABELS.items():
        for lbl in labels.values():
            if text == lbl.lower():
                return canonical
    return None


def translate_raw(text: str, lang: str) -> str:
    return text


def get_dashboard_strings(lang: str) -> dict:
    """Return all dashboard UI strings for the requested language."""
    lang = lang if lang in SUPPORTED_LANGS else "en"
    return {key: (row.get(lang) or row.get("en") or key)
            for key, row in DASHBOARD_STRINGS.items()}