import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import supabase, { ensureSupabaseConfigured, getSupabaseConfigError } from '../lib/supabase';
import { hasPassword, isStrongPassword } from '../lib/authHelpers';

const AuthContext = createContext(null);
const API_URL = (process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000').trim().replace(/\/+$/, '');

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function mapSessionUser(session) {
  const user = session?.user;
  if (!user || !user.email_confirmed_at) return null;

  // Admin role must strictly come from server-controlled app_metadata, never from user_metadata.
  // Admin accounts must never be bannable.
  const isAdmin = user.app_metadata?.role === 'admin';

  return {
    id: user.id,
    name: user.user_metadata?.name || user.email.split('@')[0] || 'Student',
    email: user.email,
    token: session.access_token,
    provider: user.app_metadata?.provider || user.identities?.[0]?.provider || 'email',
    authProvider: user.app_metadata?.provider || user.identities?.[0]?.provider || 'email',
    emailConfirmed: Boolean(user.email_confirmed_at),
    hasPassword: Boolean(hasPassword(user)),
    isAdmin,
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

function shouldPingActiveUser(user) {
  if (!user?.id && !user?.email) return false;
  if (typeof window !== 'undefined') {
    if ((window.location.pathname || '').startsWith('/admin')) {
      return false;
    }
  }
  return true;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const applySession = (session) => {
      if (cancelled) return;
      const mapped = mapSessionUser(session);
      setCurrentUser(mapped);
      setInitialized(true);
      if (mapped?.id && shouldPingActiveUser(mapped)) {
        fetch(`${API_URL}/api/auth/presence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: mapped.id, email: mapped.email, status: 'active' }),
        }).catch(() => {});
      }
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

  useEffect(() => {
    if (!currentUser?.id && !currentUser?.email) return;

    const pingStatus = (status) => {
      try {
        fetch(`${API_URL}/api/auth/presence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id, email: currentUser.email, status }),
        }).catch(() => {});
      } catch (_) {}
    };

    // Heartbeat every 20 seconds as long as student is logged in
    const interval = setInterval(() => {
      if (shouldPingActiveUser(currentUser)) {
        pingStatus('active');
      }
    }, 20000);

    const handleUnload = () => {
      if (currentUser?.id || currentUser?.email) {
        try {
          if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify({ userId: currentUser.id, email: currentUser.email, status: 'passive' })], {
              type: 'application/json',
            });
            navigator.sendBeacon(`${API_URL}/api/auth/presence`, blob);
          } else {
            pingStatus('passive');
          }
        } catch (_) {}
      }
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [currentUser?.id, currentUser?.email]);

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

    // Save recovery question whether or not a session was created
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

    // Always sign out after signup so the user must verify email before signing in
    if (data.session) {
      await supabase.auth.signOut();
    }

    return { requiresEmailVerification: true, email: normalizedEmail };
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
      // Keep banned check strictly in the normal user login flow.
      // Admin accounts must never be bannable.
      if ((error.message || '').toLowerCase().includes('banned')) {
        throw new Error('This account has been banned by an administrator.');
      }
      throw error;
    }

    // Normal user login flow: verify account is not banned
    const sessionUser = data.session?.user;
    if (sessionUser?.banned_until && new Date(sessionUser.banned_until) > new Date()) {
      await supabase.auth.signOut();
      throw new Error('This account has been banned by an administrator.');
    }

    const user = mapSessionUser(data.session);
    if (!user) throw new Error('Please verify your email before signing in.');
    return user;
  }, []);

  const logout = useCallback(async () => {
    ensureSupabaseConfigured();
    // IMPORTANT: await the passive presence ping (with 3s timeout) BEFORE
    // calling signOut so the backend registers the logout before navigation.
    if (currentUser?.id || currentUser?.email) {
      try {
        await Promise.race([
          fetch(`${API_URL}/api/auth/presence`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, email: currentUser.email, status: 'passive' }),
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('presence timeout')), 3000)),
        ]);
      } catch (_) {
        // Presence call failed or timed out — proceed with logout anyway
      }
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setCurrentUser(null);
  }, [currentUser]);

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

  const setPasswordForGoogleUser = useCallback(async ({ nonce, newPassword }) => {
    ensureSupabaseConfigured();
    if (!isStrongPassword(newPassword)) {
      throw new Error('Password must be at least 8 characters and include uppercase, lowercase, number, and special character.');
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword, nonce });
    if (error) throw error;

    await supabase.auth.refreshSession();
    const { data: refreshedData } = await supabase.auth.getSession();
    const refreshedUser = refreshedData.session ? mapSessionUser(refreshedData.session) : null;
    if (refreshedUser) {
      setCurrentUser(refreshedUser);
    }
    await supabase.auth.signOut({ scope: 'others' });
  }, []);

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
    setPasswordForGoogleUser,
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
    setPasswordForGoogleUser,
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
