import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const USERS_STORAGE_KEY = 'careerAppUsers';
const SESSION_STORAGE_KEY = 'careerAppSession';

const AuthContext = createContext(null);

function createFallbackId() {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function hashPassword(password) {
  const browserCrypto = typeof window !== 'undefined' ? window.crypto : undefined;

  if (!browserCrypto?.subtle) {
    let hash = 0;
    for (let index = 0; index < password.length; index += 1) {
      hash = (hash << 5) - hash + password.charCodeAt(index);
      hash |= 0;
    }

    return `fallback_${hash.toString(16)}`;
  }

  const encoded = new TextEncoder().encode(password);
  const buffer = await browserCrypto.subtle.digest('SHA-256', encoded);
  const bytes = Array.from(new Uint8Array(buffer));
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function createUserRecord({ name, email, password }) {
  return {
    id: typeof window !== 'undefined' && window.crypto?.randomUUID ? window.crypto.randomUUID() : createFallbackId(),
    name,
    email,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
  };
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const sessionUser = safeJsonParse(localStorage.getItem(SESSION_STORAGE_KEY), null);
    if (sessionUser) {
      setCurrentUser(sessionUser);
    }
    setInitialized(true);
  }, []);

  const persistSession = useCallback((user) => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    setCurrentUser(user);
  }, []);

  const register = useCallback(async ({ name, email, password }) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      throw new Error('Please use a valid email address to create your account.');
    }

    // Use backend API when available
    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const res = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: normalizedEmail, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Registration failed');
      }

      const body = await res.json();
      const sessionUser = { id: body.user.id, name: body.user.name, email: body.user.email, token: body.token };
      persistSession(sessionUser);
      return sessionUser;
    } catch (err) {
      // Fallback to local storage behavior
      const users = safeJsonParse(localStorage.getItem(USERS_STORAGE_KEY), []);

      if (users.some((user) => user.email === normalizedEmail)) {
        throw new Error('An account with this email already exists.');
      }

      const record = await createUserRecord({
        name: name.trim(),
        email: normalizedEmail,
        password,
      });

      const nextUsers = [...users, record];
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(nextUsers));

      const sessionUser = {
        id: record.id,
        name: record.name,
        email: record.email,
      };

      persistSession(sessionUser);
      return sessionUser;
    }
  }, [persistSession]);

  const login = useCallback(async ({ email, password }) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      throw new Error('Please enter a valid email address.');
    }

    // Try backend API first
    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Login failed');
      }

      const body = await res.json();
      const sessionUser = { id: body.user.id, name: body.user.name, email: body.user.email, token: body.token };
      persistSession(sessionUser);
      return sessionUser;
    } catch (err) {
      const users = safeJsonParse(localStorage.getItem(USERS_STORAGE_KEY), []);
      const user = users.find((entry) => entry.email === normalizedEmail);

      if (!user) {
        throw new Error('No account found for that email.');
      }

      const passwordHash = await hashPassword(password);
      if (user.passwordHash !== passwordHash) {
        throw new Error('Incorrect password.');
      }

      const sessionUser = {
        id: user.id,
        name: user.name,
        email: user.email,
      };

      persistSession(sessionUser);
      return sessionUser;
    }
  }, [persistSession]);

  const logout = useCallback(() => {
    // Remove session token and local user
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setCurrentUser(null);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    // Server-side Google OAuth is preferred; not implemented yet.
    const record = {
      id: createFallbackId(),
      name: 'Google User',
      email: `google_${Date.now()}@local`,
    };
    const sessionUser = { id: record.id, name: record.name, email: record.email };
    persistSession(sessionUser);
    return sessionUser;
  }, [persistSession]);

  const resetPassword = useCallback(async (email) => {
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      throw new Error('Please provide a valid email address.');
    }

    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const res = await fetch(`${apiUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Unable to request password reset');
      }

      return true;
    } catch (err) {
      // Local fallback: verify user exists
      const users = safeJsonParse(localStorage.getItem(USERS_STORAGE_KEY), []);
      const user = users.find((u) => u.email === normalizedEmail);
      if (!user) throw new Error('No account found with that email.');
      return true;
    }
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      initialized,
      isAuthenticated: Boolean(currentUser),
      register,
      login,
      logout,
      signInWithGoogle,
      resetPassword,
    }),
    [currentUser, initialized, login, logout, register],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}