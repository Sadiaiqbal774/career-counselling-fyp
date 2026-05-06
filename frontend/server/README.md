# Career Counselling App - Server

Express.js + PostgreSQL authentication API with JWT, password reset, and email support.

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up PostgreSQL database
- Create a PostgreSQL database (e.g., `careerdb`)
- Run the SQL schema:
```bash
psql -U postgres -d careerdb -f sql/init.sql
```

Or manually in psql:
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### 3. Create `.env` file
Copy `.env.example` and fill in your values:
```bash
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/careerdb
JWT_SECRET=your_secret_key_here
FRONTEND_URL=http://localhost:3000

# Optional: SMTP for real emails (leave empty for dev mode)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

### 4. Start the server
**Development** (with nodemon):
```bash
npm run dev
```

**Production**:
```bash
npm start
```

Server runs on `http://localhost:4000`

## API Endpoints

### POST /api/auth/register
Register a new user.
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secure_password"
}
```
Response:
```json
{
  "user": { "id": 1, "name": "John Doe", "email": "john@example.com" },
  "token": "jwt_token_here"
}
```

### POST /api/auth/login
Login with email and password.
```json
{
  "email": "john@example.com",
  "password": "secure_password"
}
```

### POST /api/auth/forgot-password
Request a password reset code.
```json
{
  "email": "john@example.com"
}
```

**Development mode** (no SMTP configured):
```json
{
  "message": "Password reset link generated (development mode)",
  "resetLink": "http://localhost:3000/reset-password?token=abc123...",
  "token": "abc123...",
  "devMode": true
}
```

### POST /api/auth/reset-password
Reset password using the token.
```json
{
  "token": "reset_token_from_email",
  "password": "new_password"
}
```

### GET /api/auth/me
Get current user (requires JWT in `Authorization: Bearer <token>` header).

## Testing Password Reset Locally (without email)

1. Start the server: `npm run dev`
2. Leave `SMTP_HOST` empty in `.env` (development mode)
3. Go to frontend login page → "Forgot password"
4. Enter your registered email
5. Server returns the reset link directly on the page
6. Click the link or copy it into your browser
7. Reset your password

## Setting up SMTP for real emails

### Gmail
1. Enable 2FA on your Google account
2. Create an [App Password](https://support.google.com/accounts/answer/185833)
3. In `.env`:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your_app_password
```

### Other providers
Nodemailer supports any SMTP provider (SendGrid, Mailgun, Mailchimp, etc.).

## Troubleshooting

**"DATABASE_URL not configured"**
- Set `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running
- Check database exists: `psql -l`

**"Cannot find module 'pg'"**
- Run `npm install`

**Password reset not sending emails**
- Check if `SMTP_HOST` is empty (dev mode shows link on page)
- Test email config in `.env`
- Check server logs for errors
