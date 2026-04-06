import re

file_path = "dashboard_i18n.js"

# 10-Language Dictionary for New/Missing Keys
new_keys_data = {
    "nav.back": {
        "en": "Back", "hi": "पीछे", "bn": "পেছনে", "mr": "मागे", "te": "వెనుకకు",
        "ta": "பின்", "gu": "પાછા", "kn": "ಹಿಂದೆ", "pa": "ਪਿੱਛੇ", "or": "ପଛକୁ"
    },
    "nav.dashboard": {
        "en": "Dashboard", "hi": "डैशबोर्ड", "bn": "ড্যাশবোর্ড", "mr": "डॅशबोर्ड", "te": "డాష్‌బోర్డ్",
        "ta": "டாஷ்போர்டு", "gu": "ડેશબોર્ડ", "kn": "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್", "pa": "ਡੈਸ਼ਬੋਰਡ", "or": "ଡ୍ୟାସବୋର୍ଡ"
    },
    "nav.back_home": {
        "en": "Back to Home", "hi": "होम पर वापस जाएं", "bn": "হোমে ফিরে যান", "mr": "मुखपृष्ठावर जा", "te": "హోమ్‌కు తిరిగి వెళ్ళు",
        "ta": "முகப்புக்குத் திரும்பு", "gu": "હોમ પર પાછા જાઓ", "kn": "ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ", "pa": "ਹੋਮ 'ਤੇ ਵਾਪਸ ਜਾਓ", "or": "ହୋମକୁ ଫେରନ୍ତୁ"
    },
    "farmer.crop_details": {
        "en": "Crop Details", "hi": "फसल विवरण", "bn": "ফসলের বিবরণ", "mr": "पिकाचे तपशील", "te": "పంట వివరాలు",
        "ta": "பயிர் விவரங்கள்", "gu": "પાકની ವಿಗતો", "kn": "ಬೆಳೆ ವಿವರಗಳು", "pa": "ਫਸਲ ਦਾ ਵੇਰਵਾ", "or": "ଫସଲ ବିବରଣୀ"
    },
    "farmer.crop_name": {
        "en": "Crop Name", "hi": "फ़सल का नाम", "bn": "ফসলের নাম", "mr": "पिकाचे नाव", "te": "పంట పేరు",
        "ta": "பயிர் பெயர்", "gu": "પાકનું નામ", "kn": "ಬೆಳೆಯ ಹೆಸರು", "pa": "ਫਸਲ ਦਾ ਨਾਮ", "or": "ଫସଲର ନାମ"
    },
    "farmer.quantity_quintals": {
        "en": "Quantity (Quintals)", "hi": "मात्रा (क्विंटल)", "bn": "পরিমাণ (কুইন্টাল)", "mr": "प्रमाण (क्विंटल)", "te": "పరిమాణం (క్వింటాళ్ళు)",
        "ta": "அளவு (குவிண்டல்)", "gu": "જથ્થો (ક્વિન્ટલ)", "kn": "ಪ್ರಮಾಣ (ಕ್ವಿಂಟಾಲ್)", "pa": "ਮਾਤਰਾ (ਕੁਇੰਟਲ)", "or": "ପରିମାଣ (କ୍ୱିଣ୍ଟାଲ)"
    },
    "farmer.pricing_title": {
        "en": "Pricing", "hi": "मूल्य निर्धारण", "bn": "মূল্য নির্ধারণ", "mr": "किंमत", "te": "ధర",
        "ta": "விலை", "gu": "કિંમત", "kn": "ಬೆಲೆ", "pa": "ਕੀਮਤ", "or": "ମୂଲ୍ୟ"
    },
    "farmer.expected_price": {
        "en": "Expected Price (₹ / Qtl)", "hi": "अपेक्षित मूल्य", "bn": "প্রত্যাশিত মূল্য", "mr": "अपेक्षित किंमत", "te": "ఆశించిన ధర",
        "ta": "விலை", "gu": "અપેક્ષિત કિંમત", "kn": "ನಿರೀಕ್ಷಿತ ಬೆಲೆ", "pa": "ਉਮੀਦ ਕੀਮਤ", "or": "ପ୍ରତ୍ୟାଶିତ ମୂଲ୍ୟ"
    },
    "farmer.availability_title": {
        "en": "Availability", "hi": "उपलब्धता", "bn": "উপলব্ধতা", "mr": "उपलब्धता", "te": "అందుబాటు",
        "ta": "கிடைக்கும்", "gu": "ઉપલબ્ધતા", "kn": "ಲಭ್ಯತೆ", "pa": "ਉਪਲਬਧਤਾ", "or": "ଉପଲବ୍ଧତା"
    },
    "farmer.available_from": {
        "en": "Available From", "hi": "से उपलब्ध", "bn": "কবে থেকে", "mr": "उपलब्धता", "te": "నుండి",
        "ta": "கிடைக்கும்", "gu": "ક્યારથી", "kn": "ಯಾವಾಗ", "pa": "ਕਦੋਂ ਤੋਂ", "or": "କେବେଠାରୁ"
    },
    "gov.title": {
        "en": "Gov Schemes", "hi": "सरकारी योजनाएं", "bn": "সরকারি প্রকল্প", "mr": "सरकारी योजना", "te": "పథకాలు",
        "ta": "திட்டங்கள்", "gu": "યોજનાઓ", "kn": "ಯೋಜನೆಗಳು", "pa": "ਸਕੀਮਾਂ", "or": "ଯୋଜନା"
    },
    "gov.subtitle": {
        "en": "Verified schemes.", "hi": "सत्यापित योजनाएं।", "bn": "যাচাইকৃত প্রকল্প।", "mr": "योजना.", "te": "పథకాలు.",
        "ta": "திட்டங்கள்.", "gu": "યોજનાઓ.", "kn": "ಯೋಜನೆಗಳು.", "pa": "ਸਕੀਮਾਂ।", "or": "ଯୋଜନା।"
    },
    "messages.sidebar_title": {
        "en": "Messages", "hi": "संदेश", "bn": "বার্তা", "mr": "संदेश", "te": "సందేశాలు",
        "ta": "செய்திகள்", "gu": "સંદેશાઓ", "kn": "ಸಂದೇಶಗಳು", "pa": "ਸੰਦੇਸ਼", "or": "ବାର୍ତ୍ତା"
    },
    "messages.sidebar_sub": {
        "en": "Chat with deals", "hi": "सौदों के साथ चैट", "bn": "চ্যাট", "mr": "चॅट", "te": "చాట్",
        "ta": "அரட்டை", "gu": "ચેટ", "kn": "ಚಾಟ್", "pa": "ਗੱਲਬਾਤ", "or": "ଚାଟ୍"
    },
    "messages.empty_title": {
        "en": "Select a chat", "hi": "एक चैट चुनें", "bn": "চয়ন করুন", "mr": "निवडा", "te": "ఎంచుకోండి",
        "ta": "தேர்ந்தெடு", "gu": "પસંદ કરો", "kn": "ಆರಿಸಿ", "pa": "ਚੁਣੋ", "or": "ବାଛନ୍ତୁ"
    },
    "messages.empty_sub": {
        "en": "Start messaging", "hi": "मैसेजिंग शुरू करें", "bn": "শুরু করুন", "mr": "सुरू करा", "te": "ప్రారంభించండి",
        "ta": "தொடங்கு", "gu": "શરૂ કરો", "kn": "ಪ್ರಾರಂಭಿಸಿ", "pa": "ਸ਼ੁਰੂ ਕਰੋ", "or": "ଆରମ୍ଭ କରନ୍ତୁ"
    },
    "messages.call_btn": {
        "en": "Call", "hi": "कॉल", "bn": "কল", "mr": "कॉल", "te": "కాల్",
        "ta": "அழை", "gu": "કોલ", "kn": "ಕರೆ", "pa": "ਕਾਲ", "or": "କଲ୍"
    },
    "messages.input_placeholder": {
        "en": "Message...", "hi": "संदेश...", "bn": "বার্তা...", "mr": "संदेश...", "te": "సందేశం...",
        "ta": "செய்தி...", "gu": "સંદેશ...", "kn": "ಸಂದೇಶ...", "pa": "ਸੰਦੇਸ਼...", "or": "ବାର୍ତ୍ତା..."
    },
    "messages.send_btn": {
        "en": "Send", "hi": "भेजें", "bn": "পাঠান", "mr": "पाठवा", "te": "పంపండి",
        "ta": "அனுப்பு", "gu": "મોકલો", "kn": "ಕಳುಹಿಸಿ", "pa": "ਭੇਜੋ", "or": "ପଠାନ୍ତୁ"
    }
}

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

content = "".join(lines)

# Clean existing keys if any
for key in new_keys_data.keys():
    pattern = rf'"{re.escape(key)}":\s*\{{[^}}]*\}},?'
    content = re.sub(pattern, "", content)

# Format the new 10-language keys
formatted_keys = ""
for key, trans in new_keys_data.items():
    formatted_keys += f'    "{key}": {{ ' + ", ".join([f'{l}:"{t}"' for l, t in trans.items()]) + " },\n"

# Insert before the closing brace of STRINGS
content = content.replace("  };", formatted_keys + "  };", 1)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("SUCCESS: dictionary upgraded.")
