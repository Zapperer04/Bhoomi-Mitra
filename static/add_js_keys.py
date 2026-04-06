import re

file_path = "dashboard_i18n.js"

js_keys = {
    "status.active": { "en": "Active", "hi": "सक्रिय", "bn": "সক্রিয়", "mr": "सक्रिय", "te": "యాక్టివ్", "ta": "செயலில்", "gu": "સક્રિય", "kn": "ಸಕ್ರಿಯ", "pa": "ਸਰਗਰਮ", "or": "ସକ୍ରିୟ" },
    "status.partially_sold": { "en": "Partially Sold", "hi": "आंशिक रूप से बिका", "bn": "আংশিক বিক্রিত", "mr": "अंशतः विक्री", "te": "పాక్షికంగా అమ్మబడింది", "ta": "பகுதி விற்கப்பட்டது", "gu": "અંશતઃ વેચાયેલ", "kn": "ಭಾಗಶಃ ಮಾರಾಟ", "pa": "ਅੰਸ਼ਕ ਤੌਰ 'ਤੇ ਵੇਚਿਆ ਗਿਆ", "or": "ଆଂଶିକ ବିକ୍ରୟ" },
    "status.negotiating": { "en": "Negotiating", "hi": "मोलभाव", "bn": "আলোচনাধীন", "mr": "बोलणी सुरू", "te": "చర్చలు", "ta": "பேச்சுவார்த்தை", "gu": "વાતચીત", "kn": "ಚರ್ಚೆ", "pa": "ਗੱਲਬાਤ", "or": "ଆଲୋଚନା" },
    "status.sold": { "en": "Sold", "hi": "बिका हुआ", "bn": "বিক্রিত", "mr": "विकले", "te": "అమ్మబడింది", "ta": "விற்கப்பட்டது", "gu": "વેચાયેલ", "kn": "ಮಾರಾಟವಾಗಿದೆ", "pa": "ਵੇਚਿਆ ਗਿਆ", "or": "ବିକ୍ରି ହୋଇଛି" },
    "status.pending": { "en": "Pending", "hi": "लंबित", "bn": "বকেয়া", "mr": "प्रलंबित", "te": "పెండింగ్", "ta": "நிலுவையில்", "gu": "બાકી", "kn": "ಬಾಕಿ", "pa": "ਬਕਾਇਆ", "or": "ବାକି ଅଛି" },

    "label.qty": { "en": "Qty", "hi": "मात्रा", "bn": "পরিমাণ", "mr": "प्रमाण", "te": "పరిమాణం", "ta": "அளவு", "gu": "જથ્થો", "kn": "ಪ್ರಮಾಣ", "pa": "ਮਾਤਰਾ", "or": "ପରିମାଣ" },
    "label.status": { "en": "Status", "hi": "स्थिति", "bn": "অবস্থা", "mr": "स्थिती", "te": "స్థితి", "ta": "நிலை", "gu": "સ્થિતિ", "kn": "ಸ್ಥಿತಿ", "pa": "ਸਥਿਤੀ", "or": "ସ୍ଥିତି" },
    "label.contractor": { "en": "Contractor", "hi": "ठेकेदार", "bn": "ঠিকাদার", "mr": "कंत्राटदार", "te": "కాంట్రాక్టర్", "ta": "ஒப்பந்ததாரர்", "gu": "કોન્ટ્રાક્ટર", "kn": "ಗುತ್ತಿಗೆದಾರ", "pa": "ਠੇਕੇਦਾਰ", "or": "ଠିକାଦାର" },
    "label.offered": { "en": "Offered", "hi": "प्रस्तावित", "bn": "প্রস্তাবিত", "mr": "प्रस्तावित", "te": "ఆఫర్", "ta": "வழங்கப்பட்டது", "gu": "ઓફર", "kn": "ಆಫರ್", "pa": "ਪੇਸ਼ਕਸ਼", "or": "ପ୍ରଦତ୍ତ" },
    "btn.clear": { "en": "Clear", "hi": "साफ़ करें", "bn": "পরিষ্কার", "mr": "काढून टाका", "te": "తొలగించు", "ta": "அழி", "gu": "સાફ કરો", "kn": "ಅಳಿಸು", "pa": "ਸਾਫ਼ ਕਰੋ", "or": "ସଫା କରନ୍ତୁ" }
}

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

formatted_keys = ""
for key, trans in js_keys.items():
    formatted_keys += f'    "{key}": {{ ' + ", ".join([f'{l}:"{t}"' for l, t in trans.items()]) + " },\n"

content = content.replace("  };", formatted_keys + "  };", 1)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("SUCCESS: status and label keys added.")
