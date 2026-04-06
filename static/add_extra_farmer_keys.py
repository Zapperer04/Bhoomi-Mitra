import re

file_path = "dashboard_i18n.js"

new_keys = {
    "farmer.crop_placeholder": { "en": "Wheat, Paddy, etc.", "hi": "गेहूं, धान, आदि", "bn": "গম, ধান, ইত্যাদি", "mr": "गहू, भात, इत्यादी", "te": "గోధుమ, వరి, మొదలైనవి", "ta": "கோதுமை, நெல், போன்றவை", "gu": "ઘઉં, ડાંગર, વગેરે", "kn": "ಬೆಳೆಗಳ ಹೆಸರು", "pa": "ਕਣਕ, ਝੋਨਾ, ਆਦਿ", "or": "ଗହମ, ଧାନ, ଇତ୍ୟାଦି" },
    "farmer.location_lbl": { "en": "Location", "hi": "स्थान", "bn": "স্থান", "mr": "ठिकाण", "te": "ప్రాంతం", "ta": "இடம்", "gu": "સ્થળ", "kn": "ಸ್ಥಳ", "pa": "ਸਥਾਨ", "or": "ସ୍ଥାନ" }
}

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

formatted_keys = ""
for key, trans in new_keys.items():
    formatted_keys += f'    "{key}": {{ ' + ", ".join([f'{l}:"{t}"' for l, t in trans.items()]) + " },\n"

content = content.replace("  };", formatted_keys + "  };", 1)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("SUCCESS: extra farmer keys added.")
