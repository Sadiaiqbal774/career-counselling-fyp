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

The admin signs in at `/admin/login` with a fixed username (`ADMIN_USERNAME`, default `admin`) and the password set in `ADMIN_PASSWORD` (at least 12 characters). Email addresses are not accepted as admin logins. Internally the backend maps the username to a Supabase Auth system account and verifies the password through Supabase Auth. The system account is created or synchronised automatically on first login, which requires `SUPABASE_SERVICE_ROLE_KEY`. Do not set `ADMIN_EMAILS`.

PowerShell example:

```powershell
$env:ADMIN_USERNAME = "admin"
$env:ADMIN_PASSWORD = "a-strong-password-12+"
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_ANON_KEY = "your-anon-key"
$env:SUPABASE_SERVICE_ROLE_KEY = "server-only-service-role-key"
py -3 backend\app.py
```

The service-role key must never be placed in frontend environment variables.

Create the administrator account in Supabase Auth, enable email verification, and open `http://localhost:3000/admin/login`. The same Supabase session is used for the admin console and application. The service-role key must never be placed in frontend environment variables.

Existing local accounts in `backend\users.json` are not modified automatically. Generate a non-destructive migration report with:

```powershell
py backend\scripts\migrate_accounts_dry_run.py --output backend\account-migration-report.json
```

Local SHA-256 passwords cannot be imported into Supabase; affected users must complete a Supabase password reset.
