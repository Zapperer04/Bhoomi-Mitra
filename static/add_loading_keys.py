import re

file_path = "dashboard_i18n.js"

loading_keys = {
    "loading.conversations": {
        "en": "Loading conversations...", "hi": "बातचीत लोड हो रही है...", "bn": "বার্তা লোড হচ্ছে...", "mr": "संभाषण लोड होत आहे...", "te": "సంభాషణలు లోడ్ అవుతున్నాయి...",
        "ta": "உரையாடல்கள் ஏற்றப்படுகின்றன...", "gu": "વાતચીત લોડ થઈ રહી છે...", "kn": "ಸಂಭಾಷಣೆಗಳು ಲೋಡ್ ಆಗುತ್ತಿವೆ...", "pa": "ਗੱਲਬਾਤ ਲੋਡ ਹੋ ਰਹੀ ਹੈ...", "or": "ବାର୍ତ୍ତାଳପ ଲୋଡ୍ ହେଉଛି..."
    },
    "loading.messages": {
        "en": "Loading messages...", "hi": "संदेश लोड हो रहे हैं...", "bn": "বার্তা লোড হচ্ছে...", "mr": "संदेश लोड होत आहेत...", "te": "సందేశాలు లోడ్ అవుతున్నాయి...",
        "ta": "செய்திகள் ஏற்றப்படுகின்றன...", "gu": "સંદેશાઓ લોડ થઈ રહ્યા છે...", "kn": "ಸಂದೇಶಗಳು ಲೋಡ್ ಆಗುತ್ತಿವೆ...", "pa": "ਸੰਦੇਸ਼ ਲੋਡ ਹੋ ਰਹੇ ਹਨ...", "or": "ବାର୍ତ୍ତା ଲୋଡ୍ ହେଉଛି..."
    },
    "loading.schemes": {
        "en": "Loading schemes...", "hi": "योजनाएं लोड हो रही हैं...", "bn": "প্রকল্প লোড হচ্ছে...", "mr": "योजना लोड होत आहेत...", "te": "పథకాలు లోడ్ అవుతున్నాయి...",
        "ta": "திட்டங்கள் ஏற்றப்படுகின்றன...", "gu": "યોજનાઓ લોડ થઈ રહી છે...", "kn": "ಯೋಜನೆಗಳು ಲೋಡ್ ಆಗುತ್ತಿವೆ...", "pa": "ਸਕੀਮਾਂ ਲੋਡ ਹੋ ਰਹੀਆਂ ਹਨ...", "or": "ଯୋଜନା ଲୋଡ୍ ହେଉଛି..."
    }
}

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

formatted_keys = ""
for key, trans in loading_keys.items():
    formatted_keys += f'    "{key}": {{ ' + ", ".join([f'{l}:"{t}"' for l, t in trans.items()]) + " },\n"

content = content.replace("  };", formatted_keys + "  };", 1)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("SUCCESS: loading keys added.")
