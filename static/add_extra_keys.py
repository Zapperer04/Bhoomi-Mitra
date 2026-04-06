import re

file_path = "dashboard_i18n.js"

extra_keys = {
    "toast.interest_sent": { "en": "Interest sent!", "hi": "रुचि संचयी!", "bn": "আগ্রহ পাঠানো হয়েছে!", "mr": "स्वारस्य पाठवले!", "te": "ఆసక్తి పంపబడింది!", "ta": "ஆர்வத்தை அனுப்பினீர்கள்!", "gu": "રસ મોકલ્યો!", "kn": "ಆಸಕ್ತಿ ಕಳುಹಿಸಲಾಗಿದೆ!", "pa": "ਦਿਲਚਸਪੀ ਭੇਜੀ ਗਈ!", "or": "ଆଗ୍ରହ ପଠାଗଲା!" },
    "quantity_lbl": { "en": "Quantity", "hi": "मात्रा", "bn": "পরিমাণ", "mr": "प्रमाण", "te": "పరిమాణం", "ta": "அளவு", "gu": "જથ્થો", "kn": "ಪ್ರಮಾಣ", "pa": "ਮਾਤਰਾ", "or": "ପରିମାଣ" },
    "price_lbl": { "en": "Price", "hi": "मूल्य", "bn": "দাম", "mr": "किंमत", "te": "ధర", "ta": "விலை", "gu": "કિંમત", "kn": "ಬೆಲೆ", "pa": "ਕੀਮਤ", "or": "ମୂଲ୍ୟ" },
    "quintal_short": { "en": "Qtl", "hi": "क्विंटल", "bn": "কুইন্টাল", "mr": "क्विंटल", "te": "క్వింటా", "ta": "குவிண்டல்", "gu": "ક્વિન્ટલ", "kn": "ಕ್ವಿಂಟಾಲ್", "pa": "ਕੁਇੰਟਲ", "or": "କ୍ୱିଣ୍ଟାଲ" }
}

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

formatted_keys = ""
for key, trans in extra_keys.items():
    formatted_keys += f'    "{key}": {{ ' + ", ".join([f'{l}:"{t}"' for l, t in trans.items()]) + " },\n"

content = content.replace("  };", formatted_keys + "  };", 1)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("SUCCESS: extra keys added.")
