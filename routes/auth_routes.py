from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from models import db, User

auth_bp = Blueprint("auth_bp", __name__)
import re

def api_response(success=True, data=None, error=None, status=200):
    return jsonify({"success": success, "data": data, "error": error}), status

def normalize_phone(phone):
    """
    Normalizes a phone number to Indian format (+91XXXXXXXXXX).
    Returns None if the format is invalid for Indian numbers.
    """
    phone = re.sub(r"\s+", "", str(phone)) # strip whitespace
    
    # CASE 1: 10 digits (9876543210)
    if re.match(r"^\d{10}$", phone):
        return "+91" + phone
    
    # CASE 2: +91 followed by 10 digits (+919876543210)
    if re.match(r"^\+91\d{10}$", phone):
        return phone
        
    # CASE 3: 91 followed by 10 digits (919876543210)
    if re.match(r"^91\d{10}$", phone):
        return "+" + phone

    return None

def validate_password_strength(password):
    """
    Checks if password is 'strong enough' for farmers:
    - Minimum 6 characters
    - At least one letter and one number
    """
    if len(password) < 6:
        return False, "Password must be at least 6 characters long."
    if not re.search(r"[A-Za-z]", password):
        return False, "Password must contain at least one letter."
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number."
    return True, ""


# ================= REGISTER =================
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    name, phone, password, role = data.get("name"), data.get("phone"), data.get("password"), data.get("role")

    if not all([name, phone, password, role]):
        return api_response(success=False, error="All fields required", status=400)
    
    phone = normalize_phone(phone)
    if not phone:
        return api_response(success=False, error="Invalid Indian phone format. Use 10 digits or +91XXXXXXXXXX", status=400)

    is_strong, pw_err = validate_password_strength(password)
    if not is_strong:
        return api_response(success=False, error=pw_err, status=400)

    if role not in ("farmer", "contractor"):
        return api_response(success=False, error="Invalid role", status=400)
    if User.query.filter_by(phone=phone).first():
        return api_response(success=False, error="User already exists", status=409)

    user = User(name=name, phone=phone, role=role)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return api_response(data={"message": "Registration successful"}, status=201)


# ================= LOGIN =================
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    phone, password = data.get("phone"), data.get("password")

    phone = normalize_phone(phone) or phone # try normalize, else keep raw for error check
    user = User.query.filter_by(phone=phone).first()
    if not user or not user.check_password(password):
        return api_response(success=False, error="Invalid credentials", status=401)

    access_token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})
    return api_response(data={"access_token": access_token, "role": user.role})


@auth_bp.route("/protected", methods=["GET"])
@jwt_required()
def protected():
    return api_response(data={
        "user_id": get_jwt_identity(),
        "role": get_jwt().get("role")
    })


# ================= GET PROFILE =================
@auth_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    user = User.query.get_or_404(int(get_jwt_identity()))
    return api_response(data={"id": user.id, "name": user.name, "phone": user.phone, "role": user.role})


# ================= UPDATE NAME =================
@auth_bp.route("/profile/name", methods=["PATCH"])
@jwt_required()
def update_name():
    user = User.query.get_or_404(int(get_jwt_identity()))
    new_name = (request.get_json() or {}).get("name", "").strip()

    if not new_name or len(new_name) < 2 or len(new_name) > 100:
        return api_response(success=False, error="Invalid name length", status=400)

    user.name = new_name
    db.session.commit()
    return api_response(data={"message": "Name updated", "name": user.name})


# ================= UPDATE PHONE =================
@auth_bp.route("/profile/phone", methods=["PATCH"])
@jwt_required()
def update_phone():
    import re
    user = User.query.get_or_404(int(get_jwt_identity()))
    new_phone = (request.get_json() or {}).get("phone", "").strip()

    new_phone = normalize_phone(new_phone)
    if not new_phone:
        return api_response(success=False, error="Invalid Indian phone format. Use 10 digits or +91XXXXXXXXXX", status=400)

    existing = User.query.filter_by(phone=new_phone).first()
    if existing and existing.id != user.id:
        return api_response(success=False, error="Phone already linked to another account", status=409)

    user.phone = new_phone
    db.session.commit()
    return api_response(data={"message": "Phone updated", "phone": user.phone})


# ================= CHANGE PASSWORD =================
@auth_bp.route("/profile/password", methods=["PATCH"])
@jwt_required()
def change_password():
    user = User.query.get_or_404(int(get_jwt_identity()))
    data = request.get_json() or {}
    current_pw, new_pw, confirm_pw = data.get("current_password", ""), data.get("new_password", ""), data.get("confirm_password", "")

    if not user.check_password(current_pw): return api_response(success=False, error="Current password incorrect", status=401)
    
    is_strong, pw_err = validate_password_strength(new_pw)
    if not is_strong: return api_response(success=False, error=pw_err, status=400)
    
    if new_pw != confirm_pw: return api_response(success=False, error="Passwords do not match", status=400)

    user.set_password(new_pw)
    db.session.commit()
    return api_response(data={"message": "Password changed successfully"})


# ================= DELETE ACCOUNT =================
@auth_bp.route("/profile/delete", methods=["DELETE"])
@jwt_required()
def delete_account():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    password = (request.get_json() or {}).get("password", "")

    if not user.check_password(password):
        return api_response(success=False, error="Password incorrect", status=401)

    if user.role == "farmer":
        from models import Crop
        live = Crop.query.filter(Crop.farmer_id == user_id, Crop.status.in_(["active", "negotiating"])).first()
        if live: return api_response(success=False, error="Remove active listings first", status=409)

    db.session.delete(user)
    db.session.commit()
    return api_response(data={"message": "Account deleted"})