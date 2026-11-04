# Career Counselling FYP

## Frontend
cd frontend
npm install
npm start

## Backend
cd backend
pip install -r requirements.txt
python app.py

## Admin access

Configure Supabase Auth and set `ADMIN_EMAILS` to a comma-separated allowlist of administrator email addresses. Flask verifies Supabase access-token signatures through the Supabase JWKS endpoint and does not accept browser-supplied admin claims.

PowerShell example:

```powershell
$env:ADMIN_EMAILS = "administrator@example.com"
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "server-only-service-role-key"
py -3 backend\app.py
```

Create the administrator account in Supabase Auth, enable email verification, and open `http://localhost:3000/admin/login`. The same Supabase session is used for the admin console and application. The service-role key must never be placed in frontend environment variables.

Existing local accounts in `backend\users.json` are not modified automatically. Generate a non-destructive migration report with:

```powershell
py backend\scripts\migrate_accounts_dry_run.py --output backend\account-migration-report.json
```

Local SHA-256 passwords cannot be imported into Supabase; affected users must complete a Supabase password reset.
