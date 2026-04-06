import re

file_path = "dashboard_i18n.js"

gov_keys = {
    "gov.scheme1_desc": {
        "en": "Income support of ₹6,000 per year to farmers.", "hi": "किसानों को प्रति वर्ष ₹6,000 की आय सहायता।", "bn": "কৃষকদের বছরে ৬,০০০ টাকা সহায়তা।", "mr": "शेतकऱ्यांना वर्षाला ६,००० रुपये मदत.", "te": "రైతులకు ఏడాదికి ₹6,000 ఆర్థిక సాయం.",
        "ta": "விவசாயிகளுக்கு ஆண்டுக்கு ₹6,000 வருமான ஆதரவு.", "gu": "ખેડૂતોને વર્ષે ₹6,000 ની સહાય.", "kn": "ರೈತರಿಗೆ ವರ್ಷಕ್ಕೆ ₹6,000 ಆದಾಯ ಬೆಂಬಲ.", "pa": "ਕਿਸਾਨਾਂ ਨੂੰ ਸਾਲਾਨਾ ₹6,000 ਦੀ ਸਹਾਇਤਾ।", "or": "ଚାଷୀଙ୍କୁ ବର୍ଷକୁ ୬,୦୦୦ ଟଙ୍କା ସହାୟତା।"
    },
    "gov.tag_income": { "en": "Income", "hi": "आय", "bn": "আয়", "mr": "उत्पन्न", "te": "ఆదాయం", "ta": "வருமானம்", "gu": "આવક", "kn": "ಆದಾಯ", "pa": "ਆਮਦਨ", "or": "ଆୟ" },
    "gov.learn_more": { "en": "Learn more →", "hi": "अधिक जानें →", "bn": "আরও জানুন →", "mr": "अधिक जाणून घ्या →", "te": "మరింత తెలుసుకోండి →", "ta": "மேலும் அறிய →", "gu": "વધુ જાણો →", "kn": "ಇನ್ನಷ್ಟು ತಿಳಿಯಿರಿ →", "pa": "ਹੋਰ ਜਾਣੋ →", "or": "ଅଧିକ ଜାଣନ୍ତୁ →" }
}

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

formatted_keys = ""
for key, trans in gov_keys.items():
    formatted_keys += f'    "{key}": {{ ' + ", ".join([f'{l}:"{t}"' for l, t in trans.items()]) + " },\n"

content = content.replace("  };", formatted_keys + "  };", 1)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("SUCCESS: gov keys added.")
