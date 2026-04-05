# advisory/data.py
import json
import os

DATA_PATH = os.path.join(os.path.dirname(__file__), "advisory_data.json")

with open(DATA_PATH, "r", encoding="utf-8") as f:
    ADVISORY_DB = json.load(f)

def get_advisory(crop: str, stage: str | None):
    crop_data = ADVISORY_DB.get(crop)
    if not crop_data:
        return None

    # 1️⃣ Exact stage match
    if stage and stage in crop_data:
        return crop_data[stage]

    # 2️⃣ General fallback
    if "_general" in crop_data:
        return crop_data["_general"]

    # 3️⃣ Nothing found
    return None
