import os
import json
import google.generativeai as genai

gemini_api_key = os.getenv("GEMINI_API_KEY")
if gemini_api_key:
    genai.configure(api_key=gemini_api_key)
model = genai.GenerativeModel("gemini-pro")

SYSTEM_PROMPT = """
You are Bhoomi Mitra's reasoning engine.

DO NOT answer the user.
DO NOT explain anything.

Return ONLY valid JSON.

Allowed actions:
- get_msp
- get_weather
- get_scheme
- ask_clarification
- fallback

Rules:
- Never invent facts
- If crop/location/scheme missing → ask_clarification
- Output JSON only
"""

def get_plan(user_text: str) -> dict:
    try:
        response = model.generate_content([
            SYSTEM_PROMPT,
            f"User message: {user_text}"
        ])

        return json.loads(response.text)

    except Exception:
        return {"action": "fallback"}
