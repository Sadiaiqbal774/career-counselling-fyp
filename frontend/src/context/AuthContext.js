import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import supabase, { ensureSupabaseConfigured, getSupabaseConfigError } from '../lib/supabase';

const AuthContext = createContext(null);
const API_URL = (process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000').trim().replace(/\/+$/, '');

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isStrongPassword(password) {
  return typeof password === 'string'
    && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password);
}

function mapSessionUser(session) {
  const user = session?.user;
  if (!user || !user.email_confirmed_at) return null;

  return {
    id: user.id,
    name: user.user_metadata?.name || user.email.split('@')[0] || 'Student',
    email: user.email,
    token: session.access_token,
    provider: user.app_metadata?.provider || user.identities?.[0]?.provider || 'email',
    authProvider: user.app_metadata?.provider || user.identities?.[0]?.provider || 'email',
    emailConfirmed: true,
    hasPassword: Boolean(user.app_metadata?.providers?.includes('email')),
    isAdmin: false,
  };
}

function getResetRedirect() {
  return typeof window === 'undefined'
    ? '/reset-password'
    : `${window.location.origin}/reset-password`;
}

function getEmailVerificationRedirect() {
  return typeof window === 'undefined'
    ? '/'
    : `${window.location.origin}/`;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const applySession = (session) => {
      if (cancelled) return;
      setCurrentUser(mapSessionUser(session));
      setInitialized(true);
    };

    if (getSupabaseConfigError()) {
      setInitialized(true);
      return () => {
        cancelled = true;
      };
    }

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        applySession(data.session);
      })
      .catch(() => {
        if (!cancelled) {
          setCurrentUser(null);
          setInitialized(true);
        }
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => applySession(session));
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  const register = useCallback(async ({ name, email, password, recoveryQuestion, recoveryAnswer }) => {
    ensureSupabaseConfigured();
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) throw new Error('Please use a valid email address.');
    if (!isStrongPassword(password)) {
      throw new Error('Password must be at least 8 characters and include uppercase, lowercase, number, and special character.');
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { name: name.trim() },
        emailRedirectTo: getEmailVerificationRedirect(),
      },
    });
    if (error) throw error;

    if (data.user?.identities && data.user.identities.length === 0) {
      throw new Error('This email is already registered. Please sign in instead.');
    }

    if (!data.session) {
      if (data.user?.id && recoveryQuestion && recoveryAnswer) {
        const setupResponse = await fetch(`${API_URL}/api/auth/recovery-question/setup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: data.user.id,
            email: normalizedEmail,
            question: recoveryQuestion,
            answer: recoveryAnswer,
          }),
        });
        const setupResult = await setupResponse.json().catch(() => ({}));
        if (!setupResponse.ok) throw new Error(setupResult.message || 'Unable to save recovery details.');
      }
      return { requiresEmailVerification: true, email: normalizedEmail };
    }

    await supabase.auth.signOut();
    throw new Error(
      'Email confirmation is not enabled in Supabase. Enable Confirm email in Supabase Auth settings, then register again.',
    );
  }, []);

  const login = useCallback(async ({ email, password }) => {
    ensureSupabaseConfigured();
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) throw new Error('Please enter a valid email address.');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error) {
      if ((error.message || '').toLowerCase().includes('email not confirmed')) {
        throw new Error('Please verify your email before signing in.');
      }
      throw error;
    }
    const user = mapSessionUser(data.session);
    if (!user) throw new Error('Please verify your email before signing in.');
    return user;
  }, []);

  const logout = useCallback(async () => {
    ensureSupabaseConfigured();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setCurrentUser(null);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    ensureSupabaseConfigured();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) throw error;
  }, []);

  const resendVerification = useCallback(async (email) => {
    ensureSupabaseConfigured();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: getEmailVerificationRedirect() },
    });
    if (error) throw error;
  }, []);

  const verifySignupCode = useCallback(async (email, token) => {
    ensureSupabaseConfigured();
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: token.trim(),
      type: 'signup',
    });
    if (error) throw error;
    const user = mapSessionUser(data.session);
    if (!user) throw new Error('Email verification did not create an authenticated session.');
    return user;
  }, []);

  const resetPassword = useCallback(async (email) => {
    ensureSupabaseConfigured();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: getResetRedirect(),
    });
    if (error) throw error;
  }, []);

  const getRecoveryQuestion = useCallback(async (email) => {
    const response = await fetch(`${API_URL}/api/auth/recovery-question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || 'Recovery details are unavailable.');
    return result.question;
  }, []);

  const verifyRecoveryAnswer = useCallback(async (email, answer) => {
    const response = await fetch(`${API_URL}/api/auth/recovery-question/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), answer }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || 'Incorrect recovery answer.');
    return result.recoveryToken;
  }, []);

  const completeRecoveryQuestion = useCallback(async (recoveryToken, newPassword) => {
    const response = await fetch(`${API_URL}/api/auth/recovery-question/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recoveryToken, newPassword }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || 'Unable to reset password.');
  }, []);

  const updatePassword = useCallback(async (password) => {
    ensureSupabaseConfigured();
    if (!isStrongPassword(password)) {
      throw new Error('Password must be at least 8 characters and include uppercase, lowercase, number, and special character.');
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    await supabase.auth.signOut({ scope: 'others' });
  }, []);

  const changePassword = useCallback(async ({ oldPassword, newPassword }) => {
    ensureSupabaseConfigured();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.user?.email) {
      throw new Error('Please login again before changing password.');
    }
    if (oldPassword) {
      const { error } = await supabase.auth.signInWithPassword({
        email: sessionData.session.user.email,
        password: oldPassword,
      });
      if (error) throw new Error('Current password is incorrect.');
    } else {
      const { error } = await supabase.auth.reauthenticate();
      if (error) throw new Error('Please reauthenticate before changing your password.');
    }
    await updatePassword(newPassword);
  }, [updatePassword]);

  const deleteAccount = useCallback(async (password) => {
    ensureSupabaseConfigured();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const email = sessionData.session?.user?.email;
    if (sessionError || !email) throw new Error('Please login again before deleting your account.');
    if (!password) throw new Error('Enter your current password to delete your account.');

    const { error: passwordError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (passwordError) throw new Error('Current password is incorrect.');

    const { data: refreshedSession, error: refreshError } = await supabase.auth.getSession();
    const token = refreshedSession.session?.access_token;
    if (refreshError || !token) throw new Error('Please login again before deleting your account.');

    const response = await fetch(`${API_URL}/api/auth/delete-account`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || 'Unable to delete account.');
    await supabase.auth.signOut();
    setCurrentUser(null);
  }, []);

  const getAccessToken = useCallback(async () => {
    if (getSupabaseConfigError()) return null;
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.access_token) return null;
    return data.session.access_token;
  }, []);

  const value = useMemo(() => ({
    currentUser,
    initialized,
    isAuthenticated: Boolean(currentUser),
    register,
    login,
    logout,
    signInWithGoogle,
    resendVerification,
    verifySignupCode,
    resetPassword,
    updatePassword,
    changePassword,
    deleteAccount,
    getAccessToken,
    getRecoveryQuestion,
    verifyRecoveryAnswer,
    completeRecoveryQuestion,
    verifyPassword: async (password) => {
      if (!currentUser?.email) return false;
      const { error } = await supabase.auth.signInWithPassword({ email: currentUser.email, password });
      return !error;
    },
  }), [
    currentUser,
    initialized,
    register,
    login,
    logout,
    signInWithGoogle,
    resendVerification,
    verifySignupCode,
    resetPassword,
    updatePassword,
    changePassword,
    deleteAccount,
    getAccessToken,
    getRecoveryQuestion,
    verifyRecoveryAnswer,
    completeRecoveryQuestion,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
