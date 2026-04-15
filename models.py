from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import CheckConstraint, UniqueConstraint

db = SQLAlchemy()


# ================= USER =================
class User(db.Model):
    __tablename__ = "users"

    id            = db.Column(db.Integer, primary_key=True)
    name          = db.Column(db.String(100), nullable=False)
    phone         = db.Column(db.String(20), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    role          = db.Column(db.String(20), nullable=False)

    crops = db.relationship(
        "Crop", backref="farmer", lazy=True,
        cascade="all, delete-orphan", foreign_keys="Crop.farmer_id"
    )
    interests_as_contractor = db.relationship(
        "Interest", backref="contractor", lazy=True,
        cascade="all, delete-orphan", foreign_keys="Interest.contractor_id"
    )
    interests_as_farmer = db.relationship(
        "Interest", backref="farmer_user", lazy=True,
        cascade="all, delete-orphan", foreign_keys="Interest.farmer_id"
    )
    waitlist_subscriptions = db.relationship(
        "Waitlist", backref="user", lazy=True, cascade="all, delete-orphan"
    )

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "phone": self.phone, "role": self.role}


# ================= CROP =================
class Crop(db.Model):
    __tablename__ = "crops"

    id                = db.Column(db.Integer, primary_key=True)
    farmer_id         = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    crop_name         = db.Column(db.String(100), nullable=False)
    quantity          = db.Column(db.Integer, nullable=False)
    # quantity_remaining tracks unsold stock. Null only for legacy rows (use quantity as fallback).
    quantity_remaining = db.Column(db.Integer, nullable=True)
    price             = db.Column(db.Float, nullable=True)
    availability_date = db.Column(db.Date, nullable=False)
    location          = db.Column(db.String(200), nullable=False)
    # Valid statuses: active | partially_sold | sold | removed
    # "negotiating" is INTENTIONALLY excluded — negotiation lives on Interest, not Crop.
    status            = db.Column(db.String(20), nullable=False, default="active", index=True)
    created_at        = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at        = db.Column(db.DateTime, nullable=True) # TC-32: Auto-expiry support

    interests = db.relationship(
        "Interest", backref="crop", lazy=True, cascade="all, delete-orphan"
    )
    waitlist = db.relationship(
        "Waitlist", backref="crop", lazy=True, cascade="all, delete-orphan"
    )

    __table_args__ = (
        # Belt-and-suspenders: DB enforces what the app should also enforce.
        CheckConstraint("quantity_remaining >= 0",          name="ck_crop_qty_remaining_nonneg"),
        CheckConstraint("quantity_remaining <= quantity",   name="ck_crop_qty_remaining_max"),
        CheckConstraint(
            "status IN ('active', 'partially_sold', 'sold', 'removed', 'expired')",
            name="ck_crop_status_valid"
        ),
    )

    def effective_quantity(self):
        """Return remaining quantity, falling back to original for legacy rows."""
        return self.quantity_remaining if self.quantity_remaining is not None else self.quantity

    def to_dict(self):
        # TC-33: Calculate active deal quantity
        # "Active" means anything not accepted by BOTH (which reduces remaining) and not rejected.
        active_interests = Interest.query.filter(
            Interest.crop_id == self.id,
            Interest.status.in_(["pending", "negotiating"]),
            Interest.accepted_by.in_([None, "farmer", "contractor"])
        ).all()
        active_deal_qty = sum(i.quantity_requested for i in active_interests)

        return {
            "id":                self.id,
            "farmer_id":         self.farmer_id,
            "crop_name":         self.crop_name,
            "quantity":          self.quantity,
            "quantity_remaining": self.effective_quantity(),
            "active_deal_qty":   active_deal_qty,
            "price":             self.price,
            "availability_date": self.availability_date.isoformat() if self.availability_date else None,
            "location":          self.location,
            "status":            self.status,
            "created_at":        self.created_at.isoformat() + "Z" if self.created_at else None,
            "expires_at":        self.expires_at.isoformat() + "Z" if self.expires_at else None,
        }


# ================= INTEREST =================
class Interest(db.Model):
    __tablename__ = "interests"

    id                 = db.Column(db.Integer, primary_key=True)
    crop_id            = db.Column(db.Integer, db.ForeignKey("crops.id"),  nullable=False, index=True)
    farmer_id          = db.Column(db.Integer, db.ForeignKey("users.id"),  nullable=False, index=True)
    contractor_id      = db.Column(db.Integer, db.ForeignKey("users.id"),  nullable=False, index=True)
    quantity_requested = db.Column(db.Integer, nullable=False)
    price_offered      = db.Column(db.Float,   nullable=False)
    message            = db.Column(db.String(300))
    # Valid statuses: pending | negotiating | accepted | rejected
    status             = db.Column(db.String(20), default="pending")
    # accepted_by: None | "farmer" | "contractor" | "both"
    # Invariant: accepted_by == "both" iff status == "accepted"
    accepted_by        = db.Column(db.String(20), nullable=True)
    created_at         = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    last_activity_at  = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc)) # TC-30, TC-31: Offer timeouts
    finalized_at       = db.Column(db.DateTime, nullable=True)
    
    # TC-38 to TC-41: Post-acceptance confirmation records
    payment_confirmed_at = db.Column(db.DateTime, nullable=True)
    goods_confirmed_at   = db.Column(db.DateTime, nullable=True)

    messages = db.relationship(
        "Message", backref="interest", lazy=True, cascade="all, delete-orphan"
    )

    __table_args__ = (
        # One active interest per contractor per crop.
        # UPDATE is allowed (in-place re-submission after rejection) — constraint only fires on INSERT.
        UniqueConstraint("crop_id", "contractor_id", name="uq_one_interest_per_contractor_crop"),

        CheckConstraint(
            "accepted_by IN ('farmer', 'contractor', 'both') OR accepted_by IS NULL",
            name="ck_interest_accepted_by_valid"
        ),
        CheckConstraint(
            "status IN ('pending', 'negotiating', 'accepted', 'rejected', 'completed', 'disputed')",
            name="ck_interest_status_valid"
        ),
    )

    def to_dict(self):
        return {
            "id":                 self.id,
            "crop_id":            self.crop_id,
            "farmer_id":          self.farmer_id,
            "contractor_id":      self.contractor_id,
            "quantity_requested": self.quantity_requested,
            "price_offered":      self.price_offered,
            "message":            self.message,
            "status":             self.status,
            "accepted_by":        self.accepted_by,
            "created_at":         self.created_at.isoformat() + "Z" if self.created_at else None,
            "last_activity_at":   self.last_activity_at.isoformat() + "Z" if self.last_activity_at else None,
            "finalized_at":       self.finalized_at.isoformat() + "Z" if self.finalized_at else None,
            "payment_confirmed_at": self.payment_confirmed_at.isoformat() + "Z" if self.payment_confirmed_at else None,
            "goods_confirmed_at":   self.goods_confirmed_at.isoformat() + "Z" if self.goods_confirmed_at else None,
        }


# ================= MESSAGE =================
class Message(db.Model):
    __tablename__ = "messages"

    id          = db.Column(db.Integer, primary_key=True)
    interest_id = db.Column(db.Integer, db.ForeignKey("interests.id"), nullable=False, index=True)
    sender_id   = db.Column(db.Integer, db.ForeignKey("users.id"),     nullable=False, index=True)
    content     = db.Column(db.Text, nullable=False)
    created_at  = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    is_read     = db.Column(db.Boolean, default=False)
    nonce       = db.Column(db.String(64), unique=True, nullable=True, index=True)

    sender = db.relationship("User", foreign_keys=[sender_id])

    def to_dict(self):
        return {
            "id":          self.id,
            "interest_id": self.interest_id,
            "sender_id":   self.sender_id,
            "sender_name": self.sender.name if self.sender else "Unknown",
            "content":     self.content,
            "created_at":  self.created_at.isoformat() + "Z" if self.created_at else None,
            "is_read":     self.is_read,
            "nonce":       self.nonce,
        }


# ================= WAITLIST =================
class Waitlist(db.Model):
    __tablename__ = "waitlist"

    id         = db.Column(db.Integer, primary_key=True)
    crop_id    = db.Column(db.Integer, db.ForeignKey("crops.id"), nullable=False, index=True)
    user_id    = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("crop_id", "user_id", name="uq_waitlist_per_crop"),
    )

    def to_dict(self):
        return {
            "id":         self.id,
            "crop_id":    self.crop_id,
            "user_id":    self.user_id,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None
        }