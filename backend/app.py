from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
from pathlib import Path
import hashlib
import json
import secrets
import re
import os
import time
import csv
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError

app = Flask(__name__)

# Only allow requests from your actual frontend(s), not every website.
# Set FRONTEND_URL on your hosting platform once you have your live Vercel URL
# (e.g. https://career-counselling.vercel.app) -- no code change needed to update it.
_allowed_origins = ["http://localhost:3000"]
_frontend_url = os.environ.get("FRONTEND_URL", "").strip().rstrip("/")
if _frontend_url:
    _allowed_origins.append(_frontend_url)
CORS(app, origins=_allowed_origins)

# Get backend directory path
backend_dir = Path(__file__).resolve().parent


def load_local_env():
    env_file = backend_dir / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ[key.strip()] = value.strip().strip('"').strip("'")

load_local_env()
users_file = backend_dir / "users.json"
admin_json_resources = {
    "assessments": backend_dir / "assessment_results.json",
    "chatbot-interactions": backend_dir / "chatbot_interactions.json",
    "chatbot-responses": backend_dir / "chatbot_responses.json",
    "eligibility": backend_dir / "eligibility_criteria.json",
    "activity": backend_dir / "system_activity.json",
}
# These resources are monitoring/audit logs, not admin-managed content — never deletable.
read_only_admin_resources = {"chatbot-interactions", "activity"}

# Percentages and money caps entered by admins must never be negative.
non_negative_numeric_fields = ("income_cap_pkr", "min_merit_pct", "minimumMarks")


def clamp_non_negative_numeric_fields(payload):
    for field in non_negative_numeric_fields:
        if field in payload:
            try:
                number = float(payload[field])
            except (TypeError, ValueError):
                continue
            if number < 0:
                payload[field] = 0
    return payload


def non_negative_numeric_string(value):
    text = str(value) if value is not None else ""
    try:
        number = float(text)
    except (TypeError, ValueError):
        return text
    return "0" if number < 0 else text
admin_csv_resources = {
    "scholarships": backend_dir / "scholarships_deduped.csv",
    "universities": backend_dir / "universities_deduped.csv",
    "programs": backend_dir / "programs.csv",
}
active_sessions = {}
admin_sessions = {}
password_reset_tokens = {}
# Single fixed administrator username and password (admin uses username, never email)
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "").strip() or "admin"
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "").strip() or "admin123"
ADMIN_SESSION_TTL = 60 * 60 * 8
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()


def hash_text(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def is_valid_email(email):
    return bool(re.fullmatch(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", email or ""))

is_valid_gmail = is_valid_email


def is_strong_password(password):
    if not isinstance(password, str):
        return False

    return bool(
        re.fullmatch(
            r"(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}",
            password
        )
    )


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
        "hasPassword": bool(user.get("passwordHash")),
        "blocked": bool(user.get("blocked", False)),
        "createdAt": user.get("createdAt"),
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

    user = next(
        (entry for entry in users if entry["id"] == user_id),
        None
    )

    return user, token


def get_authenticated_admin():
    token = get_bearer_token()
    session = admin_sessions.get(token)

    if not session or session["expires_at"] <= time.time():
        if token:
            admin_sessions.pop(token, None)
        return None

    return session


def require_admin():
    if not get_authenticated_admin():
        return jsonify({"message": "Admin authentication required."}), 401
    return None


def get_admin_csv(resource):
    if resource not in admin_csv_resources:
        return None
    return admin_csv_resources[resource]


def load_admin_records(resource):
    resource_file = get_admin_csv(resource)
    if resource_file is None:
        return None
    with resource_file.open("r", encoding="utf-8-sig", newline="") as file:
        return [{"id": str(index), **row} for index, row in enumerate(csv.DictReader(file))]


def save_admin_records(resource, records):
    resource_file = get_admin_csv(resource)
    if records:
        columns = []
        for record in records:
            for key in record:
                if key != "id" and key not in columns:
                    columns.append(key)
    else:
        with resource_file.open("r", encoding="utf-8-sig", newline="") as file:
            columns = next(csv.reader(file), [])
    with resource_file.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=columns)
        writer.writeheader()
        writer.writerows({key: record.get(key, "") for key in columns} for record in records)


def load_universities_with_programs():
    universities = load_admin_records("universities") or []
    programs = load_admin_records("programs") or []
    for university in universities:
        university["programs"] = [
            {
                "id": program["id"],
                "degree_name": program.get("degree_name", ""),
                "merit_formula": program.get("merit_formula", ""),
                "eligibility_pct": program.get("eligibility_pct", ""),
                "url": program.get("url", ""),
            }
            for program in programs if str(program.get("university_id")) == str(university["id"])
        ]
    return universities


def load_scholarships_df():
    records = load_admin_records("scholarships") or []
    rows = []
    for record in records:
        raw = record.get("min_merit_pct")
        rows.append({
            "name": record.get("name", ""),
            "provider": record.get("provider", ""),
            "provinces": record.get("provinces") or "",
            "basis": record.get("basis", ""),
            "provider_type": record.get("provider_type", ""),
            "min_merit_pct": float(raw) if raw not in (None, "") else None,
            "source_url": record.get("source_url", ""),
        })
    return pd.DataFrame(rows, columns=["name", "provider", "provinces", "basis", "provider_type", "min_merit_pct", "source_url"])


def load_university_programs_df():
    universities = {u["id"]: u for u in (load_admin_records("universities") or [])}
    programs = load_admin_records("programs") or []
    rows = []
    for program in programs:
        university = universities.get(str(program.get("university_id")))
        if not university:
            continue
        eligibility_pct = program.get("eligibility_pct")
        rows.append({
            "university": university.get("name", ""),
            "program": program.get("degree_name", ""),
            "city_norm": university.get("city", ""),
            "eligibility_pct": float(eligibility_pct) if eligibility_pct not in (None, "") else None,
            "url": program.get("url") or university.get("website_url") or "",
        })
    return pd.DataFrame(rows, columns=["university", "program", "city_norm", "eligibility_pct", "url"])


def save_universities(records):
    fields = ["id", "name", "city", "province", "sector", "website_url"]
    with admin_csv_resources["universities"].open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        writer.writerows({field: record.get(field, "") for field in fields} for record in records)


def load_json_records(resource):
    resource_file = admin_json_resources.get(resource)
    if resource_file is None:
        return None
    try:
        with resource_file.open("r", encoding="utf-8") as file:
            records = json.load(file)
            return records if isinstance(records, list) else []
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def save_json_records(resource, records):
    resource_file = admin_json_resources[resource]
    with resource_file.open("w", encoding="utf-8") as file:
        json.dump(records, file, indent=2)


def log_activity(activity_type, details=None):
    records = load_json_records("activity") or []
    records.append({
        "id": secrets.token_hex(8),
        "type": activity_type,
        "details": details or {},
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    })
    save_json_records("activity", records[-1000:])


def load_supabase_quiz_scores():
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for admin assessment access.")
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    }
    scores_request = Request(
        f"{SUPABASE_URL}/rest/v1/quiz_scores?{urlencode({'select': '*'})}",
        headers=headers,
    )
    with urlopen(scores_request, timeout=10) as response:
        records = json.loads(response.read().decode("utf-8"))

    profile_request = Request(
        f"{SUPABASE_URL}/rest/v1/profiles?{urlencode({'select': 'id,full_name,email'})}",
        headers=headers,
    )
    try:
        with urlopen(profile_request, timeout=10) as response:
            profiles = {str(row["id"]): row for row in json.loads(response.read().decode("utf-8"))}
    except Exception:
        profiles = {}
    for record in records:
        record["id"] = record.get("user_id")
        record["source"] = "quiz"
        profile = profiles.get(str(record.get("user_id")))
        if profile:
            record["user"] = profile
    return records


def load_local_assessment_records():
    records = load_json_records("assessments") or []
    output = []
    for record in records:
        result = record.get("result") or {}
        output.append({
            "id": record.get("id"),
            "source": "university_recommender",
            "userName": "Anonymous (University Recommender)",
            "result": {"career": result.get("career"), "matchedField": result.get("matched_field")} if result else None,
            "createdAt": record.get("createdAt"),
        })
    return output


def supabase_admin_request(method, path, body=None, params=None):
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for admin user management.")

    url = f"{SUPABASE_URL}{path}"
    if params:
        url = f"{url}?{urlencode(params)}"

    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    data = json.dumps(body).encode("utf-8") if body is not None else None
    admin_request = Request(url, data=data, headers=headers, method=method)

    try:
        with urlopen(admin_request, timeout=10) as response:
            raw = response.read()
            return json.loads(raw.decode("utf-8")) if raw else None
    except HTTPError as error:
        raw = error.read().decode("utf-8", errors="ignore")
        message = raw
        try:
            parsed = json.loads(raw)
            message = parsed.get("msg") or parsed.get("message") or parsed.get("error_description") or raw
        except (json.JSONDecodeError, AttributeError):
            pass
        raise RuntimeError(message or f"Supabase admin request failed ({error.code})")


def list_supabase_users():
    users = []
    page = 1
    per_page = 200
    while True:
        result = supabase_admin_request("GET", "/auth/v1/admin/users", params={"page": page, "per_page": per_page})
        batch = (result or {}).get("users", [])
        if not batch:
            break
        users.extend(batch)
        if len(batch) < per_page:
            break
        page += 1
    return users


def sanitize_supabase_user(user):
    metadata = user.get("user_metadata") or {}
    app_metadata = user.get("app_metadata") or {}
    providers = app_metadata.get("providers") or []
    provider = app_metadata.get("provider") or (providers[0] if providers else "email")
    email = user.get("email") or ""

    return {
        "id": user.get("id"),
        "name": metadata.get("name") or (email.split("@")[0] if email else "Student"),
        "email": email,
        "authProvider": "google" if provider == "google" else "local",
        "blocked": bool(user.get("banned_until")),
        "createdAt": user.get("created_at"),
        "emailConfirmed": bool(user.get("email_confirmed_at")),
        "lastSignInAt": user.get("last_sign_in_at"),
    }


def get_university_link(name):
    base = name.lower()

    if "fast" in base:
        return "https://nu.edu.pk/"

    elif "comsats" in base:
        return "https://www.comsats.edu.pk/"

    elif "bahria" in base:
        return "https://bahria.edu.pk/"

    search_query = name.replace(" ", "+") + "+admissions+Pakistan"

    return f"https://www.google.com/search?q={search_query}"


# LOAD MODEL
field_classifier = joblib.load(backend_dir / "field_classifier.pkl")
tfidf_vectorizer = joblib.load(backend_dir / "tfidf_vectorizer.pkl")


# CAREER FIELD -> UNIVERSITY PROGRAM KEYWORDS
CATEGORY_KEYWORDS = {
    "Computer Science & Technology": [
        "computer science", "software", "information technology",
        "artificial intelligence", "data science", "cyber security",
        "fintech", "computer engineering", "bscs"
    ],
    "Engineering": [
        "electrical engineering", "civil engineering", "mechanical engineering",
        "biomedical engineering", "chemical engineering", "architecture",
        "industrial engineering", "mechatronics", "petroleum engineering",
        "engineering"
    ],
    "Business & Commerce": [
        "bba", "business", "accounting", "finance", "commerce",
        "management sciences", "economics", "marketing"
    ],
    "Medicine & Health Sciences": [
        "mbbs", "bds", "pharm-d", "pharmacy", "dpt", "physical therapy",
        "nursing", "medical lab", "public health", "nutrition", "dietetics",
        "optometry", "radiology"
    ],
    "Law": ["llb", "law"],
    "Natural & Applied Sciences": [
        "biotechnology", "zoology", "chemistry", "physics", "mathematics",
        "biochemistry", "environmental science", "agriculture", "botany",
        "microbiology", "genetics", "statistics", "geology"
    ],
    "Social Sciences & Humanities": [
        "psychology", "international relations", "political science", "english",
        "islamic studies", "media and communication", "education", "sociology",
        "anthropology", "journalism", "fine arts", "history", "philosophy"
    ],
}


def field_matches_program(program, field):
    program_lower = program.lower()
    return any(
        keyword in program_lower
        for keyword in CATEGORY_KEYWORDS.get(field, [])
    )


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

    if not all([
        name,
        email,
        password,
        security_question,
        security_answer
    ]):
        return jsonify({
            "message": "All fields are required."
        }), 400

    if not is_valid_email(email):
        return jsonify({
            "message":
            "Please use a valid email address."
        }), 400

    if not is_strong_password(password):
        return jsonify({
            "message":
            "Password must contain uppercase, lowercase, number and special character."
        }), 400

    users = load_users()

    if any(user["email"] == email for user in users):
        return jsonify({
            "message":
            "An account with this email already exists."
        }), 409

    user = {
        "id": secrets.token_hex(12),
        "name": name,
        "email": email,
        "passwordHash": hash_text(password),
        "securityQuestion": security_question,
        "securityAnswerHash": hash_text(
            security_answer.lower()
        ),
        "authProvider": "local",
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    users.append(user)
    save_users(users)

    token = secrets.token_urlsafe(24)
    active_sessions[token] = user["id"]

    return jsonify({
        "user": sanitize_user(user),
        "token": token
    }), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    payload = request.get_json(silent=True) or {}

    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    if not email or not password:
        return jsonify({
            "message":
            "Email and password are required."
        }), 400

    users = load_users()

    user = next(
        (entry for entry in users if entry["email"] == email),
        None
    )

    if not user:
        return jsonify({
            "message":
            "No account found."
        }), 404

    if user.get("blocked"):
        return jsonify({"message": "This account has been blocked by an administrator."}), 403

    if user.get("authProvider") != "google":

        if user.get("passwordHash") != hash_text(password):
            return jsonify({
                "message":
                "Incorrect password."
            }), 401

    token = secrets.token_urlsafe(24)
    active_sessions[token] = user["id"]

    return jsonify({
        "user": sanitize_user(user),
        "token": token
    }), 200


@app.route("/api/auth/google-auth", methods=["POST"])
def google_auth():
    payload = request.get_json(silent=True) or {}

    name = (
        payload.get("name") or ""
    ).strip() or "Google User"

    email = (
        payload.get("email") or ""
    ).strip().lower()

    google_id = (
        payload.get("googleId") or ""
    ).strip()

    if not email or not google_id:
        return jsonify({
            "message":
            "Google account data is incomplete."
        }), 400

    users = load_users()

    user = next(
        (entry for entry in users if entry["email"] == email),
        None
    )

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
        user["name"] = name
        user["googleId"] = google_id
        user["authProvider"] = "google"

    save_users(users)

    token = secrets.token_urlsafe(24)
    active_sessions[token] = user["id"]

    return jsonify({
        "user": sanitize_user(user),
        "token": token
    }), 200


@app.route("/api/auth/security-question", methods=["POST"])
def security_question():
    payload = request.get_json(silent=True) or {}

    email = (
        payload.get("email") or ""
    ).strip().lower()

    users = load_users()

    user = next(
        (entry for entry in users if entry["email"] == email),
        None
    )

    if not user or not user.get("securityQuestion"):
        return jsonify({
            "message":
            "No account found."
        }), 404

    return jsonify({
        "securityQuestion":
        user["securityQuestion"]
    }), 200


@app.route("/api/auth/reset-password-with-question", methods=["POST"])
def reset_password_with_question():
    payload = request.get_json(silent=True) or {}

    email = (
        payload.get("email") or ""
    ).strip().lower()

    security_answer = (
        payload.get("securityAnswer") or ""
    ).strip().lower()

    password = payload.get("password") or ""

    users = load_users()

    user = next(
        (entry for entry in users if entry["email"] == email),
        None
    )

    if not user:
        return jsonify({
            "message":
            "No account found."
        }), 404

    if user.get("securityAnswerHash") != hash_text(
        security_answer
    ):
        return jsonify({
            "message":
            "Incorrect answer."
        }), 401

    user["passwordHash"] = hash_text(password)

    save_users(users)

    return jsonify({
        "message":
        "Password reset successful."
    }), 200


@app.route("/api/auth/set-password", methods=["POST"])
def set_password():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    old_password = payload.get("oldPassword") or ""
    new_password = payload.get("newPassword") or ""
    is_oauth = bool(payload.get("isOAuth"))

    if not email or not new_password:
        return jsonify({"message": "Email and new password are required."}), 400

    users = load_users()
    user = next((entry for entry in users if entry["email"] == email), None)

    if not user:
        user = {
            "id": secrets.token_hex(8),
            "email": email,
            "name": email.split("@")[0].capitalize(),
            "passwordHash": hash_text(new_password),
            "role": "student",
            "provider": "google" if is_oauth else "email",
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        users.append(user)
        save_users(users)
        return jsonify({"message": "Password set successfully.", "user": user}), 200

    user["passwordHash"] = hash_text(new_password)
    save_users(users)
    return jsonify({"message": "Password updated successfully."}), 200


@app.route("/api/auth/delete-account", methods=["DELETE"])
def delete_account():
    user, token = get_authenticated_user()

    if not user:
        return jsonify({
            "message":
            "Unauthorized."
        }), 401

    users = load_users()

    remaining_users = [
        entry for entry in users
        if entry["id"] != user["id"]
    ]

    save_users(remaining_users)

    if token in active_sessions:
        del active_sessions[token]

    return jsonify({
        "message":
        "Account deleted successfully."
    }), 200


@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or payload.get("email") or "").strip()
    password = payload.get("password") or ""

    if not ADMIN_USERNAME or not ADMIN_PASSWORD:
        return jsonify({
            "message": "Admin authentication is not configured on the server."
        }), 503

    if username != ADMIN_USERNAME or password != ADMIN_PASSWORD:
        return jsonify({"message": "Invalid admin credentials."}), 401

    token = secrets.token_urlsafe(32)
    admin_sessions[token] = {
        "username": ADMIN_USERNAME,
        "expires_at": time.time() + ADMIN_SESSION_TTL,
    }

    return jsonify({
        "admin": {"username": ADMIN_USERNAME},
        "token": token,
        "expiresIn": ADMIN_SESSION_TTL,
    }), 200


@app.route("/api/admin/me", methods=["GET"])
def admin_me():
    admin = get_authenticated_admin()
    if not admin:
        return jsonify({"message": "Admin authentication required."}), 401

    return jsonify({"admin": {"username": admin["username"]}}), 200


@app.route("/api/admin/stats", methods=["GET"])
def admin_stats():
    auth_error = require_admin()
    if auth_error:
        return auth_error

    try:
        users = [sanitize_supabase_user(entry) for entry in list_supabase_users()]
    except (RuntimeError, Exception):
        users = [sanitize_user(entry) for entry in reversed(load_users())]

    # Admin accounts are never part of the student / registered user store
    admin_un = (ADMIN_USERNAME or "admin").strip().lower()
    users = [
        user for user in users
        if user.get("name", "").strip().lower() != admin_un
        and user.get("email", "").strip().lower() != admin_un
        and not user.get("email", "").strip().lower().startswith(f"{admin_un}@")
        and not user.get("name", "").strip().lower().startswith(f"{admin_un} ")
    ]

    return jsonify({
        "totalUsers": len(users),
        "localUsers": sum(user["authProvider"] == "local" for user in users),
        "googleUsers": sum(user["authProvider"] == "google" for user in users),
        "users": users,
    }), 200


@app.route("/api/admin/users/<user_id>", methods=["PUT"])
def admin_update_user(user_id):
    auth_error = require_admin()
    if auth_error:
        return auth_error

    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    if not name or not email:
        return jsonify({"message": "Name and email are required."}), 400

    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        users = load_users()
        user = next((entry for entry in users if entry["id"] == user_id), None)
        if not user:
            return jsonify({"message": "User not found."}), 404
        user["name"] = name
        user["email"] = email
        if "blocked" in payload:
            user["blocked"] = bool(payload["blocked"])
        save_users(users)
        log_activity("admin_user_updated", {"userId": user_id, "email": email})
        return jsonify({"user": sanitize_user(user)}), 200

    try:
        current = supabase_admin_request("GET", f"/auth/v1/admin/users/{user_id}")
    except RuntimeError as error:
        return jsonify({"message": str(error)}), 502
    if not current or not current.get("id"):
        return jsonify({"message": "User not found."}), 404

    update_body = {
        "email": email,
        "user_metadata": {**(current.get("user_metadata") or {}), "name": name},
    }
    will_block = None
    if "blocked" in payload:
        will_block = bool(payload["blocked"])
        update_body["ban_duration"] = "876000h" if will_block else "none"

    try:
        updated = supabase_admin_request("PUT", f"/auth/v1/admin/users/{user_id}", body=update_body)
    except RuntimeError as error:
        message = str(error)
        status = 409 if "already been registered" in message.lower() or "already exists" in message.lower() else 502
        return jsonify({"message": message}), status

    if will_block is not None:
        log_activity("admin_user_blocked" if will_block else "admin_user_unblocked", {"userId": user_id, "email": email})
    else:
        log_activity("admin_user_updated", {"userId": user_id, "email": email})

    return jsonify({"user": sanitize_supabase_user(updated)}), 200


@app.route("/api/admin/users/<user_id>", methods=["DELETE"])
def admin_delete_user(user_id):
    auth_error = require_admin()
    if auth_error:
        return auth_error

    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        users = load_users()
        remaining_users = [entry for entry in users if entry["id"] != user_id]
        if len(remaining_users) == len(users):
            return jsonify({"message": "User not found."}), 404
        save_users(remaining_users)
        log_activity("admin_user_deleted", {"userId": user_id})
        return jsonify({"message": "User deleted successfully."}), 200

    try:
        supabase_admin_request("DELETE", f"/auth/v1/admin/users/{user_id}")
    except RuntimeError as error:
        message = str(error)
        status = 404 if "not found" in message.lower() else 502
        return jsonify({"message": message}), status

    for resource in ("profiles", "quiz_scores"):
        try:
            supabase_admin_request("DELETE", f"/rest/v1/{resource}", params={"user_id" if resource == "quiz_scores" else "id": f"eq.{user_id}"})
        except RuntimeError:
            pass

    log_activity("admin_user_deleted", {"userId": user_id})
    return jsonify({"message": "User deleted successfully."}), 200


@app.route("/api/admin/assessments", methods=["GET"])
def admin_assessments():
    auth_error = require_admin()
    if auth_error:
        return auth_error
    records = []
    try:
        records.extend(load_supabase_quiz_scores())
    except Exception as error:
        print(f"Unable to load Supabase assessment results: {error}")
    records.extend(load_local_assessment_records())
    records.sort(key=lambda record: record.get("createdAt") or record.get("updated_at") or "", reverse=True)
    return jsonify({"records": records, "readOnly": True}), 200


@app.route("/api/admin/assessments/<record_id>", methods=["DELETE"])
def admin_delete_assessment(record_id):
    auth_error = require_admin()
    if auth_error:
        return auth_error
    return jsonify({"message": "Assessment records are a read-only monitoring log and cannot be deleted."}), 403


@app.route("/api/admin/<resource>", methods=["GET", "POST"])
def admin_resource(resource):
    auth_error = require_admin()
    if auth_error:
        return auth_error

    records = load_universities_with_programs() if resource == "universities" else load_admin_records(resource)
    if records is None:
        records = load_json_records(resource)
    if records is None:
        return jsonify({"message": "Unknown admin resource."}), 404
    if request.method == "GET":
        if resource in ("chatbot-interactions", "assessments", "activity"):
            def extract_sort_key(record):
                val = record.get("createdAt") or record.get("created_at") or record.get("date") or record.get("timestamp") or ""
                return str(val)
            records = sorted(records, key=extract_sort_key, reverse=True)
        return jsonify({"records": records}), 200

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"message": "A JSON object is required."}), 400
    payload.pop("id", None)
    clamp_non_negative_numeric_fields(payload)
    if resource not in admin_json_resources and not records:
        return jsonify({"message": "Cannot add a record without CSV columns."}), 400
    if resource == "universities":
        fields = ["id", "name", "city", "province", "sector", "website_url"]
        if not payload.get("name"):
            return jsonify({"message": "University name is required."}), 400
        base_records = load_admin_records("universities") or []
        next_id = max((int(record["id"]) for record in base_records if str(record.get("id", "")).isdigit()), default=0) + 1
        record = {field: str(payload.get(field, "Public" if field == "sector" else "")) for field in fields if field != "id"}
        record = {"id": str(next_id), **record}
        base_records.append(record)
        save_universities(base_records)
        record["programs"] = []
    elif resource in admin_json_resources:
        record = {"id": secrets.token_hex(8), **payload}
        records.append(record)
        save_json_records(resource, records)
    else:
        columns = []
        for record in records:
            for key in record:
                if key != "id" and key not in columns:
                    columns.append(key)
        for key in payload:
            if key != "id" and key not in columns:
                columns.append(key)
        record = {column: str(payload.get(column, "")) for column in columns}
        records.append({"id": str(len(records)), **record})
        save_admin_records(resource, records)
    return jsonify({"record": records[-1]}), 201


@app.route("/api/admin/<resource>/<record_id>", methods=["PUT", "DELETE"])
def admin_update_resource(resource, record_id):
    auth_error = require_admin()
    if auth_error:
        return auth_error
    if request.method == "DELETE" and resource in read_only_admin_resources:
        return jsonify({"message": "This is a read-only monitoring log and cannot be deleted."}), 403

    records = load_admin_records(resource)
    if records is None:
        records = load_json_records(resource)
    if records is None:
        return jsonify({"message": "Unknown admin resource."}), 404
    record_index = next((index for index, record in enumerate(records) if str(record.get("id")) == record_id), None)
    if record_index is None:
        return jsonify({"message": "Record not found."}), 404
    if request.method == "DELETE":
        records.pop(record_index)
        (save_json_records if resource in admin_json_resources else save_admin_records)(resource, records)
        if resource == "universities":
            programs = load_admin_records("programs") or []
            remaining_programs = [program for program in programs if str(program.get("university_id")) != record_id]
            if len(remaining_programs) != len(programs):
                save_admin_records("programs", remaining_programs)
        return jsonify({"message": "Record deleted successfully."}), 200

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"message": "A JSON object is required."}), 400
    clamp_non_negative_numeric_fields(payload)
    if resource == "universities":
        if not payload.get("name"):
            return jsonify({"message": "University name is required."}), 400
        fields = ["name", "city", "province", "sector", "website_url"]
        records[record_index] = {"id": record_id, **{field: str(payload.get(field, "Public" if field == "sector" else "")) for field in fields}}
        save_universities(records)
        records[record_index]["programs"] = load_universities_with_programs()[record_index].get("programs", [])
    elif resource in admin_json_resources:
        records[record_index] = {"id": record_id, **{key: value for key, value in payload.items() if key != "id"}}
        save_json_records(resource, records)
    else:
        columns = []
        for record in records:
            for key in record:
                if key != "id" and key not in columns:
                    columns.append(key)
        updated = {column: str(payload.get(column, "")) for column in columns}
        records[record_index] = {"id": record_id, **updated}
        save_admin_records(resource, records)
    return jsonify({"record": records[record_index]}), 200


@app.route("/api/admin/universities/<university_id>/programs", methods=["GET", "POST"])
def admin_programs(university_id):
    auth_error = require_admin()
    if auth_error:
        return auth_error
    universities = load_admin_records("universities") or []
    if not any(str(university.get("id")) == university_id for university in universities):
        return jsonify({"message": "University not found."}), 404
    programs = load_admin_records("programs") or []
    if request.method == "GET":
        return jsonify({"programs": [program for program in programs if str(program.get("university_id")) == university_id]}), 200
    payload = request.get_json(silent=True) or {}
    if not payload.get("degree_name"):
        return jsonify({"message": "Degree name is required."}), 400
    next_id = max((int(program["id"]) for program in programs if str(program.get("id", "")).isdigit()), default=0) + 1
    program = {
        "id": str(next_id),
        "university_id": university_id,
        "degree_name": str(payload["degree_name"]),
        "merit_formula": str(payload.get("merit_formula", "")),
        "eligibility_pct": non_negative_numeric_string(payload.get("eligibility_pct", "")),
        "url": str(payload.get("url", "")),
    }
    programs.append(program)
    save_admin_records("programs", programs)
    return jsonify({"program": program}), 201


@app.route("/api/admin/universities/<university_id>/programs/<program_id>", methods=["PUT", "DELETE"])
def admin_program(university_id, program_id):
    auth_error = require_admin()
    if auth_error:
        return auth_error
    programs = load_admin_records("programs") or []
    program_index = next((index for index, program in enumerate(programs) if str(program.get("id")) == program_id and str(program.get("university_id")) == university_id), None)
    if program_index is None:
        return jsonify({"message": "Program not found."}), 404
    if request.method == "DELETE":
        programs.pop(program_index)
        save_admin_records("programs", programs)
        return jsonify({"message": "Program deleted successfully."}), 200
    payload = request.get_json(silent=True) or {}
    if not payload.get("degree_name"):
        return jsonify({"message": "Degree name is required."}), 400
    programs[program_index]["degree_name"] = str(payload["degree_name"])
    programs[program_index]["merit_formula"] = str(payload.get("merit_formula", ""))
    programs[program_index]["eligibility_pct"] = non_negative_numeric_string(payload.get("eligibility_pct", ""))
    programs[program_index]["url"] = str(payload.get("url", ""))
    save_admin_records("programs", programs)
    return jsonify({"program": programs[program_index]}), 200


@app.route("/api/chatbot/responses", methods=["GET"])
def chatbot_responses():
    records = load_json_records("chatbot-responses") or []
    return jsonify({"responses": records}), 200


@app.route("/api/chatbot/interactions", methods=["POST"])
def chatbot_interaction():
    payload = request.get_json(silent=True) or {}
    interaction = {
        "id": secrets.token_hex(8),
        "userId": payload.get("userId"),
        "message": str(payload.get("message", "")),
        "response": str(payload.get("response", "")),
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    records = load_json_records("chatbot-interactions") or []
    records.append(interaction)
    save_json_records("chatbot-interactions", records[-1000:])
    log_activity("chatbot_interaction", {"userId": interaction["userId"]})
    return jsonify({"interaction": interaction}), 201


# CAREER EXPLANATION
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


def eligibility_overrides():
    criteria = load_json_records("eligibility") or []
    return {
        str(entry.get("field", "")).strip(): float(entry["minimumMarks"])
        for entry in criteria
        if entry.get("field") and str(entry.get("minimumMarks", "")).strip()
    }


# CAREER PREDICTION
@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json

        city = data.get("City", None)

        interests = (data.get("Interests") or "").strip()

        if not interests:
            return jsonify({
                "error": "Please describe your interests before submitting."
            }), 400

        if len(interests.split()) < 6:
            return jsonify({
                "error": "Please describe your interests in a full sentence "
                "(at least a few words of context) so the AI can make a "
                "confident prediction — e.g. \"I enjoy coding and building apps\"."
            }), 400

        vec = tfidf_vectorizer.transform([interests])
        proba = field_classifier.predict_proba(vec)[0]
        classes = field_classifier.classes_

        ranked = sorted(zip(classes, proba), key=lambda x: -x[1])
        career = ranked[0][0]
        confidence = round(float(ranked[0][1]), 3)
        low_confidence = confidence < 0.25

        reasons = generate_reason(data)
        criteria = eligibility_overrides()

        # UNIVERSITIES
        uni_df = load_university_programs_df()

        def find_matches(field, filter_city=True):
            minimum_marks = criteria.get(field)
            matches = uni_df[
                (
                    uni_df["program"].apply(
                        lambda program: field_matches_program(
                            program, field
                        )
                    )
                )
                &
                (
                    uni_df["eligibility_pct"].isna()
                    | (uni_df["eligibility_pct"] <= data["Marks"])
                )
                & (
                    minimum_marks is None
                    or data["Marks"] >= minimum_marks
                )
            ]

            if filter_city and city and str(city).strip():
                clean_city = str(city).strip().lower()
                matches = matches[
                    matches["city_norm"].str.lower().str.contains(clean_city, na=False)
                ]

            return matches.drop_duplicates(
                subset=["university", "program"]
            ).head(6)

        # 1. Try predicted career field in the selected city
        matched_field = career
        city_notice = None
        recommended = find_matches(career, filter_city=True)

        # 2. If no programs in the specific city, search nationwide for the SAME career field!
        if recommended.empty and city and str(city).strip():
            nationwide_matches = find_matches(career, filter_city=False)
            if not nationwide_matches.empty:
                recommended = nationwide_matches
                city_notice = f"No {career} programs found directly in {city}. Showing top programs across Pakistan instead."

        # 3. Only if no programs exist anywhere in Pakistan, fall back to next closest field
        if recommended.empty:
            for field, _score in ranked[1:]:
                fallback_matches = find_matches(field, filter_city=True)
                if fallback_matches.empty:
                    fallback_matches = find_matches(field, filter_city=False)
                if not fallback_matches.empty:
                    matched_field = field
                    recommended = fallback_matches
                    break

        universities_list = []

        for _, row in recommended.iterrows():

            merit = (
                row["eligibility_pct"]
                if pd.notna(row["eligibility_pct"])
                else None
            )

            if merit is None:
                eligibility = "Merit not specified"
                requirements = "Merit criteria not listed — check with the university"
            elif data["Marks"] >= merit:
                eligibility = "Eligible"
                requirements = f"Minimum {merit}% merit required"
            else:
                eligibility = "Not Eligible"
                requirements = f"Minimum {merit}% merit required"

            universities_list.append({
                "University": row["university"],
                "Program": row["program"],
                "City": row["city_norm"],
                "Merit": merit,
                "your_marks": data["Marks"],
                "eligibility": eligibility,
                "requirements": requirements,
                "link":
                row["url"]
                if pd.notna(row["url"]) and row["url"]
                else get_university_link(row["university"]),
                "guidance": [
                    "Apply before deadline",
                    "Prepare required documents",
                    "Check entry test schedule",
                ],
            })

        # SCHOLARSHIP FILTERING
        scholarship_df = load_scholarships_df()

        eligible_scholarships = scholarship_df[
            scholarship_df["min_merit_pct"].isna()
            | (scholarship_df["min_merit_pct"] <= data["Marks"])
        ]

        def build_scholarship_entry(row):
            merit = (
                row["min_merit_pct"]
                if pd.notna(row["min_merit_pct"])
                else None
            )

            return {
                "name": row["name"],
                "provider": row["provider"],
                "field": row["provider_type"] or row["basis"] or "General",
                "min_percentage": merit,
                "eligibility":
                "Merit not specified"
                if merit is None
                else "Eligible",
                "basis": row["basis"],
                "link": row["source_url"],
            }

        is_international = eligible_scholarships["provinces"].str.contains(
            "international", case=False, na=False
        )

        international_scholarships = [
            build_scholarship_entry(row)
            for _, row in eligible_scholarships[is_international]
            .head(6)
            .iterrows()
        ]

        pakistan_scholarships = [
            build_scholarship_entry(row)
            for _, row in eligible_scholarships[~is_international]
            .head(6)
            .iterrows()
        ]

        result = {
            "career": career,
            "confidence": confidence,
            "low_confidence": low_confidence,
            "matched_field": matched_field,
            "city_notice": city_notice,
            "reasons": reasons,
            "universities": universities_list,
            "international_scholarships": international_scholarships,
            "pakistan_scholarships": pakistan_scholarships,
        }
        log_activity("assessment_completed", {"career": career, "matchedField": matched_field})
        assessment_records = load_json_records("assessments") or []
        assessment_records.append({
            "id": secrets.token_hex(8),
            "answers": data,
            "result": result,
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        })
        save_json_records("assessments", assessment_records[-1000:])
        return jsonify(result)

    except Exception as e:
        return jsonify({
            "error": str(e)
        })


# SCHOLARSHIP API
@app.route("/scholarships", methods=["GET"])
def get_scholarships():
    try:
        records = load_admin_records("scholarships") or []
        scholarships = [
            {
                "name": record.get("name", ""),
                "provider": record.get("provider", ""),
                "provinces": record.get("provinces", ""),
                "basis": record.get("basis", ""),
                "min_percentage": record.get("min_merit_pct") or None,
                "field": record.get("provider_type") or record.get("basis") or "General",
                "link": record.get("source_url", ""),
            }
            for record in records
        ]

        return jsonify(scholarships)

    except Exception as e:
        return jsonify({
            "error": str(e)
        })


if __name__ == "__main__":
    app.run(
        debug=True,
        host="127.0.0.1",
        port=5000
    )