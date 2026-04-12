import os
import re
import logging
import time
from datetime import timedelta, date, datetime, timedelta as py_timedelta
from collections import defaultdict
from dotenv import load_dotenv

# ================= LOGGING SETUP =================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, jwt_required, get_jwt_identity, get_jwt, create_access_token
)
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError

# ================= DB & MODELS =================
from models import db, Crop, Interest, Message, User
from routes.auth_routes import auth_bp

# ================= DATA SERVICES =================
from services.msp_service import get_msp
from data.weather_data import get_weather

# ================= DATASETS =================
from schemes.schemes_data import SCHEMES_DATA
from advisory.advisory_data import ADVISORY_DATA
from fertilizer.fertilizer_data import FERTILIZER_DATA

# ================= TRANSLATION =================
from services.translator import (
    get_text, translate_raw, get_crop_label, get_city_label,
    normalize_city_input, get_dashboard_strings,
)

# ================= CONSTANTS =================
CANONICAL_CROPS = [
    "wheat", "rice", "paddy", "maize", "barley", "jowar", "bajra", "ragi",
    "gram", "tur", "moong", "urad", "lentil",
    "groundnut", "soybean", "sunflower", "sesame",
    "mustard", "cotton", "sugarcane",
]

CANONICAL_CITIES = [
    "delhi", "mumbai", "kolkata", "chennai",
    "bengaluru", "hyderabad", "pune", "jaipur",
]

# ================= ENV & APP SETUP =================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

from whitenoise import WhiteNoise
from sqlalchemy import event
from sqlalchemy.engine import Engine


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if "sqlite" in type(dbapi_connection).__module__:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()


app = Flask(__name__)
STATIC_DIR = os.path.join(BASE_DIR, "static")
app.wsgi_app = WhiteNoise(app.wsgi_app, root=STATIC_DIR, prefix="static/")
CORS(app, supports_credentials=True)

INSTANCE_DIR = os.path.join(BASE_DIR, "instance")
os.makedirs(INSTANCE_DIR, exist_ok=True)

DB_PATH   = os.path.join(INSTANCE_DIR, "db.sqlite3")
db_url    = os.environ.get("DATABASE_URL", f"sqlite:///{DB_PATH.replace(chr(92), '/')}")
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"]     = db_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"]   = {"pool_pre_ping": True}
# Required >= 32 chars for JWT to prevent InsecureKeyLengthWarning -> 502 crashes in strict envs
app.config["JWT_SECRET_KEY"]              = os.environ.get("JWT_SECRET_KEY", "fallback-dev-secret-key-at-least-32-chars")
app.config["JWT_ACCESS_TOKEN_EXPIRES"]    = timedelta(days=30)

db.init_app(app)
jwt = JWTManager(app)
app.register_blueprint(auth_bp, url_prefix="/auth")

with app.app_context():
    db.create_all()

    # ── Safe Migration: add columns introduced after initial deploy ──────────
    # These ALTER TABLE statements are idempotent — they fail silently if the
    # column already exists, so it is safe to run on every startup.
    migrations = [
        "ALTER TABLE messages ADD COLUMN nonce VARCHAR(64)",
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_nonce ON messages(nonce)",
    ]
    with db.engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
                logger.info(f"[MIGRATION] Applied: {sql[:60]}...")
            except Exception as e:
                conn.rollback()
                logger.warning(f"[MIGRATION] Skipped (already exists or error): {str(e)[:100]}")
                pass  # Column/index already exists — safe to ignore

CHAT_SESSIONS = defaultdict(lambda: {"state": "START", "context": {"lang": "en"}})


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def api_response(success=True, data=None, error=None, status=200):
    """Standardized API response format."""
    return jsonify({
        "success": success,
        "data":    data,
        "error":   error
    }), status

@app.errorhandler(Exception)
def handle_exception(e):
    """Ensure all server crashes return JSON, not HTML, to prevent frontend parse errors."""
    logger.error(f"[SERVER_CRASH] {str(e)}", exc_info=True)
    try:
        # If it's a 404 or other HTTP error, preserve its code
        code = getattr(e, 'code', 500)
        if not isinstance(code, int): code = 500
        return api_response(success=False, error=f"Server error: {str(e)}", status=code)
    except:
        # Ultimate fallback if EVEN the error handler crashes
        return jsonify({"success": False, "error": "Critical Server Error"}), 500


def with_db_retry(max_retries=5, delay=0.2, total_timeout=5.0):
    """
    Decorator for SQLite 'database is locked' retries.
    Uses exponential backoff and a total_timeout fail-fast guard.
    """
    def decorator(func):
        from functools import wraps
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            last_err   = None
            for i in range(max_retries):
                elapsed = time.time() - start_time
                if elapsed > total_timeout:
                    logger.error(f"[DB_TIMEOUT] {func.__name__} failed after {elapsed:.2f}s")
                    break

                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    msgs = ["database is locked", "Lock wait timeout", "concurrent update"]
                    if any(m in str(e) for m in msgs):
                        last_err = e
                        wait = delay * (2 ** i)
                        logger.warning(f"[DB_LOCKED] Retrying {func.__name__} ({i+1}/{max_retries}) in {wait:.2f}s...")
                        db.session.rollback()
                        time.sleep(wait)
                        continue
                    raise e
            
            err_msg = str(last_err) if last_err else "Unknown timeout"
            return api_response(success=False, error=f"Database busy: {err_msg}", status=503)
        return wrapper
    return decorator


def _current_user_id():
    return int(get_jwt_identity())

def _current_user_role():
    return get_jwt().get("role")


def _recompute_crop_status(crop):
    """
    Recalculate crop.status from first principles.

    Rules (in priority order):
      1. quantity_remaining == 0  →  sold
      2. quantity_remaining < quantity AND any accepted interest  →  partially_sold
      3. quantity_remaining == quantity (nothing sold yet)  →  active
      4. Fallback for legacy NULL rows  →  active

    NOTE: "negotiating" is intentionally NEVER written to crop.status here.
    Negotiation is an Interest-level state. Hiding the crop from the marketplace
    because one interest is being negotiated is wrong — other contractors may
    still buy the remaining quantity.

    Does NOT commit — caller is responsible for db.session.commit().
    """
    qty_rem = crop.quantity_remaining if crop.quantity_remaining is not None else crop.quantity

    if qty_rem == 0:
        crop.status = "sold"
        return

    if qty_rem < crop.quantity:
        # Some quantity has been sold — verify at least one accepted deal exists
        has_accepted = Interest.query.filter_by(
            crop_id=crop.id, status="accepted"
        ).first()
        crop.status = "partially_sold" if has_accepted else "active"
    else:
        # qty_rem == crop.quantity  →  nothing sold yet
        crop.status = "active"


def _validate_status_transition(interest, target_status):
    """
    STRICT STATE MACHINE ENFORCEMENT
    pending → negotiating → accepted | rejected
    accepted → (final)
    rejected → (final)
    """
    # Define valid target statuses for each current status
    valid_map = {
        "pending":     ["negotiating", "accepted", "rejected"],
        "negotiating": ["accepted", "rejected", "negotiating"],
        "accepted":    [],  # Terminal
        "rejected":    [],  # Terminal
    }
    current = interest.status or "pending"
    if target_status not in valid_map.get(current, []):
        raise ValueError(f"Invalid state transition from {current} to {target_status}")


def _strip_system_prefix(content: str) -> str:
    """Return a human-readable sidebar preview for system/counter messages."""
    if not content:
        return "No messages yet"
    if content.startswith("__SYSTEM__:"):
        tag = content[len("__SYSTEM__:"):]
        labels = {
            "farmer_accepted":              "✅ Farmer accepted the deal",
            "contractor_accepted":          "✅ Contractor accepted the deal",
            "deal_fully_accepted":          "🎉 Deal confirmed by both parties",
            "rejected":                     "❌ Deal rejected",
            "rejected_crop_sold_out":       "❌ Rejected — crop sold out",
            "negotiating":                  "💬 Negotiation started",
            "withdrew_acceptance:farmer":   "↩️ Farmer withdrew acceptance",
            "withdrew_acceptance:contractor": "↩️ Contractor withdrew acceptance",
            "farmer_acceptance_nullified_by_counter_offer":
                                            "↩️ Counter-offer nullified farmer's acceptance",
        }
        return labels.get(tag, "📋 Status update")
    if content.startswith("__COUNTER__:"):
        return "💬 Counter-offer sent"
    return content


def menu_start(lang="en"):
    return {
        "message": get_text("WELCOME", lang),
        "options": [
            {"label": get_text("MSP_MENU",        lang), "action": "MSP"},
            {"label": get_text("WEATHER_MENU",     lang), "action": "WEATHER"},
            {"label": get_text("ADVISORY_MENU",    lang), "action": "ADVISORY"},
            {"label": get_text("FERTILIZER_MENU",  lang), "action": "FERTILIZER"},
            {"label": get_text("SCHEME_MENU",      lang), "action": "SCHEMES"},
        ],
    }


# ─────────────────────────────────────────────────────────────────────────────
# PAGE ROUTES
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/")
def index():           return render_template("index.html")

@app.route("/login")
def login():           return render_template("login.html")

@app.route("/signup")
def signup():          return render_template("Signup.html")

@app.route("/api/me")
@jwt_required()
def api_me():
    user = User.query.get_or_404(_current_user_id())
    return api_response(data={
        "id":   user.id,
        "name": user.name,
        "role": user.role
    })

@app.route("/farmer/dashboard")
def farmer_dashboard(): return render_template("farmer_dashboard.html")

@app.route("/farmer/post-crop")
def post_crop():       return render_template("post_crop.html")

@app.route("/contractor/dashboard")
def contractor_dashboard(): return render_template("contractor_dashboard.html")

@app.route("/chatbot")
def chatbot_page():    return render_template("Chatbot.html")

@app.route("/gov")
def gov_page():        return render_template("gov.html")

@app.route("/messages")
def messages_page():   return render_template("messages.html")

@app.route("/profile")
def profile_page():    return render_template("Profile.html")


# ─────────────────────────────────────────────────────────────────────────────
# AUTH IDENTITY
# ─────────────────────────────────────────────────────────────────────────────

# Deduplicated from above


@app.route("/debug/whoami", methods=["GET"])
@jwt_required()
def whoami():
    return api_response(data={"identity_received": get_jwt_identity()})


# ─────────────────────────────────────────────────────────────────────────────
# UI TEXT / TRANSLATION
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/ui-text", methods=["POST"])
def ui_text():
    data = request.get_json()
    return api_response(data={"text": get_text(data.get("key"), data.get("lang", "en"))})


@app.route("/api/translate", methods=["POST"])
def translate_api():
    data = request.get_json()
    return api_response(data={"text": translate_raw(data.get("text", ""), data.get("lang", "en"))})


@app.route("/api/ui-strings", methods=["GET"])
def ui_strings():
    return api_response(data=get_dashboard_strings(request.args.get("lang", "en")))


# ─────────────────────────────────────────────────────────────────────────────
# CROP APIs
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/crops", methods=["POST"])
@jwt_required()
@with_db_retry()
def create_crop():
    if _current_user_role() != "farmer":
        return api_response(success=False, error="Only farmers can post crops", status=403)

    data = request.get_json()
    try:
        # Harden input parsing: default to 0 and strip strings to handle empty inputs
        qty_raw = str(data.get("quantity", "0")).strip()
        prc_raw = str(data.get("price", "0")).strip()
        
        qty = int(qty_raw) if qty_raw else 0
        prc = float(prc_raw) if prc_raw else 0.0
        
        if qty <= 0:
            return api_response(success=False, error="Quantity must be greater than zero", status=400)
        if prc < 0:
            return api_response(success=False, error="Price cannot be negative", status=400)

        # Availability date parsing hardening
        avail_str = data.get("availabilityDate")
        if not avail_str:
            avail_date = date.today()
        else:
            try:
                avail_date = date.fromisoformat(avail_str)
            except ValueError:
                return api_response(success=False, error="Invalid date format. Use YYYY-MM-DD.", status=400)

        crop = Crop(
            farmer_id          = _current_user_id(),
            crop_name          = data.get("cropName", "Unknown Crop").strip()[:100],
            quantity           = qty,
            quantity_remaining = qty,
            price              = prc,
            availability_date  = avail_date,
            location           = data.get("location", "Not specified").strip()[:200],
            status             = "active",
        )
        db.session.add(crop)
        db.session.commit()
        logger.info(f"[CROP_POSTED] Farmer {_current_user_id()} posted {crop.crop_name}")
        return api_response(data={"message": "Crop posted", "crop_id": crop.id}, status=201)

    except (ValueError, KeyError, TypeError) as e:
        logger.warning(f"[CROP_POST_VALIDATION] {str(e)}")
        return api_response(success=False, error=f"Invalid data format: {str(e)}", status=400)
    except Exception as e:
        logger.error(f"[CROP_POST_ERROR] {str(e)}", exc_info=True)
        return api_response(success=False, error="Internal server error while saving crop", status=500)


@app.route("/api/crops", methods=["GET"])
@jwt_required()
def list_crops():
    user_id = _current_user_id()
    crops   = Crop.query.filter_by(farmer_id=user_id).all()
    return api_response(data=[c.to_dict() for c in crops])


@app.route("/api/crops/<int:crop_id>", methods=["DELETE"])
@jwt_required()
@with_db_retry()
def delete_crop(crop_id):
    user_id = _current_user_id()
    crop    = Crop.query.get_or_404(crop_id)

    if crop.farmer_id != user_id:
        return api_response(success=False, error="Unauthorized", status=403)

    live = Interest.query.filter(
        Interest.crop_id == crop_id,
        Interest.status.in_(["pending", "negotiating", "accepted"]),
    ).first()
    if live:
        return api_response(success=False, error="Cannot remove a crop with live or accepted deals.", status=409)

    crop.status = "removed"
    db.session.commit()
    return api_response(data={"message": "Crop marked as removed"})


@app.route("/api/crops/<int:crop_id>/hard", methods=["DELETE"])
@jwt_required()
@with_db_retry()
def hard_delete_crop(crop_id):
    user_id = _current_user_id()
    crop    = Crop.query.get_or_404(crop_id)

    if crop.farmer_id != user_id:
        return api_response(success=False, error="Unauthorized", status=403)

    live = Interest.query.filter(
        Interest.crop_id == crop_id,
        Interest.status.in_(["pending", "negotiating", "accepted"]),
    ).first()
    if live:
        return api_response(success=False, error="Cannot remove a crop with live or accepted deals.", status=409)

    db.session.delete(crop)
    db.session.commit()
    return api_response(data={"message": "Crop permanently deleted"})


@app.route("/api/marketplace/crops", methods=["GET"])
@jwt_required()
def list_marketplace_crops():
    """Crops available for contractors to browse (active/partially_sold only, not their own)."""
    user_id = _current_user_id()
    crops = Crop.query.filter(
        Crop.status.in_(["active", "partially_sold"]),
        Crop.farmer_id != user_id,
    ).order_by(Crop.created_at.desc()).all()
    return api_response(data=[c.to_dict() for c in crops])


@app.route("/api/interests", methods=["POST"])
@jwt_required()
@with_db_retry()
def create_interest():
    user_id = _current_user_id()
    if _current_user_role() != "contractor":
        return api_response(success=False, error="Only contractors can show interest", status=403)

    data    = request.get_json()
    crop_id = data.get("crop_id")
    if not crop_id:
        return api_response(success=False, error="crop_id is required", status=400)

    crop = Crop.query.get_or_404(crop_id)
    if crop.farmer_id == user_id:
        return api_response(success=False, error="Cannot show interest in your own crop", status=400)

    if crop.status in ("sold", "removed"):
        return api_response(success=False, error=f"This crop is no longer available ({crop.status})", status=409)

    available_qty = crop.effective_quantity()
    if available_qty <= 0:
        return api_response(success=False, error="No quantity remaining on this crop", status=409)

    existing = Interest.query.filter_by(crop_id=crop.id, contractor_id=user_id).first()
    if existing:
        if existing.status != "rejected":
            return api_response(success=False, error="Active interest already exists", status=409)

        new_qty = int(data.get("quantity", available_qty))
        if new_qty <= 0:
            return api_response(success=False, error="Quantity must be greater than zero", status=400)
        if new_qty > available_qty:
            return api_response(success=False, error=f"Requested quantity exceeds available ({available_qty}q)", status=400)

        existing.quantity_requested = new_qty
        existing.price_offered      = float(data.get("price", crop.price))
        if existing.price_offered < 0:
            return api_response(success=False, error="Price cannot be negative", status=400)
        existing.status             = "pending"
        existing.accepted_by        = None
        existing.created_at         = datetime.utcnow()
        db.session.commit()
        return api_response(data={"message": "Interest re-submitted", "interest_id": existing.id})

    qty_req = int(data.get("quantity", available_qty))
    if qty_req <= 0:
        return api_response(success=False, error="Requested quantity must be greater than zero", status=400)
    if qty_req > available_qty:
        return api_response(success=False, error=f"Requested quantity exceeds available ({available_qty}q)", status=400)

    interest = Interest(
        crop_id            = crop.id,
        farmer_id          = crop.farmer_id,
        contractor_id      = user_id,
        quantity_requested = qty_req,
        price_offered      = float(data.get("price", crop.price)),
        message            = data.get("message", ""),
        status             = "pending",
    )
    db.session.add(interest)
    db.session.commit()
    return api_response(data={"message": "Interest sent", "interest_id": interest.id}, status=201)
@app.route("/api/interests/details/<int:interest_id>", methods=["GET"])
@jwt_required()
def get_interest_details(interest_id):
    user_id = _current_user_id()
    i       = Interest.query.get_or_404(interest_id)

    if i.farmer_id != user_id and i.contractor_id != user_id:
        return api_response(success=False, error="Unauthorized", status=403)

    farmer_phone = i.crop.farmer.phone if i.status == "accepted" else None

    return api_response(data={
        "id":               i.id,
        "crop_id":          i.crop_id,
        "crop_name":        i.crop.crop_name,
        "quantity_requested": i.quantity_requested,
        "quantity_available": i.crop.effective_quantity(),
        "price_offered":    i.price_offered,
        "original_price":   i.crop.price,
        "location":         i.crop.location,
        "availability_date": i.crop.availability_date.isoformat() if i.crop.availability_date else None,
        "status":           i.status,
        "message":          i.message,
        "farmer_id":        i.farmer_id,
        "contractor_id":    i.contractor_id,
        "farmer_name":      i.crop.farmer.name if i.crop.farmer else None,
        "farmer_phone":     farmer_phone,
        "contractor_name":  i.contractor.name if i.contractor else None,
        "viewer_role":      "farmer" if i.farmer_id == user_id else "contractor",
        "accepted_by":      i.accepted_by,
    })


@app.route("/api/interests/farmer", methods=["GET"])
@jwt_required()
def farmer_interests():
    user_id   = _current_user_id()
    interests = Interest.query.join(Crop).filter(Crop.farmer_id == user_id).all()
    result    = []
    for i in interests:
        result.append({
            "id":               i.id,
            "crop_id":          i.crop_id,
            "crop_name":        i.crop.crop_name,
            "quantity_requested": i.quantity_requested,
            "quantity_available": i.crop.effective_quantity(),
            "price_offered":    i.price_offered,
            "original_price":   i.crop.price,
            "status":           i.status,
            "message":          i.message,
            "contractor_name":  i.contractor.name if i.contractor else None,
            "contractor_phone": i.contractor.phone if i.contractor else None,
            "accepted_by":      i.accepted_by,
        })
    return api_response(data=result)


@app.route("/api/interests/contractor", methods=["GET"])
@jwt_required()
def contractor_interests():
    user_id   = _current_user_id()
    interests = Interest.query.filter_by(contractor_id=user_id).all()
    result    = []
    for i in interests:
        # FIX (BUG-07): Phone only after full acceptance
        farmer_phone = None
        if i.status == "accepted" and i.crop and i.crop.farmer:
            farmer_phone = i.crop.farmer.phone
        result.append({
            "id":               i.id,
            "crop_id":          i.crop_id,
            "crop_name":        i.crop.crop_name if i.crop else "Unknown",
            "quantity_requested": i.quantity_requested,
            "price_offered":    i.price_offered,
            "message":          i.message,
            "status":           i.status,
            "farmer_phone":     farmer_phone,
            "accepted_by":      i.accepted_by,
        })
    return api_response(data=result)


# ─────────────────────────────────────────────────────────────────────────────
# STATUS UPDATES
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/interests/<int:interest_id>/accept", methods=["POST"])
@jwt_required()
@with_db_retry()
def accept_interest(interest_id):
    user_id = _current_user_id()
    
    try:
        # Use top-level atomic transaction (commits on exit, rolls back on error)
        with db.session.begin():
            # 1. Lock Interest and Crop records
            i = Interest.query.filter_by(id=interest_id).with_for_update().first()
            if not i:
                return api_response(success=False, error="Interest not found", status=404)
            
            crop = Crop.query.filter_by(id=i.crop_id).with_for_update().first()
            if not crop:
                return api_response(success=False, error="Crop missing", status=500)

            if user_id not in (i.farmer_id, i.contractor_id):
                return api_response(success=False, error="Unauthorized", status=403)

            # 2. Strict State Machine & Idempotency Check
            if i.status == "accepted":
                return api_response(success=False, error="Interest already accepted", status=400)
            if i.status == "rejected":
                return api_response(success=False, error="Cannot accept a rejected interest", status=400)

            actor = "farmer" if user_id == i.farmer_id else "contractor"
            other = "contractor" if actor == "farmer" else "farmer"

            if i.accepted_by == actor:
                return api_response(success=False, error="You have already accepted this deal", status=400)

            # 3. First Party Acceptance
            if i.accepted_by is None:
                _validate_status_transition(i, "negotiating") # Implicitly moves to negotiating state
                i.accepted_by = actor
                db.session.add(Message(
                    interest_id = i.id,
                    sender_id   = user_id,
                    content     = f"__SYSTEM__:{actor}_accepted",
                ))
                logger.info(f"[INTEREST_ACCEPT] {interest_id} partially accepted by {actor} ({user_id})")
                return api_response(data={"message": "Accepted by you", "interest_id": i.id})

            # 4. Dual Acceptance (Handshake)
            if i.accepted_by == other:
                available = crop.effective_quantity()
                qty_sold  = i.quantity_requested or 0

                # 4a. Overselling Prevention
                if qty_sold > available:
                    logger.error(f"Stock conflict on Interest {interest_id}: Requested {qty_sold}, Available {available}")
                    return api_response(success=False, error=f"Stock insufficient: {available}q remaining", status=409)

                # 4b. State Transition Validation
                _validate_status_transition(i, "accepted")

                # 4c. Finalize Deal
                i.accepted_by = "both"
                i.status      = "accepted"
                crop.quantity_remaining = available - qty_sold
                _recompute_crop_status(crop)

                # 4d. Auto-reject competing interests if sold out
                if crop.quantity_remaining == 0:
                    competing = Interest.query.filter(
                        Interest.crop_id == crop.id,
                        Interest.id      != i.id,
                        Interest.status.in_(["pending", "negotiating"]),
                    ).all()
                    for other_i in competing:
                        other_i.status      = "rejected"
                        other_i.accepted_by = None
                        db.session.add(Message(
                            interest_id = other_i.id,
                            sender_id   = user_id,
                            content     = "__SYSTEM__:rejected_crop_sold_out",
                        ))
                    logger.info(f"Crop {crop.id} sold out. Auto-rejected {len(competing)} interests.")

                db.session.add(Message(
                    interest_id = i.id,
                    sender_id   = user_id,
                    content     = "__SYSTEM__:deal_fully_accepted",
                ))
                
                logger.info(f"[INTEREST_FINAL] {interest_id} fully accepted")

        return api_response(data={"message": "Deal Finalized!", "interest_id": i.id})

    except ValueError as ve:
        return api_response(success=False, error=str(ve), status=400)
    except IntegrityError:
        logger.error(f"[INTEGRITY_ERROR] Interest {interest_id}")
        return api_response(success=False, error="Database conflict. Please retry.", status=409)
    except Exception as e:
        logger.error(f"[SYSTEM_ERROR] Interest {interest_id}: {str(e)}")
        return api_response(success=False, error="System error during acceptance.", status=500)


@app.route("/api/interests/<int:interest_id>/withdraw_accept", methods=["POST"])
@jwt_required()
@with_db_retry()
def withdraw_accept(interest_id):
    user_id = _current_user_id()
    try:
        with db.session.begin():
            i = Interest.query.filter_by(id=interest_id).with_for_update().first()
            if not i:
                return api_response(success=False, error="Interest not found", status=404)

            if i.farmer_id != user_id and i.contractor_id != user_id:
                return api_response(success=False, error="Unauthorized", status=403)

            if i.status == "accepted":
                return api_response(success=False, error="Deal fully confirmed - cannot withdraw", status=400)

            viewer_role = "farmer" if i.farmer_id == user_id else "contractor"
            if i.accepted_by != viewer_role:
                return api_response(success=False, error="You haven't accepted this deal", status=400)

            i.accepted_by = None
            db.session.add(Message(
                interest_id = i.id,
                sender_id   = user_id,
                content     = f"__SYSTEM__:withdrew_acceptance:{viewer_role}",
            ))
            logger.info(f"[INTEREST_WITHDRAW] {interest_id} by {user_id}")

        return api_response(data={"message": "Withdrawal successful"})
    except Exception as e:
        return api_response(success=False, error=str(e), status=500)


@app.route("/api/interests/<int:interest_id>/reject", methods=["POST"])
@jwt_required()
@with_db_retry()
def reject_interest(interest_id):
    user_id = _current_user_id()
    try:
        with db.session.begin():
            i = Interest.query.filter_by(id=interest_id).with_for_update().first()
            if not i:
                return api_response(success=False, error="Interest not found", status=404)

            if i.farmer_id != user_id and i.contractor_id != user_id:
                return api_response(success=False, error="Unauthorized", status=403)

            # Strict State Transition
            _validate_status_transition(i, "rejected")

            i.status      = "rejected"
            i.accepted_by = None
            _recompute_crop_status(i.crop)

            db.session.add(Message(
                interest_id = i.id,
                sender_id   = user_id,
                content     = "__SYSTEM__:rejected",
            ))
            logger.info(f"[INTEREST_REJECT] {interest_id} by {user_id}")

        return api_response(data={"message": "Rejected"})
    except ValueError as ve:
        return api_response(success=False, error=str(ve), status=400)
    except Exception as e:
        return api_response(success=False, error=str(e), status=500)


@app.route("/api/interests/<int:interest_id>/negotiate", methods=["POST"])
@jwt_required()
@with_db_retry()
def negotiate_interest(interest_id):
    user_id = _current_user_id()
    try:
        with db.session.begin():
            i = Interest.query.filter_by(id=interest_id).with_for_update().first()
            if not i:
                return api_response(success=False, error="Interest not found", status=404)

            if i.farmer_id != user_id:
                return api_response(success=False, error="Only the farmer can initiate negotiation", status=403)

            _validate_status_transition(i, "negotiating")

            i.status = "negotiating"
            db.session.add(Message(
                interest_id = i.id,
                sender_id   = user_id,
                content     = "__SYSTEM__:negotiating",
                is_read     = False,
            ))
            logger.info(f"[INTEREST_NEGOTIATE] {interest_id} by {user_id}")

        return api_response(data={"message": "Negotiation started"})
    except ValueError as ve:
        return api_response(success=False, error=str(ve), status=400)
    except Exception as e:
        return api_response(success=False, error=str(e), status=500)


@app.route("/api/interests/<int:interest_id>/counter_offer", methods=["POST"])
@jwt_required()
@with_db_retry()
def counter_offer(interest_id):
    user_id = _current_user_id()
    try:
        with db.session.begin():
            i = Interest.query.filter_by(id=interest_id).with_for_update().first()
            if not i:
                return api_response(success=False, error="Interest not found", status=404)

            if i.farmer_id != user_id and i.contractor_id != user_id:
                return api_response(success=False, error="Unauthorized", status=403)

            # Strict State Transition
            _validate_status_transition(i, "negotiating")

            data      = request.get_json()
            new_price = data.get("price")
            new_qty   = data.get("quantity")
            note      = data.get("note", "")

            if not new_price and not new_qty:
                return api_response(success=False, error="No price or quantity provided", status=400)

            if new_qty:
                new_qty_int = int(new_qty)
                if new_qty_int <= 0:
                    return api_response(success=False, error="Quantity must be positive", status=400)
                
                available = i.crop.effective_quantity()
                if new_qty_int > available:
                    return api_response(success=False, error=f"Qty exceeds stock ({available}q)", status=400)
                i.quantity_requested = new_qty_int

            if new_price:
                new_price_val = float(new_price)
                if new_price_val <= 0:
                    return api_response(success=False, error="Price must be positive", status=400)
                i.price_offered = new_price_val

            # Reset acceptance on counter-offer
            i.accepted_by = None
            i.status      = "negotiating"

            parts = []
            if new_price: parts.append(f"price:₹{new_price}/q")
            if new_qty:   parts.append(f"qty:{new_qty}q")
            if note:      parts.append(f"note:{note}")

            db.session.add(Message(
                interest_id = i.id,
                sender_id   = user_id,
                content     = "__COUNTER__:" + "|".join(parts),
            ))
            logger.info(f"[INTEREST_COUNTER] {interest_id} by {user_id}")

        return api_response(data={"message": "Counter offer sent"})
    except ValueError as ve:
        return api_response(success=False, error=str(ve), status=400)
    except Exception as e:
        return api_response(success=False, error=str(e), status=500)


@app.route("/api/interests/<int:interest_id>/withdraw", methods=["POST"])
@jwt_required()
@with_db_retry()
def withdraw_interest(interest_id):
    """
    NEW ENDPOINT (MISSING RULE 5): Allows a contractor to withdraw a pending
    interest they submitted. Prevents the contractor from being stuck forever
    in "already shown interest" limbo if the farmer never responds.
    Only allowed when status == "pending" (before any negotiation begins).
    """
    user_id = _current_user_id()
    i       = Interest.query.get_or_404(interest_id)
    if i.contractor_id != user_id:
        return api_response(success=False, error="Only the contractor who submitted can withdraw", status=403)

    if i.status != "pending":
        return api_response(success=False, 
                            error=f"Can only withdraw a pending interest (current status: {i.status}). Use withdraw_accept if you have already accepted.", 
                            status=400)

    i.status      = "rejected"
    i.accepted_by = None
    _recompute_crop_status(i.crop)
    db.session.commit()
    return api_response(data={"message": "Interest withdrawn"})


# ─────────────────────────────────────────────────────────────────────────────
# MESSAGE APIs
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/messages/conversations", methods=["GET"])
@jwt_required()
def get_conversations():
    user_id = _current_user_id()

    interests = Interest.query.filter(
        (Interest.farmer_id == user_id) | (Interest.contractor_id == user_id),
        Interest.status.in_(["pending", "negotiating", "accepted", "rejected"]),
    ).all()

    conversations = []
    for interest in interests:
        if interest.status == "rejected":
            if not Message.query.filter_by(interest_id=interest.id).first():
                continue

        other_id   = interest.contractor_id if interest.farmer_id == user_id else interest.farmer_id
        other_user = User.query.get(other_id)
        last_msg   = Message.query.filter_by(interest_id=interest.id)\
                                  .order_by(Message.created_at.desc()).first()
        unread     = Message.query.filter_by(interest_id=interest.id, is_read=False)\
                                  .filter(Message.sender_id != user_id).count()

        other_phone = other_user.phone if (other_user and interest.status == "accepted") else None
        preview     = _strip_system_prefix(last_msg.content if last_msg else None)

        conversations.append({
            "interest_id":      interest.id,
            "crop_id":          interest.crop_id,
            "crop_name":        interest.crop.crop_name,
            "status":           interest.status,
            "accepted_by":      interest.accepted_by,
            "other_user_id":    other_id,
            "other_user_name":  other_user.name if other_user else "Unknown",
            "other_user_phone": other_phone,
            "last_message":     preview,
            "last_message_time": last_msg.created_at.isoformat() if last_msg else None,
            "unread_count":     unread,
            # Deal Metadata for Status Bar
            "farmer_id":          interest.farmer_id,
            "contractor_id":      interest.contractor_id,
            "price_offered":      interest.price_offered,
            "quantity_requested": interest.quantity_requested,
        })

    conversations.sort(key=lambda c: c["last_message_time"] or "", reverse=True)
    return api_response(data=conversations)


@app.route("/api/messages/unread-count", methods=["GET"])
@jwt_required()
def get_unread_count():
    user_id   = _current_user_id()
    interests = Interest.query.filter(
        (Interest.farmer_id == user_id) | (Interest.contractor_id == user_id),
        Interest.status.in_(["pending", "negotiating", "accepted"]),
    ).all()
    total = sum(
        Message.query.filter_by(interest_id=i.id, is_read=False)
                     .filter(Message.sender_id != user_id).count()
        for i in interests
    )
    return api_response(data={"unread_count": total})


@app.route("/api/messages/interest/<int:interest_id>", methods=["GET"])
@jwt_required()
def get_messages(interest_id):
    user_id  = _current_user_id()
    interest = Interest.query.get_or_404(interest_id)

    if interest.farmer_id != user_id and interest.contractor_id != user_id:
        return api_response(success=False, error="Unauthorized", status=403)

    since_id = request.args.get("since_id", type=int)
    
    query = Message.query.filter_by(interest_id=interest_id)
    if since_id:
        query = query.filter(Message.id > since_id)
    
    messages = query.order_by(Message.created_at.asc()).all()
    
    for msg in messages:
        if msg.sender_id != user_id and not msg.is_read:
            msg.is_read = True
    
    if messages:
        db.session.commit()
        
    return api_response(data=[m.to_dict() for m in messages])


@app.route("/api/messages/send", methods=["POST"])
@jwt_required()
@with_db_retry()
def send_message():
    user_id = _current_user_id()
    data    = request.get_json()

    interest_id = data.get("interest_id")
    content     = data.get("content", "").strip()
    nonce       = data.get("nonce") # Rule: Use nonce for guaranteed idempotency

    if not interest_id or not content:
        return api_response(success=False, error="interest_id and content are required", status=400)

    # 1. Idempotency Guard (Nonce check)
    if nonce:
        existing = Message.query.filter_by(nonce=nonce).first()
        if existing:
            logger.info(f"[MSG_DEDUP] Nonce {nonce} already exists")
            return api_response(data=existing.to_dict(), status=200)

    interest = Interest.query.get_or_404(int(interest_id))
    if interest.farmer_id != user_id and interest.contractor_id != user_id:
        return api_response(success=False, error="Unauthorized", status=403)

    # 2. Simple Save Pattern (Ultra-compatible)
    msg = Message(
        interest_id = int(interest_id), 
        sender_id   = int(user_id), 
        content     = str(content), 
        is_read     = False, 
        nonce       = nonce
    )
    db.session.add(msg)
    db.session.commit()
    
    logger.info(f"[MSG_CREATED] User {user_id} -> Interest {interest_id}")
    return api_response(data=msg.to_dict(), status=201)


# ─────────────────────────────────────────────────────────────────────────────
# CHATBOT
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/chat", methods=["POST"])
def chat():
    data       = request.get_json() or {}
    session_id = request.headers.get("X-Session-ID", "default")
    session    = CHAT_SESSIONS[session_id]

    lang  = data.get("lang") or session["context"].get("lang") or "en"
    session["context"]["lang"] = lang

    action     = data.get("action")
    value      = data.get("value")
    text_input = data.get("text")

    if action == "BACK":
        session["state"] = "START"
        return jsonify(menu_start(lang))

    if action == "WEATHER_OTHER":
        session["state"] = "WEATHER_OTHER_INPUT"
        return jsonify({
            "message": get_text("ENTER_CITY", lang),
            "options": [{"label": get_text("BACK", lang), "action": "BACK"}],
            "input":   "text",
        })

    if session["state"] == "START":
        if not action:
            return jsonify(menu_start(lang))

        if action == "MSP":
            session["state"] = "MSP_CROP"
            return jsonify({
                "message": get_text("SELECT_MSP_CROP", lang),
                "options": [
                    {"label": get_crop_label(c, lang), "action": f"MSP_{c.upper()}", "value": c}
                    for c in CANONICAL_CROPS
                ] + [{"label": get_text("BACK", lang), "action": "BACK"}],
            })

        if action == "WEATHER":
            session["state"] = "WEATHER_CITY"
            return jsonify({
                "message": get_text("SELECT_WEATHER_CITY", lang),
                "options": [
                    {"label": get_city_label(city, lang), "action": "WEATHER_CITY", "value": city}
                    for city in CANONICAL_CITIES
                ] + [
                    {"label": get_text("OTHER_CITY", lang), "action": "WEATHER_OTHER"},
                    {"label": get_text("BACK", lang), "action": "BACK"},
                ],
            })

        if action == "ADVISORY":
            session["state"] = "ADV_CROP"
            return jsonify({
                "message": get_text("SELECT_ADVISORY_CROP", lang),
                "options": [
                    {"label": get_crop_label(crop, lang), "action": "ADV_CROP", "value": crop}
                    for crop in ADVISORY_DATA.keys()
                ] + [{"label": get_text("BACK", lang), "action": "BACK"}],
            })

        if action == "FERTILIZER":
            session["state"] = "FERT_CROP"
            return jsonify({
                "message": get_text("SELECT_FERTILIZER_CROP", lang),
                "options": [
                    {"label": get_crop_label(crop, lang), "action": "FERT_CROP", "value": crop}
                    for crop in FERTILIZER_DATA.keys()
                ] + [{"label": get_text("BACK", lang), "action": "BACK"}],
            })

        if action == "SCHEMES":
            session["state"] = "SCHEME_TYPE"
            return jsonify({
                "message": get_text("SELECT_SCHEME_TYPE", lang),
                "options": [
                    {"label": get_text("SCHEME_GENERAL",    lang), "action": "SCHEME_GENERAL"},
                    {"label": get_text("SCHEME_CROP_BASED", lang), "action": "SCHEME_CROP"},
                    {"label": get_text("BACK",              lang), "action": "BACK"},
                ],
            })

    if session["state"] == "MSP_CROP":
        crop  = value
        price = get_msp(crop)
        session["state"] = "START"
        msg = (
            get_text("MSP_NOT_AVAILABLE", lang).format(crop=get_crop_label(crop, lang))
            if not price
            else get_text("MSP_RESULT", lang).format(crop=get_crop_label(crop, lang), price=price)
        )
        return jsonify({"message": msg, "options": [{"label": get_text("MAIN_MENU", lang), "action": "BACK"}]})

    if session["state"] == "WEATHER_CITY":
        city    = normalize_city_input(text_input or value)
        weather = get_weather(city)
        session["state"] = "START"
        if not weather:
            return jsonify({"message": "Weather info unavailable.", "options": [{"label": get_text("MAIN_MENU", lang), "action": "BACK"}]})
        return jsonify({
            "message": f"Weather in {city.title()}:\nTemp: {weather['temperature']}°C\nCondition: {weather['condition']}",
            "options": [{"label": get_text("MAIN_MENU", lang), "action": "BACK"}],
        })

    if session["state"] == "WEATHER_OTHER_INPUT":
        city_query = text_input or value
        weather    = get_weather(city_query)
        if not weather:
            return jsonify({
                "message": f"Could not find weather for '{city_query}'. Please check the city name.",
                "options": [{"label": get_text("BACK", lang), "action": "BACK"}],
                "input":   "text",
            })
        session["state"] = "START"
        return jsonify({
            "message": f"Weather in {weather['location']}:\nTemp: {weather['temperature']}°C\nCondition: {weather['condition']}",
            "options": [{"label": get_text("MAIN_MENU", lang), "action": "BACK"}],
        })

    if session["state"] == "ADV_CROP":
        session["context"]["adv_crop"] = value
        session["state"] = "ADV_STAGE"
        return jsonify({
            "message": get_text("SELECT_CROP_STAGE", lang),
            "options": [
                {"label": get_text("STAGE_SOWING",  lang), "action": "ADV_STAGE", "value": "sowing"},
                {"label": get_text("STAGE_GROWTH",  lang), "action": "ADV_STAGE", "value": "growth"},
                {"label": get_text("STAGE_HARVEST", lang), "action": "ADV_STAGE", "value": "harvest"},
                {"label": get_text("BACK",          lang), "action": "BACK"},
            ],
        })

    if session["state"] == "ADV_STAGE":
        crop, stage = session["context"]["adv_crop"], value
        advice = (
            ADVISORY_DATA.get(crop, {}).get(stage, {}).get(lang)
            or ADVISORY_DATA.get(crop, {}).get(stage, {}).get("en", "No advice available.")
        )
        session["state"] = "START"
        return jsonify({"message": advice, "options": [{"label": get_text("MAIN_MENU", lang), "action": "BACK"}]})

    if session["state"] == "FERT_CROP":
        advice = (
            FERTILIZER_DATA.get(value, {}).get(lang)
            or FERTILIZER_DATA.get(value, {}).get("en", "No advice available.")
        )
        session["state"] = "START"
        return jsonify({"message": advice, "options": [{"label": get_text("MAIN_MENU", lang), "action": "BACK"}]})

    if session["state"] == "SCHEME_TYPE":
        if action == "SCHEME_GENERAL":
            session["state"] = "START"
            schemes  = SCHEMES_DATA["general"]
            msg_list = [
                f"🏛️ {s['name'].get(lang, s['name']['en'])}\n"
                f"{s['desc'].get(lang, s['desc']['en'])}\n"
                f"🔗 {s.get('url', '#')}"
                for s in schemes
            ]
            return jsonify({"message": "\n\n".join(msg_list), "options": [{"label": get_text("MAIN_MENU", lang), "action": "BACK"}]})

        if action == "SCHEME_CROP":
            session["state"] = "SCHEME_CROP_SELECT"
            return jsonify({
                "message": get_text("SELECT_SCHEME_CROP", lang),
                "options": [
                    {"label": get_crop_label(crop, lang), "action": "SCHEME_CROP_SELECT", "value": crop}
                    for crop in SCHEMES_DATA.keys() if crop != "general"
                ] + [{"label": get_text("BACK", lang), "action": "BACK"}],
            })

    if session["state"] == "SCHEME_CROP_SELECT":
        schemes = SCHEMES_DATA.get(value, [])
        session["state"] = "START"
        if not schemes:
            return jsonify({"message": "No specific schemes found.", "options": [{"label": get_text("MAIN_MENU", lang), "action": "BACK"}]})
        msg_list = [
            f"🌾 {s['name'].get(lang, s['name']['en'])}\n"
            f"{s['desc'].get(lang, s['desc']['en'])}\n"
            f"🔗 {s.get('url', '#')}"
            for s in schemes
        ]
        return jsonify({"message": "\n\n".join(msg_list), "options": [{"label": get_text("MAIN_MENU", lang), "action": "BACK"}]})

    session["state"] = "START"
    return jsonify(menu_start(lang))


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)