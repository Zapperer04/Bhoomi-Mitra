/**
 * dashboard_i18n.js — Bhoomi Mitra
 * Provides DT.t(key) for all dashboard UI strings across 10 Indian languages.
 *
 * FIX v3 — resolves ALL remaining raw-key display issues:
 *   1. Race condition fixed: DT.ready resolves AFTER DOM scan completes,
 *      guaranteeing static data-i18n attributes are translated BEFORE
 *      dashboard.js renders any dynamic content.
 *   2. Added every missing key: negotiating_lbl, partially_sold_lbl,
 *      qty_remaining, status_sold, status_removed, status_active,
 *      status_partially_sold, confirm_accept, confirm_reject,
 *      confirm_withdraw, confirm_delete_history, confirm_remove_crop,
 *      buyers_suffix, unknown_crop, unknown_contractor, n_a.
 *   3. farmer.contractors_sub and farmer.chatbot_sub now properly defined.
 *   4. DOM scanner runs inside _init() before _resolveReady().
 */

(function () {
  "use strict";

  const SUPPORTED = ["en","hi","mr","te","kn","ta","gu","pa","bn","or"];

  const STRINGS = {

    // ── HOME PAGE ─────────────────────────────────────────────────────────
    "home.nav_home":  { en:"Home",            hi:"होम",            mr:"मुख्यपृष्ठ",    te:"హోమ్",            kn:"ಮುಖಪುಟ",         ta:"முகப்பு",         gu:"હોમ",      pa:"ਹੋਮ",       bn:"হোম",      or:"ହୋମ"  },
    "home.nav_login": { en:"Login",           hi:"लॉगिन",          mr:"लॉगिन",          te:"లాగిన్",          kn:"ಲಾಗಿನ್",          ta:"உள்நுழை",        gu:"લૉગઇન",   pa:"ਲੌਗਇਨ",     bn:"লগইন",     or:"ଲଗଇନ" },
    "home.back_home": { en:"← Back to Home",  hi:"← होम पर वापस", mr:"← मुखपृष्ठावर", te:"← హోమ్‌కు వెళ్ళు",kn:"← ಮುಖಪುಟಕ್ಕೆ",  ta:"← முகப்புக்கு",  gu:"← ઘરે",    pa:"← ਹੋਮ",     bn:"← হোমে",   or:"← ହୋମ" },
    "home.badge": {
      en:"🌾 Agriculture Platform", hi:"🌾 कृषि मंच", mr:"🌾 शेती मंच",
      te:"🌾 వ్యవసాయ వేదిక", kn:"🌾 ಕೃಷಿ ವೇದಿಕೆ", ta:"🌾 விவசாய தளம்",
      gu:"🌾 ખEtee Manch", pa:"🌾 ਖੇਤੀ ਮੰਚ", bn:"🌾 কৃষি প্ল্যাটফর্ম", or:"🌾  କୃଷି ମଞ୍ଚ"
    },
    "home.hero_title": {
      en:"Connecting Farmers Directly with Contractors",
      hi:"किसानों को सीधे ठेकेदारों से जोड़ना",
      mr:"शेतकऱ्यांना थेट कंत्राटदारांशी जोडणे",
      te:"రైతులను నేరుగా కాంట్రాక్టర్లతో అనుసంధానించడం",
      kn:"ರೈತರನ್ನು ನೇರವಾಗಿ ಗುತ್ತಿಗೆದಾರರೊಂದಿಗೆ ಸಂಪರ್ಕಿಸುವುದು",
      ta:"விவசாயிகளை நேரடியாக ஒப்பந்தக்காரர்களுடன் இணைக்கிறோம்",
      gu:"Khedutone seedha Thekedar sathe jodvu",
      pa:"ਕਿਸਾਨਾਂ ਨੂੰ ਸਿੱਧੇ ਠੇਕੇਦਾਰਾਂ ਨਾਲ ਜੋੜਨਾ",
      bn:"কৃষকদের সরাসরি ঠিকাদারদের সাথে সংযুক্ত করা",
      or:"ଚାଷୀଙ୍କୁ ସିଧା ଠିକାଦାରଙ୍କ ସହ ଯୋଡ଼ିବା"
    },
    "home.hero_sub": {
      en:"A smart agriculture platform combining direct trade and a farming chatbot.",
      hi:"एक स्मार्ट कृषि मंच जो प्रत्यक्ष व्यापार और एक कृषि चैटबॉट को जोड़ता है।",
      mr:"थेट व्यापार आणि शेती चॅटबॉट एकत्र करणारे स्मार्ट कृषी मंच.",
      te:"ప్రత్యక్ష వ్యాపారం మరియు వ్యవసాయ చాట్‌బాట్‌ను కలిపే స్మార్ట్ వ్యవసాయ వేదిక.",
      kn:"ನೇರ ವ್ಯಾಪಾರ ಮತ್ತು ಕೃಷಿ ಚಾಟ್‌ಬಾಟ್ ಸಂಯೋಜಿಸುವ ಸ್ಮಾರ್ಟ್ ಕೃಷಿ ವೇದಿಕೆ.",
      ta:"நேரடி வர்த்தகம் மற்றும் விவசாய சாட்போட்டை இணைக்கும் ஸ்மார்ட் தளம்.",
      gu:"Direct trade ane Chatbot bharelu Smart Kheti Manch.",
      pa:"ਸਿੱਧੇ ਵਪਾਰ ਅਤੇ ਖੇਤੀ ਚੈਟਬੋਟ ਨੂੰ ਜੋੜਦਾ ਸਮਾਰਟ ਕ੍ਰਿਸ਼ੀ ਮੰਚ।",
      bn:"সরাসরি ব্যবসা এবং কৃষি চ্যাটবট একত্রিত স্মার্ট কৃষি প্ল্যাটফর্ম।",
      or:"ସିଧା ବ୍ୟାପାର ଓ ଚ୍ୟାଟ୍‌ବଟ ମିଶ୍ରଣ ସ୍ମାର୍ଟ ମଞ୍ଚ।"
    },
    "home.join_farmer":   { en:"Join as Farmer",     hi:"किसान के रूप में जुड़ें",    mr:"शेतकरी म्हणून सामील व्हा",   te:"రైతుగా చేరండి",        kn:"ರೈತನಾಗಿ ಸೇರಿ",        ta:"விவசாயியாக சேருங்கள்",    gu:"Khedut tarke jodao",   pa:"ਕਿਸਾਨ ਵਜੋਂ ਜੁੜੋ",   bn:"কৃষক হিসেবে যোগ",    or:"Chashi bhawe jog" },
    "home.join_contractor":{ en:"Join as Contractor", hi:"ठेकेदार के रूप में जुड़ें", mr:"कंत्राटदार म्हणून सामील व्हा",te:"కాంట్రాక్టర్‌గా చేరండి",kn:"ಗುತ್ತಿಗೆದಾರನಾಗಿ ಸೇರಿ",  ta:"ஒப்பந்தக்காரராக சேருங்கள்",gu:"Thekedar tarke jodao",pa:"ਠੇਕੇਦਾਰ ਵਜੋਂ ਜੁੜੋ",  bn:"ঠিকাদার হিসেবে যোগ", or:"Thika bhawe jog" },
    "home.card_farmer_title":    { en:"For Farmers",     hi:"किसानों के लिए",    mr:"शेतकऱ्यांसाठी",   te:"రైతులకు",           kn:"ರೈತರಿಗೆ",         ta:"விவசாயிகளுக்கு",  gu:"Khedut",   pa:"ਕਿਸਾਨ",   bn:"কৃষক",    or:"Chashi" },
    "home.card_contractor_title":{ en:"For Contractors", hi:"ठेकेदारों के लिए", mr:"कंत्राटदारांसाठी", te:"కాంట్రాక్టర్లకు",  kn:"ಗುತ್ತಿಗೆದಾರರಿಗೆ",ta:"ஒப்பந்தக்காரர்",  gu:"Thekedar", pa:"ਠੇਕੇਦਾਰ",  bn:"ঠিকাদার",  or:"Thika" },
    "home.card_chatbot_title":   { en:"Farming Chatbot", hi:"कृषि चैटबॉट",      mr:"शेती चॅटबॉट",     te:"వ్యవసాయ చాట్‌బాట్",kn:"ಕೃಷಿ ಚಾಟ್‌ಬಾಟ್",  ta:"விவசாய சாட்போட்", gu:"Chatbot",  pa:"ਖੇਤੀ ਚੈਟਬੋਟ",bn:"কৃষি চ্যাটবট",or:"Chatbot" },
    "home.card_farmer_body": {
      en:"Sell crops directly to contractors, discover local demand, and avoid middlemen completely.",
      hi:"फसलें सीधे ठेकेदारों को बेचें, स्थानीय मांग खोजें और बिचौलियों से बचें।",
      mr:"पिके थेट कंत्राटदारांना विका, स्थानिक मागणी शोधा आणि दलालांना टाळा.",
      te:"పంటలు నేరుగా కాంట్రాక్టర్లకు అమ్మండి, స్థానిక డిమాండ్ కనుగొనండి.",
      kn:"ಬೆಳೆಗಳನ್ನು ನೇರವಾಗಿ ಗುತ್ತಿಗೆದಾರರಿಗೆ ಮಾರಿ, ಸ್ಥಳೀಯ ಬೇಡಿಕೆ ತಿಳಿಯಿರಿ.",
      ta:"பயிர்களை நேரடியாக விற்கவும், உள்ளூர் தேவை கண்டறியவும்.",
      gu:"Pik seedha vecho, local manag shodho, dalaloni bachvo.",
      pa:"ਫਸਲਾਂ ਸਿੱਧੇ ਵੇਚੋ, ਸਥਾਨਕ ਮੰਗ ਲੱਭੋ, ਵਿਚੋਲਿਆਂ ਤੋਂ ਬਚੋ।",
      bn:"সরাসরি ফসল বিক্রি করুন, স্থানীয় চাহিদা আবিষ্কার করুন।",
      or:"ସିଧା ଫସଲ ବECHAN କରନ୍ତୁ, ସ୍ଥାନୀୟ ଚାହିଦ ଜANIBU।"
    },
    "home.card_contractor_body": {
      en:"Find farmers by crop and region, source produce efficiently, and build long-term supply connections.",
      hi:"फसल और क्षेत्र के आधार पर किसान खोजें, उपज कुशलतापूर्वक प्राप्त करें।",
      mr:"पीक आणि प्रदेशानुसार शेतकरी शोधा, कार्यक्षमतेने उत्पादन मिळवा.",
      te:"పంట మరియు ప్రాంతం ద్వారా రైతులను కనుగొనండి.",
      kn:"ಬೆಳೆ ಮತ್ತು ಪ್ರದೇಶದ ಮೂಲಕ ರೈತರನ್ನು ಹುಡುಕಿ.",
      ta:"பயிர் மற்றும் பகுதி மூலம் விவசாயிகளை கண்டறியுங்கள்.",
      gu:"Pak ane Pradesh thi Khedut shodho.",
      pa:"ਫਸਲ ਅਤੇ ਖੇਤਰ ਅਨੁਸਾਰ ਕਿਸਾਨ ਲੱਭੋ।",
      bn:"ফসল ও অঞ্চল অনুযায়ী কৃষক খুঁজুন।",
      or:"ଫସଲ ଓ ଅଞ୍ଚଳ ଅNUSARE ଚAshi ଖୋଜ।"
    },
    "home.card_chatbot_body": {
      en:"Get instant crop advice, weather updates, MSP information, and government schemes — anytime, in your language.",
      hi:"तुरंत फसल सलाह, मौसम अपडेट, MSP जानकारी और सरकारी योजनाएं — किसी भी समय, अपनी भाषा में।",
      mr:"त्वरित पीक सल्ला, हवामान अपडेट, MSP माहिती आणि सरकारी योजना — कधीही, तुमच्या भाषेत.",
      te:"తక్షణ పంట సలహా, వాతావరణం, MSP సమాచారం — ఎప్పుడైనా, మీ భాషలో.",
      kn:"ತಕ್ಷಣ ಬೆಳೆ ಸಲಹೆ, ಹವಾಮಾನ, MSP ಮಾಹಿತಿ — ಯಾವಾಗಲೂ, ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ.",
      ta:"உடனடி பயிர் ஆலோசனை, வானிலை, MSP தகவல் — எப்போதும், உங்கள் மொழியில்.",
      gu:"Tatkal Pak Salah, Hawaman, MSP — kyare pan, tamari bhasha ma.",
      pa:"ਤੁਰੰਤ ਫਸਲ ਸਲਾਹ, ਮੌਸਮ, MSP ਜਾਣਕਾਰੀ — ਕਦੇ ਵੀ, ਆਪਣੀ ਭਾਸ਼ਾ ਵਿੱਚ।",
      bn:"তাৎক্ষণিক ফসল পরামর্শ, আবহাওয়া, MSP — যেকোনো সময়, আপনার ভাষায়।",
      or:"ତୁRNT ଫSAL ପRMSH, MSP — ଯEKne SAMAY, APN ভASHAy।"
    },

    // ── LOGIN PAGE ────────────────────────────────────────────────────────
    "login.title":                { en:"Welcome back",          hi:"वापस स्वागत है",         mr:"परत स्वागत",          te:"తిరిగి స్వాగతం",         kn:"ಮತ್ತೆ ಸ್ವಾಗತ",         ta:"மீண்டும் வரவேற்கிறோம்", gu:"Pacho Swagat",  pa:"ਵਾਪਸੀ ਸੁਆਗਤ",  bn:"ফিরে স্বাগতম",   or:"Pheri swagat" },
    "login.subtitle":             { en:"Login to your account",  hi:"अपने खाते में लॉगिन करें",mr:"खात्यात लॉगिन करा",   te:"ఖాతాలో లాగిన్ చేయండి",  kn:"ಖಾತೆಗೆ ಲಾಗಿನ್ ಮಾಡಿ",  ta:"கணக்கில் உள்நுழையுங்கள்",gu:"Account ma Login",pa:"ਖਾਤੇ ਵਿੱਚ ਲੌਗਇਨ",bn:"অ্যাকাউন্টে লগইন",or:"Account login" },
    "login.phone_placeholder":    { en:"Phone Number",           hi:"फ़ोन नंबर",               mr:"फोन नंबर",             te:"ఫోన్ నంబర్",              kn:"ಫೋನ್ ಸಂಖ್ಯೆ",          ta:"தொலைபேசி எண்",          gu:"Phone Number",  pa:"ਫੋਨ ਨੰਬਰ",     bn:"ফোন নম্বর",      or:"Phone" },
    "login.password_placeholder": { en:"Password",               hi:"पासवर्ड",                 mr:"पासवर्ड",               te:"పాస్‌వర్డ్",               kn:"ಪಾಸ್‌ವರ್ಡ್",            ta:"கடவுச்சொல்",             gu:"Password",      pa:"ਪਾਸਵਰਡ",        bn:"পাসওয়ার্ড",      or:"Password" },
    "login.submit":               { en:"Login",                  hi:"लॉगिन करें",              mr:"लॉगिन करा",            te:"లాగిన్ చేయండి",           kn:"ಲಾಗಿನ್ ಮಾಡಿ",          ta:"உள்நுழை",               gu:"Login",         pa:"ਲੌਗਇਨ",          bn:"লগইন",           or:"Login" },
    "login.no_account":           { en:"Don't have an account?", hi:"खाता नहीं है?",           mr:"खाते नाही?",           te:"ఖాతా లేదా?",              kn:"ಖಾತೆ ಇಲ್ಲವೇ?",         ta:"கணக்கு இல்லையா?",       gu:"Account nathi?", pa:"ਖਾਤਾ ਨਹੀਂ?",    bn:"অ্যাকাউন্ট নেই?",or:"Account nahi?" },
    "login.create_one":           { en:"Create one",             hi:"बनाएं",                   mr:"तयार करा",             te:"సృష్టించండి",              kn:"ರಚಿಸಿ",                 ta:"உருவாக்கு",             gu:"Banavo",        pa:"ਬਣਾਓ",           bn:"তৈরি করুন",      or:"Banao" },

    // ── SIGNUP PAGE ───────────────────────────────────────────────────────
    "signup.title":                { en:"Create your account",      hi:"अपना खाता बनाएं",       mr:"खाते तयार करा",           te:"ఖాతా సృష్టించండి",        kn:"ಖಾತೆ ರಚಿಸಿ",           ta:"கணக்கு உருவாக்குங்கள்", gu:"Account banao",  pa:"ਖਾਤਾ ਬਣਾਓ",     bn:"অ্যাকাউন্ট তৈরি",  or:"Account banao" },
    "signup.subtitle":             { en:"Select your role to continue",hi:"भूमिका चुनें",         mr:"भूमिका निवडा",            te:"పాత్ర ఎంచుకోండి",          kn:"ಪಾತ್ರ ಆಯ್ಕೆ ಮಾಡಿ",    ta:"பங்கை தேர்ந்தெடுங்கள்",gu:"Role chuno",     pa:"ਭੂਮਿਕਾ ਚੁਣੋ",    bn:"ভূমিকা বেছে নিন",  or:"Role chuno" },
    "signup.role_farmer":          { en:"Farmer",     hi:"किसान",    mr:"शेतकरी",   te:"రైతు",     kn:"ರೈತ",    ta:"விவசாயி",  gu:"Khedut",  pa:"ਕਿਸਾਨ",   bn:"কৃষক",    or:"Chashi" },
    "signup.role_contractor":      { en:"Contractor", hi:"ठेकेदार",  mr:"कंत्राटदार",te:"కాంట్రాక్టర్",kn:"ಗುತ್ತಿಗೆದಾರ",ta:"ஒப்பந்தக்காரர்",gu:"Thekedar",pa:"ਠੇਕੇਦਾਰ", bn:"ঠিকাদার",  or:"Thika" },
    "signup.name_placeholder":     { en:"Full Name",         hi:"पूरा नाम",         mr:"पूर्ण नाव",        te:"పూర్తి పేరు",        kn:"ಪೂರ್ಣ ಹೆಸರು",      ta:"முழு பெயர்",         gu:"Puru Naam",    pa:"ਪੂਰਾ ਨਾਮ",    bn:"পুরো নাম",    or:"Pura Naam" },
    "signup.phone_placeholder":    { en:"Phone Number",      hi:"फ़ोन नंबर",        mr:"फोन नंबर",         te:"ఫోన్ నంబర్",         kn:"ಫೋನ್ ಸಂಖ್ಯೆ",      ta:"தொலைபேசி எண்",       gu:"Phone Number", pa:"ਫੋਨ ਨੰਬਰ",    bn:"ফোন নম্বর",   or:"Phone" },
    "signup.password_placeholder": { en:"Password",          hi:"पासवर्ड",          mr:"पासवर्ड",          te:"పాస్‌వర్డ్",          kn:"ಪಾಸ್‌ವರ್ಡ್",        ta:"கடவுச்சொல்",         gu:"Password",     pa:"ਪਾਸਵਰਡ",       bn:"পাসওয়ার্ড",   or:"Password" },
    "signup.village_placeholder":  { en:"Village / District",hi:"गाँव / जिला",      mr:"गाव / जिल्हा",     te:"గ్రామం / జిల్లా",    kn:"ಗ್ರಾಮ / ಜಿಲ್ಲೆ",    ta:"கிராமம் / மாவட்டம்", gu:"Gam / Jillo",  pa:"ਪਿੰਡ / ਜ਼ਿਲ੍ਹਾ",bn:"গ্রাম / জেলা",or:"Gaon / Jilla" },
    "signup.crops_placeholder":    { en:"Primary Crops",     hi:"मुख्य फसलें",      mr:"मुख्य पिके",       te:"ముఖ్య పంటలు",        kn:"ಮುಖ್ಯ ಬೆಳೆಗಳು",     ta:"முக்கிய பயிர்கள்",   gu:"Mukhya Pak",   pa:"ਮੁੱਖ ਫਸਲਾਂ",  bn:"প্রধান ফসল",  or:"Mukhya Fasal" },
    "signup.business_placeholder": { en:"Business Type",     hi:"व्यापार का प्रकार",mr:"व्यवसायाचा प्रकार",te:"వ్యాపార రకం",         kn:"ವ್ಯಾಪಾರ ಪ್ರಕಾರ",    ta:"வணிக வகை",           gu:"Business Type",pa:"ਕਾਰੋਬਾਰ",      bn:"ব্যবসার ধরন", or:"Byapar" },
    "signup.regions_placeholder":  { en:"Operating Regions", hi:"कार्यक्षेत्र",     mr:"कार्यक्षेत्र",     te:"కార్యాచరణ ప్రాంతాలు",kn:"ಕಾರ್ಯ ಪ್ರದೇಶಗಳು",  ta:"செயல்படும் பகுதிகள்",gu:"Regions",      pa:"ਖੇਤਰ",         bn:"কার্যক্ষেত্র", or:"Kshetra" },
    "signup.submit":               { en:"Create Account",    hi:"खाता बनाएं",       mr:"खाते तयार करा",    te:"ఖాతా సృష్టించు",     kn:"ಖಾತೆ ರಚಿಸಿ",        ta:"கணக்கு உருவாக்கு",  gu:"Account banao",pa:"ਖਾਤਾ ਬਣਾਓ",    bn:"অ্যাকাউন্ট তৈরি",or:"Account banao" },

    // ── NAV ──────────────────────────────────────────────────────────────
    "nav.messages":    { en:"Messages",    hi:"संदेश",          mr:"संदेश",         te:"సందేశాలు",       kn:"ಸಂದೇಶಗಳು",    ta:"செய்திகள்",   gu:"સંદેશ",    pa:"ਸੁਨੇਹੇ",    bn:"বার্তা",     or:"ସନ୍ଦେଶ"      },
    "nav.logout":      { en:"Logout",      hi:"लॉगआउट",         mr:"लॉगआउट",        te:"లాగ్ అవుట్",     kn:"ಲಾಗ್ ಔಟ್",   ta:"வெளியேறு",   gu:"લૉગ આઉટ", pa:"ਲੌਗ ਆਉਟ",  bn:"লগআউট",      or:"ଲଗ ଆଉଟ"      },
    "nav.gov_schemes": { en:"Gov Schemes", hi:"सरकारी योजनाएं",  mr:"सरकारी योजना",  te:"ప్రభుత్వ పథకాలు",kn:"ಸರ್ಕಾರಿ ಯೋಜ", ta:"அரசு திட்டம்",gu:"સરકારી યોજ", pa:"ਸਰਕਾਰੀ ਯੋਜ",bn:"সরকারি প্রকল্প",or:"ସରକାରୀ ଯୋଜ"},
    "nav.interests":   { en:"Interests",   hi:"रुचियां",          mr:"स्वारस्य",       te:"ఆసక్తులు",       kn:"ಆಸಕ್ತಿಗಳು",   ta:"விருப்பங்கள்",gu:"રુચિ",     pa:"ਰੁਚੀਆਂ",   bn:"আগ্রহ",       or:"ଆଗ୍ରହ"        },

    // ── FARMER DASHBOARD ─────────────────────────────────────────────────
    "farmer.role_badge": { en:"Farmer",hi:"किसान",mr:"शेतकरी",te:"రైతు",kn:"ರೈತ",ta:"விவசாயி",gu:"ખેડૂત",pa:"ਕਿਸਾਨ",bn:"কৃষক",or:"ଚାଷୀ" },
    "farmer.welcome":  {
      en:"Welcome, Farmer 👋", hi:"स्वागत है, किसान 👋", mr:"स्वागत आहे, शेतकरी 👋",
      te:"స్వాగతం, రైతు 👋", kn:"ಸ್ವಾಗತ, ರೈತ 👋", ta:"வரவேற்கிறோம், விவசாயி 👋",
      gu:"સ્વાગત, ખેડૂત 👋", pa:"ਜੀ ਆਇਆਂ ਨੂੰ, ਕਿਸਾਨ 👋", bn:"স্বাগতম, কৃষক 👋", or:"ସ୍ୱାଗତ, ଚାଷୀ 👋"
    },
    "farmer.welcome_sub": {
      en:"Manage your crops, connect with contractors, and track history.",
      hi:"अपनी फसलें प्रबंधित करें, ठेकेदारों से जुड़ें और इतिहास ट्रैक करें।",
      mr:"तुमच्या पिकांचे व्यवस्थापन करा, कंत्राटदारांशी जोडा.",
      te:"మీ పంటలను నిర్వహించండి, కాంట్రాక్టర్లతో అనుసంధానించండి.",
      kn:"ನಿಮ್ಮ ಬೆಳೆ ನಿರ್ವಹಿಸಿ, ಗುತ್ತಿಗೆದಾರರೊಂದಿಗೆ ಸಂಪರ್ಕಿಸಿ.",
      ta:"உங்கள் பயிர்களை நிர்வகிக்கவும், ஒப்பந்தக்காரர்களுடன் இணையுங்கள்.",
      gu:"તમારા પાક સંચાલિત કરો, ઠેકેদારો સાથે જોડો.",
      pa:"ਆਪਣੀਆਂ ਫਸਲਾਂ ਦਾ ਪ੍ਰਬੰਧਨ ਕਰੋ, ਠੇਕੇਦਾਰਾਂ ਨਾਲ ਜੁੜੋ।",
      bn:"আপনার ফসল পরিচালনা করুন, ঠিকাদারদের সাথে সংযোগ করুন।",
      or:"ଆପଣଙ୍କ ଫସଲ ପରିଚାଳନା କରନ୍ତୁ।"
    },
    "farmer.post_crop":     { en:"Post Crop for Sale",hi:"फसल बेचने के लिए पोस्ट करें",mr:"पीक विक्रीसाठी पोस्ट करा",te:"పంటను అమ్మకానికి పోస్ట్ చేయండి",kn:"ಮಾರಾಟಕ್ಕೆ ಬೆಳೆ ಪೋಸ್ಟ್",ta:"விற்பனைக்கு பயிர் பதிவிடவும்",gu:"પاক Post",pa:"ਫਸਲ ਪੋਸਟ",bn:"ফসল পোস্ট",or:"ଫসল Post" },
    "farmer.post_crop_sub": { en:"Add crop details and let contractors contact you.",hi:"फसल विवरण जोड़ें।",mr:"पीक तपशील जोडा.",te:"పంట వివరాలు జోడించండి.",kn:"ಬೆಳೆ ವಿವರ ಸೇರಿಸಿ.",ta:"பயிர் விவரம் சேர்க்கவும்.",gu:"Pak Vigat Umero.",pa:"ਫਸਲ ਵੇਰਵੇ ਜੋੜੋ।",bn:"ফসলের বিবরণ যোগ করুন।",or:"ଫসল ବিବরଣ ଯୋଡ଼ନ୍ତୁ।" },
    "farmer.post_crop_btn": { en:"Post Crop",hi:"फसल पोस्ट करें",mr:"पीक पोस्ट करा",te:"పంట పోస్ట్",kn:"ಬೆಳೆ ಪೋಸ್ಟ್",ta:"பயிர் பதிவிடு",gu:"Pak Post",pa:"ਫਸਲ ਪੋਸਟ",bn:"ফসল পোস্ট",or:"ଫসल Post" },
    "farmer.contractors":   { en:"Interested Contractors",hi:"इच्छुक ठेकेदार",mr:"इच्छुक कंत्राटदार",te:"ఆసక్తిగల కాంట్రాక్టర్లు",kn:"ಆಸಕ್ತ ಗುತ್ತಿಗೆದಾರರು",ta:"ஆர்வமுள்ள ஒப்பந்தக்காரர்கள்",gu:"Interested Thekedar",pa:"ਰੁਚੀ ਰੱਖਣ ਵਾਲੇ ਠੇਕੇਦਾਰ",bn:"আগ্রহী ঠিকাদার",or:"ଆଗ୍ରହୀ ଠିকার" },
    // FIX: was showing as raw key
    "farmer.contractors_sub": {
      en:"View contractors who have shown interest in your crops.",
      hi:"उन ठेकेदारों को देखें जिन्होंने रुचि दिखाई है।",
      mr:"ज्यांनी स्वारस्य दाखवले त्या कंत्राटदारांना पहा.",
      te:"ఆసక్తి చూపిన కాంట్రాక్టర్లను చూడండి.",
      kn:"ಆಸಕ್ತಿ ತೋರಿದ ಗುತ್ತಿಗೆದಾರರನ್ನು ನೋಡಿ.",
      ta:"ஆர்வம் காட்டிய ஒப்பந்தக்காரர்களை பாருங்கள்.",
      gu:"Ruch Batavel Thekedar Juo.",
      pa:"ਰੁਚੀ ਦਿਖਾਉਣ ਵਾਲੇ ਠੇਕੇਦਾਰ ਦੇਖੋ।",
      bn:"আগ্রহ দেখানো ঠিকাদার দেখুন।",
      or:"ଆଗ୍ରହ ଦେଖାଇଥିବା ଠିকার ଦেখনন୍ତୁ।"
    },
    "farmer.view_requests": { en:"View Requests",hi:"अनुरोध देखें",mr:"विनंत्या पहा",te:"అభ్యర్థనలు చూడండి",kn:"ವಿನಂತಿ ನೋಡಿ",ta:"கோரிக்கைகளைப் பாருங்கள்",gu:"Request Juo",pa:"ਬੇਨਤੀਆਂ ਦੇਖੋ",bn:"অনুরোধ দেখুন",or:"ଅनुরোধ ଦেখন" },
    "farmer.chatbot_title": { en:"Your Farming Assistant",hi:"आपका कृषि सहायक",mr:"तुमचा शेती सहायक",te:"మీ వ్యవసాయ సహాయకుడు",kn:"ನಿಮ್ಮ ಕೃಷಿ ಸಹಾಯಕ",ta:"உங்கள் விவசாய உதவியாளர்",gu:"Kheti Sahayak",pa:"ਤੁਹਾਡਾ ਖੇਤੀ ਸਹਾਇਕ",bn:"আপনার কৃষি সহকারী",or:"ଆपਣਙ੍ਕ ਕ੍ਰਿਸ਼ਿ ਸਹਾਯਕ" },
    // FIX: was showing as raw key
    "farmer.chatbot_sub": {
      en:"Get crop advice, weather, MSP prices and government schemes.",
      hi:"फसल सलाह, मौसम, MSP मूल्य और सरकारी योजनाएं प्राप्त करें।",
      mr:"पीक सल्ला, हवामान, MSP किमती आणि सरकारी योजना मिळवा.",
      te:"పంట సలహా, వాతావరణం, MSP ధరలు మరియు ప్రభుత్వ పథకాలు.",
      kn:"ಬೆಳೆ ಸಲಹೆ, ಹವಾಮಾನ, MSP ಬೆಲೆ ಮತ್ತು ಸರ್ಕಾರಿ ಯೋಜನೆ.",
      ta:"பயிர் ஆலோசனை, வானிலை, MSP விலைகள் மற்றும் திட்டங்கள்.",
      gu:"Pak Salab, Havaman, MSP Bhav ane Sarkar Yojna.",
      pa:"ਫਸਲ ਸਲਾਹ, ਮੌਸਮ, MSP ਕੀਮਤਾਂ ਅਤੇ ਸਰਕਾਰੀ ਯੋਜਨਾਵਾਂ।",
      bn:"ফসল পরামর্শ, আবহাওয়া, MSP মূল্য ও সরকারি প্রকল্প পান।",
      or:"ଫসল ପরামর্শ, ପাଣିପাଗ, MSP ମୂଲ୍ୟ।"
    },
    "farmer.open_chatbot":  { en:"Open Chatbot",hi:"चैटबॉट खोलें",mr:"चॅटबॉट उघडा",te:"చాట్‌బాట్ తెరవండి",kn:"ಚಾಟ್‌ಬಾಟ್ ತೆರೆ",ta:"சாட்போட்டை திற",gu:"Chatbot Kholo",pa:"ਚੈਟਬੋਟ ਖੋਲੋ",bn:"চ্যাটবট খুলুন",or:"Chatbot ଖোলன" },
    "farmer.active_crops":  { en:"My Active Crops",hi:"मेरी सक्रिय फसलें",mr:"माझी सक्रिय पिके",te:"నా క్రియాశీల పంటలు",kn:"ನನ್ನ ಸಕ್ರಿಯ ಬೆಳೆ",ta:"என் செயலில் உள்ள பயிர்கள்",gu:"Mara Sakri Pak",pa:"ਮੇਰੀਆਂ ਸਰਗਰਮ ਫਸਲਾਂ",bn:"আমার সক্রিয় ফসল",or:"ମୋ ସক্রিয় ফসল" },
    "farmer.interests":     { en:"🔔 Interest Requests",hi:"🔔 रुचि अनुरोध",mr:"🔔 स्वारस्य विनंत्या",te:"🔔 ఆసక్తి అభ్యర్థనలు",kn:"🔔 ಆಸಕ್ತಿ ವಿನಂತಿ",ta:"🔔 விருப்ப கோரிக்கைகள்",gu:"🔔 Ruch Vinanti",pa:"🔔 ਰੁਚੀ ਬੇਨਤੀਆਂ",bn:"🔔 আগ্রহের অনুরোধ",or:"🔔 ଆਗ੍ਰਹ ਅਨੁਰੋਧ" },
    "farmer.crop_history":  { en:"Crop History",hi:"फसल इतिहास",mr:"पीक इतिहास",te:"పంట చరిత్ర",kn:"ಬೆಳೆ ಇತಿಹಾಸ",ta:"பயிர் வரலாறு",gu:"Pak Itihas",pa:"ਫਸਲ ਇਤਿਹਾਸ",bn:"ফসলের ইতিহাস",or:"ফসل ইতিহাস" },
    "farmer.clear_history": { en:"Clear History",hi:"इतिहास साफ़ करें",mr:"इतिहास साफ करा",te:"చరిత్ర తొలగించండి",kn:"ಇತಿಹಾಸ ತೆರ",ta:"வரலாற்றை அழி",gu:"Itihas Saf Karo",pa:"ਇਤਿਹਾਸ ਸਾਫ਼ ਕਰੋ",bn:"ইতিহাস মুছুন",or:"ইতিহাস ଅপসারণ" },
    "farmer.loading_crops":    { en:"Fetching active crops…",hi:"सक्रिय फसलें लोड हो रही हैं…",mr:"सक्रिय पिके लोड होत आहेत…",te:"పంటలు లోడవుతున్నాయి…",kn:"ಬೆಳೆ ಲೋಡ್…",ta:"பயிர்கள் ஏற்றப்படுகின்றன…",gu:"Pak Load...",pa:"ਫਸਲਾਂ ਲੋਡ...",bn:"ফসল লোড হচ্ছে…",or:"ফসল Load..." },
    "farmer.loading_interests": { en:"Loading interests...",hi:"रुचियां लोड हो रही हैं...",mr:"स्वारस्य लोड होत आहे...",te:"ఆసక్తులు లోడ...",kn:"ಆಸಕ್ತಿ ಲೋಡ್...",ta:"விருப்பங்கள் ஏற்றம்...",gu:"Ruch Load...",pa:"ਰੁਚੀਆਂ ਲੋਡ...",bn:"আগ্রহ লোড...",or:"ਆਗ੍ਰਹ Load..." },
    "farmer.no_history":    { en:"No crop history yet.",hi:"अभी कोई फसल इतिहास नहीं।",mr:"अद्याप पीक इतिहास नाही.",te:"ఇంకా పంట చరిత్ర లేదు.",kn:"ಬೆಳೆ ಇತಿಹಾಸ ಇಲ್ಲ.",ta:"பயிர் வரலாறு இல்லை.",gu:"Itihas nathi.",pa:"ਅਜੇ ਇਤਿਹਾਸ ਨਹੀਂ।",bn:"এখনও ইতিহাস নেই।",or:"ইতিহাস ନাহི।" },

    // ── CONTRACTOR DASHBOARD ─────────────────────────────────────────────
    "contractor.role_badge":   { en:"Contractor",hi:"ठेकेदार",mr:"कंत्राटदार",te:"కాంట్రాక్టర్",kn:"ಗುತ್ತಿಗೆದಾರ",ta:"ஒப்பந்தக்காரர்",gu:"Thekedar",pa:"ਠੇਕੇਦਾਰ",bn:"ঠিকাদার",or:"ঠিকাদার" },
    "contractor.greeting":     { en:"👋 Hi Contractor",hi:"👋 नमस्ते ठेकेदार",mr:"👋 नमस्कार कंत्राटदार",te:"👋 హాయ్ కాంట్రాక్టర్",kn:"👋 ಹಲೋ ಗುತ್ತಿಗೆದಾರ",ta:"👋 வணக்கம் ஒப்பந்தக்காரர்",gu:"👋 Namaste Thekedar",pa:"👋 ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਠੇਕੇਦਾਰ",bn:"👋 হ্যালো ঠিকাদার",or:"👋 Namaste Thekedar" },
    "contractor.greeting_sub": { en:"Browse crops listed by farmers and show interest in purchasing.",hi:"किसानों द्वारा सूचीबद्ध फसलें देखें।",mr:"शेतकऱ्यांनी सूचीबद्ध केलेली पिके पाहा.",te:"రైతులు జాబితా చేసిన పంటలను వీక్షించండి.",kn:"ರೈತ ಬೆಳೆ ಹುಡುಕಿ.",ta:"விவசாயிகள் பட்டியலிட்ட பயிர்களை பாருங்கள்.",gu:"Khedut Pak Tapaso.",pa:"ਕਿਸਾਨਾਂ ਦੀਆਂ ਫਸਲਾਂ ਦੇਖੋ।",bn:"কৃষকদের ফসল দেখুন।",or:"চাষী ফসল ਦੇਖੋ।" },
    "contractor.available":    { en:"🌾 Available Crops for Sale",hi:"🌾 बिक्री के लिए उपलब्ध फसलें",mr:"🌾 विक्रीसाठी उपलब्ध पिके",te:"🌾 అమ్మకానికి అందుబాటులో పంటలు",kn:"🌾 ಮಾರಾಟಕ್ಕೆ ಲಭ್ಯ ಬೆಳೆ",ta:"🌾 விற்பனைக்கு கிடைக்கும் பயிர்கள்",gu:"🌾 Vechan Pak",pa:"🌾 ਵਿਕਰੀ ਲਈ ਉਪਲਬਧ ਫਸਲਾਂ",bn:"🌾 বিক্রয়ের ফসল",or:"🌾 বিক্রয় ফসল" },
    "contractor.my_interests": { en:"📨 My Interests",hi:"📨 मेरी रुचियां",mr:"📨 माझे स्वारस्य",te:"📨 నా ఆసక్తులు",kn:"📨 ನನ್ನ ಆಸಕ್ತಿ",ta:"📨 என் விருப்பங்கள்",gu:"📨 Mari Ruch",pa:"📨 ਮੇਰੀਆਂ ਰੁਚੀਆਂ",bn:"📨 আমার আগ্রহ",or:"📨 ਮੇਰੀ ਆਗ੍ਰਹ" },
    "contractor.search":       { en:"Search crop or location...",hi:"फसल या स्थान खोजें...",mr:"पीक किंवा ठिकाण...",te:"పంట లేదా స్థానం...",kn:"ಬೆಳೆ ಅಥವಾ ಸ್ಥಳ...",ta:"பயிர் அல்லது இடம்...",gu:"Pak ya Sthal...",pa:"ਫਸਲ ਜਾਂ ਟਿਕਾਣਾ...",bn:"ফসল বা অবস্থান...",or:"ফসল ਬা ਸ਼ੁਕੁ..." },
    "contractor.sort":         { en:"Sort by",hi:"क्रमबद्ध",mr:"क्रमवारी",te:"వరుసక్రమం",kn:"ವಿಂಗಡಿಸಿ",ta:"வரிசைப்படுத்து",gu:"Sort",pa:"ਕ੍ਰਮ",bn:"সাজান",or:"Sort" },
    "contractor.price_asc":    { en:"Price: Low to High",hi:"मूल्य: कम से अधिक",mr:"किंमत: कमी ते जास्त",te:"ధర: తక్కువ నుండి",kn:"ಬೆಲೆ: ಕಡಿಮೆ ಯಿಂದ",ta:"விலை: குறைவிலிருந்து",gu:"Bhav: Ochho to Uchho",pa:"ਕੀਮਤ: ਘੱਟ ਤੋਂ",bn:"মূল্য: কম থেকে",or:"ਮੂਲ੍ਯ: ਕਮ" },
    "contractor.price_desc":   { en:"Price: High to Low",hi:"मूल्य: अधिक से कम",mr:"किंमत: जास्त ते कमी",te:"ధర: అధికం నుండి",kn:"ಬೆಲೆ: ಹೆಚ್ಚು ಯಿಂದ",ta:"விலை: அதிகத்திலிருந்து",gu:"Bhav: Uchho to Ochho",pa:"ਕੀਮਤ: ਵੱਧ ਤੋਂ",bn:"মূল্য: বেশি থেকে",or:"ਮੂਲ੍ਯ: ਵੱਧ" },
    "contractor.all_locations":{ en:"All Locations",hi:"सभी स्थान",mr:"सर्व ठिकाणे",te:"అన్ని స్థానాలు",kn:"ಎಲ್ಲ ಸ್ಥಳ",ta:"அனைத்து இடங்கள்",gu:"Badha Sthal",pa:"ਸਭ ਟਿਕਾਣੇ",bn:"সকল অবস্থান",or:"ਸਭ ਸ਼ੁਕੁ" },
    "contractor.loading_crops":     { en:"Loading crops...",hi:"फसलें लोड...",mr:"पिके लोड...",te:"పంటలు లోడ...",kn:"ಬೆಳೆ ಲೋಡ...",ta:"பயிர்கள் ஏற்றம்...",gu:"Pak Load...",pa:"ਫਸਲਾਂ ਲੋਡ...",bn:"ফসল লোড...",or:"ফসল Load..." },
    "contractor.loading_interests": { en:"Loading interests...",hi:"रुचियां लोड...",mr:"स्वारस्य लोड...",te:"ఆసక్తులు లోడ...",kn:"ಆಸಕ್ತಿ ಲೋಡ...",ta:"விருப்பங்கள் ஏற்றம்...",gu:"Ruch Load...",pa:"ਰੁਚੀਆਂ ਲੋਡ...",bn:"আগ্রহ লোড...",or:"ਆਗ੍ਰਹ Load..." },

    // ── MODAL ─────────────────────────────────────────────────────────────
    "contractor.modal_title":            { en:"Show Interest",              hi:"रुचि दिखाएं",         mr:"स्वारस्य दाखवा",       te:"ఆసక్తి చూపు",        kn:"ಆಸಕ್ತಿ ತೋರಿ",     ta:"விருப்பம் காட்டு",  gu:"Ruch Batavo",   pa:"ਰੁਚੀ ਦਿਖਾਓ",   bn:"আগ্রহ দেখান",   or:"ਆਗ੍ਰਹ ਦੇਖਾਓ" },
    "contractor.modal_qty_label":        { en:"Quantity (Quintals)",        hi:"मात्रा (क्विंटल)",    mr:"प्रमाण (क्विंटल)",     te:"పరిమాణం (క్వింటాళ్లు)",kn:"ಪ್ರಮಾಣ (ಕ್ವಿ)",  ta:"அளவு (குவிண்டல்)",gu:"Jatho (Qui.)",  pa:"ਮਾਤਰਾ (ਕੁਇੰਟਲ)",bn:"পরিমাণ",        or:"ਪਰਿਮਾਣ" },
    "contractor.modal_qty_placeholder":  { en:"Ex: 10",hi:"उदा: 10",mr:"उदा: 10",te:"ఉదా: 10",kn:"ಉದಾ: 10",ta:"எ.கா: 10",gu:"Daxla: 10",pa:"ਜਿਵੇਂ: 10",bn:"যেমন: 10",or:"ਯਥਾ: 10" },
    "contractor.modal_price_label":      { en:"Offer Price / Quintal (₹)", hi:"ऑफर मूल्य/क्विंटल",  mr:"ऑफर किंमत/क्विंटल",   te:"ఆఫర్ ధర/క్వింటాల్", kn:"ಕೊಡುಗೆ ಬೆಲೆ/ಕ್ವಿ",ta:"சலுகை விலை/குவி",gu:"Offer Bhav/Qui.",pa:"ਅਫਰ ਕੀਮਤ",    bn:"অফার মূল্য",    or:"ਅਫਰ ਮੂਲ੍ਯ" },
    "contractor.modal_price_placeholder":{ en:"Ex: 2100",hi:"उदा: 2100",mr:"उदा: 2100",te:"ఉదా: 2100",kn:"ಉದಾ: 2100",ta:"எ.கா: 2100",gu:"Daxla: 2100",pa:"ਜਿਵੇਂ: 2100",bn:"যেমন: 2100",or:"ਯਥਾ: 2100" },
    "contractor.modal_msg_label":        { en:"Message to Farmer",hi:"किसान को संदेश",mr:"शेतकऱ्यास संदेश",te:"రైతుకు సందేశం",kn:"ರೈತರಿಗೆ ಸಂದೇಶ",ta:"விவசாயிக்கு செய்தி",gu:"Khedut ne Sandes",pa:"ਕਿਸਾਨ ਨੂੰ ਸੁਨੇਹਾ",bn:"কৃষককে বার্তা",or:"ਚਾਸੀ ਨੂੰ ਯੋਗ" },
    "contractor.modal_msg_placeholder":  { en:"Write a message...",hi:"संदेश लिखें...",mr:"संदेश लिहा...",te:"సందేశం రాయండి...",kn:"ಸಂದೇಶ ಬರೆ...",ta:"செய்தி எழுதுங்கள்...",gu:"Sandes Lakho...",pa:"ਸੁਨੇਹਾ ਲਿਖੋ...",bn:"বার্তা লিখুন...",or:"ਯੋਗ ਲਿਖੋ..." },
    "contractor.modal_cancel":  { en:"Cancel",hi:"रद्द करें",mr:"रद्द करा",te:"రద్దు చేయండి",kn:"ರದ್ದು",ta:"இரத்து செய்",gu:"Raddo",pa:"ਰੱਦ ਕਰੋ",bn:"বাতিল করুন",or:"ਰਦਦ" },
    "contractor.modal_submit":  { en:"Submit Interest",hi:"रुचि जमा करें",mr:"स्वारस्य सबमिट करा",te:"ఆసక్తి సమర్పించు",kn:"ಆಸಕ್ತಿ ಸಲ್ಲಿಸಿ",ta:"விருப்பம் சமர்ப்பி",gu:"Ruch Submit",pa:"ਰੁਚੀ ਜਮ੍ਹਾਂ",bn:"আগ্রহ জমা",or:"ਆਗ੍ਰਹ ਦਾਖਲ" },

    // ── SHARED FIELD LABELS ───────────────────────────────────────────────
    "available_lbl":  { en:"Available",     hi:"उपलब्ध",      mr:"उपलब्ध",     te:"అందుబాటులో", kn:"ಲಭ್ಯ",       ta:"கிடைக்கும்",  gu:"Uplabdh",  pa:"ਉਪਲਬਧ",   bn:"উপলব্ধ",  or:"ਉਪਲਬ੍ਧ" },
    "price_lbl":      { en:"Price",         hi:"मूल्य",        mr:"किंमत",       te:"ధర",          kn:"ಬೆಲೆ",       ta:"விலை",        gu:"Bhav",     pa:"ਕੀਮਤ",    bn:"মূল্য",   or:"ਮੂਲ੍ਯ" },
    "location_lbl":   { en:"Location",      hi:"स्थान",        mr:"ठिकाण",       te:"స్థానం",      kn:"ಸ್ಥಳ",       ta:"இடம்",        gu:"Sthal",    pa:"ਟਿਕਾਣਾ",  bn:"অবস্থান", or:"ਸ਼ੁਕੁ" },
    "quantity_lbl":   { en:"Quantity",      hi:"मात्रा",       mr:"प्रमाण",      te:"పరిమాణం",     kn:"ಪ್ರಮಾಣ",     ta:"அளவு",        gu:"Jatho",    pa:"ਮਾਤਰਾ",   bn:"পরিমাণ",  or:"ਪਰਿਮਾਣ" },
    "quintals":       { en:"Quintals",      hi:"क्विंटल",      mr:"क्विंटल",     te:"క్వింటాళ్లు", kn:"ಕ್ವಿಂಟಾಲ್", ta:"குவிண்டல்",  gu:"Quintal",  pa:"ਕੁਇੰਟਲ",  bn:"কুইন্টাল",or:"Quintal" },
    "quintal_short":  { en:"Quintal",       hi:"क्विं.",       mr:"क्विं.",       te:"క్వి.",        kn:"ಕ್ವಿ.",      ta:"குவி.",       gu:"Qui.",     pa:"ਕੁਇੰ.",   bn:"কুইন্টাল",or:"Qui." },
    "status_lbl":     { en:"Status",        hi:"स्थिति",       mr:"स्थिती",      te:"స్థితి",       kn:"ಸ್ಥಿತಿ",     ta:"நிலை",        gu:"Status",   pa:"ਸਥਿਤੀ",   bn:"অবস্থা",  or:"ਸ੍ਥਿਤੀ" },
    "farmer_name_lbl":{ en:"Farmer",        hi:"किसान",        mr:"शेतकरी",      te:"రైతు",         kn:"ರೈತ",        ta:"விவசாயி",    gu:"Khedut",   pa:"ਕਿਸਾਨ",   bn:"কৃষক",    or:"ਚਾਸੀ" },
    "sold_to":        { en:"Sold To",       hi:"बेचा गया",     mr:"विकले",       te:"అమ్మిన వారికి",kn:"ಮಾರಾಟ",      ta:"விற்பனை",    gu:"Vechayu",  pa:"ਵੇਚਿਆ",   bn:"বিক্রয়",  or:"ਬੇਚਿਆ" },

    // ── STATUS VALUES — for DB status strings shown directly in cards ─────
    // FIX: history cards showed raw "sold"/"removed" DB strings
    "status_sold":           { en:"Sold",          hi:"बेचा गया",      mr:"विकले",         te:"అమ్మబడింది",  kn:"ಮಾರಾಟವಾಗಿದೆ", ta:"விற்பனையானது",gu:"Vechayu",    pa:"ਵੇਚਿਆ",      bn:"বিক্রিত",    or:"ਬਿਕ੍ਰੀ" },
    "status_removed":        { en:"Removed",       hi:"हटाया गया",     mr:"काढले",         te:"తొలగించబడింది",kn:"ತೆಗೆದ",         ta:"நீக்கப்பட்டது",gu:"Kadhyu",     pa:"ਹਟਾਇਆ",       bn:"সরানো",       or:"ਹਟਾਇਆ" },
    "status_active":         { en:"Active",        hi:"सक्रिय",        mr:"सक्रिय",        te:"సక్రియం",     kn:"ಸಕ್ರಿಯ",       ta:"செயலில்",    gu:"Sakriya",    pa:"ਸਰਗਰਮ",       bn:"সক্রিয়",     or:"ਸਕ੍ਰਿਯ" },
    "status_partially_sold": { en:"Partially Sold",hi:"आंशिक बिक्री",  mr:"अंशत: विकले",  te:"పాక్షిక అమ్మకం",kn:"ಭಾಗಶಃ ಮಾರಾಟ",ta:"ஓரளவு விற்பனை",gu:"Aanshik Vecho",pa:"ਅੰਸ਼ਕ ਵਿਕਰੀ",  bn:"আংশিক বিক্রয়",or:"ਅੰਸ਼ਿਕ ਬਿਕ੍ਰੀ" },
    // FIX: negotiating_lbl was referenced in statusLabels but never defined
    "negotiating_lbl":       { en:"Negotiating",   hi:"वार्ता जारी",   mr:"वाटाघाटी",     te:"చర్చలు",       kn:"ಮಾತುಕತೆ",      ta:"பேச்சுவார்த்தை",gu:"Negotiate",  pa:"ਗੱਲਬਾਤ",      bn:"আলোচনা",      or:"ਵਾਟਘਾਟੀ" },
    // FIX: "remaining" word was hardcoded English in qty label
    "qty_remaining":         { en:"remaining",     hi:"शेष",            mr:"शिल्लक",        te:"మిగిలింది",    kn:"ಉಳಿದಿದೆ",      ta:"மீதமுள்ளது", gu:"Baki",       pa:"ਬਕਾਇਆ",       bn:"অবশিষ্ট",     or:"ਬਾਕੀ" },
    // FIX: "buyers" was hardcoded in multi-buyer history
    "buyers_suffix":         { en:"buyers",        hi:"खरीदार",         mr:"खरेदीदार",      te:"కొనుగోలుదారులు",kn:"ಖರೀದಿದಾರ",    ta:"வாங்குபவர்கள்",gu:"Khariddar",  pa:"ਖਰੀਦਦਾਰ",     bn:"ক্রেতা",       or:"ਖਰੀਦਦਾਰ" },

    // ── INTEREST LABELS ───────────────────────────────────────────────────
    "qty_requested":  { en:"Qty Requested",    hi:"अनुरोधित मात्रा",mr:"मागणी प्रमाण",  te:"అభ్యర్థించిన పరిమాణం",kn:"ಕೋರಿದ ಪ್ರಮಾಣ",ta:"கோரிய அளவு",gu:"Mang Jatho", pa:"ਮੰਗੀ ਮਾਤਰਾ", bn:"অনুরোধিত",   or:"ਅਨੁਰੋਧ ਪਰਿਮਾਣ" },
    "offered_price":  { en:"Offered Price",    hi:"प्रस्तावित मूल्य",mr:"ऑफर किंमत",    te:"ఆఫర్ ధర",      kn:"ನೀಡಿದ ಬೆಲೆ",  ta:"சலுகை விலை", gu:"Offer Bhav", pa:"ਅਫਰ ਕੀਮਤ",  bn:"প্রস্তাবিত",  or:"ਅਫਰ ਮੂਲ੍ਯ" },
    "your_message":   { en:"Your Message",     hi:"आपका संदेश",      mr:"तुमचा संदेश",  te:"మీ సందేశం",    kn:"ನಿಮ್ಮ ಸಂದೇಶ",  ta:"உங்கள் செய்தி",gu:"Tamaro Sandes",pa:"ਤੁਹਾਡਾ ਸੁਨੇਹਾ",bn:"আপনার বার্তা",or:"ਤੁਹਾਡਾ ਯੋਗ" },
    "message_lbl":    { en:"Message",          hi:"संदेश",            mr:"संदेश",         te:"సందేశం",        kn:"ಸಂದೇಶ",        ta:"செய்தி",      gu:"Sandes",     pa:"ਸੁਨੇਹਾ",    bn:"বার্তা",      or:"ਯੋਗ" },
    "farmer_contact": { en:"Farmer Contact",   hi:"किसान संपर्क",    mr:"शेतकरी संपर्क",te:"రైతు సంప్రదింపు",kn:"ರೈತ ಸಂಪರ್ಕ",  ta:"விவசாயி தொடர்பு",gu:"Khedut Sampark",pa:"ਕਿਸਾਨ ਸੰਪਰਕ",bn:"কৃষক যোগাযোগ",or:"ਚਾਸੀ ਸੰਪਰਕ" },
    "contractor_lbl": { en:"Contractor",       hi:"ठेकेदार",          mr:"कंत्राटदार",   te:"కాంట్రాక్టర్",  kn:"ಗುತ್ತಿಗೆದಾರ",  ta:"ஒப்பந்தக்காரர்",gu:"Thekedar",  pa:"ਠੇਕੇਦਾਰ",   bn:"ঠিকাদার",    or:"ঠিকাদার" },
    "requested_qty":  { en:"Requested Qty",    hi:"अनुरोधित मात्रा", mr:"मागणी प्रमाण", te:"అభ్యర్థన పరిమాణం",kn:"ಕೋರಿದ ಪ್ರಮಾಣ",ta:"கோரிய அளவு",gu:"Arj Jatho",  pa:"ਮੰਗੀ ਮਾਤਰਾ", bn:"অনুরোধিত",   or:"ਅਨੁਰੋਧ ਪਰਿਮਾਣ" },
    "listed_price":   { en:"Your Listed Price",hi:"सूचीबद्ध मूल्य",  mr:"सूचीबद्ध किंमत",te:"మీ జాబితా ధర",kn:"ನಿಮ್ಮ ಬೆಲೆ",   ta:"உங்கள் பட்டியல் விலை",gu:"List Bhav",pa:"ਸੂਚੀ ਕੀਮਤ",   bn:"তালিকা মূল্য",or:"ਤਾਲਿਕਾ ਮੂਲ੍ਯ" },

    // ── BUTTONS ───────────────────────────────────────────────────────────
    "show_interest_btn": { en:"Show Interest",    hi:"रुचि दिखाएं",    mr:"स्वारस्य दाखवा", te:"ఆసక్తి చూపించు",kn:"ಆಸಕ್ತಿ ತೋರಿ",  ta:"விருப்பம் காட்டு",gu:"Ruch Batavo",pa:"ਰੁਚੀ ਦਿਖਾਓ",bn:"আগ্রহ দেখান",or:"ਆਗ੍ਰਹ ਦੇਖਾਓ" },
    "resubmit_btn":      { en:"Re-submit Interest",hi:"फिर से रुचि",   mr:"पुन्हा सबमिट",  te:"మళ్ళీ ఆసక్తి",  kn:"ಮತ್ತೆ ಆಸಕ್ತಿ", ta:"மீண்டும் விருப்பம்",gu:"Fari Submit",pa:"ਦੁਬਾਰਾ ਰੁਚੀ",bn:"পুনরায়",or:"ਪੁਣਿ ਆਗ੍ਰਹ" },
    "accept_btn":        { en:"Accept",           hi:"स्वीकार करें",   mr:"स्वीकारा",       te:"ఒప్పుకోండి",   kn:"ಒಪ್ಪಿ",         ta:"ஏற்றுக்கொள்",  gu:"Svikaro",   pa:"ਸਵੀਕਾਰ",   bn:"গ্রহণ",      or:"ਗ੍ਰਿਹਣ" },
    "negotiate_btn":     { en:"Negotiate",        hi:"वार्ता करें",    mr:"वाटाघाटी करा",   te:"చర్చించండి",   kn:"ಮಾತುಕತೆ",       ta:"பேச்சுவார்த்தை",gu:"Vatghati",  pa:"ਗੱਲਬਾਤ",   bn:"আলোচনা",    or:"ਵਾਟਘਾਟੀ" },
    "reject_btn":        { en:"Reject",           hi:"अस्वीकार करें",  mr:"नाकारा",         te:"తిరస్కరించు",  kn:"ತಿರಸ್ಕರಿಸಿ",   ta:"நிராகரி",     gu:"Nakaro",    pa:"ਰੱਦ ਕਰੋ",  bn:"প্রত্যাখ্যান",or:"ਨਾਕਾਰੋ" },
    "final_accept_btn":  { en:"Confirm & Accept", hi:"पुष्टि करें",    mr:"पुष्टी करा",     te:"నిర్ధారించండి", kn:"ದೃಢಪಡಿಸಿ",      ta:"உறுதிப்படுத்து",gu:"Confirm",   pa:"ਪੁਸ਼ਟੀ",    bn:"নিশ্চিত",   or:"ਪੁਸ਼੍ਟੀ" },
    "continue_chat_btn": { en:"Continue Chat",    hi:"चैट जारी रखें",  mr:"चॅट सुरू ठेवा",  te:"చాట్ కొనసాగించండి",kn:"ಚಾಟ್ ಮುಂದಿಸಿ",ta:"அரட்டை தொடர்",gu:"Chat Jari", pa:"ਗੱਲਬਾਤ ਜਾਰੀ",bn:"চ্যাট চালান", or:"ਚੈਟ ਜਾਰੀ" },
    "open_chat":         { en:"Open Chat",        hi:"चैट खोलें",      mr:"चॅट उघडा",       te:"చాట్ తెరవండి",  kn:"ಚಾಟ್ ತೆರೆ",    ta:"அரட்டை திற",  gu:"Chat Kholo",pa:"ਚੈਟ ਖੋਲੋ",  bn:"চ্যাট খুলুন",or:"ਚੈਟ ਖੋਲੋ" },
    "remove_listing":    { en:"Remove Listing",   hi:"लिस्टिंग हटाएं", mr:"यादी काढा",       te:"జాబితా తొలగించు",kn:"ಪಟ್ಟಿ ತೆಗೆ",  ta:"பட்டியல் நீக்கு",gu:"Listing Kadho",pa:"ਲਿਸਟਿੰਗ ਹਟਾਓ",bn:"তালিকা সরান",or:"ਲਿਸਟ ਹਟਾਓ" },
    "msg_contractor":    { en:"Message Contractor",hi:"ठेकेदार को संदेश",mr:"कंत्राटदारास संदेश",te:"కాంట్రాక్టర్‌కు",kn:"ಗುತ್ತಿಗೆದಾರರಿಗೆ",ta:"ஒப்பந்தக்காரருக்கு",gu:"Thekedar ne",pa:"ਠੇਕੇਦਾਰ ਨੂੰ",bn:"ঠিকাদারকে",or:"ঠিকাদার ਨੂੰ" },
    // FIX: was showing as raw key
    "withdraw_accept_btn": {
      en:"Withdraw Accept",       hi:"स्वीकृति वापस लें",   mr:"स्वीकृती मागे घ्या",
      te:"ఆమోదాన్ని వెనక్కి తీసుకోండి", kn:"ಒಪ್ಪಿಗೆ ಹಿಂತೆಗೆ",
      ta:"ஒப்புதலை திரும்பப் பெறு", gu:"Svikruti Pachhi Lo",
      pa:"ਸਵੀਕ੍ਰਿਤੀ ਵਾਪਸ ਲਓ",    bn:"গ্রহণ প্রত্যাহার",   or:"ਗ੍ਰਿਹਣ ਵਾਪਸ"
    },

    // ── ACCEPTANCE/WAITING STATE LABELS ──────────────────────────────────
    // FIX: all were showing as raw keys
    "waiting_for_contractor": {
      en:"Accepted — waiting for contractor to confirm",
      hi:"स्वीकृत — ठेकेदार की पुष्टि की प्रतीक्षा",
      mr:"स्वीकारले — कंत्राटदाराच्या पुष्टीची प्रतीक्षा",
      te:"ఆమోదించబడింది — కాంట్రాక్టర్ నిర్ధారణ కోసం వేచి ఉంది",
      kn:"ಒಪ್ಪಿದ — ಗುತ್ತಿಗೆದಾರ ದೃಢಪಡಿಸಲು ನಿರೀಕ್ಷಿಸಲಾಗುತ್ತಿದೆ",
      ta:"ஏற்கப்பட்டது — ஒப்பந்தக்காரர் உறுதிப்படுத்தல் காத்திருக்கிறது",
      gu:"Svikrut — Thekedar Confirm ni Rakhar", pa:"ਸਵੀਕਾਰ — ਠੇਕੇਦਾਰ ਦੀ ਪੁਸ਼ਟੀ ਦੀ ਉਡੀਕ",
      bn:"গৃহীত — ঠিকাদারের নিশ্চিতকরণের অপেক্ষা", or:"ਗ੍ਰਿਹਣ — ਠਿਕਾਦਾਰ ਪੁਸ਼੍ਟੀ ਇੰਤਜ਼ਾਰ"
    },
    "contractor_accepted_confirm": {
      en:"Contractor accepted — confirm the deal",
      hi:"ठेकेदार ने स्वीकार किया — सौदा पुष्टि करें",
      mr:"कंत्राटदाराने स्वीकारले — करार पुष्टी करा",
      te:"కాంట్రాక్టర్ ఒప్పుకున్నారు — ఒప్పందాన్ని నిర్ధారించండి",
      kn:"ಗುತ್ತಿಗೆದಾರ ಒಪ್ಪಿದ — ಒಪ್ಪಂದ ದೃಢಪಡಿಸಿ",
      ta:"ஒப்பந்தக்காரர் ஏற்றார் — ஒப்பந்தத்தை உறுதிப்படுத்துங்கள்",
      gu:"Thekedar Accept — Deal Confirm Karo", pa:"ਠੇਕੇਦਾਰ ਨੇ ਸਵੀਕਾਰ — ਸੌਦਾ ਪੱਕਾ ਕਰੋ",
      bn:"ঠিকাদার গ্রহণ করেছে — চুক্তি নিশ্চিত করুন", or:"ਠਿਕਾਦਾਰ ਗ੍ਰਿਹਣ — ਚੁਕਤੀ ਪੁਸ਼੍ਟੀ"
    },
    "accepted_waiting_farmer": {
      en:"Accepted — waiting for farmer to confirm",
      hi:"स्वीकृत — किसान की पुष्टि की प्रतीक्षा",
      mr:"स्वीकारले — शेतकऱ्याच्या पुष्टीची प्रतीक्षा",
      te:"ఆమోదించబడింది — రైతు నిర్ధారణ కోసం వేచి ఉంది",
      kn:"ಒಪ್ಪಿದ — ರೈತ ದೃಢಪಡಿಸಲು ನಿರೀಕ್ಷಿಸಲಾಗುತ್ತಿದೆ",
      ta:"ஏற்கப்பட்டது — விவசாயி உறுதிப்படுத்தல் காத்திருக்கிறது",
      gu:"Svikrut — Khedut Confirm ni Rakhar", pa:"ਸਵੀਕਾਰ — ਕਿਸਾਨ ਦੀ ਪੁਸ਼ਟੀ ਦੀ ਉਡੀਕ",
      bn:"গৃহীত — কৃষকের নিশ্চিতকরণের অপেক্ষা", or:"ਗ੍ਰਿਹਣ — ਚਾਸੀ ਪੁਸ਼੍ਟੀ ਇੰਤਜ਼ਾਰ"
    },
    "farmer_accepted_confirm": {
      en:"Farmer accepted — confirm the deal",
      hi:"किसान ने स्वीकार किया — सौदा पुष्टि करें",
      mr:"शेतकऱ्याने स्वीकारले — करार पुष्टी करा",
      te:"రైతు ఒప్పుకున్నారు — ఒప్పందాన్ని నిర్ధారించండి",
      kn:"ರೈತ ಒಪ್ಪಿದ — ಒಪ್ಪಂದ ದೃಢಪಡಿಸಿ",
      ta:"விவசாயி ஏற்றார் — ஒப்பந்தத்தை உறுதிப்படுத்துங்கள்",
      gu:"Khedut Accept — Deal Confirm Karo", pa:"ਕਿਸਾਨ ਨੇ ਸਵੀਕਾਰ — ਸੌਦਾ ਪੱਕਾ ਕਰੋ",
      bn:"কৃষক গ্রহণ করেছে — চুক্তি নিশ্চিত করুন", or:"ਚਾਸੀ ਗ੍ਰਿਹਣ — ਚੁਕਤੀ ਪੁਸ਼੍ਟੀ"
    },

    // ── STATUS DISPLAY ────────────────────────────────────────────────────
    "status_pending":     { en:"Pending",      hi:"लंबित",       mr:"प्रलंबित",    te:"పెండింగ్",    kn:"ಬಾಕಿ",       ta:"நிலுவை",      gu:"Pending",  pa:"ਬਕਾਇਆ",   bn:"মুলতুবি",  or:"ਪੈਂਡਿੰਗ" },
    "status_negotiating": { en:"Negotiating",  hi:"वार्ता जारी", mr:"वाटाघाटी",    te:"చర్చలు",      kn:"ಮಾತುಕತೆ",    ta:"பேச்சுவார்த்தை",gu:"Negotiate",pa:"ਗੱਲਬਾਤ",   bn:"আলোচনা",  or:"ਵਾਟਘਾਟੀ" },
    "status_accepted":    { en:"Accepted ✓",   hi:"स्वीकृत ✓",   mr:"स्वीकारले ✓", te:"ఆమోదించబడింది ✓",kn:"ಒಪ್ಪಿದ ✓",ta:"ஏற்கப்பட்டது ✓",gu:"Accepted ✓",pa:"ਸਵੀਕਾਰ ✓",bn:"গৃহীত ✓",  or:"ਗ੍ਰਿਹਣ ✓" },
    "status_rejected":    { en:"Rejected",     hi:"अस्वीकृत",    mr:"नाकारले",     te:"తిరస్కరించబడింది",kn:"ತಿರಸ್ಕರಿಸಲಾಗಿದೆ",ta:"நிராகரிக்கப்பட்டது",gu:"Rejected",pa:"ਰੱਦ ਕੀਤਾ",bn:"প্রত্যাখ্যাত",or:"ਰੱਦ" },

    "fstatus_pending":     { en:"Pending",       hi:"लंबित",          mr:"प्रलंबित",      te:"పెండింగ్",      kn:"ಬಾಕಿ",         ta:"நிலுவை",        gu:"Pending",   pa:"ਬਕਾਇਆ",    bn:"মুলতুবি",   or:"ਪੈਂਡਿੰਗ" },
    "fstatus_negotiating": { en:"Negotiating",   hi:"वार्ता जारी",    mr:"वाटाघाटी",      te:"చర్చలు",         kn:"ಮಾತುಕತೆ",       ta:"பேச்சுவார்த்தை",gu:"Negotiate", pa:"ਗੱਲਬਾਤ",   bn:"আলোচনা",    or:"ਵਾਟਘਾਟੀ" },
    "fstatus_accepted":    { en:"Deal Accepted ✓",hi:"सौदा स्वीकृत ✓",mr:"करार स्वीकारले ✓",te:"ఒప్పందం ఆమోదించబడింది ✓",kn:"ಒಪ್ಪಂದ ✓",ta:"ஒப்பந்தம் ✓",gu:"Deal Accepted ✓",pa:"ਸੌਦਾ ਸਵੀਕਾਰ ✓",bn:"চুক্তি গৃহীত ✓",or:"ਚੁਕਤੀ ✓" },
    "fstatus_rejected":    { en:"Rejected",      hi:"अस्वीकृत",       mr:"नाकारले",       te:"తిరస్కరించబడింది",kn:"ತಿರಸ್ಕರಿಸಲಾಗಿದೆ",ta:"நிராகரிக்கப்பட்டது",gu:"Rejected",pa:"ਰੱਦ ਕੀਤਾ",bn:"প্রত্যাখ্যাত",or:"ਰੱਦ" },

    "pending_lbl":    { en:"Pending",    hi:"लंबित",   mr:"प्रलंबित", te:"పెండింగ్",kn:"ಬಾಕಿ",    ta:"நிலுவை",  gu:"Pending",pa:"ਬਕਾਇਆ",  bn:"মুলতুবি",or:"ਪੈਂਡਿੰਗ" },
    "accepted_lbl":   { en:"Accepted",   hi:"स्वीकृत", mr:"स्वीकारले",te:"ఆమోదం",  kn:"ಒಪ್ಪಿದ",  ta:"ஏற்பு",   gu:"Accepted",pa:"ਸਵੀਕਾਰ",bn:"গৃহীত",   or:"ਗ੍ਰਿਹਣ" },
    "interest_shown": { en:"Interest Shown",hi:"रुचि दिखाई",mr:"स्वारस्य दाखवले",te:"ఆసక్తి చూపించారు",kn:"ಆಸಕ್ತಿ ತೋರಿದ",ta:"விருப்பம் காட்டப்பட்டது",gu:"Ruch Batavi",pa:"ਰੁਚੀ ਦਿਖਾਈ",bn:"আগ্রহ দেখানো",or:"ਆਗ੍ਰਹ ਦੇਖਾਈ" },

    // ── CONFIRM DIALOGS ───────────────────────────────────────────────────
    // FIX: all confirm() strings were hardcoded English
    "confirm_accept":  {
      en:"Accept this deal?", hi:"यह सौदा स्वीकार करें?", mr:"हा करार स्वीकारायचा?",
      te:"ఈ ఒప్పందాన్ని ఒప్పుకుంటారా?", kn:"ಈ ಒಪ್ಪಂದ ಒಪ್ಪಿ?",
      ta:"இந்த ஒப்பந்தத்தை ஏற்கலாமா?", gu:"Aa deal svikaro?",
      pa:"ਕੀ ਸੌਦਾ ਸਵੀਕਾਰ ਕਰਨਾ ਹੈ?", bn:"এই চুক্তি গ্রহণ করবেন?", or:"ਇਹ ਡੀਲ ਸਵੀਕਾਰ?"
    },
    "confirm_reject":  {
      en:"Reject this interest?", hi:"इस रुचि को अस्वीकार करें?", mr:"हे स्वारस्य नाकारायचे?",
      te:"ఈ ఆసక్తిని తిరస్కరిస్తారా?", kn:"ಈ ಆಸಕ್ತಿ ತಿರಸ್ಕರಿಸಿ?",
      ta:"இந்த விருப்பத்தை நிராகரிக்கலாமா?", gu:"Aa ruch nakaro?",
      pa:"ਕੀ ਰੁਚੀ ਰੱਦ ਕਰਨੀ ਹੈ?", bn:"এই আগ্রহ প্রত্যাখ্যান করবেন?", or:"ਇਹ ਰੁਚੀ ਰੱਦ ਕਰੋ?"
    },
    "confirm_withdraw": {
      en:"Withdraw your acceptance? The deal will return to negotiating.",
      hi:"स्वीकृति वापस लेंगे? सौदा फिर से वार्ता में जाएगा।",
      mr:"स्वीकृती मागे घ्यायची? करार पुन्हा वाटाघाटीत जाईल.",
      te:"ఆమోదాన్ని వెనక్కి తీసుకుంటారా? ఒప్పందం మళ్ళీ చర్చలకు.",
      kn:"ಒಪ್ಪಿಗೆ ಹಿಂತೆಗೆ? ಒಪ್ಪಂದ ಮಾತುಕತೆಗೆ ಮರಳುತ್ತದೆ.",
      ta:"ஒப்புதலை திரும்பப் பெறலாமா? பேச்சுவார்த்தைக்கு திரும்பும்.",
      gu:"Svikruti Pachhi Lo? Deal Negotiate.", pa:"ਕੀ ਸਵੀਕ੍ਰਿਤੀ ਵਾਪਸ ਲੈਣੀ ਹੈ?",
      bn:"গ্রহণ প্রত্যাহার করবেন? চুক্তি আলোচনায় ফিরবে।", or:"ਗ੍ਰਿਹਣ ਵਾਪਸ? ਵਾਟਘਾਟੀ।"
    },
    "confirm_remove_crop": {
      en:"Stop selling the remaining amount and remove this listing?",
      hi:"बची हुई मात्रा की बिक्री रोकें और यह लिस्टिंग हटाएं?",
      mr:"शिल्लक प्रमाण विकणे थांबवायचे आणि यादी काढायची?",
      te:"మిగిలిన మొత్తం అమ్మకాన్ని ఆపి జాబితాను తొలగించాలా?",
      kn:"ಉಳಿದ ಪ್ರಮಾಣ ಮಾರಾಟ ನಿಲ್ಲಿಸಿ ಪಟ್ಟಿ ತೆಗೆ?",
      ta:"மீதமுள்ளதை விற்பனை நிறுத்தி பட்டியலை நீக்கலாமா?",
      gu:"Baki Vechan Band Karo?", pa:"ਬਕਾਇਆ ਵੇਚਣਾ ਬੰਦ ਕਰੋ?",
      bn:"বাকি বিক্রয় বন্ধ করবেন?", or:"ਬਾਕੀ ਵੇਚਣਾ ਬੰਦ ਕਰੋ?"
    },
    "confirm_delete_history": {
      en:"Permanently delete all crop history?",
      hi:"सभी फसल इतिहास स्थायी रूप से हटाएं?",
      mr:"सर्व पीक इतिहास कायमचा हटवायचा?",
      te:"అన్ని పంట చరిత్రని శాశ్వతంగా తొలగించాలా?",
      kn:"ಎಲ್ಲ ಬೆಳೆ ಇತಿಹಾಸ ಶಾಶ್ವತ ಅಳಿಸಿ?",
      ta:"அனைத்து பயிர் வரலாற்றையும் நிரந்தரமாக நீக்கலாமா?",
      gu:"Badho Itihas Kayam Kadhvo?", pa:"ਸਾਰਾ ਇਤਿਹਾਸ ਮਿਟਾਓ?",
      bn:"সব ইতিহাস মুছবেন?", or:"ਸਭ ਇਤਿਹਾਸ ਮਿਟਾਓ?"
    },

    // ── ALIASES: JS uses short keys, map to same translations ────────────
    // contractor_dashboard.js calls DT.t("all_locations") (no prefix)
    "all_locations": {
      en:"All Locations", hi:"सभी स्थान", mr:"सर्व ठिकाणे", te:"అన్ని స్థానాలు",
      kn:"ಎಲ್ಲ ಸ್ಥಳಗಳು", ta:"அனைத்து இடங்கள்", gu:"બધા સ્થળો", pa:"ਸਭ ਟਿਕਾਣੇ", bn:"সকল অবস্থান", or:"ସମସ୍ତ ସ୍ଥାନ"
    },

    // ── CONFIRM DIALOGS (new key names used by fixed dashboard.js) ────────
    "confirm_accept_deal": {
      en:"Accept this deal?", hi:"यह सौदा स्वीकार करें?", mr:"हा करार स्वीकारायचा?",
      te:"ఈ ఒప్పందాన్ని ఒప్పుకుంటారా?", kn:"ಈ ಒಪ್ಪಂದ ಒಪ್ಪಿ?",
      ta:"இந்த ஒப்பந்தத்தை ஏற்கலாமா?", gu:"Aa deal svikaro?",
      pa:"ਕੀ ਸੌਦਾ ਸਵੀਕਾਰ ਕਰਨਾ ਹੈ?", bn:"এই চুক্তি গ্রহণ করবেন?", or:"ଏ ଡ଼ିଲ ଗ୍ରହଣ?"
    },
    "confirm_reject_interest": {
      en:"Reject this interest?", hi:"इस रुचि को अस्वीकार करें?", mr:"हे स्वारस्य नाकारायचे?",
      te:"ఈ ఆసక్తిని తిరస్కరిస్తారా?", kn:"ಈ ಆಸಕ್ತಿ ತಿರಸ್ಕರಿಸಿ?",
      ta:"இந்த விருப்பத்தை நிராகரிக்கலாமா?", gu:"Aa ruch nakaro?",
      pa:"ਕੀ ਰੁਚੀ ਰੱਦ ਕਰਨੀ ਹੈ?", bn:"এই আগ্রহ প্রত্যাখ্যান করবেন?", or:"ଏ ଆଗ୍ରହ ପ୍ରତ୍ୟାଖ୍ୟାନ?"
    },
    "confirm_withdraw_accept": {
      en:"Withdraw your acceptance? The deal will return to negotiating.",
      hi:"स्वीकृति वापस लेंगे? सौदा फिर से वार्ता में जाएगा।",
      mr:"स्वीकृती मागे घ्यायची? करार पुन्हा वाटाघाटीत जाईल.",
      te:"ఆమోదాన్ని వెనక్కి తీసుకుంటారా? ఒప్పందం మళ్ళీ చర్చలకు.",
      kn:"ಒಪ್ಪಿಗೆ ಹಿಂತೆಗೆ? ಒಪ್ಪಂದ ಮಾತುಕತೆಗೆ ಮರಳುತ್ತದೆ.",
      ta:"ஒப்புதலை திரும்பப் பெறலாமா? பேச்சுவார்த்தைக்கு திரும்பும்.",
      gu:"Svikruti Pachhi Lo? Deal Vaato.", pa:"ਕੀ ਸਵੀਕ੍ਰਿਤੀ ਵਾਪਸ ਲੈਣੀ ਹੈ?",
      bn:"গ্রহণ প্রত্যাহার করবেন? চুক্তি আলোচনায় ফিরবে।", or:"ଗ୍ରହଣ ପ୍ରତ୍ୟାହାର?"
    },
    "confirm_clear_history": {
      en:"Permanently delete all crop history?",
      hi:"सभी फसल इतिहास स्थायी रूप से हटाएं?",
      mr:"सर्व पीक इतिहास कायमचा हटवायचा?",
      te:"అన్ని పంట చరిత్రని శాశ్వతంగా తొలగించాలా?",
      kn:"ಎಲ್ಲ ಬೆಳೆ ಇತಿಹಾಸ ಶಾಶ್ವತ ಅಳಿಸಿ?",
      ta:"அனைத்து பயிர் வரலாற்றையும் நிரந்தரமாக நீக்கலாமா?",
      gu:"Badho Itihas Kayam Kadhvo?", pa:"ਸਾਰਾ ਇਤਿਹਾਸ ਮਿਟਾਓ?",
      bn:"সব ইতিহাস মুছবেন?", or:"ସମସ୍ତ ଇତିହାସ ଶାଶ୍ୱତ ଅଳିଶ?"
    },
    "confirm_remove_listing": {
      en:"Stop selling the remaining amount and remove this listing?",
      hi:"बची हुई मात्रा की बिक्री रोकें और यह लिस्टिंग हटाएं?",
      mr:"शिल्लक प्रमाण विकणे थांबवायचे आणि यादी काढायची?",
      te:"మిగిలిన మొత్తం అమ్మకాన్ని ఆపి జాబితాను తొలగించాలా?",
      kn:"ಉಳಿದ ಪ್ರಮಾಣ ಮಾರಾಟ ನಿಲ್ಲಿಸಿ ಪಟ್ಟಿ ತೆಗೆ?",
      ta:"மீதமுள்ளதை விற்பனை நிறுத்தி பட்டியலை நீக்கலாமா?",
      gu:"Baki Vechan Band Karo?", pa:"ਬਕਾਇਆ ਵੇਚਣਾ ਬੰਦ ਕਰੋ?",
      bn:"বাকি বিক্রয় বন্ধ করবেন?", or:"ଅବଶିଷ୍ଟ ବିକ୍ରୟ ବନ୍ଦ?"
    },
    // {n} is replaced at runtime with the pending count
    "confirm_remove_with_interests": {
      en:"This crop has {n} pending interest(s). Removing it will cancel all of them. Continue?",
      hi:"इस फसल पर {n} रुचि है। हटाने से सभी रद्द हो जाएंगी। जारी रखें?",
      mr:"या पिकावर {n} स्वारस्य आहे. काढल्यास सर्व रद्द होतील. पुढे जायचे?",
      te:"ఈ పంటకు {n} ఆసక్తులు ఉన్నాయి. తొలగిస్తే అన్నీ రద్దవుతాయి. కొనసాగించాలా?",
      kn:"ಈ ಬೆಳೆಗೆ {n} ಆಸಕ್ತಿ ಇದೆ. ತೆಗೆದರೆ ಎಲ್ಲ ರದ್ದಾಗುತ್ತದೆ. ಮುಂದುವರಿಸಿ?",
      ta:"இந்த பயிரில் {n} விருப்பங்கள் உள்ளன. நீக்கினால் அனைத்தும் ரத்தாகும். தொடரலாமா?",
      gu:"{n} ruch che. Kadhva thi badhi radh thase. Aage vadho?",
      pa:"ਇਸ ਫਸਲ 'ਤੇ {n} ਰੁਚੀਆਂ ਹਨ। ਹਟਾਉਣ ਨਾਲ ਸਭ ਰੱਦ ਹੋਣਗੀਆਂ। ਜਾਰੀ ਰੱਖੋ?",
      bn:"এই ফসলে {n}টি আগ্রহ আছে। সরালে সব বাতিল হবে। চালিয়ে যাবেন?",
      or:"ଏ ଫସଲରେ {n} ଆଗ୍ରହ ଅଛି। ତୋଲଗଲେ ସବୁ ବାତିଲ। ଜାରି ରଖ?"
    },

    // ── ALERT MESSAGES ────────────────────────────────────────────────────
    "alert_interest_sent": {
      en:"✅ Interest sent successfully!", hi:"✅ रुचि सफलतापूर्वक भेजी गई!", mr:"✅ स्वारस्य यशस्वीरित्या पाठवले!",
      te:"✅ ఆసక్తి విజయవంతంగా పంపబడింది!", kn:"✅ ಆಸಕ್ತಿ ಯಶಸ್ವಿಯಾಗಿ ಕಳುಹಿಸಲಾಗಿದೆ!",
      ta:"✅ விருப்பம் வெற்றிகரமாக அனுப்பப்பட்டது!", gu:"✅ Ruch safaltapurvak mokli!",
      pa:"✅ ਰੁਚੀ ਸਫਲਤਾਪੂਰਵਕ ਭੇਜੀ ਗਈ!", bn:"✅ আগ্রহ সফলভাবে পাঠানো হয়েছে!", or:"✅ ଆଗ୍ରହ ସଫଳତାର ସହ ପଠାଗଲା!"
    },
    "alert_enter_qty": {
      en:"Please enter a valid quantity.", hi:"कृपया मान्य मात्रा दर्ज करें।", mr:"कृपया वैध प्रमाण प्रविष्ट करा.",
      te:"దయచేసి సరైన పరిమాణాన్ని నమోదు చేయండి.", kn:"ದಯವಿಟ್ಟು ಸರಿಯಾದ ಪ್ರಮಾಣ ನಮೂದಿಸಿ.",
      ta:"சரியான அளவை உள்ளிடவும்.", gu:"Krupa karine yogya jatho dakhal karo.",
      pa:"ਕਿਰਪਾ ਕਰਕੇ ਸਹੀ ਮਾਤਰਾ ਦਰਜ ਕਰੋ।", bn:"অনুগ্রহ করে একটি বৈধ পরিমাণ লিখুন।", or:"ଦୟାକରି ଏକ ବୈଧ ପରିମାଣ ଦର୍ଜ କରନ୍ତୁ।"
    },
    "alert_enter_price": {
      en:"Please enter a valid price.", hi:"कृपया मान्य मूल्य दर्ज करें।", mr:"कृपया वैध किंमत प्रविष्ट करा.",
      te:"దయచేసి సరైన ధరను నమోదు చేయండి.", kn:"ದಯವಿಟ್ಟು ಸರಿಯಾದ ಬೆಲೆ ನಮೂದಿಸಿ.",
      ta:"சரியான விலையை உள்ளிடவும்.", gu:"Krupa karine yogya bhav dakhal karo.",
      pa:"ਕਿਰਪਾ ਕਰਕੇ ਸਹੀ ਕੀਮਤ ਦਰਜ ਕਰੋ।", bn:"অনুগ্রহ করে একটি বৈধ মূল্য লিখুন।", or:"ଦୟାକରି ଏକ ବୈଧ ମୂଲ୍ୟ ଦର୍ଜ କରନ୍ତୁ।"
    },
    "alert_max_qty": {
      en:"Maximum available quantity is", hi:"अधिकतम उपलब्ध मात्रा है", mr:"कमाल उपलब्ध प्रमाण आहे",
      te:"గరిష్ట అందుబాటు పరిమాణం", kn:"ಗರಿಷ್ಠ ಲಭ್ಯವಿರುವ ಪ್ರಮಾಣ",
      ta:"அதிகபட்ச கிடைக்கும் அளவு", gu:"Mahattam uplabdh jatho che",
      pa:"ਵੱਧ ਤੋਂ ਵੱਧ ਉਪਲਬਧ ਮਾਤਰਾ ਹੈ", bn:"সর্বোচ্চ উপলব্ধ পরিমাণ হল", or:"ସର୍ବାଧିକ ଉପଲବ୍ଧ ପରିମାଣ ହେଉଛି"
    },
    "alert_deal_accepted": {
      en:"Deal accepted!", hi:"सौदा स्वीकृत!", mr:"करार स्वीकारला!",
      te:"ఒప్పందం ఆమోదించబడింది!", kn:"ಒಪ್ಪಂದ ಒಪ್ಪಿಸಲಾಗಿದೆ!",
      ta:"ஒப்பந்தம் ஏற்கப்பட்டது!", gu:"Deal Svikarvama Avi!",
      pa:"ਸੌਦਾ ਸਵੀਕਾਰ ਕੀਤਾ!", bn:"চুক্তি গৃহীত হয়েছে!", or:"ଡ଼ିଲ ଗ୍ରହଣ!"
    },
    "alert_interest_failed": {
      en:"Failed to send interest.", hi:"रुचि भेजने में विफल।", mr:"स्वारस्य पाठवणे अपयशी.",
      te:"ఆసక్తి పంపడం విఫలమైంది.", kn:"ಆಸಕ್ತಿ ಕಳುಹಿಸಲು ವಿಫಲ.",
      ta:"விருப்பம் அனுப்புவதில் தோல்வி.", gu:"Ruch Moklavama Nisafalata.",
      pa:"ਰੁਚੀ ਭੇਜਣ ਵਿੱਚ ਅਸਫਲ।", bn:"আগ্রহ পাঠাতে ব্যর্থ।", or:"ଆଗ୍ରହ ପଠାଇବା ବିଫଳ।"
    },
    "error_loading_dashboard": {
      en:"Error loading dashboard. Please refresh.",
      hi:"डैशबोर्ड लोड करने में त्रुटि। कृपया पुनः लोड करें।",
      mr:"डॅशबोर्ड लोड त्रुटी. कृपया रिफ्रेश करा.",
      te:"డ్యాష్‌బోర్డ్ లోడ్ లో తప్పు. దయచేసి రిఫ్రెష్ చేయండి.",
      kn:"ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಲೋಡ್ ದೋಷ. ದಯವಿಟ್ಟು ರಿಫ್ರೆಶ್ ಮಾಡಿ.",
      ta:"டாஷ்போர்டு ஏற்றலில் பிழை. புதுப்பிக்கவும்.",
      gu:"Dashboard Load Error. Refresh Karo.",
      pa:"ਡੈਸ਼ਬੋਰਡ ਲੋਡ ਵਿੱਚ ਗਲਤੀ। ਕਿਰਪਾ ਰਿਫ੍ਰੈਸ਼ ਕਰੋ।",
      bn:"ড্যাশবোর্ড লোডে ত্রুটি। রিফ্রেশ করুন।", or:"ଡ୍ୟାଶ ଲୋଡ ତ୍ରୁଟି। ରିଫ୍ରେଶ।"
    },
    // alias — old key used in some places
    "error_load_dashboard": {
      en:"Error loading dashboard. Please refresh.",
      hi:"डैशबोर्ड लोड करने में त्रुटि।", mr:"डॅशबोर्ड लोड त्रुटी.",
      te:"డ్యాష్‌బోర్డ్ లోడ్ తప్పు.", kn:"ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಲೋಡ್ ದೋಷ.",
      ta:"டாஷ்போர்டு பிழை.", gu:"Dashboard Error.", pa:"ਡੈਸ਼ਬੋਰਡ ਗਲਤੀ।",
      bn:"ড্যাশবোর্ড ত্রুটি।", or:"ଡ୍ୟାଶ ତ୍ରୁଟି।"
    },

    // ── EMPTY / ERROR STATES ──────────────────────────────────────────────
    "no_crops":        { en:"No crops available for sale at the moment.", hi:"अभी कोई फसल उपलब्ध नहीं।", mr:"सध्या पीक नाही.", te:"ప్రస్తుతం పంటలు లేవు.", kn:"ಇದీಗ ಬೆಳೆ ಇಲ್ಲ.", ta:"தற்போது பயிர் இல்லை.", gu:"Hmar Pak nathi.", pa:"ਹੁਣੇ ਕੋਈ ਫਸਲ ਨਹੀਂ।", bn:"এখন ফসল নেই।", or:"ਹੁਣੇ ਫਸਲ ਨਹੀਂ।" },
    "no_interests":    { en:"No interests yet. Browse crops above!", hi:"अभी कोई रुचि नहीं।", mr:"अद्याप स्वारस्य नाही.", te:"ఇంకా ఆసక్తులు లేవు.", kn:"ಇನ್ನೂ ಆಸಕ್ತಿ ಇಲ್ಲ.", ta:"இன்னும் விருப்பங்கள் இல்லை.", gu:"Ruch nathi.", pa:"ਹਾਲੇ ਕੋਈ ਰੁਚੀ ਨਹੀਂ।", bn:"এখনও আগ্রহ নেই।", or:"ਹਾਲੇ ਆਗ੍ਰਹ ਨਹੀਂ।" },
    "no_active_crops": { en:"No active crops. Post your first crop!", hi:"कोई सक्रिय फसल नहीं।", mr:"सक्रिय पीक नाही.", te:"సక్రియ పంటలు లేవు.", kn:"ಸಕ್ರಿಯ ಬೆಳೆ ಇಲ್ಲ.", ta:"செயலில் பயிர் இல்லை.", gu:"Sakri Pak nathi.", pa:"ਕੋਈ ਸਰਗਰਮ ਫਸਲ ਨਹੀਂ।", bn:"সক্রিয় ফসল নেই।", or:"ਸਕ੍ਰਿਯ ਫਸਲ ਨਹੀਂ।" },
    "failed_crops":    { en:"Failed to load crops. Please refresh.", hi:"फसलें लोड नहीं हुईं।", mr:"पिके लोड अपयश.", te:"పంటలు లోడ అవలేదు.", kn:"ಬೆಳೆ ಲೋಡ ವಿಫಲ.", ta:"பயிர் ஏற்றல் தோல்வி.", gu:"Pak Load Fail.", pa:"ਫਸਲਾਂ ਲੋਡ ਅਸਫਲ।", bn:"ফসল লোড ব্যর্থ।", or:"ਫਸਲ Load Fail।" },
    "no_history":      { en:"No crop history yet.", hi:"अभी इतिहास नहीं।", mr:"अद्याप इतिहास नाही.", te:"ఇంకా చరిత్ర లేదు.", kn:"ಇತಿಹಾಸ ಇಲ್ಲ.", ta:"வரலாறு இல்லை.", gu:"Itihas nathi.", pa:"ਅਜੇ ਇਤਿਹਾਸ ਨਹੀਂ।", bn:"ইতিহাস নেই।", or:"ਇਤਿਹਾਸ ਨਹੀਂ।" },
    // FIX: hardcoded "N/A" and "Unknown" fallbacks in JS templates
    "n_a":               { en:"N/A",         hi:"उपलब्ध नहीं", mr:"उपलब्ध नाही",te:"వర్తించదు",kn:"ಅನ್ವಯಿಸುವ‌ದಿಲ್ಲ",ta:"பொருந்தாது",gu:"N/A",pa:"ਲਾਗੂ ਨਹੀਂ",bn:"প্রযোজ্য নয়",or:"ਲਾਗੂ ਨਹੀਂ" },
    "unknown_crop":      { en:"Unknown Crop",hi:"अज्ञात फसल",  mr:"अज्ञात पीक", te:"తెలియని పంట",kn:"ಅಜ್ಞಾತ ಬೆಳೆ",ta:"தெரியாத பயிர்",gu:"Ajan Pak",pa:"ਅਣਜਾਣ ਫਸਲ",bn:"অজানা ফসল",or:"ਅਜਾਣ ਫਸਲ" },
    "unknown_contractor":{ en:"Unknown",     hi:"अज्ञात",      mr:"अज्ञात",      te:"తెలియదు",   kn:"ತಿಳಿದಿಲ್ಲ",   ta:"தெரியாது",    gu:"Ajan",   pa:"ਅਣਜਾਣ",   bn:"অজানা",   or:"ਅਜਾਣ" },
  };

  // ─── RUNTIME ──────────────────────────────────────────────────────────────

  let _lang = localStorage.getItem("bhoomi_lang") || "en";
  let _resolveReady;
  const _ready = new Promise(res => { _resolveReady = res; });

  function t(key) {
    const entry = STRINGS[key];
    if (!entry) {
      console.warn(`[DT] Missing i18n key: "${key}"`);
      return key;
    }
    return entry[_lang] || entry["en"] || key;
  }

  function setLang(lang) {
    if (SUPPORTED.includes(lang)) {
      _lang = lang;
      localStorage.setItem("bhoomi_lang", lang);
    }
  }

  function getLang() { return _lang; }

  /**
   * Scan DOM and translate all [data-i18n] elements.
   * Handles text content and attribute translation (data-i18n-attr).
   * Preserves child elements (e.g. badge spans inside nav links).
   */
  function _scanDOM() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key  = el.getAttribute("data-i18n");
      const attr = el.getAttribute("data-i18n-attr");
      const text = t(key);
      if (attr) {
        el.setAttribute(attr, text);
        return;
      }
      // If the element has child ELEMENTS (e.g. badge <span>),
      // only replace text nodes, not the child elements.
      const hasChildElements = [...el.childNodes].some(n => n.nodeType === Node.ELEMENT_NODE);
      if (!hasChildElements) {
        el.textContent = text;
      } else {
        // Replace the first text node only, preserve element children
        const textNode = [...el.childNodes].find(n => n.nodeType === Node.TEXT_NODE);
        if (textNode) {
          textNode.textContent = text + " ";
        } else {
          // Prepend a text node
          el.insertBefore(document.createTextNode(text + " "), el.firstChild);
        }
      }
    });
  }

  async function _init() {
    // 1. Try to sync language from server (non-blocking for performance)
    try {
      const token = localStorage.getItem("access_token");
      if (token) {
        const res = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(3000),
        });
        if (res.ok) {
          const me = await res.json();
          if (me.lang && SUPPORTED.includes(me.lang)) {
            _lang = me.lang;
            localStorage.setItem("bhoomi_lang", _lang);
          }
        }
      }
    } catch (_) { /* offline or timeout — use localStorage/default */ }

    // 2. FIX: Scan DOM BEFORE resolving DT.ready.
    //    This guarantees all static data-i18n attributes on HTML elements
    //    are translated before dashboard.js begins rendering any cards.
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        _scanDOM();
        _resolveReady();
      });
    } else {
      _scanDOM();
      _resolveReady();
    }
  }

  window.DT = { t, setLang, getLang, ready: _ready };
  _init();

})();