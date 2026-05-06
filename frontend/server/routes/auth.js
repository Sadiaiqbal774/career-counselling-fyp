const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function createHash(value) {
  return bcrypt.hash(String(value), 10);
}

async function compareHash(value, hash) {
  if (!hash) return false;
  return bcrypt.compare(String(value), hash);
}

function createUserPayload(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    authProvider: row.auth_provider,
  };
}

async function createToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
}

router.post('/register', async (req, res) => {
  const { name, email, password, securityQuestion, securityAnswer } = req.body || {};
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password || !securityQuestion || !securityAnswer) {
    return res.status(400).json({ message: 'Missing required registration details' });
  }

  try {
    const existing = await db.query('SELECT id, auth_provider FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length) return res.status(409).json({ message: 'Email already registered' });

    const password_hash = await createHash(password);
    const security_answer_hash = await createHash(securityAnswer);
    const result = await db.query(
      'INSERT INTO users (name, email, password_hash, security_question, security_answer_hash, auth_provider) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, email, auth_provider',
      [name || null, normalizedEmail, password_hash, securityQuestion, security_answer_hash, 'local'],
    );

    const user = result.rows[0];
    const token = await createToken(user);
    res.json({ user: createUserPayload(user), token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) return res.status(400).json({ message: 'Missing email or password' });

  try {
    const result = await db.query('SELECT id, name, email, password_hash, auth_provider FROM users WHERE email = $1', [normalizedEmail]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    if (!user.password_hash) {
      return res.status(400).json({ message: 'This account uses Google sign-in. Please continue with Google.' });
    }

    const ok = await compareHash(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = await createToken(user);
    delete user.password_hash;
    res.json({ user: createUserPayload(user), token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/google-auth', async (req, res) => {
  const { name, email, googleId, photoURL } = req.body || {};
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !name) {
    return res.status(400).json({ message: 'Missing Google account details' });
  }

  try {
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    let userRow;

    if (existing.rows.length) {
      const result = await db.query(
        `UPDATE users
         SET name = $1,
             auth_provider = 'google',
             google_id = COALESCE(google_id, $2)
         WHERE email = $3
         RETURNING id, name, email, auth_provider`,
        [name, googleId || null, normalizedEmail],
      );
      userRow = result.rows[0];
    } else {
      const result = await db.query(
        `INSERT INTO users (name, email, password_hash, security_question, security_answer_hash, auth_provider, google_id)
         VALUES ($1, $2, NULL, NULL, NULL, 'google', $3)
         RETURNING id, name, email, auth_provider`,
        [name, normalizedEmail, googleId || null],
      );
      userRow = result.rows[0];
    }

    const token = await createToken(userRow);
    res.json({ user: createUserPayload(userRow), token, photoURL: photoURL || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/security-question', async (req, res) => {
  const { email } = req.body || {};
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return res.status(400).json({ message: 'Missing email' });
  }

  try {
    const result = await db.query(
      'SELECT id, security_question, auth_provider FROM users WHERE email = $1',
      [normalizedEmail],
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ message: 'No account found for that email.' });
    }

    if (!user.security_question) {
      return res.status(400).json({ message: 'This account does not use a security question.' });
    }

    res.json({ securityQuestion: user.security_question, authProvider: user.auth_provider });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/reset-password-with-question', async (req, res) => {
  const { email, securityAnswer, password } = req.body || {};
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !securityAnswer || !password) {
    return res.status(400).json({ message: 'Missing email, answer, or password' });
  }

  try {
    const result = await db.query(
      'SELECT id, security_answer_hash FROM users WHERE email = $1',
      [normalizedEmail],
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ message: 'No account found for that email.' });
    }

    const ok = await compareHash(securityAnswer, user.security_answer_hash);
    if (!ok) {
      return res.status(401).json({ message: 'The answer does not match our records.' });
    }

    const passwordHash = await createHash(password);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, user.id]);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return res.status(400).json({ message: 'Missing email' });

  try {
    const result = await db.query(
      'SELECT id, security_question FROM users WHERE email = $1',
      [normalizedEmail],
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ message: 'No account found for that email.' });
    }

    if (!user.security_question) {
      return res.status(400).json({ message: 'This account does not use a security question.' });
    }

    return res.json({
      message: 'Answer the security question to reset your password',
      securityQuestion: user.security_question,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Unauthorized' });

  const parts = authHeader.split(' ');
  const token = parts.length === 2 ? parts[1] : null;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = payload.sub;
    const result = await db.query('SELECT id, name, email FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    res.json({ user });
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) return res.status(400).json({ message: 'Missing token or password' });

  try {
    const result = await db.query(
      'SELECT user_id FROM password_reset_tokens WHERE token = $1 AND expires_at > now()',
      [token],
    );
    const tokenRow = result.rows[0];
    if (!tokenRow) return res.status(401).json({ message: 'Invalid or expired reset code' });

    const userId = tokenRow.user_id;
    const passwordHash = await bcrypt.hash(password, 10);

    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
    await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/delete-account', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Unauthorized' });

  const parts = authHeader.split(' ');
  const token = parts.length === 2 ? parts[1] : null;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = payload.sub;

    // Delete user and associated tokens
    await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM users WHERE id = $1', [userId]);

    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
