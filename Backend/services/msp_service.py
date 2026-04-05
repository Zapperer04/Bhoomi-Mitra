import json
import time
import os

CACHE_TTL = 24 * 60 * 60  # 24 hours
_cache = {
    "data": None,
    "timestamp": 0
}

DATA_PATH = os.path.join(
    os.path.dirname(__file__),
    "..",
    "data",
    "msp_fallback.json"
)

def _load_fallback():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def get_msp(crop: str):
    crop = crop.lower().strip()

    # ---------- CACHE ----------
    if _cache["data"] and (time.time() - _cache["timestamp"]) < CACHE_TTL:
        value = _cache["data"].get(crop)

        # 🔥 critical fix: cache miss → force reload
        if value is not None:
            return value

    # ---------- LOAD FALLBACK ----------
    try:
        data = _load_fallback()
    except Exception as e:
        print("MSP LOAD ERROR:", e)
        return None

    # ---------- UPDATE CACHE ----------
    _cache["data"] = data
    _cache["timestamp"] = time.time()

    return data.get(crop)


# ---------- FORCE CLEAN CACHE ON STARTUP ----------
_cache["data"] = None
_cache["timestamp"] = 0
