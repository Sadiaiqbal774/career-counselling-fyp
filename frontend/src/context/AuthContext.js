import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import supabase, { ensureSupabaseConfigured, getSupabaseConfigError } from '../lib/supabase';
import { hasPassword, isStrongPassword } from '../lib/authHelpers';
import { saveUserProfile } from '../data/userData';

const AuthContext = createContext(null);
const API_URL = (() => {
  if (typeof window !== 'undefined' && window.location && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:5000';
  }
  const envUrl = (process.env.REACT_APP_API_URL || '').trim().replace(/\/+$/, '');
  return envUrl || 'https://career-counselling-fyp.onrender.com';
})();

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
        const clientId = (() => { try { let cid = sessionStorage.getItem('_presence_cid'); if (!cid) { cid = Math.random().toString(36).slice(2); sessionStorage.setItem('_presence_cid', cid); } return cid; } catch (_) { return 'default'; } })();
        fetch(`${API_URL}/api/auth/presence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: mapped.id, email: mapped.email, status: 'active', clientId }),
        }).catch(() => {});

        // Fetch and cache user profile from Supabase so it's immediately available across devices
        supabase
          .from('profiles')
          .select('*')
          .eq('id', mapped.id)
          .maybeSingle()
          .then(({ data: sp }) => {
            if (sp) {
              const loaded = {
                fullName: mapped.name || sp.full_name || '',
                email: mapped.email || sp.email || '',
                phone: sp.phone || '',
                city: sp.city || '',
                school: sp.school || '',
                marks: sp.marks !== null && sp.marks !== undefined ? String(sp.marks) : '',
                intermediateMarks: sp.intermediate_marks !== null && sp.intermediate_marks !== undefined ? String(sp.intermediate_marks) : '',
                intermediateGroup: sp.intermediate_group || 'Pre-Engineering',
                entryTest: sp.entry_test || 'None',
                entryTestScore: sp.entry_test_score ? String(sp.entry_test_score) : '',
                academicLevel: ['Matric', 'Intermediate'].includes(sp.academic_level) ? sp.academic_level : 'Intermediate',
                preferredField: sp.preferred_field || 'Technology',
                interests: sp.interests || '',
                notes: sp.notes || '',
              };
              saveUserProfile(mapped.id, loaded);
            }
          })
          .catch(() => {});
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

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      applySession(session);
      if (event === 'PASSWORD_RECOVERY') {
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/reset-password')) {
          window.location.href = `/reset-password${window.location.hash || ''}`;
        }
      }
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!currentUser?.id && !currentUser?.email) return;

    // Unique ID per browser tab so multi-device tracking works correctly
    const clientId = (() => {
      try {
        let cid = sessionStorage.getItem('_presence_cid');
        if (!cid) { cid = Math.random().toString(36).slice(2); sessionStorage.setItem('_presence_cid', cid); }
        return cid;
      } catch (_) { return Math.random().toString(36).slice(2); }
    })();

    const pingStatus = (status) => {
      try {
        fetch(`${API_URL}/api/auth/presence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id, email: currentUser.email, status, clientId }),
        }).catch(() => {});
      } catch (_) {}
    };

    // Immediate active ping on mount / login
    if (shouldPingActiveUser(currentUser)) {
      pingStatus('active');
    }

    // Heartbeat every 12 seconds while the user session is active
    const interval = setInterval(() => {
      if (shouldPingActiveUser(currentUser)) {
        pingStatus('active');
      }
    }, 12000);

    // sendThisDevicePassive: called when THIS tab/browser window is actually closed
    const sendThisDevicePassive = () => {
      if (!currentUser?.id && !currentUser?.email) return;
      try {
        const payloadStr = JSON.stringify({ userId: currentUser.id, email: currentUser.email, status: 'passive', clientId });
        if (navigator.sendBeacon) {
          const blob = new Blob([payloadStr], { type: 'application/json' });
          navigator.sendBeacon(`${API_URL}/api/auth/presence`, blob);
        }
        fetch(`${API_URL}/api/auth/presence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payloadStr,
          keepalive: true,
        }).catch(() => {});
      } catch (_) {}
    };

    // On tab becoming visible again, immediately re-ping as active
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && shouldPingActiveUser(currentUser)) {
        pingStatus('active');
      }
    };

    window.addEventListener('beforeunload', sendThisDevicePassive);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', sendThisDevicePassive);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser?.id, currentUser?.email]);

  const register = useCallback(async ({ name, email, password, recoveryQuestion, recoveryAnswer }) => {
    ensureSupabaseConfigured();
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) throw new Error('Please use a valid email address.');
    if (!isStrongPassword(password)) {
      throw new Error('Password must be at least 6 characters.');
    }

    const payload = {
      name: name.trim(),
      email: normalizedEmail,
      password,
    };
    if (recoveryQuestion) payload.securityQuestion = recoveryQuestion;
    if (recoveryAnswer) payload.securityAnswer = recoveryAnswer;

    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || 'Unable to start registration.');
    return result;
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
        throw new Error('Please verify your email before signing in. Check your inbox and spam folder.');
      }
      if ((error.message || '').toLowerCase().includes('invalid login credentials')) {
        try {
          const checkRes = await fetch(`${API_URL}/api/auth/check-pending?email=${encodeURIComponent(normalizedEmail)}`);
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            if (checkData.pending) {
              throw new Error('Please verify your email before signing in. We sent a verification link to your email.');
            }
          }
        } catch (checkErr) {
          if (checkErr.message && checkErr.message.includes('verify your email')) {
            throw checkErr;
          }
        }
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
    // Send logout status (removes this tab's presence immediately)
    if (currentUser?.id || currentUser?.email) {
      const clientId = (() => { try { return sessionStorage.getItem('_presence_cid') || 'default'; } catch (_) { return 'default'; } })();
      try {
        await Promise.race([
          fetch(`${API_URL}/api/auth/presence`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, email: currentUser.email, status: 'logout', clientId }),
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
    const response = await fetch(`${API_URL}/api/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || 'Unable to resend verification email.');
  }, []);

  const verifyRegistration = useCallback(async (token) => {
    const response = await fetch(`${API_URL}/api/auth/verify-registration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || 'Unable to verify the registration.');
    return result;
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
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) throw new Error('Email is required to send password reset link.');

    // 1. First try backend endpoint which delivers email directly via Brevo SMTP
    try {
      const response = await fetch(`${API_URL}/api/auth/send-reset-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        return data;
      }
      if (response.status >= 500) {
        throw new Error(data.message || 'Email delivery service is currently unavailable.');
      }
    } catch (err) {
      console.warn('Backend send-reset-link failed, trying Supabase fallback:', err);
    }

    // 2. Fallback to Supabase client-side resetPasswordForEmail
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
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
      throw new Error('Password must be at least 6 characters.');
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

  const setPasswordForGoogleUser = useCallback(async ({ email, otpCode, newPassword }) => {
    ensureSupabaseConfigured();
    if (!isStrongPassword(newPassword)) {
      throw new Error('Password must be at least 6 characters.');
    }

    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail || !otpCode) {
      throw new Error('Enter the verification code sent to your email.');
    }

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: otpCode.trim(),
      type: 'email',
    });
    if (verifyError) throw new Error('The verification code is invalid or expired.');

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) throw updateError;

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
    verifyRegistration,
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
    verifyRegistration,
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
