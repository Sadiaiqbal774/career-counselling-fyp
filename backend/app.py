from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
from pathlib import Path
import hashlib
import json
import secrets
import re
import time
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)

# Get backend directory path
backend_dir = Path(__file__).resolve().parent
users_file = backend_dir / "users.json"
active_sessions = {}
password_reset_tokens = {}


def hash_text(value):
    return generate_password_hash(value, method="scrypt")


def verify_password(value, stored_hash):
    if not stored_hash:
        return False, False
    if stored_hash.startswith(("scrypt:", "pbkdf2:")):
        return check_password_hash(stored_hash, value), False
    legacy_hash = hashlib.sha256(value.encode("utf-8")).hexdigest()
    return secrets.compare_digest(legacy_hash, stored_hash), True


def revoke_user_sessions(user_id):
    for session_token, session_user_id in list(active_sessions.items()):
        if session_user_id == user_id:
            del active_sessions[session_token]


def is_valid_gmail(email):
    return bool(re.fullmatch(r"[a-zA-Z0-9._%+-]+@gmail\.com", email or ""))


def is_strong_password(password):
    if not isinstance(password, str):
        return False
    return bool(re.fullmatch(r"(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}", password))


def load_users():
    if not users_file.exists():
        return []
    try:
        with users_file.open("r", encoding="utf-8") as file:
            return json.load(file)
    except json.JSONDecodeError:
        return []


def save_users(users):
    with users_file.open("w", encoding="utf-8") as file:
        json.dump(users, file, indent=2)


def sanitize_user(user):
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "authProvider": user.get("authProvider", "local"),
    }


def get_bearer_token():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    return auth_header.split(" ", 1)[1].strip()


def get_authenticated_user():
    token = get_bearer_token()
    if not token:
        return None, None

    user_id = active_sessions.get(token)
    if not user_id:
        return None, None

    users = load_users()
    user = next((entry for entry in users if entry["id"] == user_id), None)
    return user, token


def require_authenticated_user():
    user, token = get_authenticated_user()
    if not user:
        return None, None, jsonify({"message": "Authentication required."}), 401
    return user, token, None, None

def get_university_link(name):
    base = name.lower()

    # ✅ safer: open homepage (never 403)
    if "fast" in base:
        return "https://nu.edu.pk/"
    elif "comsats" in base:
        return "https://www.comsats.edu.pk/"
    elif "bahria" in base:
        return "https://bahria.edu.pk/"

    # ✅ fallback: Google search (always works)
    search_query = name.replace(" ", "+") + "+admissions+Pakistan"
    return f"https://www.google.com/search?q={search_query}"
    

   
# LOAD MODEL
model = joblib.load(backend_dir / "career_model.pkl")
le_background = joblib.load(backend_dir / "background_encoder.pkl")
le_career = joblib.load(backend_dir / "career_encoder.pkl")


@app.route("/")
def home():
    return "API Running"


@app.route("/api/auth/register", methods=["POST"])
def register():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    security_question = (payload.get("securityQuestion") or "").strip()
    security_answer = (payload.get("securityAnswer") or "").strip()

    if not all([name, email, password, security_question, security_answer]):
        return jsonify({"message": "All fields are required."}), 400

    if not is_valid_gmail(email):
        return jsonify({"message": "Please use a valid Gmail address (example@gmail.com)."}), 400

    if not is_strong_password(password):
        return jsonify({"message": "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."}), 400

    users = load_users()
    if any(user["email"] == email for user in users):
        return jsonify({"message": "An account with this email already exists."}), 409

    user = {
        "id": secrets.token_hex(12),
        "name": name,
        "email": email,
        "passwordHash": hash_text(password),
        "securityQuestion": security_question,
        "securityAnswerHash": hash_text(security_answer.lower()),
        "authProvider": "local",
    }
    users.append(user)
    save_users(users)

    token = secrets.token_urlsafe(24)
    active_sessions[token] = user["id"]
    return jsonify({"user": sanitize_user(user), "token": token}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    if not email or not password:
        return jsonify({"message": "Email and password are required."}), 400

    if not is_valid_gmail(email):
        return jsonify({"message": "Please use a valid Gmail address (example@gmail.com)."}), 400

    users = load_users()
    user = next((entry for entry in users if entry["email"] == email), None)
    if not user:
        return jsonify({"message": "No account found for that email."}), 404

    if user.get("authProvider") != "google":
        password_matches, legacy_hash = verify_password(password, user.get("passwordHash"))
        if not password_matches:
            return jsonify({"message": "Incorrect password."}), 401
        if legacy_hash:
            user["passwordHash"] = hash_text(password)
            save_users(users)

    token = secrets.token_urlsafe(24)
    active_sessions[token] = user["id"]
    return jsonify({"user": sanitize_user(user), "token": token}), 200


@app.route("/api/auth/google-auth", methods=["POST"])
def google_auth():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip() or "Google User"
    email = (payload.get("email") or "").strip().lower()
    google_id = (payload.get("googleId") or "").strip()

    if not email or not google_id:
        return jsonify({"message": "Google account data is incomplete."}), 400

    users = load_users()
    user = next((entry for entry in users if entry["email"] == email), None)

    if not user:
        user = {
            "id": secrets.token_hex(12),
            "name": name,
            "email": email,
            "googleId": google_id,
            "authProvider": "google",
            "securityQuestion": "",
            "securityAnswerHash": "",
        }
        users.append(user)
    else:
        user["name"] = name or user.get("name", "Google User")
        user["googleId"] = google_id
        user["authProvider"] = "google"

    save_users(users)

    token = secrets.token_urlsafe(24)
    active_sessions[token] = user["id"]
    return jsonify({"user": sanitize_user(user), "token": token}), 200


@app.route("/api/auth/security-question", methods=["POST"])
def security_question():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    users = load_users()
    user = next((entry for entry in users if entry["email"] == email), None)

    if not user or not user.get("securityQuestion"):
        return jsonify({"message": "No account found with that email."}), 404

    return jsonify({"securityQuestion": user["securityQuestion"]}), 200


@app.route("/api/auth/reset-password-with-question", methods=["POST"])
def reset_password_with_question():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    security_answer = (payload.get("securityAnswer") or "").strip().lower()
    password = payload.get("password") or ""

    users = load_users()
    user = next((entry for entry in users if entry["email"] == email), None)
    if not user:
        return jsonify({"message": "No account found with that email."}), 404

    answer_matches, legacy_hash = verify_password(security_answer, user.get("securityAnswerHash"))
    if not answer_matches:
        return jsonify({"message": "The answer does not match our records."}), 401

    if not is_strong_password(password):
        return jsonify({"message": "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."}), 400

    user["passwordHash"] = hash_text(password)
    if legacy_hash:
        user["securityAnswerHash"] = hash_text(security_answer)
    save_users(users)
    revoke_user_sessions(user["id"])
    return jsonify({"message": "Password reset successful."}), 200


@app.route("/api/auth/request-reset", methods=["POST"])
def request_reset():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    users = load_users()
    user = next((entry for entry in users if entry["email"] == email), None)
    if not user:
        return jsonify({"message": "No account found with that email."}), 404

    token = secrets.token_urlsafe(28)
    password_reset_tokens[token] = (user["id"], time.time() + 900)
    return jsonify({"message": "If the account exists, password reset instructions have been sent."}), 200


@app.route("/api/auth/reset-password", methods=["POST"])
def reset_password():
    payload = request.get_json(silent=True) or {}
    token = (payload.get("token") or "").strip()
    password = payload.get("password") or ""

    reset_record = password_reset_tokens.get(token)
    if not reset_record:
        return jsonify({"message": "Invalid or expired reset token."}), 400
    user_id, expires_at = reset_record
    if time.time() >= expires_at:
        password_reset_tokens.pop(token, None)
        return jsonify({"message": "Invalid or expired reset token."}), 400

    if not is_strong_password(password):
        return jsonify({"message": "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."}), 400

    users = load_users()
    user = next((entry for entry in users if entry["id"] == user_id), None)
    if not user:
        return jsonify({"message": "User not found."}), 404

    user["passwordHash"] = hash_text(password)
    save_users(users)
    del password_reset_tokens[token]
    revoke_user_sessions(user["id"])
    return jsonify({"message": "Password reset successful."}), 200


@app.route("/api/auth/change-password", methods=["POST"])
def change_password():
    user, token, error_response, error_status = require_authenticated_user()
    if error_response:
        return error_response, error_status

    payload = request.get_json(silent=True) or {}
    current_password = payload.get("currentPassword") or ""
    new_password = payload.get("newPassword") or ""

    if not current_password or not new_password:
        return jsonify({"message": "Current password and new password are required."}), 400

    if not is_strong_password(new_password):
        return jsonify({"message": "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."}), 400

    password_matches, _ = verify_password(current_password, user.get("passwordHash"))
    if not password_matches:
        return jsonify({"message": "Current password is incorrect."}), 401

    users = load_users()
    stored_user = next((entry for entry in users if entry["id"] == user["id"]), None)
    if not stored_user:
        return jsonify({"message": "Authenticated user no longer exists."}), 401

    stored_user["passwordHash"] = hash_text(new_password)
    save_users(users)
    revoke_user_sessions(user["id"])
    return jsonify({"message": "Password changed successfully. Please sign in again."}), 200


@app.route("/api/auth/delete-account", methods=["DELETE"])
def delete_account():
    user, token = get_authenticated_user()
    if not user:
        return jsonify({"message": "Unauthorized."}), 401

    payload = request.get_json(silent=True) or {}
    password = payload.get("password") or ""

    if user.get("authProvider") != "google":
        password_matches, _ = verify_password(password, user.get("passwordHash"))
        if not password_matches:
            return jsonify({"message": "Incorrect password."}), 401

    users = load_users()
    remaining_users = [entry for entry in users if entry["id"] != user["id"]]
    save_users(remaining_users)

    if token in active_sessions:
        del active_sessions[token]

    return jsonify({"message": "Account deleted successfully."}), 200


# 🔥 EXPLANATION FUNCTION
def generate_reason(data):
    reasons = []

    if int(data["Computer"]) >= 4:
        reasons.append("Strong interest in Computer")

    if int(data["Biology"]) >= 4:
        reasons.append("High interest in Biology")

    if int(data["Math"]) >= 4:
        reasons.append("Good analytical skills")

    if data["Background"] == "ICS":
        reasons.append("Background supports computing field")

    if data["Background"] == "Pre-Medical":
        reasons.append("Background supports medical field")

    return reasons


@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json

        city = data.get("City", None)

        model_input = data.copy()
        model_input.pop("City", None)

        df = pd.DataFrame([model_input])

        df = df[["Math", "Biology", "Computer", "Communication", "Marks", "Background", "Leadership"]]

        df["Background"] = le_background.transform(df["Background"])

        pred = model.predict(df)
        career = le_career.inverse_transform(pred)[0]

        # 🔥 EXPLANATION
        reasons = generate_reason(data)

        # -------- UNIVERSITIES --------
        uni_df = pd.read_csv(backend_dir / "universities_cleaned.csv")

        mapping = {
            "BSCS": "Computer",
            "Software Engineering": "Software",
            "BBA": "Business",
            "MBBS": "Medical"
        }

        keyword = mapping.get(career, career)

        recommended = uni_df[
            (uni_df["Program"].str.contains(keyword, case=False)) &
            (uni_df["Merit"] <= data["Marks"])
        ]

        if city:
            recommended = recommended[
                recommended["City"].str.lower() == city.lower()
            ]

        recommended = recommended.drop_duplicates(
            subset=["University", "Program"]
        ).head(5)

        # 🔥 ADD REQUIREMENTS + GUIDANCE
        universities_list = []

        for _, row in recommended.iterrows():
           universities_list.append({
    "University": row["University"],
    "Program": row["Program"],
    "City": row["City"],
    "Merit": row["Merit"],

    # 🔥 NEW FEATURES
    "your_marks": data["Marks"],

    "eligibility": "Eligible" if data["Marks"] >= row["Merit"] else "Not Eligible",

    "requirements": f"Minimum {row['Merit']}% merit required",

    "link": get_university_link(row["University"]),

    "guidance": [
        "Apply before deadline",
        "Prepare required documents",
        "Check entry test schedule"
    ]
})
        return jsonify({
            "career": career,
            "reasons": reasons,
            "universities": universities_list
        })

    except Exception as e:
        return jsonify({"error": str(e)})


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)