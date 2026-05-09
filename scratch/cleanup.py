import os
files = [
    "index.html", "Signup.html", "messages.html", "farmer_dashboard.html", 
    "contractor_dashboard.html", "Chatbot.html", "Profile.html", 
    "post_crop.html", "login.html", "gov.html", "farmer_help.html", 
    "contractor_help.html"
]
for f in files:
    path = os.path.join(os.getcwd(), f)
    if os.path.exists(path):
        os.remove(path)
        print(f"Deleted {f}")
    else:
        print(f"Skipped {f} (not found)")
