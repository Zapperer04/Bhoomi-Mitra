import os
import re
import hashlib
import logging
import time
from datetime import timedelta, date, datetime, timezone, timedelta as py_timedelta
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
from models import db, Crop, Interest, Message, User, Waitlist
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
load_dotenv(os.path.join(BASE_DIR, "Backend", ".env"), override=False)

import importlib
try:
    WhiteNoise = importlib.import_module("whitenoise").WhiteNoise
except ImportError:
    WhiteNoise = None
from sqlalchemy import event
from sqlalchemy.engine import Engine


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if "sqlite" in type(dbapi_connection).__module__:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


# TC-30/31/32: Expiry durations
OFFER_TIMEOUT_MINS = 60 # 60 mins for testing (prev 2), default 1440 (24h)
LISTING_TIMEOUT_DAYS = 7
CONFIRMATION_TIMEOUT_MINS = 4320 # 3 days (TC-41: Duration before a confirmed deal becomes 'disputed')

app = Flask(__name__)
STATIC_DIR = os.path.join(BASE_DIR, "static")
if WhiteNoise:
    # Industry-standard prefix to avoid routing collisions with API endpoints
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

# ── DATABASE PERFORMANCE & STABILITY ─────────────────────────────────────────
is_sqlite = "sqlite" in db_url
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_pre_ping": True,
    "pool_recycle": 280,
    "connect_args": {"timeout": 30} if is_sqlite else {"connect_timeout": 30}
}
# Required >= 32 chars for JWT to prevent InsecureKeyLengthWarning -> 502 crashes in strict envs
app.config["JWT_SECRET_KEY"]              = os.environ.get("JWT_SECRET_KEY", "fallback-dev-extra-long-secret-key-at-least-32-chars")
app.config["JWT_ACCESS_TOKEN_EXPIRES"]    = timedelta(days=30)

# ── ENVIRONMENT DETECTION ────────────────────────────────────────────────────
IS_DEV = os.environ.get("FLASK_ENV") == "development" or "localhost" in db_url or "127.0.0.1" in db_url
app.debug = IS_DEV
if IS_DEV:
    logger.info("🔧 Running in DEVELOPMENT mode (Debug Active)")
else:
    logger.info("🚀 Running in PRODUCTION mode")

db.init_app(app)
jwt = JWTManager(app)
app.register_blueprint(auth_bp, url_prefix="/auth")


# ── DB INIT (MOVED TO init_db.py) ───────────────────────────────────────────
# We No longer run migrations on EVERY startup to prevent Render 502 timeouts.
# Use 'python init_db.py' manually or in the build/release phase.
with app.app_context():
    # Only create tables if they don't exist, don't run heavy ALTERS here.
    db.create_all()


CHAT_SESSIONS = defaultdict(lambda: {"state": "START", "context": {"lang": "en"}, "last_activity": time.time()})

# ── HEALTH CHECK (VITAL FOR RENDER STABILITY) ──────────────────────────────
@app.route("/health")
def health():
    """Lightweight endpoint for Render health checks to prevent 502s."""
    return jsonify({"status": "healthy", "timestamp": time.time()}), 200


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


def transition_interest(interest, action, actor_role, new_price=None, new_qty=None, delivery=None, payment=None, note=None):
    if interest.status in ["accepted", "rejected", "completed", "disputed"]:
        raise ValueError("Deal in terminal state")

    interest.last_activity_at = datetime.now(timezone.utc) # Refresh expiry timer on ANY action

    # ── COUNTER ─────────────────────────────
    if action == "counter":
        if not new_price or not new_qty or float(new_price) <= 0 or int(new_qty) <= 0:
            raise ValueError("Invalid counter values")

        # Counter-offer quantity cannot exceed currently available stock.
        available_qty = interest.crop.effective_quantity()
        if int(new_qty) > available_qty:
            raise ValueError(f"Quantity requested ({new_qty}) cannot exceed available stock ({available_qty})")

        interest.price_offered = float(new_price)
        interest.quantity_requested = int(new_qty)
        interest.status = "negotiating"
        interest.accepted_by = None

        # Build richer counter-offer string
        # Format: __COUNTER__:price:qty:delivery:payment:note
        d_terms = (delivery or "Not specified").replace(":", "-").replace("|", "-")
        p_terms = (payment or "Not specified").replace(":", "-").replace("|", "-")
        n_text  = (note or "").replace(":", "-").replace("|", "-")
        
        return f"__COUNTER__:{new_price}:{new_qty}:{d_terms}:{p_terms}:{n_text}"

    # ── ACCEPT ─────────────────────────────
    if action == "accept":
        if interest.accepted_by is None:
            interest.accepted_by = actor_role
            interest.status = "negotiating"
            return f"__SYSTEM__:{actor_role}_accepted"

        if interest.accepted_by != actor_role:
            interest.accepted_by = "both"
            interest.status = "accepted"
            finalize_transaction_safe(interest)
            return "__SYSTEM__:deal_fully_accepted"
        return None  # ignore duplicate

    # ── REJECT ─────────────────────────────
    if action == "reject":
        interest.status = "rejected"
        interest.accepted_by = None
        return "__SYSTEM__:rejected"

    # ── WITHDRAW (contractor cancels their interest entirely) ───────────────────
    # Case A: withdraw a pending/negotiating interest → reject it outright
    # Case B: withdraw a partial acceptance → roll back to negotiating
    if action == "withdraw":
        if actor_role == "contractor":
            # TC-29: Recovery Logic - If a finalized deal is withdrawn, restore stock and re-activate listing
            if interest.status == "accepted":
                crop = interest.crop
                crop.quantity_remaining += interest.quantity_requested
                if crop.status in ["sold", "partially_sold"]:
                    crop.status = "active"
                
                # Notify waitlist members (TC-29)
                # For each waitlist entry, find the corresponding (rejected) interest and send a message.
                waitlist_entries = Waitlist.query.filter_by(crop_id=crop.id).all()
                for entry in waitlist_entries:
                    # Find the interest for this user on this crop
                    sub_i = Interest.query.filter_by(crop_id=crop.id, contractor_id=entry.user_id).first()
                    if sub_i:
                        db.session.add(Message(
                            interest_id=sub_i.id,
                            sender_id=interest.farmer_id, # From the farmer's perspective
                            content="__SYSTEM__:listing_reactivated"
                        ))

                interest.status = "rejected"
                interest.accepted_by = None
                return "__SYSTEM__:contractor_withdrew_finalized"

            # Full withdrawal — contractor pulls out entirely
            if interest.status in ["pending", "negotiating"]:
                interest.status = "rejected"
                interest.accepted_by = None
                return "__SYSTEM__:contractor_withdrew"
            return None
        else:
            # Farmer withdrawing their own partial acceptance
            if interest.accepted_by == actor_role:
                interest.accepted_by = None
                interest.status = "negotiating"
                return f"__SYSTEM__:withdrew_acceptance:{actor_role}"
            return None

    raise ValueError("Invalid action")


def finalize_transaction_safe(interest):
    crop = Crop.query.with_for_update().get(interest.crop_id)
    if interest.accepted_by != "both":
        raise ValueError("Invalid finalize state")

    if crop.quantity_remaining < interest.quantity_requested:
        raise ValueError("Insufficient stock")

    crop.quantity_remaining -= interest.quantity_requested
    if crop.quantity_remaining == 0:
        crop.status = "sold"
        auto_reject_safe(crop.id)
    else:
        crop.status = "partially_sold"
    interest.finalized_at = datetime.now(timezone.utc)


LAST_EXPIRY_CHECK = 0
EXPIRY_CHECK_INTERVAL = 60 # Check at most once per minute
_EXTENDED_INTEREST_STATUS_SUPPORTED = None


def _supports_extended_interest_statuses():
    """
    Backward-compatibility for older SQLite schemas where ck_interest_status_valid
    may only allow pending/negotiating/accepted/rejected.
    """
    global _EXTENDED_INTEREST_STATUS_SUPPORTED
    if _EXTENDED_INTEREST_STATUS_SUPPORTED is not None:
        return _EXTENDED_INTEREST_STATUS_SUPPORTED

    if not is_sqlite:
        _EXTENDED_INTEREST_STATUS_SUPPORTED = True
        return True

    try:
        create_sql = db.session.execute(
            text("SELECT sql FROM sqlite_master WHERE type='table' AND name='interests'")
        ).scalar() or ""
        lowered = create_sql.lower()
        _EXTENDED_INTEREST_STATUS_SUPPORTED = ("'completed'" in lowered and "'disputed'" in lowered)
    except Exception:
        # Fail open to avoid blocking flow on metadata lookup issues.
        _EXTENDED_INTEREST_STATUS_SUPPORTED = True

    return _EXTENDED_INTEREST_STATUS_SUPPORTED

def check_expirations():
    """Lazy cleanup for expired crops and interests. Throttled to prevent DB thrashing."""
    global LAST_EXPIRY_CHECK
    now_ts = time.time()
    
    if now_ts - LAST_EXPIRY_CHECK < EXPIRY_CHECK_INTERVAL:
        return
    
    LAST_EXPIRY_CHECK = now_ts
    from datetime import timezone
    now = datetime.now(timezone.utc)

    # 1. Expire Crops (TC-32)
    expired_crops = Crop.query.filter(
        Crop.status.in_(["active", "partially_sold"]),
        Crop.expires_at < now
    ).all()
    for c in expired_crops:
        c.status = "expired"
        # Auto-reject all interests on this expired crop
        auto_reject_safe(c.id, reason="listing_expired")

    # 2. Time-out Interests (DISABLED — Let Farmer decide)
    # Previously, interests would auto-reject after OFFER_TIMEOUT_MINS.
    # This logic has been removed as per user request to allow manual decisions only.
    
    # 3. Time-out Accepted Deals to Disputed (TC-41)
    dispute_limit = now - timedelta(minutes=CONFIRMATION_TIMEOUT_MINS)
    stale_accepted = Interest.query.filter(
        Interest.status == "accepted",
        Interest.finalized_at < dispute_limit,
        db.or_(Interest.payment_confirmed_at.is_(None), Interest.goods_confirmed_at.is_(None))
    ).all()

    for i in stale_accepted:
        if _supports_extended_interest_statuses():
            i.status = "disputed"
        db.session.add(Message(
            interest_id=i.id,
            sender_id=i.farmer_id,
            content="__SYSTEM__:deal_disputed"
        ))

    # FIXED: removed stale_interests from condition since that block is disabled
    if expired_crops or stale_accepted:
        db.session.commit()

def auto_reject_safe(crop_id, reason="auto_rejected_sold_out"):
    others = Interest.query.filter(
        Interest.crop_id == crop_id,
        Interest.status.in_(["pending", "negotiating"])
    ).all()
    for i in others:
        if i.status != "rejected":
            i.status = "rejected"
            i.accepted_by = None
            db.session.add(Message(
                interest_id=i.id,
                sender_id=i.farmer_id,
                content=f"__SYSTEM__:{reason}"
            ))


def _strip_system_prefix(content: str) -> str:
    """Return a human-readable sidebar preview for system/counter messages."""
    if not content:
        return "No messages yet"
    if content.startswith("__SYSTEM__:"):
        tag = content[len("__SYSTEM__:"):]
        labels = {
            "interest_submitted":            "📋 Interest submitted",
            "farmer_accepted":               "✅ Farmer accepted the deal",
            "contractor_accepted":           "✅ Contractor accepted the deal",
            "deal_fully_accepted":           "🎉 Deal confirmed by both parties",
            "rejected":                      "❌ Deal rejected",
            "rejected_crop_sold_out":        "❌ Rejected — crop sold out",
            "auto_rejected_sold_out":        "❌ Crop sold out — interest closed",
            "crop_listing_removed":          "❌ Crop listing removed by farmer",
            "contractor_withdrew":           "↩️ Contractor withdrew their interest",
            "negotiating":                   "💬 Farmer opened negotiation",
            "withdrew_acceptance:farmer":    "↩️ Farmer withdrew acceptance",
            "withdrew_acceptance:contractor":"↩️ Contractor withdrew acceptance",
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


@app.route("/api/waitlist/join", methods=["POST"])
@jwt_required()
def join_waitlist():
    user_id = _current_user_id()
    data = request.get_json()
    crop_id = data.get("crop_id")
    
    if not crop_id:
        return api_response(False, error="Missing crop_id", status=400)
    
    existing = Waitlist.query.filter_by(crop_id=crop_id, user_id=user_id).first()
    if existing:
        return api_response(True, data={"message": "Already on waitlist"})
    
    db.session.add(Waitlist(crop_id=crop_id, user_id=user_id))
    db.session.commit()
    return api_response(True, data={"message": "Joined waitlist"})


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

        crop_name = data.get("cropName", "Unknown Crop").strip()[:100]
        location  = data.get("location", "Not specified").strip()[:200]
        user_id   = _current_user_id()

        # ── EXACT DUPLICATE CHECK (DISABLED BLOCKING) ──────────────────────────
        # Downgraded to a simple logger warning to prevent any blocking of legitimate posts.
        exact_duplicate = Crop.query.filter(
            Crop.farmer_id         == user_id,
            Crop.status.in_(["active", "partially_sold"]),
            db.func.lower(Crop.crop_name) == crop_name.lower(),
            Crop.quantity          == qty,
            Crop.price             == prc,
            db.func.lower(Crop.location) == location.lower(),
            Crop.availability_date == avail_date,
        ).first()

        if exact_duplicate:
            logger.warning(f"[DUPLICATE_ATTEMPT] Farmer {user_id} is posting an identical crop {crop_name}. Allowing anyway.")
        # ── END DUPLICATE CHECK ────────────────────────────────────────────────

        crop = Crop(
            farmer_id          = user_id,
            crop_name          = crop_name,
            quantity           = qty,
            quantity_remaining = qty,
            price              = prc,
            availability_date  = avail_date,
            location           = location,
            status             = "active",
            expires_at         = datetime.now(timezone.utc) + timedelta(days=LISTING_TIMEOUT_DAYS)
        )
        db.session.add(crop)
        db.session.commit()
        logger.info(f"[CROP_POSTED] Farmer {user_id} posted {crop.crop_name}")
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
    check_expirations()
    user_id = _current_user_id()
    crops   = Crop.query.filter_by(farmer_id=user_id).all()
    results = []
    for c in crops:
        d = c.to_dict()
        d["waitlist_count"] = Waitlist.query.filter_by(crop_id=c.id).count()
        results.append(d)
    return api_response(data=results)


@app.route("/api/crops/<int:crop_id>", methods=["DELETE"])
@jwt_required()
@with_db_retry()
def delete_crop(crop_id):
    user_id = _current_user_id()
    crop    = Crop.query.get_or_404(crop_id)

    if crop.farmer_id != user_id:
        return api_response(success=False, error="Unauthorized", status=403)

    if crop.status in ("sold", "removed"):
        return api_response(success=False, error="Crop is already sold or removed", status=409)

    # We allow removal even if 'accepted' deals exist (Partial Sale Case). 
    # Finalized transactions are preserved, we just stop the listing for the remaining stock.

    # Only then auto-reject open interests
    open_interests = Interest.query.filter(
        Interest.crop_id == crop_id,
        Interest.status.in_(["pending", "negotiating"]),
    ).all()
    for i in open_interests:
        i.status = "rejected"
        i.accepted_by = None
        db.session.add(Message(
            interest_id=i.id,
            sender_id=i.farmer_id,
            content="__SYSTEM__:crop_listing_removed"
        ))

    crop.status = "removed"
    db.session.commit()
    return api_response(data={"message": "Crop listing removed. All pending interests have been notified."})


@app.route("/api/crops/<int:crop_id>/hard", methods=["DELETE"])
@jwt_required()
@with_db_retry()
def hard_delete_crop(crop_id):
    user_id = _current_user_id()
    crop    = Crop.query.get_or_404(crop_id)

    if crop.farmer_id != user_id:
        return api_response(success=False, error="Unauthorized", status=403)

    # Only block if there is a live (not yet closed) deal
    # Rejected, completed, disputed interests are safe to delete with the crop
    live = Interest.query.filter(
        Interest.crop_id == crop_id,
        Interest.status.in_(["pending", "negotiating", "accepted"]),
    ).first()
    if live:
        return api_response(
            success=False,
            error="Cannot delete a crop with an active or accepted deal. Close the deal first.",
            status=409
        )

    # Only allow hard delete on history crops (removed, sold, expired)
    if crop.status not in ("removed", "sold", "expired"):
        return api_response(
            success=False,
            error="Only removed, sold, or expired crops can be permanently deleted.",
            status=409
        )

    db.session.delete(crop)
    db.session.commit()
    return api_response(data={"message": "Crop permanently deleted"})


@app.route("/api/crops/<int:crop_id>", methods=["PUT"])
@jwt_required()
@with_db_retry()
def update_crop(crop_id):
    user_id = _current_user_id()
    crop    = Crop.query.get_or_404(crop_id)
    if crop.farmer_id != user_id:
        return api_response(success=False, error="Unauthorized", status=403)
    
    data = request.get_json()
    new_price = float(data.get("price", crop.price))
    new_qty   = int(data.get("quantity", crop.quantity))
    
    # Validation
    if new_qty <= 0 or new_price < 0:
        return api_response(success=False, error="Invalid quantity or price", status=400)

    active_interests = Interest.query.filter(
        Interest.crop_id == crop_id,
        Interest.status.in_(["pending", "negotiating"])
    ).all()

    force_edit = data.get("force", False)
    if active_interests and not force_edit:
        return api_response(
            success=False,
            error=f"{len(active_interests)} contractors have active interests. Editing will void them.",
            status=409,
            data={"active_count": len(active_interests)}
        )

    # TC-36: If price changed and there are interests, void them
    price_changed = abs(new_price - crop.price) > 0.01
    if active_interests and price_changed:
        for i in active_interests:
            i.status = "rejected"
            i.accepted_by = None
            db.session.add(Message(
                interest_id=i.id,
                sender_id=i.farmer_id,
                content="__SYSTEM__:listing_price_changed_voided"
            ))
    
    # TC-37: If qty reduced below what's requested in active deals, flag them
    # Legacy rows may have NULL quantity_remaining; treat as unsold baseline.
    qty_remaining = crop.quantity_remaining if crop.quantity_remaining is not None else crop.quantity
    old_sold = max(0, crop.quantity - qty_remaining)
    if new_qty < old_sold:
        return api_response(
            success=False,
            error=f"Quantity cannot be set below already sold amount ({old_sold})",
            status=400
        )

    # Update logic for quantity_remaining
    crop.quantity = new_qty
    crop.quantity_remaining = max(0, new_qty - old_sold)
    crop.price = new_price
    
    if active_interests:
        for i in active_interests:
            if i.status != "rejected" and i.quantity_requested > crop.quantity_remaining:
                 db.session.add(Message(
                     interest_id=i.id,
                     sender_id=i.farmer_id,
                     content="__SYSTEM__:qty_correction_required"
                 ))

    db.session.commit()
    return api_response(data={"message": "Listing updated", "crop": crop.to_dict()})


@app.route("/api/marketplace/crops", methods=["GET"])
@jwt_required()
def list_marketplace_crops():
    check_expirations()
    """Crops available for contractors to browse (active/partially_sold only, not their own)."""
    user_id = _current_user_id()
    # Exclude crops where the user already has an active/pending interest
    interested_crop_ids = select(Interest.crop_id).where(
        Interest.contractor_id == user_id,
        Interest.status != "rejected"
    )

    crops = Crop.query.filter(
        Crop.status.in_(["active", "partially_sold"]),
        Crop.farmer_id != user_id,
        ~Crop.id.in_(interested_crop_ids)
    ).order_by(Crop.created_at.desc()).all()
    # Filter out zero-quantity rows defensively; expose farmer_name but NOT farmer_phone
    result = []
    for c in crops:
        if c.effective_quantity() <= 0:
            continue
        d = c.to_dict()
        d["farmer_name"] = c.farmer.name if c.farmer else None
        
        # TC-28: Waitlist status for the current user
        d["waitlisted"] = Waitlist.query.filter_by(crop_id=c.id, user_id=user_id).first() is not None
        result.append(d)
    return api_response(data=result)


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
        db.session.add(Message(
            interest_id = existing.id,
            sender_id   = user_id,
            content     = "__SYSTEM__:interest_submitted",
            is_read     = False,
        ))
        db.session.commit()
        return api_response(data={"message": "Interest re-submitted", "interest_id": existing.id})

    qty_req = int(data.get("quantity", 0))
    if qty_req <= 0:
        return api_response(success=False, error="Quantity must be greater than zero", status=400)
    
    # TC-34: Proposed quantity cannot exceed remaining stock
    if qty_req > crop.effective_quantity():
        return api_response(
            success=False, 
            error=f"Cannot request {qty_req} units. Only {crop.effective_quantity()} units are remaining.",
            status=400
        )

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
    db.session.flush()  # get interest.id before adding message
    db.session.add(Message(
        interest_id = interest.id,
        sender_id   = user_id,
        content     = "__SYSTEM__:interest_submitted",
        is_read     = False,
    ))
    db.session.commit()
    return api_response(data={"message": "Interest sent", "interest_id": interest.id}, status=201)
@app.route("/api/interests/details/<int:interest_id>", methods=["GET"])
@jwt_required()
def get_interest_details(interest_id):
    check_expirations()
    user_id = _current_user_id()
    i       = Interest.query.get_or_404(interest_id)

    if i.farmer_id != user_id and i.contractor_id != user_id:
        return api_response(success=False, error="Unauthorized", status=403)

    # Phone only revealed when deal is fully closed by BOTH parties
    farmer_phone = None
    if i.status == "accepted" and i.accepted_by == "both" and i.crop and i.crop.farmer:
        farmer_phone = i.crop.farmer.phone

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
    check_expirations()
    user_id   = _current_user_id()
    interests = Interest.query.join(Crop).filter(Crop.farmer_id == user_id).all()
    result    = []
    for i in interests:
        # Contractor phone only after full deal close
        contractor_phone = None
        if i.status == "accepted" and i.accepted_by == "both" and i.contractor:
            contractor_phone = i.contractor.phone
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
            "contractor_phone": contractor_phone,
            "accepted_by":      i.accepted_by,
        })
    return api_response(data=result)


@app.route("/api/interests/contractor", methods=["GET"])
@jwt_required()
def contractor_interests():
    check_expirations()
    user_id   = _current_user_id()
    interests = Interest.query.filter_by(contractor_id=user_id).all()
    result    = []
    for i in interests:
        # Phone only revealed when deal is fully closed by BOTH parties
        farmer_phone = None
        if i.status == "accepted" and i.accepted_by == "both" and i.crop and i.crop.farmer:
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

@app.route("/api/interests/action", methods=["POST"])
@jwt_required()
@with_db_retry()
def interest_action():
    try:
        data = request.get_json()
        interest_id = data.get("interest_id")
        action      = data.get("action")
        price       = data.get("price")
        qty         = data.get("quantity")
        delivery    = data.get("delivery")
        payment     = data.get("payment")
        note        = data.get("note")

        interest = Interest.query.get_or_404(interest_id)

        user_id   = _current_user_id()
        user_role = _current_user_role()

        if user_id not in [interest.farmer_id, interest.contractor_id]:
            return api_response(False, error="Unauthorized", status=403)

        msg_content = transition_interest(
            interest,
            action,
            user_role,
            new_price=price,
            new_qty=qty,
            delivery=delivery,
            payment=payment,
            note=note
        )

        # 🔥 DUPLICATE MESSAGE PROTECTION
        if msg_content:
            last_msg = Message.query.filter_by(
                interest_id=interest.id
            ).order_by(Message.id.desc()).first()

            if not last_msg or last_msg.content != msg_content:
                db.session.add(Message(
                    interest_id=interest.id,
                    sender_id=user_id,
                    content=msg_content
                ))

        db.session.commit()
        return api_response(True, data={"status": interest.status})
    except Exception as e:
        db.session.rollback()
        return api_response(False, error=str(e), status=400)





# ─────────────────────────────────────────────────────────────────────────────
# MESSAGE APIs
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/messages/conversations", methods=["GET"])
@jwt_required()
def get_conversations():
    check_expirations()
    user_id = _current_user_id()

    from sqlalchemy import func

    interests = Interest.query.options(
        db.joinedload(Interest.crop).joinedload(Crop.farmer),
        db.joinedload(Interest.contractor)
    ).filter(
        (Interest.farmer_id == user_id) | (Interest.contractor_id == user_id),
        Interest.status.in_(["pending", "negotiating", "accepted", "rejected", "completed", "disputed"]),
    ).all()

    if not interests:
        return api_response(data=[])

    interest_ids = [i.id for i in interests]

    # Batch load unread counts: 1 query for all conversations
    unread_counts = db.session.query(
        Message.interest_id, func.count(Message.id)
    ).filter(
        Message.interest_id.in_(interest_ids),
        Message.is_read == False,
        Message.sender_id != user_id
    ).group_by(Message.interest_id).all()
    unread_map = dict(unread_counts)

    # Batch load last messages: 1 refined query
    # Using a subquery to find the latest message ID per interest
    last_msg_sub = db.session.query(
        Message.interest_id, func.max(Message.id).label("last_id")
    ).filter(Message.interest_id.in_(interest_ids)).group_by(Message.interest_id).subquery()

    last_messages = Message.query.filter(Message.id == last_msg_sub.c.last_id).all()
    msg_map = {m.interest_id: m for m in last_messages}

    conversations = []
    for interest in interests:
        # Rejected interests logic: only show if messages exist
        last_msg = msg_map.get(interest.id)
        if interest.status == "rejected" and not last_msg:
            continue

        other_id = interest.contractor_id if interest.farmer_id == user_id else interest.farmer_id
        
        phone_visible = interest.status == "accepted" and interest.accepted_by == "both"

        if interest.farmer_id == user_id:
            other_name = interest.contractor.name if interest.contractor else "Unknown"
            other_phone = interest.contractor.phone if (phone_visible and interest.contractor) else None
        else:
            other_name = interest.crop.farmer.name if (interest.crop and interest.crop.farmer) else "Unknown"
            other_phone = interest.crop.farmer.phone if (phone_visible and interest.crop and interest.crop.farmer) else None

        unread = unread_map.get(interest.id, 0)
        preview = _strip_system_prefix(last_msg.content if last_msg else None)

        conversations.append({
            "interest_id":      interest.id,
            "crop_id":          interest.crop_id,
            "crop_name":        interest.crop.crop_name if interest.crop else "Unknown",
            "status":           interest.status,
            "accepted_by":      interest.accepted_by,
            "other_user_id":    other_id,
            "other_user_name":  other_name,
            "other_user_phone": other_phone,
            "last_message":     preview,
            "last_message_time": last_msg.created_at.isoformat() if last_msg else None,
            "unread_count":     unread,
            "farmer_id":          interest.farmer_id,
            "contractor_id":      interest.contractor_id,
            "price_offered":      interest.price_offered,
            "quantity_requested": interest.quantity_requested,
            "original_price":     interest.crop.price if interest.crop else None,
            "original_quantity":  interest.crop.quantity if interest.crop else None,
        })

    conversations.sort(key=lambda c: c["last_message_time"] or "", reverse=True)
    return api_response(data=conversations)


@app.route("/api/messages/unread-count", methods=["GET"])
@jwt_required()
def get_unread_count():
    from sqlalchemy import func
    user_id = _current_user_id()
    
    # Efficient aggregation in 1 query
    unread = db.session.query(func.count(Message.id)).join(Interest).filter(
        (Interest.farmer_id == user_id) | (Interest.contractor_id == user_id),
        Interest.status.in_(["pending", "negotiating", "accepted"]),
        Message.is_read == False,
        Message.sender_id != user_id
    ).scalar() or 0
    
    return api_response(data={"unread_count": unread})


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

    # Spec Part 3: messaging blocked on rejected interests
    if interest.status == "rejected":
        return api_response(False, error="Chat closed", status=400)

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


@app.route("/api/messages/conversation/<int:interest_id>")
@jwt_required()
def get_conversation(interest_id):
    user_id  = _current_user_id()
    interest = Interest.query.get_or_404(interest_id)

    if interest.farmer_id != user_id and interest.contractor_id != user_id:
        return api_response(success=False, error="Unauthorized", status=403)

    messages = Message.query.filter_by(
        interest_id=interest_id
    ).order_by(Message.id.asc()).all()

    # Mark incoming messages as read
    for msg in messages:
        if msg.sender_id != user_id and not msg.is_read:
            msg.is_read = True
    db.session.commit()

    # Reveal phone only after full deal close
    farmer_phone     = None
    contractor_phone = None
    if interest.status == "accepted" and interest.accepted_by == "both":
        if interest.crop and interest.crop.farmer:
            farmer_phone = interest.crop.farmer.phone
        if interest.contractor:
            contractor_phone = interest.contractor.phone

    viewer_is_farmer = (user_id == interest.farmer_id)

    return api_response(data={
        "messages": [m.to_dict() for m in messages],
        "interest": {
            "id":                interest.id,
            "status":            interest.status,
            "accepted_by":       interest.accepted_by,
            "price_offered":     interest.price_offered,
            "quantity_requested":interest.quantity_requested,
            "farmer_id":         interest.farmer_id,
            "contractor_id":     interest.contractor_id,
            # Crop context for chat header
            "crop_name":         interest.crop.crop_name if interest.crop else "Unknown",
            "original_price":    interest.crop.price if interest.crop else None,
            "location":          interest.crop.location if interest.crop else None,
            "availability_date": interest.crop.availability_date.isoformat() if interest.crop and interest.crop.availability_date else None,
            # People
            "farmer_name":       interest.crop.farmer.name if interest.crop and interest.crop.farmer else None,
            "contractor_name":   interest.contractor.name if interest.contractor else None,
            # Phone (only after full close)
            "farmer_phone":      farmer_phone,
            "contractor_phone":  contractor_phone,
            "viewer_role":       "farmer" if viewer_is_farmer else "contractor",
            "last_activity_at":  interest.last_activity_at.isoformat() + "Z" if interest.last_activity_at else None,
            "finalized_at":      interest.finalized_at.isoformat() + "Z" if interest.finalized_at else None,
            "payment_confirmed_at": interest.payment_confirmed_at.isoformat() + "Z" if interest.payment_confirmed_at else None,
            "goods_confirmed_at":   interest.goods_confirmed_at.isoformat() + "Z" if interest.goods_confirmed_at else None,
        }
    })


# ─────────────────────────────────────────────────────────────────────────────
# CHATBOT
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/chat", methods=["POST"])
def chat():
    data       = request.get_json() or {}
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        # Fallback keeps anonymous browsers isolated even if header is missing.
        forwarded_for = (request.headers.get("X-Forwarded-For") or request.remote_addr or "anon").split(",")[0].strip()
        user_agent = request.headers.get("User-Agent", "")
        digest = hashlib.sha256(f"{forwarded_for}|{user_agent}".encode("utf-8")).hexdigest()[:24]
        session_id = f"anon-{digest}"

    session    = CHAT_SESSIONS[session_id]
    session["last_activity"] = time.time()

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
        raw_city = text_input or value
        if not raw_city:
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

        city    = normalize_city_input(raw_city)
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
        if not city_query:
            return jsonify({
                "message": get_text("ENTER_CITY", lang),
                "options": [{"label": get_text("BACK", lang), "action": "BACK"}],
                "input": "text",
            })
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


@app.route("/api/interests/<int:interest_id>/confirm", methods=["POST"])
@jwt_required()
@with_db_retry()
def confirm_deal_status(interest_id):
    """TC-38, 39, 40: Mark payment or goods as received."""
    user_id = _current_user_id()
    interest = Interest.query.get_or_404(interest_id)
    
    if interest.status not in ["accepted", "disputed"]:
        return api_response(success=False, error="Deal must be in an actionable state (accepted or disputed)", status=400)
    
    data = request.get_json() or {}
    confirm_type = data.get("type")
    
    if confirm_type == "payment":
        if interest.farmer_id != user_id:
            return api_response(success=False, error="Only farmer can confirm payment", status=403)
        interest.payment_confirmed_at = datetime.utcnow()
        db.session.add(Message(interest_id=interest.id, sender_id=user_id, content="__SYSTEM__:payment_confirmed"))

    elif confirm_type == "goods":
        if interest.contractor_id != user_id:
            return api_response(success=False, error="Only contractor can confirm goods", status=403)
        interest.goods_confirmed_at = datetime.utcnow()
        db.session.add(Message(interest_id=interest.id, sender_id=user_id, content="__SYSTEM__:goods_confirmed"))
    else:
        return api_response(success=False, error="Invalid confirmation type", status=400)
        
    interest.last_activity_at = datetime.utcnow()

    # Move to completed if both are confirmed
    if interest.payment_confirmed_at and interest.goods_confirmed_at:
        if _supports_extended_interest_statuses():
            interest.status = "completed"
        db.session.add(Message(interest_id=interest.id, sender_id=interest.farmer_id, content="__SYSTEM__:deal_completed"))

    db.session.commit()
    return api_response(data={"message": f"{confirm_type} confirmed", "interest": interest.to_dict()})



# ── MEMORY PRUNING (VITAL FOR RENDER FREE TIER) ──────────────────────────────
@app.before_request
def clear_old_memory():
    """Memory management optimized for production performance."""
    # Throttled: Only prune if likely necessary to reduce per-request overhead
    if len(CHAT_SESSIONS) > 100:
        sorted_sessions = sorted(CHAT_SESSIONS.items(), key=lambda x: x[1].get('last_activity', 0))
        # Remove 20 oldest sessions if we hit the cap (more aggressive pruning less often)
        for i in range(20):
            CHAT_SESSIONS.pop(sorted_sessions[i][0], None)
        logger.info(f"[MEMORY_PRUNE] Pruned 20 sessions. Active: {len(CHAT_SESSIONS)}")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)