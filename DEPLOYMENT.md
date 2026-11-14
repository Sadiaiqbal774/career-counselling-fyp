# Career Counselling FYP - Deployment Guide

## Live Deployment

This project deploys across two free services (no credit card required for either):

### Frontend (React)
- **Platform**: Vercel
- **Root Directory**: `frontend`
- **Build Command**: `npm run build` (auto-detected)
- **Environment variables** (set in Vercel → Settings → Environment Variables, not the initial import screen):
  - `REACT_APP_API_URL` — your live backend URL from Zeabur
  - `REACT_APP_SUPABASE_URL`
  - `REACT_APP_SUPABASE_ANON_KEY`

### Backend (Flask)
- **Platform**: Zeabur
- **Root Directory**: `backend`
- **Start command**: comes from `backend/Procfile` (`web: gunicorn app:app`)
- **Environment variables** (set in Zeabur → Variables):
  - `ADMIN_EMAILS` — comma-separated Supabase administrator emails
  - `ADMIN_USERNAME` — username used on the admin login form
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_JWT_AUDIENCE` — normally `authenticated`
  - `FRONTEND_URL` — your live Vercel URL, once you have it (locks down CORS to just your site)

### Database / Auth
- **Platform**: Supabase (already configured)
- In Supabase Dashboard → Authentication → Settings, enable **Confirm email**. The application
  requires this setting so password accounts cannot sign in before clicking the verification link.
- Free-tier projects pause after 7 days of inactivity — visit the Supabase dashboard to resume before a demo if it's been quiet a while.
- Run `frontend/server/sql/profile-management.sql` in the Supabase SQL editor. This creates the
  `recovery_questions` table used by the backend for salted recovery-answer hashes and one-time
  recovery sessions. The backend service-role key is required for these operations and is never
  exposed to the frontend.
- Run `backend/sql/pending-registrations.sql` in the Supabase SQL editor. Configure the backend
  Brevo SMTP variables and a generated `PENDING_PASSWORD_ENCRYPTION_KEY`. Registration data stays
  pending until the single-use link is consumed; no Supabase Auth user is created beforehand.

### Not deployed
- `frontend/server/` (the Express/Postgres setup) is not used anywhere by the React app — nothing in `frontend/src` calls it. It doesn't need to be deployed.

---

## Local Testing

```bash
# Terminal 1 - Backend
cd backend
python app.py

# Terminal 2 - Frontend
cd frontend
npm start
```

Access: http://localhost:3000

---

## Live URLs (fill in once deployed)

- **Frontend**: 
- **Backend API**: 
- **Admin Login**: `[Frontend URL]/admin/login`
  - Sign in with the verified Supabase administrator account.
  - Flask checks the verified token email against `ADMIN_EMAILS`.

## Known limitations (expected on free tiers, fine for a demo)

- Both Vercel/Zeabur cold-start after ~15 minutes of inactivity; first request after idle can take 30-60 seconds.
- Data stored in local JSON/CSV files (chatbot logs, chatbot rules, eligibility criteria, activity log, admin edits to scholarships/universities/programs) resets whenever the backend restarts or redeploys, since free hosting doesn't include a persistent disk. Data seeded in the repo always reloads fine; only *runtime* additions are affected.