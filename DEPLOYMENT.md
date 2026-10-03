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
  - `ADMIN_USERNAME`
  - `ADMIN_PASSWORD`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `FRONTEND_URL` — your live Vercel URL, once you have it (locks down CORS to just your site)

### Database / Auth
- **Platform**: Supabase (already configured)
- Free-tier projects pause after 7 days of inactivity — visit the Supabase dashboard to resume before a demo if it's been quiet a while.

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
  - Username: set via `ADMIN_USERNAME`
  - Password: set via `ADMIN_PASSWORD` (keep this long and random — it's a plain string comparison, not hashed)

## Known limitations (expected on free tiers, fine for a demo)

- Both Vercel/Zeabur cold-start after ~15 minutes of inactivity; first request after idle can take 30-60 seconds.
- Data stored in local JSON/CSV files (chatbot logs, chatbot rules, eligibility criteria, activity log, admin edits to scholarships/universities/programs) resets whenever the backend restarts or redeploys, since free hosting doesn't include a persistent disk. Data seeded in the repo always reloads fine; only *runtime* additions are affected.