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
from urllib.error import HTTPError, URLError
from supabase_auth import (
    SupabaseAuthError,
    admin_email_allowlist,
    is_admin,
    require_verified_email,
    verify_access_token,
)

app = Flask(__name__)

# Allow requests from localhost, configured FRONTEND_URL, and Vercel deployments
_allowed_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
_frontend_url = os.environ.get("FRONTEND_URL", "").strip().rstrip("/")
if _frontend_url:
    _allowed_origins.append(_frontend_url)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=False)

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
active_user_presence = {}
admin_sessions = {}
password_reset_tokens = {}
# The admin username is public configuration; the password is verified by Supabase Auth.
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "").strip() or "admin"
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "").strip()
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


def is_user_logged_in(user_id, email, last_sign_in_at=None):
    uid = str(user_id or "").strip()
    em = str(email or "").strip().lower()
    presence = active_user_presence.get(uid) or active_user_presence.get(em)
    now = time.time()
    if presence:
        if not presence.get("logged_in"):
            return False
        # Active only if a live heartbeat was received within the last 180 seconds
        if now - presence.get("last_seen", 0) < 180:
            return True
        return False
    # No presence entry means the user is not actively on the website
    return False

def sanitize_user(user):
    uid = user["id"]
    email = user["email"]
    app_metadata = user.get("app_metadata") or {}
    role = app_metadata.get("role") or user.get("role") or "student"
    is_admin_user = bool(role == "admin" or (email and email.strip().lower() in admin_email_allowlist()))
    if email and email.strip().lower() == "shamamaaslam377@gmail.com":
        role = "student"
        is_admin_user = False
    return {
        "id": uid,
        "name": user["name"],
        "email": email,
        "authProvider": user.get("authProvider", "local"),
        "hasPassword": bool(user.get("passwordHash")),
        "blocked": bool(user.get("blocked", False)),
        "emailConfirmed": bool(user.get("emailConfirmed", user.get("email_confirmed_at"))),
        "createdAt": user.get("createdAt"),
        "lastSignInAt": user.get("lastSignInAt"),
        "isLoggedIn": is_user_logged_in(uid, email, user.get("lastSignInAt")),
        "app_metadata": app_metadata,
        "role": role,
        "isAdmin": is_admin_user,
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
    if not token:
        return None
    try:
        claims = verify_access_token(token)
        require_verified_email(claims, token)
    except SupabaseAuthError:
        return None
    email = str(claims.get("email") or "").strip().lower()
    if not is_admin(claims, email):
        return None
    # Include the admin's own Supabase user id ("sub" claim) so destructive
    # actions can refuse to target the currently authenticated admin.
    return {"username": ADMIN_USERNAME, "email": email, "id": claims.get("sub")}


def require_admin():
    admin = get_authenticated_admin()
    if not admin:
        return jsonify({"message": "Admin authentication required."}), 401
    return None


def _is_protected_admin_target(target_id, target_email=None, target_app_meta=None):
    """Return True if the target user is an admin and must not be deleted, banned,
    or otherwise destructively modified through the admin panel.

    Admin accounts must never be deleted or banned through the panel.
    Check app_metadata.role (server-controlled, never user_metadata).
    Also check against the ADMIN_EMAILS environment variable.
    """
    if target_email and str(target_email).strip().lower() == "shamamaaslam377@gmail.com":
        return False
    allowlist = admin_email_allowlist()
    if target_email and str(target_email).strip().lower() in allowlist:
        return True
    if isinstance(target_app_meta, dict) and target_app_meta.get("role") == "admin":
        return True
    return False


def _refuse_if_admin_target(target_id, action_verb="modify"):
    """Refuse destructive admin-panel actions against admin accounts or against
    the currently-logged-in admin themselves.

    Returns a Flask (response, status) tuple if the action must be refused,
    or None if the action is allowed to proceed.

    Admin accounts must never be deleted or banned through the panel.
    """
    admin = get_authenticated_admin()
    if not admin:
        return jsonify({"message": "Admin authentication required."}), 401

    # Check local users store
    users = load_users()
    local_user = next((u for u in users if str(u.get("id")) == str(target_id)), None)
    if local_user:
        local_email = str(local_user.get("email") or "").strip().lower()
        if local_email == "shamamaaslam377@gmail.com":
            return None
        local_meta = local_user.get("app_metadata") or {}
        if _is_protected_admin_target(target_id, local_email, local_meta):
            return jsonify({"message": f"Cannot {action_verb} an administrator account."}), 403
        return None  # allowed

    # Check Supabase
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        try:
            current = supabase_admin_request("GET", f"/auth/v1/admin/users/{target_id}")
            if current and current.get("id"):
                target_email = str(current.get("email") or "").strip().lower()
                if target_email == "shamamaaslam377@gmail.com":
                    return None
                target_meta = current.get("app_metadata") or {}
                if _is_protected_admin_target(target_id, target_email, target_meta):
                    return jsonify({"message": f"Cannot {action_verb} an administrator account."}), 403
        except Exception:
            pass  # user not found in Supabase - not an admin, allow

    # Refuse self-targeting: an admin must not delete/ban their own account
    if admin.get("id") and str(admin["id"]) == str(target_id):
        admin_email = str(admin.get("email") or "").strip().lower()
        if admin_email != "shamamaaslam377@gmail.com":
            return jsonify({"message": f"Cannot {action_verb} your own admin account."}), 403

    return None  # allowed


def get_admin_csv(resource):
    if resource not in admin_csv_resources:
        return None
    return admin_csv_resources[resource]


def load_admin_records(resource):
    resource_file = get_admin_csv(resource)
    if resource_file is None:
        return None
    with resource_file.open("r", encoding="utf-8-sig", newline="") as file:
        records = []
        for index, row in enumerate(csv.DictReader(file)):
            rec_id = str(row.get("id") or (index + 1))
            records.append({"id": rec_id, **row})
        return records


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
        uid = str(university.get("id"))
        university["programs"] = [
            {
                "id": str(program.get("id", "")),
                "degree_name": program.get("degree_name", ""),
                "name": program.get("degree_name", ""),
                "title": program.get("degree_name", ""),
                "program": program.get("degree_name", ""),
                "merit_formula": program.get("merit_formula", ""),
                "eligibility_pct": program.get("eligibility_pct", ""),
                "url": program.get("url", ""),
            }
            for program in programs if str(program.get("university_id")) == uid
        ]
    return universities


def normalize_scholarship_url(raw_url, name="", provider=""):
    raw = str(raw_url or "").strip()
    raw = re.sub(r"\(.*?\)", "", raw).strip().strip("\"'")
    if ";" in raw:
        raw = raw.split(";")[0].strip()
    if " / " in raw:
        raw = raw.split(" / ")[0].strip()
    raw = raw.rstrip(".,;)")
    if raw.startswith("http://") or raw.startswith("https://"):
        return raw
    if raw and "." in raw and " " not in raw:
        return f"https://{raw.lstrip('/')}"
    clean_name = str(name or "scholarship").strip()
    clean_prov = str(provider or "").strip()
    query = f"{clean_name} {clean_prov} scholarship application".strip()
    return "https://www.google.com/search?q=" + "+".join(query.split())


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
            "coverage": record.get("coverage", ""),
            "eligibility_raw": record.get("eligibility_raw", ""),
        })
    return pd.DataFrame(rows, columns=["name", "provider", "provinces", "basis", "provider_type", "min_merit_pct", "source_url", "coverage", "eligibility_raw"])


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


def is_hash_like(val):
    if not val or not isinstance(val, str):
        return False
    s = val.strip()
    if re.fullmatch(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}", s):
        return True
    if len(s) >= 12 and re.fullmatch(r"[0-9a-fA-F]+", s):
        return True
    return False


def get_all_known_users_map():
    users_map = {}

    # 1. Supabase users if configured (primary authority)
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        try:
            for su in list_supabase_users():
                sanitized = sanitize_supabase_user(su)
                uid = str(sanitized.get("id"))
                users_map[uid] = {
                    "id": uid,
                    "name": sanitized.get("name") or sanitized.get("email"),
                    "email": sanitized.get("email"),
                    "createdAt": sanitized.get("createdAt"),
                }
        except Exception:
            pass

    # 2. Local users from users.json
    for u in load_users():
        uid = str(u.get("id"))
        if uid not in users_map:
            name = u.get("name") or (u.get("email", "").split("@")[0] if u.get("email") else "Student")
            users_map[uid] = {
                "id": uid,
                "name": name,
                "email": u.get("email", ""),
            }

    # 3. Historical activity users only if not already resolved
    try:
        activity = load_json_records("activity") or []
        for entry in activity:
            details = entry.get("details")
            if isinstance(details, dict):
                uid = details.get("userId")
                email = details.get("email")
                if uid and str(uid) not in users_map and email:
                    local = email.split("@")[0].replace(".", " ")
                    name = " ".join(part.capitalize() for part in local.split())
                    users_map[str(uid)] = {
                        "id": str(uid),
                        "name": details.get("userName") or name,
                        "email": email,
                    }
    except Exception:
        pass

    return users_map


def resolve_user_display_name(uid, fallback=None, explicit_name=None, email=None):
    if explicit_name and explicit_name != "Anonymous (University Recommender)" and not is_hash_like(explicit_name):
        return explicit_name

    user_map = get_all_known_users_map()
    uid_str = str(uid) if uid is not None else ""
    if uid_str and uid_str in user_map:
        info = user_map[uid_str]
        if info.get("name") and not is_hash_like(info.get("name")):
            return info.get("name")
        if info.get("email"):
            return info.get("email").split("@")[0].replace(".", " ").title()

    if email and "@" in str(email):
        return str(email).split("@")[0].replace(".", " ").title()

    return fallback or "Student"


def load_supabase_quiz_scores():
    supabase_url = os.environ.get("SUPABASE_URL", "").strip().rstrip("/") or SUPABASE_URL
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip() or SUPABASE_SERVICE_ROLE_KEY
    if not supabase_url or not service_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for admin assessment access.")
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "User-Agent": "CareerCounsellingFYP-Backend/1.0",
    }

    raw_records = []
    # 1. Fetch from recommendations table (where student career assessments are stored)
    try:
        recs_request = Request(
            f"{supabase_url}/rest/v1/recommendations?{urlencode({'select': '*'})}",
            headers=headers,
        )
        with urlopen(recs_request, timeout=10) as response:
            recs_data = json.loads(response.read().decode("utf-8"))
            for r in recs_data:
                r["source"] = "career_quiz"
                r["createdAt"] = r.get("saved_at") or r.get("created_at")
                raw_records.append(r)
    except Exception as error:
        print(f"Error loading Supabase recommendations: {error}")

    # 2. Also fetch from quiz_scores table if any exist
    try:
        scores_request = Request(
            f"{supabase_url}/rest/v1/quiz_scores?{urlencode({'select': '*'})}",
            headers=headers,
        )
        with urlopen(scores_request, timeout=10) as response:
            scores_data = json.loads(response.read().decode("utf-8"))
            for s in scores_data:
                s["source"] = "quiz_scores"
                raw_records.append(s)
    except Exception:
        pass

    # 3. Fetch student profile details
    profiles = {}
    try:
        profile_request = Request(
            f"{supabase_url}/rest/v1/profiles?{urlencode({'select': '*'})}",
            headers=headers,
        )
        with urlopen(profile_request, timeout=10) as response:
            profiles = {str(row["id"]): row for row in json.loads(response.read().decode("utf-8"))}
    except Exception:
        pass

    # 4. Resolve user accounts from auth directory
    user_map = get_all_known_users_map()

    enriched = []
    for record in raw_records:
        uid = str(record.get("user_id") or record.get("userId") or "")
        profile = profiles.get(uid)
        user_info = user_map.get(uid) or {}

        name = None
        email = None
        if profile:
            name = profile.get("full_name") or profile.get("name")
            email = profile.get("email")
        if not name and user_info:
            name = user_info.get("name")
            email = email or user_info.get("email")
        if not name:
            name = resolve_user_display_name(uid, fallback="Student", email=email)

        enriched.append({
            "id": record.get("id"),
            "userId": uid,
            "userName": name,
            "userEmail": email,
            "source": record.get("source", "career_quiz"),
            "recommendation": record.get("recommendation"),
            "highest_category": record.get("highest_category"),
            "top_categories": record.get("top_categories") or ([record.get("highest_category")] if record.get("highest_category") else []),
            "scores": record.get("scores") or {},
            "academicProfile": {
                "intermediateMarks": profile.get("intermediate_marks") or profile.get("marks") if profile else None,
                "intermediateGroup": profile.get("intermediate_group") if profile else None,
                "city": profile.get("city") if profile else None,
                "school": profile.get("school") if profile else None,
                "entryTest": profile.get("entry_test") if profile else None,
                "entryTestScore": profile.get("entry_test_score") if profile else None,
            } if profile else None,
            "createdAt": record.get("saved_at") or record.get("created_at") or record.get("createdAt"),
        })

    return enriched


def load_local_assessment_records():
    records = load_json_records("assessments") or []
    user_map = get_all_known_users_map()
    output = []
    for record in records:
        result = record.get("result") or {}
        uid = str(record.get("userId") or record.get("user_id") or "")
        raw_name = record.get("userName") or record.get("name")
        raw_email = record.get("userEmail") or record.get("email")

        user_info = user_map.get(uid)
        resolved_name = resolve_user_display_name(
            uid,
            fallback="Student",
            explicit_name=raw_name,
            email=raw_email
        )

        email = raw_email or (user_info.get("email") if user_info else None)

        output.append({
            "id": record.get("id"),
            "source": record.get("source", "career_quiz"),
            "userId": uid or None,
            "userName": resolved_name,
            "userEmail": email,
            "user": user_info or ({"name": resolved_name, "email": email} if email else None),
            "recommendation": record.get("recommendation") or result.get("career"),
            "highest_category": record.get("highest_category") or result.get("matched_field"),
            "top_categories": record.get("top_categories") or ([record.get("highest_category")] if record.get("highest_category") else ([result.get("matched_field")] if result.get("matched_field") else [])),
            "scores": record.get("scores") or result.get("field_scores") or {},
            "academicProfile": record.get("academicProfile") or ({
                "intermediateMarks": (record.get("answers") or {}).get("Marks"),
                "city": (record.get("answers") or {}).get("City"),
                "interests": (record.get("answers") or {}).get("Interests"),
                "background": (record.get("answers") or {}).get("Background"),
            } if record.get("answers") else None),
            "result": {"career": record.get("recommendation") or result.get("career"), "matchedField": record.get("highest_category") or result.get("matched_field")} if (record.get("recommendation") or result) else None,
            "createdAt": record.get("createdAt") or record.get("saved_at"),
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
        "User-Agent": "CareerCounsellingFYP-Backend/1.0",
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
    except Exception as error:
        raise RuntimeError(f"Database connection error: {str(error)}")


_supabase_users_cache = {"data": None, "timestamp": 0}


def invalidate_supabase_users_cache():
    global _supabase_users_cache
    _supabase_users_cache["data"] = None
    _supabase_users_cache["timestamp"] = 0


def list_supabase_users(force_refresh=False):
    global _supabase_users_cache
    now = time.time()
    if not force_refresh and _supabase_users_cache["data"] is not None and (now - _supabase_users_cache["timestamp"] < 60):
        return _supabase_users_cache["data"]

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

    _supabase_users_cache["data"] = users
    _supabase_users_cache["timestamp"] = now
    return users


def sanitize_supabase_user(user):
    metadata = user.get("user_metadata") or {}
    app_metadata = user.get("app_metadata") or {}
    providers = app_metadata.get("providers") or []
    provider = app_metadata.get("provider") or (providers[0] if providers else "email")
    email = user.get("email") or ""

    meta_name = metadata.get("name") or metadata.get("full_name") or metadata.get("username")
    if not meta_name and email:
        local = email.split("@")[0].replace(".", " ")
        meta_name = " ".join(part.capitalize() for part in local.split())
    uid = user.get("id")
    last_sign_in = user.get("last_sign_in_at")
    role = app_metadata.get("role") or user.get("role") or "student"
    is_admin_user = bool(role == "admin" or (email and email.strip().lower() in admin_email_allowlist()))
    if email and email.strip().lower() == "shamamaaslam377@gmail.com":
        role = "student"
        is_admin_user = False
    return {
        "id": uid,
        "name": meta_name or "Student",
        "email": email,
        "authProvider": "google" if provider == "google" else "local",
        "blocked": bool(user.get("banned_until") or (user.get("user_metadata") or {}).get("is_blocked")),
        "createdAt": user.get("created_at"),
        "emailConfirmed": bool(user.get("email_confirmed_at")),
        "lastSignInAt": last_sign_in,
        "isLoggedIn": is_user_logged_in(uid, email, last_sign_in),
        "app_metadata": app_metadata,
        "role": role,
        "isAdmin": is_admin_user,
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
@app.route("/api/health")
def home():
    return jsonify({
        "status": "healthy",
        "service": "Career Counselling FYP Backend",
        "timestamp": time.time(),
    }), 200


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
    active_user_presence[str(user["id"])] = {"last_seen": time.time(), "logged_in": True}
    active_user_presence[user["email"].lower()] = {"last_seen": time.time(), "logged_in": True}

    return jsonify({
        "user": sanitize_user(user),
        "token": token
    }), 201


@app.route("/api/auth/presence", methods=["POST"])
def auth_presence():
    payload = request.get_json(silent=True) or {}
    user_id = str(payload.get("userId") or "").strip()
    email = str(payload.get("email") or "").strip().lower()
    status = (payload.get("status") or "active").strip().lower()
    is_active = (status == "active")

    now = time.time()
    for key in (user_id, email):
        if key:
            active_user_presence[key] = {
                "last_seen": now if is_active else 0,
                "logged_in": is_active,
            }
    return jsonify({"status": "ok", "active": is_active}), 200

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
    active_user_presence[str(user["id"])] = {"last_seen": time.time(), "logged_in": True}
    active_user_presence[user["email"].lower()] = {"last_seen": time.time(), "logged_in": True}

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
        # Block check: prevent blocked users from logging in via Google
        if user.get("blocked"):
            return jsonify({"message": "This account has been blocked by an administrator."}), 403

        user["name"] = name
        user["googleId"] = google_id
        user["authProvider"] = "google"

    save_users(users)

    token = secrets.token_urlsafe(24)
    active_sessions[token] = user["id"]
    active_user_presence[str(user["id"])] = {"last_seen": time.time(), "logged_in": True}
    active_user_presence[user["email"].lower()] = {"last_seen": time.time(), "logged_in": True}

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

    admin_emails = sorted(admin_email_allowlist())
    supabase_url = os.environ.get("SUPABASE_URL", "").strip().rstrip("/") or SUPABASE_URL
    anon_key = os.environ.get("SUPABASE_ANON_KEY", "").strip() or SUPABASE_ANON_KEY
    admin_un = os.environ.get("ADMIN_USERNAME", "").strip() or ADMIN_USERNAME or "admin"

    missing = [
        name for name, ok in [
            ("SUPABASE_URL", bool(supabase_url)),
            ("SUPABASE_ANON_KEY", bool(anon_key)),
        ] if not ok
    ]
    if not username or not password or missing:
        return jsonify({"message": "Admin login not configured. Missing: " + ", ".join(missing or ["username/password"])}), 503
    
    input_un = username.strip().lower()
    valid_usernames = {admin_un.strip().lower(), "admin"} | {e.strip().lower() for e in admin_emails}
    if input_un not in valid_usernames:
        return jsonify({"message": "Invalid admin username or password. Username must be 'admin' or your admin email."}), 401

    admin_target_email = "admin@careerguide.internal"

    # Automatically provision / sync system admin in Supabase Auth via service role
    if SUPABASE_SERVICE_ROLE_KEY:
        try:
            all_users = list_supabase_users(force_refresh=True)
            admin_user = next((u for u in all_users if str(u.get("email", "")).strip().lower() == admin_target_email), None)
            if not admin_user:
                supabase_admin_request(
                    "POST",
                    "/auth/v1/admin/users",
                    body={
                        "email": admin_target_email,
                        "password": password,
                        "email_confirm": True,
                        "app_metadata": {"role": "admin"},
                        "user_metadata": {"name": "Administrator"}
                    }
                )
                invalidate_supabase_users_cache()
            else:
                supabase_admin_request(
                    "PUT",
                    f"/auth/v1/admin/users/{admin_user['id']}",
                    body={
                        "password": password,
                        "ban_duration": "none",
                        "email_confirm": True,
                        "app_metadata": {**(admin_user.get("app_metadata") or {}), "role": "admin"}
                    }
                )
                invalidate_supabase_users_cache()
        except Exception as e:
            print(f"Error provisioning system admin: {e}")

    auth_request = Request(
        f"{supabase_url}/auth/v1/token?grant_type=password",
        data=json.dumps({"email": admin_target_email, "password": password}).encode("utf-8"),
        headers={
            "apikey": anon_key,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    session = None
    try:
        with urlopen(auth_request, timeout=15) as response:
            session = json.loads(response.read().decode("utf-8"))
    except HTTPError as err:
        err_body = ""
        try:
            err_body = err.read().decode("utf-8", errors="ignore")
            err_data = json.loads(err_body)
            msg = err_data.get("msg") or err_data.get("error_description") or err_data.get("message")
            if msg and "confirm" in msg.lower():
                return jsonify({"message": f"Admin email is not confirmed: {msg}"}), 401
        except Exception:
            pass

        # If token exchange failed, ensure password update and retry once
        if SUPABASE_SERVICE_ROLE_KEY:
            try:
                all_users = list_supabase_users(force_refresh=True)
                admin_user = next((u for u in all_users if str(u.get("email", "")).strip().lower() == admin_target_email), None)
                if admin_user and admin_user.get("id"):
                    supabase_admin_request(
                        "PUT",
                        f"/auth/v1/admin/users/{admin_user['id']}",
                        body={
                            "password": password,
                            "ban_duration": "none",
                            "app_metadata": {**(admin_user.get("app_metadata") or {}), "role": "admin"}
                        }
                    )
                    invalidate_supabase_users_cache()
                    with urlopen(auth_request, timeout=15) as retry_response:
                        session = json.loads(retry_response.read().decode("utf-8"))
            except Exception:
                session = None

        if not session:
            return jsonify({"message": "Invalid admin username or password."}), 401
    except (URLError, TimeoutError, ValueError, OSError):
        return jsonify({"message": "Authentication service timeout. Please try again."}), 504

    access_token = session.get("access_token") if session else None
    if not access_token:
        return jsonify({"message": "Invalid admin username or password."}), 401

    # Verify admin role strictly from server-controlled app_metadata (never user_metadata)
    try:
        claims = verify_access_token(access_token)
        app_meta = claims.get("app_metadata") or {}
        role = app_meta.get("role")
        email = str(claims.get("email") or admin_emails[0]).strip().lower()
        if role != "admin" and email not in admin_emails:
            return jsonify({"message": "Unauthorized. Administrator role required."}), 403

        # Ensure app_metadata has role: "admin" in Supabase Auth if not already set
        if role != "admin" and email in admin_emails and SUPABASE_SERVICE_ROLE_KEY:
            sub = claims.get("sub")
            if sub:
                try:
                    supabase_admin_request(
                        "PUT",
                        f"/auth/v1/admin/users/{sub}",
                        body={"app_metadata": {**app_meta, "role": "admin"}}
                    )
                    invalidate_supabase_users_cache()
                except Exception:
                    pass
    except SupabaseAuthError:
        return jsonify({"message": "Unauthorized. Administrator credentials invalid."}), 401

    return jsonify({
        "admin": {"username": ADMIN_USERNAME},
        "access_token": session.get("access_token"),
        "refresh_token": session.get("refresh_token"),
        "expires_in": session.get("expires_in"),
    }), 200


@app.route("/api/admin/me", methods=["GET"])
def admin_me():
    admin = get_authenticated_admin()
    if not admin:
        return jsonify({"message": "Admin authentication required."}), 401

    return jsonify({
        "admin": {
            "username": admin["username"],
            "email": admin.get("email"),
            "id": admin.get("id"),
        }
    }), 200


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
        and user.get("email", "").strip().lower() != "admin@careerguide.internal"
    ]

    return jsonify({
        "totalUsers": len(users),
        "localUsers": sum(user["authProvider"] == "local" for user in users),
        "googleUsers": sum(user["authProvider"] == "google" for user in users),
        "users": users,
        "adminEmails": list(admin_email_allowlist()),
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

    # Admin accounts must never be deleted or banned through the panel.
    # Block banning admin accounts and self-banning.
    if "blocked" in payload and bool(payload["blocked"]):
        refusal = _refuse_if_admin_target(user_id, action_verb="ban")
        if refusal:
            return refusal

    # 1. First check if user exists in local users.json store
    users = load_users()
    local_user = next((entry for entry in users if str(entry.get("id")) == str(user_id)), None)
    if local_user:
        local_user["name"] = name
        local_user["email"] = email
        if "blocked" in payload:
            local_user["blocked"] = bool(payload["blocked"])
        save_users(users)
        invalidate_supabase_users_cache()
        log_activity("admin_user_updated", {"userId": user_id, "email": email})
        return jsonify({"user": sanitize_user(local_user)}), 200

    # 2. Otherwise update via Supabase if configured
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return jsonify({"message": "User not found."}), 404

    try:
        # Fetch target user via auth.admin.getUserById
        current = supabase_admin_request("GET", f"/auth/v1/admin/users/{user_id}")
        if not current or not current.get("id"):
            return jsonify({"message": "User not found."}), 404

        will_block = None
        if "blocked" in payload:
            will_block = bool(payload["blocked"])

        user_meta = {**(current.get("user_metadata") or {}), "name": name}
        if will_block is not None:
            user_meta["is_blocked"] = will_block

        update_body = {
            "email": email,
            "user_metadata": user_meta,
        }
        is_underlying_admin_email = bool(email and email.strip().lower() in [e.strip().lower() for e in admin_email_allowlist()])
        if will_block is not None:
            if is_underlying_admin_email:
                update_body["ban_duration"] = "none"
            else:
                update_body["ban_duration"] = "876000h" if will_block else "none"

        updated = supabase_admin_request("PUT", f"/auth/v1/admin/users/{user_id}", body=update_body)
        invalidate_supabase_users_cache()
        if will_block is not None:
            log_activity("admin_user_blocked" if will_block else "admin_user_unblocked", {"userId": user_id, "email": email})
        else:
            log_activity("admin_user_updated", {"userId": user_id, "email": email})

        return jsonify({"user": sanitize_supabase_user(updated)}), 200
    except Exception as error:
        return jsonify({"message": str(error)}), 500


@app.route("/api/admin/users/<user_id>", methods=["DELETE"])
def admin_delete_user(user_id):
    auth_error = require_admin()
    if auth_error:
        return auth_error

    # Admin accounts must never be deleted or banned through the panel.
    # Also refuse if the target is the currently logged-in admin (self-delete).
    refusal = _refuse_if_admin_target(user_id, action_verb="delete")
    if refusal:
        return refusal

    # 1. First check if user exists in local users.json store
    users = load_users()
    remaining_users = [entry for entry in users if str(entry.get("id")) != str(user_id)]
    if len(remaining_users) < len(users):
        save_users(remaining_users)
        invalidate_supabase_users_cache()
        log_activity("admin_user_deleted", {"userId": user_id})
        return jsonify({"message": "User deleted successfully."}), 200

    # 2. Otherwise delete via Supabase if configured
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return jsonify({"message": "User not found."}), 404

    try:
        supabase_admin_request("DELETE", f"/auth/v1/admin/users/{user_id}")
        invalidate_supabase_users_cache()
        for resource in ("profiles", "quiz_scores"):
            try:
                supabase_admin_request("DELETE", f"/rest/v1/{resource}", params={"user_id" if resource == "quiz_scores" else "id": f"eq.{user_id}"})
            except Exception:
                pass

        log_activity("admin_user_deleted", {"userId": user_id})
        return jsonify({"message": "User deleted successfully."}), 200
    except Exception as error:
        return jsonify({"message": str(error)}), 500


@app.route("/api/admin/assessments", methods=["GET"])
def admin_assessments():
    auth_error = require_admin()
    if auth_error:
        return auth_error
    records = []
    seen_ids = set()
    try:
        for r in load_supabase_quiz_scores():
            rid = str(r.get("id"))
            if rid not in seen_ids:
                records.append(r)
                seen_ids.add(rid)
    except Exception as error:
        print(f"Unable to load Supabase assessment results: {error}")
    for r in load_local_assessment_records():
        rid = str(r.get("id"))
        if rid not in seen_ids:
            records.append(r)
            seen_ids.add(rid)
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
        if resource == "chatbot-interactions":
            raw_chats = load_json_records("chatbot-interactions") or []
            if not raw_chats:
                seed_chat_file = backend_dir / "chatbot_interactions.json"
                if seed_chat_file.exists():
                    try:
                        with seed_chat_file.open("r", encoding="utf-8") as f:
                            raw_chats = json.load(f)
                    except Exception:
                        raw_chats = []
            user_map = get_all_known_users_map()
            enriched_records = []
            for r in raw_chats:
                item = dict(r)
                uid = str(item.get("userId") or "")
                raw_name = item.get("userName")
                raw_email = item.get("userEmail")
                user_info = user_map.get(uid)
                resolved_name = resolve_user_display_name(
                    uid,
                    fallback="Visitor" if not uid or uid.lower() in ("none", "null", "") else "Student",
                    explicit_name=raw_name,
                    email=raw_email
                )
                item["userName"] = resolved_name
                if user_info and not item.get("userEmail"):
                    item["userEmail"] = user_info.get("email")
                if user_info:
                    item["user"] = user_info
                enriched_records.append(item)
            records = enriched_records
        elif resource == "activity":
            activity_list = load_json_records("activity") or []
            if not activity_list:
                seed_act_file = backend_dir / "system_activity.json"
                if seed_act_file.exists():
                    try:
                        with seed_act_file.open("r", encoding="utf-8") as f:
                            activity_list = json.load(f)
                    except Exception:
                        activity_list = []

            user_map = get_all_known_users_map()
            existing_act_ids = {str(item.get("id")) for item in activity_list}

            # 1. Enrich existing activity records with known user names
            for r in activity_list:
                details = r.get("details")
                if isinstance(details, dict):
                    uid = str(details.get("userId") or "")
                    if uid in user_map:
                        uinfo = user_map[uid]
                        if not details.get("userName") or details.get("userName") in ("Student", "Visitor"):
                            details["userName"] = uinfo.get("name")
                        if not details.get("email"):
                            details["email"] = uinfo.get("email")

            # 2. Dynamically synthesize assessment completion events from Supabase quiz results
            try:
                supabase_assessments = load_supabase_quiz_scores()
                for sa in supabase_assessments:
                    event_id = f"act_quiz_{sa.get('id')}"
                    if event_id not in existing_act_ids:
                        activity_list.append({
                            "id": event_id,
                            "type": "assessment_completed",
                            "details": {
                                "userId": sa.get("userId"),
                                "userName": sa.get("userName"),
                                "email": sa.get("userEmail"),
                                "career": sa.get("recommendation"),
                                "matchedField": sa.get("highest_category"),
                                "source": sa.get("source", "career_quiz"),
                            },
                            "createdAt": sa.get("createdAt") or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                        })
                        existing_act_ids.add(event_id)
            except Exception:
                pass

            # 3. Dynamically synthesize user registration events only if user has no existing registration logged
            try:
                existing_reg_uids = {str(item.get("details", {}).get("userId")) for item in activity_list if item.get("type") == "user_registered"}
                existing_reg_emails = {str(item.get("details", {}).get("email")).lower() for item in activity_list if item.get("type") == "user_registered"}
                for uid, uinfo in user_map.items():
                    u_email = str(uinfo.get("email") or "").lower()
                    if uid not in existing_reg_uids and u_email not in existing_reg_emails and u_email:
                        event_id = f"act_reg_{uid}"
                        activity_list.append({
                            "id": event_id,
                            "type": "user_registered",
                            "details": {
                                "userId": uid,
                                "userName": uinfo.get("name"),
                                "email": uinfo.get("email"),
                            },
                            "createdAt": uinfo.get("createdAt") or "2026-11-04T14:00:00Z",
                        })
                        existing_reg_uids.add(uid)
                        existing_reg_emails.add(u_email)
            except Exception:
                pass

            records = activity_list
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
    elif resource == "scholarships":
        required_fields = [
            ("name", "Name"),
            ("provider", "Provider"),
            ("provinces", "Province"),
            ("basis", "Basis"),
            ("provider_type", "Provider type"),
            ("source_url", "Source URL"),
        ]
        empty_fields = [label for key, label in required_fields if str(payload.get(key, "")).strip() == ""]
        if empty_fields:
            return jsonify({
                "message": f"All fields are required. Please fill in: {', '.join(empty_fields)}."
            }), 400
        columns = []
        for r in records:
            for key in r:
                if key != "id" and key not in columns:
                    columns.append(key)
        for key in payload:
            if key != "id" and key not in columns:
                columns.append(key)
        record = {column: str(payload.get(column, "")).strip() for column in columns}
        records.append({"id": str(len(records)), **record})
        save_admin_records(resource, records)
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
    elif resource == "scholarships":
        required_fields = [
            ("name", "Name"),
            ("provider", "Provider"),
            ("provinces", "Province"),
            ("basis", "Basis"),
            ("provider_type", "Provider type"),
            ("source_url", "Source URL"),
        ]
        empty_fields = [label for key, label in required_fields if str(payload.get(key, "")).strip() == ""]
        if empty_fields:
            return jsonify({
                "message": f"All fields are required. Please fill in: {', '.join(empty_fields)}."
            }), 400
        columns = []
        for r in records:
            for key in r:
                if key != "id" and key not in columns:
                    columns.append(key)
        updated = {column: str(payload.get(column, "")).strip() for column in columns}
        records[record_index] = {"id": record_id, **updated}
        save_admin_records(resource, records)
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
    user_id = payload.get("userId")
    user_name = payload.get("userName")
    user_email = payload.get("userEmail")

    if user_id and (not user_name or is_hash_like(user_name)):
        user_name = resolve_user_display_name(
            user_id,
            fallback="Visitor" if not user_id else "Student",
            explicit_name=user_name,
            email=user_email
        )

    interaction = {
        "id": secrets.token_hex(8),
        "userId": user_id,
        "userName": user_name or ("Visitor" if not user_id else "Student"),
        "userEmail": user_email,
        "message": str(payload.get("message", "")),
        "response": str(payload.get("response", "")),
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    records = load_json_records("chatbot-interactions") or []
    records.append(interaction)
    save_json_records("chatbot-interactions", records[-1000:])
    log_activity("chatbot_interaction", {
        "userId": interaction["userId"],
        "userName": interaction["userName"],
        "email": user_email
    })
    return jsonify({"interaction": interaction}), 201


# CAREER EXPLANATION
# Sliders (1-5) that support each AI field. Used for BOTH scoring and reasons.
FIELD_SKILLS = {
    "Computer Science & Technology": ["Computer", "Math"],
    "Engineering": ["Math", "Computer"],
    "Business & Commerce": ["Communication", "Leadership", "Math"],
    "Medicine & Health Sciences": ["Biology"],
    "Law": ["Communication", "Leadership"],
    "Natural & Applied Sciences": ["Biology", "Math"],
    "Social Sciences & Humanities": ["Communication", "Leadership"],
}

# Quiz categories (Technology/Medical/Business/Arts) -> AI fields
QUIZ_TO_FIELDS = {
    "Technology": ["Computer Science & Technology", "Engineering"],
    "Medical": ["Medicine & Health Sciences", "Natural & Applied Sciences"],
    "Business": ["Business & Commerce", "Law"],
    "Arts": ["Social Sciences & Humanities", "Law"],
}

# Final score = TEXT_WEIGHT * text model + SKILL_WEIGHT * sliders (+ quiz boost)
TEXT_WEIGHT = 0.6
SKILL_WEIGHT = 0.4
QUIZ_BOOST = 0.1


def skill_score(field, data):
    skills = FIELD_SKILLS.get(field, [])
    vals = []
    for s in skills:
        try:
            vals.append(float(data.get(s)))
        except (TypeError, ValueError):
            pass
    return (sum(vals) / len(vals)) / 5.0 if vals else 0.0


def quiz_boosts(quiz_scores):
    boosts = {}
    if not isinstance(quiz_scores, dict):
        return boosts
    nums = {}
    for k in QUIZ_TO_FIELDS:
        try:
            nums[k] = float(quiz_scores.get(k) or 0)
        except (TypeError, ValueError):
            nums[k] = 0.0
    top = max(nums.values()) if nums else 0
    if top <= 0:
        return boosts
    for cat, value in nums.items():
        if value == top:
            for f in QUIZ_TO_FIELDS[cat]:
                boosts[f] = QUIZ_BOOST
    return boosts


def generate_reason(data, field):
    reasons = []
    labels = {
        "Computer": "Strong computer skills",
        "Biology": "Strong biology interest",
        "Math": "Strong mathematical ability",
        "Communication": "Strong communication skills",
        "Leadership": "Good leadership qualities",
    }
    for skill in FIELD_SKILLS.get(field, []):
        try:
            if int(data.get(skill)) >= 4:
                reasons.append(labels[skill])
        except (TypeError, ValueError):
            pass

    bg = data.get("Background")
    bg_map = {
        "Computer Science & Technology": ["ICS"],
        "Engineering": ["Pre-Engineering", "ICS"],
        "Medicine & Health Sciences": ["Pre-Medical"],
        "Business & Commerce": ["Commerce"],
        "Social Sciences & Humanities": ["Arts"],
        "Law": ["Arts", "Commerce"],
    }
    if bg in bg_map.get(field, []):
        reasons.append(f"Your {bg} background supports this field")

    return reasons


CITY_PROVINCE = {
    "lahore": "Punjab", "rawalpindi": "Punjab", "faisalabad": "Punjab", "multan": "Punjab",
    "islamabad": "Federal", "karachi": "Sindh", "hyderabad": "Sindh",
    "peshawar": "Khyber Pakhtunkhwa", "mardan": "Khyber Pakhtunkhwa",
    "quetta": "Balochistan",
}

FIELD_SCHOLAR_KEYWORDS = {
    "Computer Science & Technology": ["computer", "technology", "it ", "stem", "software"],
    "Engineering": ["engineering", "stem", "technology"],
    "Business & Commerce": ["business", "commerce", "finance", "management"],
    "Medicine & Health Sciences": ["medical", "medicine", "health", "mbbs", "nursing"],
    "Law": ["law", "legal"],
    "Natural & Applied Sciences": ["science", "stem", "agriculture", "research"],
    "Social Sciences & Humanities": ["social", "humanities", "arts", "education", "media"],
}


def score_university(row, marks, city, quiz_fields, field):
    score, why = 50.0, []
    merit = row["eligibility_pct"]
    if pd.notna(merit):
        margin = marks - float(merit)
        if margin < 0:
            score -= 40
            why.append(f"Your {marks:.0f}% is below the {merit:.0f}% merit")
        elif margin <= 10:
            score += 25
            why.append(f"Realistic target: your {marks:.0f}% is just above the {merit:.0f}% merit")
        else:
            score += 15
            why.append(f"Safe choice: your {marks:.0f}% comfortably meets the {merit:.0f}% merit")
    else:
        why.append("Merit not published - confirm with the university")
    if city and str(city).strip().lower() in str(row["city_norm"]).lower():
        score += 15
        why.append(f"Located in {city}")
    if field in quiz_fields:
        score += 5
    return round(min(max(score, 0), 100), 1), "; ".join(why)


def score_scholarship(row, marks, city, field):
    score, why = 40.0, []
    merit = row["min_merit_pct"]
    if pd.notna(merit):
        if marks >= float(merit):
            score += 20
            why.append(f"Your marks meet the {merit:.0f}% requirement")
        else:
            score -= 30
    else:
        why.append("No minimum marks listed")
    province = CITY_PROVINCE.get(str(city or "").strip().lower(), "")
    provinces = str(row["provinces"] or "")
    if province and province.lower() in provinces.lower():
        score += 20
        why.append(f"Open to students in {province}")
    elif "federal" in provinces.lower() or "national" in provinces.lower():
        score += 10
        why.append("Open nationwide")
    text = f"{row['name']} {row['eligibility_raw']} {row['basis']}".lower()
    if any(k in text for k in FIELD_SCHOLAR_KEYWORDS.get(field, [])):
        score += 15
        why.append(f"Relevant to {field}")
    if "merit" in str(row["basis"]).lower() and marks >= 80:
        score += 5
        why.append("Your strong marks suit merit-based awards")
    return round(min(max(score, 0), 100), 1), "; ".join(why)


def build_explanation(career, text_prob, interests, data, boosts, marks):
    points = []
    words = []
    try:
        vec = tfidf_vectorizer.transform([interests])
        names = tfidf_vectorizer.get_feature_names_out()
        idx = list(field_classifier.classes_).index(career)
        coefs = getattr(field_classifier, "coef_", None)
        row = vec.tocoo()
        weighted = []
        for j, v in zip(row.col, row.data):
            w = float(coefs[idx][j]) * v if coefs is not None else v
            weighted.append((w, names[j]))
        words = [w for _, w in sorted(weighted, reverse=True)[:4]]
    except Exception:
        pass
    pct = round(text_prob * 100)
    if words:
        points.append(f"Your interest description matches {career} ({pct}% text match), especially: {', '.join(words)}.")
    else:
        points.append(f"Your interest description matches {career} ({pct}% text match).")
    skills = [f"{s} {data.get(s)}/5" for s in FIELD_SKILLS.get(career, []) if str(data.get(s) or "").isdigit() and int(data.get(s)) >= 4]
    if skills:
        points.append(f"Your self-rated skills support it: {', '.join(skills)}.")
    if career in boosts:
        points.append("Your career quiz result also points toward this field.")
    points.append(f"Your average marks of {marks:.0f}% were used to filter programs you are eligible for.")
    return points


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
        # Treat "All" (All Cities / Nationwide) as no city filter
        if city and str(city).strip().lower() == "all":
            city = None

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

        boosts = quiz_boosts(data.get("quizScores"))
        blended = [
            (
                c,
                TEXT_WEIGHT * float(p)
                + SKILL_WEIGHT * skill_score(str(c), data)
                + boosts.get(str(c), 0.0),
            )
            for c, p in zip(classes, proba)
        ]
        ranked = sorted(blended, key=lambda x: -x[1])
        career = str(ranked[0][0])
        # confidence stays the text model's own probability for the chosen field
        text_prob = {str(c): float(p) for c, p in zip(classes, proba)}
        confidence = round(text_prob[career], 3)
        low_confidence = confidence < 0.25

        reasons = generate_reason(data, career)
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
            )

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

        quiz_fields = set(boosts.keys())
        ranked_rows = []
        for _, row in recommended.iterrows():
            sc, why = score_university(row, data["Marks"], city, quiz_fields, matched_field)
            ranked_rows.append((sc, why, row))
        ranked_rows.sort(key=lambda x: -x[0])
        ranked_rows = ranked_rows[:6]

        universities_list = []

        for uni_score, uni_why, row in ranked_rows:

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
                "match_score": uni_score,
                "why": uni_why,
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

            sch_score, sch_why = score_scholarship(row, data["Marks"], city, matched_field)
            return {
                "match_score": sch_score,
                "why": sch_why,
                "name": str(row["name"] or ""),
                "provider": str(row["provider"] or ""),
                "field": str(row["provider_type"] or row["basis"] or "General"),
                "min_percentage": merit,
                "eligibility": (
                    "Merit not specified"
                    if merit is None
                    else "Eligible"
                ),
                "basis": str(row["basis"] or "Merit + Need"),
                "provinces": str(row["provinces"] or "National"),
                "coverage": str(row.get("coverage") or "") if pd.notna(row.get("coverage")) else "",
                "eligibility_raw": str(row.get("eligibility_raw") or "") if pd.notna(row.get("eligibility_raw")) else "",
                "link": normalize_scholarship_url(row["source_url"], row["name"], row["provider"]),
            }

        is_international = (
            eligible_scholarships["provinces"].str.contains("international", case=False, na=False)
            | eligible_scholarships["provider_type"].str.contains("international", case=False, na=False)
        )

        international_scholarships = sorted(
            (build_scholarship_entry(row)
             for _, row in eligible_scholarships[is_international].iterrows()),
            key=lambda e: -e["match_score"],
        )[:6]

        pakistan_pool = eligible_scholarships[~is_international]
        if pakistan_pool.empty:
            pakistan_pool = scholarship_df[~scholarship_df["provinces"].str.contains("international", case=False, na=False)]

        pakistan_scholarships = sorted(
            (build_scholarship_entry(row) for _, row in pakistan_pool.iterrows()),
            key=lambda e: -e["match_score"],
        )[:8]

        result = {
            "career": career,
            "confidence": confidence,
            "low_confidence": low_confidence,
            "matched_field": matched_field,
            "city_notice": city_notice,
            "reasons": reasons,
            "explanation": build_explanation(career, text_prob[career], interests, data, boosts, data["Marks"]),
            "field_scores": {str(c): round(float(sc), 3) for c, sc in ranked},
            "universities": universities_list,
            "international_scholarships": international_scholarships,
            "pakistan_scholarships": pakistan_scholarships,
        }
        user_id = data.get("userId")
        user_name = data.get("userName")
        user_email = data.get("userEmail")

        if user_id and (not user_name or is_hash_like(user_name)):
            user_name = resolve_user_display_name(
                user_id,
                fallback="Student",
                explicit_name=user_name,
                email=user_email
            )

        log_activity("assessment_completed", {
            "career": career,
            "matchedField": matched_field,
            "userId": user_id,
            "userName": user_name or "Student",
            "email": user_email
        })
        assessment_records = load_json_records("assessments") or []
        assessment_records.append({
            "id": secrets.token_hex(8),
            "userId": user_id,
            "userName": user_name or "Student",
            "userEmail": user_email,
            "answers": data,
            "result": result,
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        })
        save_json_records("assessments", assessment_records[-1000:])
        if user_id:
            try:
                rec_payload = {
                    "user_id": user_id,
                    "recommendation": career,
                    "highest_category": matched_field,
                    "top_categories": [matched_field],
                    "scores": result.get("field_scores") or {},
                }
                supabase_admin_request("POST", "/rest/v1/recommendations", body=rec_payload)
            except Exception as e:
                print(f"Could not persist recommender assessment to Supabase: {e}")
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
        scholarships = []
        for record in records:
            name = (record.get("name") or "").strip()
            provider = (record.get("provider") or "").strip()
            if not name or (name == "Scholarship Name" and provider == "University (Provider)"):
                continue
            link = normalize_scholarship_url(record.get("source_url"), name, provider)
            scholarships.append({
                "id": record.get("id"),
                "name": name,
                "provider": provider,
                "provinces": record.get("provinces", ""),
                "basis": record.get("basis", ""),
                "min_percentage": record.get("min_merit_pct") or None,
                "field": record.get("provider_type") or record.get("basis") or "General",
                "coverage": record.get("coverage", ""),
                "eligibility_raw": record.get("eligibility_raw", ""),
                "link": link,
                "source_url": link,
            })

        return jsonify(scholarships)

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


@app.errorhandler(404)
def handle_404(e):
    return jsonify({"message": "Resource or endpoint not found on the backend."}), 404


@app.errorhandler(405)
def handle_405(e):
    return jsonify({"message": "Method not allowed for this endpoint."}), 405


@app.errorhandler(500)
def handle_500(e):
    app.logger.exception("Unhandled error: %s", e)
    return jsonify({"message": "Internal server error occurred on backend."}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(
        debug=True,
        host="0.0.0.0",
        port=port
    )