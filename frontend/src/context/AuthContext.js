import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { initFirebase, firebaseAvailable } from '../firebase';

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

async function hashSecurityAnswer(answer) {
  return hashPassword(answer);
}

async function createUserRecord({ name, email, password, securityQuestion, securityAnswer }) {
  return {
    id: typeof window !== 'undefined' && window.crypto?.randomUUID ? window.crypto.randomUUID() : createFallbackId(),
    name,
    email,
    passwordHash: await hashPassword(password),
    securityQuestion,
    securityAnswerHash: await hashSecurityAnswer(securityAnswer),
    authProvider: 'local',
    createdAt: new Date().toISOString(),
  };
}

function getApiUrl() {
  return process.env.REACT_APP_API_URL || 'http://localhost:4000';
}

async function readJsonResponse(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.message || 'Request failed');
    error.isBackendError = true;
    throw error;
  }

  return body;
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

  const register = useCallback(async ({ name, email, password, securityQuestion, securityAnswer }) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      throw new Error('Please use a valid email address to create your account.');
    }

    if (!securityQuestion || !securityAnswer) {
      throw new Error('Please choose a security question and provide an answer.');
    }

    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: normalizedEmail,
          password,
          securityQuestion,
          securityAnswer,
        }),
      });

      const body = await readJsonResponse(res);
      const sessionUser = { id: body.user.id, name: body.user.name, email: body.user.email, token: body.token };
      persistSession(sessionUser);
      return sessionUser;
    } catch (err) {
      if (err?.isBackendError) {
        throw err;
      }

      const users = safeJsonParse(localStorage.getItem(USERS_STORAGE_KEY), []);

      if (users.some((user) => user.email === normalizedEmail)) {
        throw new Error('An account with this email already exists.');
      }

      const record = await createUserRecord({
        name: name.trim(),
        email: normalizedEmail,
        password,
        securityQuestion,
        securityAnswer,
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

    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      const body = await readJsonResponse(res);
      const sessionUser = { id: body.user.id, name: body.user.name, email: body.user.email, token: body.token };
      persistSession(sessionUser);
      return sessionUser;
    } catch (err) {
      if (err?.isBackendError) {
        throw err;
      }

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
    if (!firebaseAvailable) {
      throw new Error('Google authentication is not configured. Add the Firebase environment variables first.');
    }

    const { auth, googleProvider } = await initFirebase();
    const { signInWithPopup } = await import('firebase/auth');
    const result = await signInWithPopup(auth, googleProvider);
    const firebaseUser = result.user;

    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/auth/google-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: firebaseUser.displayName || 'Google User',
          email: firebaseUser.email,
          googleId: firebaseUser.uid,
          photoURL: firebaseUser.photoURL || null,
        }),
      });

      const body = await readJsonResponse(res);
      const sessionUser = { id: body.user.id, name: body.user.name, email: body.user.email, token: body.token };
      persistSession(sessionUser);
      return sessionUser;
    } catch (error) {
      const sessionUser = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || 'Google User',
        email: firebaseUser.email,
        provider: 'google',
      };

      persistSession(sessionUser);
      return sessionUser;
    }
  }, [persistSession]);

  const getSecurityQuestion = useCallback(async (email) => {
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      throw new Error('Please provide a valid email address.');
    }

    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/auth/security-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const body = await readJsonResponse(res);
      return body.securityQuestion;
    } catch (err) {
      if (err?.isBackendError) {
        throw err;
      }

      const users = safeJsonParse(localStorage.getItem(USERS_STORAGE_KEY), []);
      const user = users.find((u) => u.email === normalizedEmail);
      if (!user?.securityQuestion) throw new Error('No account found with that email.');
      return user.securityQuestion;
    }
  }, []);

  const resetPasswordWithSecurityQuestion = useCallback(async ({ email, securityAnswer, password }) => {
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      throw new Error('Please provide a valid email address.');
    }

    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/auth/reset-password-with-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, securityAnswer, password }),
      });

      await readJsonResponse(res);
      return true;
    } catch (err) {
      if (err?.isBackendError) {
        throw err;
      }

      const users = safeJsonParse(localStorage.getItem(USERS_STORAGE_KEY), []);
      const user = users.find((entry) => entry.email === normalizedEmail);

      if (!user?.securityAnswerHash) {
        throw new Error('No account found with that email.');
      }

      const answerHash = await hashSecurityAnswer(securityAnswer);
      if (user.securityAnswerHash !== answerHash) {
        throw new Error('The answer does not match our records.');
      }

      const passwordHash = await hashPassword(password);
      const updatedUsers = users.map((entry) => {
        if (entry.email !== normalizedEmail) {
          return entry;
        }

        return {
          ...entry,
          passwordHash,
        };
      });

      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
      return true;
    }
  }, []);

  const resetPassword = useCallback(async (payload) => resetPasswordWithSecurityQuestion(payload), [resetPasswordWithSecurityQuestion]);

  const deleteAccount = useCallback(async () => {
    if (!currentUser || !currentUser.token) {
      throw new Error('No active session');
    }

    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/auth/delete-account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`,
        },
      });

      const body = await readJsonResponse(res);
      
      if (res.ok) {
        // Clear session on successful deletion
        localStorage.removeItem(SESSION_STORAGE_KEY);
        setCurrentUser(null);
        return body;
      }
    } catch (err) {
      if (err?.isBackendError) {
        throw err;
      }
      throw new Error('Unable to delete account. Please try again later.');
    }
  }, [currentUser]);

  const value = useMemo(
    () => ({
      currentUser,
      initialized,
      isAuthenticated: Boolean(currentUser),
      register,
      login,
      logout,
      signInWithGoogle,
      getSecurityQuestion,
      resetPasswordWithSecurityQuestion,
      resetPassword,
      deleteAccount,
    }),
    [currentUser, initialized, login, logout, register, signInWithGoogle, getSecurityQuestion, resetPasswordWithSecurityQuestion, resetPassword, deleteAccount],
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