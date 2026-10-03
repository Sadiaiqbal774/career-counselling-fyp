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

Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in the backend process environment before starting Flask. The server fails closed when these values are not configured.

PowerShell example:

```powershell
$env:ADMIN_USERNAME = "administrator"
$env:ADMIN_PASSWORD = "replace-with-a-long-random-password"
py -3 backend\app.py
```

Open `http://localhost:3000/admin/login` and use those credentials. Admin sessions expire after eight hours and are stored only in server memory. Admin data is available at `/api/admin/stats` only with the issued bearer token.
