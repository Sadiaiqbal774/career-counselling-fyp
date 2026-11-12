import argparse
import json
import os
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen


BACKEND_DIR = Path(__file__).resolve().parents[1]


def load_local_users():
    path = BACKEND_DIR / "users.json"
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def load_supabase_users():
    base_url = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not base_url or not service_key:
        return None

    users = []
    page = 1
    while True:
        query = urlencode({"page": page, "per_page": 200})
        request = Request(
            f"{base_url}/auth/v1/admin/users?{query}",
            headers={
                "apikey": service_key,
                "Authorization": f"Bearer {service_key}",
            },
        )
        with urlopen(request, timeout=10) as response:
            batch = (json.loads(response.read().decode("utf-8")) or {}).get("users", [])
        if not batch:
            break
        users.extend(batch)
        if len(batch) < 200:
            break
        page += 1
    return users


def build_report(local_users, supabase_users):
    local_by_email = {}
    duplicate_local_emails = []
    for user in local_users:
        email = str(user.get("email", "")).strip().lower()
        if not email:
            continue
        if email in local_by_email:
            duplicate_local_emails.append(email)
        local_by_email.setdefault(email, []).append(user)

    if supabase_users is None:
        supabase_by_email = {}
        supabase_status = "not queried; Supabase credentials are not configured"
    else:
        supabase_by_email = {}
        for user in supabase_users:
            email = str(user.get("email", "")).strip().lower()
            if email:
                supabase_by_email.setdefault(email, []).append(user)
        supabase_status = "queried"

    mappings = []
    for email, users in local_by_email.items():
        matches = supabase_by_email.get(email, [])
        mappings.append({
            "email": email,
            "localUserIds": [user.get("id") for user in users],
            "supabaseUserIds": [user.get("id") for user in matches],
            "localDuplicate": len(users) > 1,
            "supabaseConflict": len(matches) > 1,
            "emailConfirmedAt": [
                user.get("email_confirmed_at")
                for user in matches
                if user.get("email_confirmed_at")
            ],
            "action": "manual-review" if len(users) > 1 or len(matches) > 1 else (
                "existing-supabase-account" if matches else "requires-password-reset"
            ),
        })

    return {
        "dryRun": True,
        "writesPerformed": False,
        "localUserCount": len(local_users),
        "supabaseUserCount": None if supabase_users is None else len(supabase_users),
        "supabaseStatus": supabase_status,
        "duplicateLocalEmails": sorted(set(duplicate_local_emails)),
        "mappings": mappings,
        "notes": [
            "This utility never changes users.json or Supabase.",
            "Existing SHA-256 passwords require a user-initiated Supabase password reset.",
            "Email verification status is reported, never automatically changed.",
        ],
    }


def main():
    parser = argparse.ArgumentParser(description="Generate a non-destructive account migration report.")
    parser.add_argument("--output", type=Path, help="Optional JSON report path.")
    args = parser.parse_args()

    report = build_report(load_local_users(), load_supabase_users())
    encoded = json.dumps(report, indent=2)
    if args.output:
        args.output.write_text(encoded + "\n", encoding="utf-8")
    else:
        print(encoded)


if __name__ == "__main__":
    main()
