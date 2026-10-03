import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import supabase from '../lib/supabase';
import { storageKeys, userStorageKey } from '../data/quizData';

const AuthContext = createContext(null);
const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';
const USER_STORAGE_KEY = 'career-guide-user-session';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongPassword(password) {
  if (typeof password !== 'string') {
    return false;
  }

  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password);
}

function mapSessionUser(session) {
  const sessionUser = session?.user;
  if (!sessionUser) {
    return null;
  }

  return {
    id: sessionUser.id,
    name: sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || 'Student',
    email: sessionUser.email,
    token: session?.access_token || null,
    securityQuestion: sessionUser.user_metadata?.securityQuestion || '',
    provider: sessionUser.app_metadata?.provider || sessionUser.identities?.[0]?.provider || 'email',
  };
}

function getResetRedirect() {
  if (typeof window === 'undefined') {
    return '/reset-password';
  }
  return `${window.location.origin}/reset-password`;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const localUserRaw = typeof window !== 'undefined' ? localStorage.getItem(USER_STORAGE_KEY) : null;
        let activeLocalUser = null;
        if (localUserRaw) {
          try {
            activeLocalUser = JSON.parse(localUserRaw);
            if (activeLocalUser && activeLocalUser.id) {
              // Purge stale/leaked benat session if detected
              if (activeLocalUser.email && activeLocalUser.email.toLowerCase().includes('benat')) {
                localStorage.removeItem(USER_STORAGE_KEY);
                activeLocalUser = null;
              } else {
                if (!cancelled) {
                  setCurrentUser(activeLocalUser);
                }
                return;
              }
            }
          } catch {
            // ignore JSON parse error
          }
        }

        const isSupabaseConfigured = Boolean(
          process.env.REACT_APP_SUPABASE_URL && !process.env.REACT_APP_SUPABASE_URL.includes('placeholder')
        );
        if (isSupabaseConfigured) {
          const { data } = await supabase.auth.getSession();
          if (cancelled) return;
          const user = mapSessionUser(data?.session);
          if (user && (!user.email || !user.email.toLowerCase().includes('benat'))) {
            if (typeof window !== 'undefined') {
              localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
            }
            setCurrentUser(user);

            try {
              const { data: rows } = await supabase
                .from('quiz_scores')
                .select('*')
                .eq('user_id', user.id)
                .limit(1);

              const row = rows?.[0];
              if (row) {
                if (row.scores) {
                  localStorage.setItem(userStorageKey(storageKeys.scores, user.id), JSON.stringify(row.scores));
                }
                if (row.top_categories) {
                  localStorage.setItem(userStorageKey(storageKeys.topCategories, user.id), JSON.stringify(row.top_categories));
                }
                if (row.model_answers) {
                  localStorage.setItem(userStorageKey('modelQuizAnswers', user.id), JSON.stringify(row.model_answers));
                }
              }
            } catch (err) {
              void err;
            }
          }
        }
      } finally {
        if (!cancelled) {
          setInitialized(true);
        }
      }
    }

    loadSession();

    const isSupabaseConfigured = Boolean(
      process.env.REACT_APP_SUPABASE_URL && !process.env.REACT_APP_SUPABASE_URL.includes('placeholder')
    );

    let subscription = null;
    if (isSupabaseConfigured) {
      const authStateResult = supabase.auth.onAuthStateChange(async (_event, session) => {
        const localUserRaw = typeof window !== 'undefined' ? localStorage.getItem(USER_STORAGE_KEY) : null;
        let localUser = null;
        if (localUserRaw) {
          try {
            localUser = JSON.parse(localUserRaw);
          } catch {}
        }

        // If a local user session is actively running, never let asynchronous Supabase session clobber it
        if (localUser && localUser.id && (localUser.authProvider === 'local' || localUser.provider === 'local')) {
          setCurrentUser(localUser);
          setInitialized(true);
          return;
        }

        if (session) {
          const user = mapSessionUser(session);
          if (user && (!user.email || !user.email.toLowerCase().includes('benat'))) {
            if (typeof window !== 'undefined') {
              localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
            }
            setCurrentUser(user);
          }
        } else {
          if (localUser?.id) {
            setCurrentUser(localUser);
          } else {
            setCurrentUser(null);
          }
        }
        setInitialized(true);
      });
      subscription = authStateResult?.data?.subscription;
    }

    return () => {
      cancelled = true;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const register = useCallback(async ({ name, email, password, securityQuestion, securityAnswer }) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      throw new Error('Please use a valid email address to create your account.');
    }

    if (!securityQuestion || !securityAnswer) {
      throw new Error('Please choose a security question and provide an answer.');
    }

    if (!isStrongPassword(password)) {
      throw new Error('Password must be at least 8 characters and include uppercase, lowercase, number, and special character.');
    }

    // Try local backend API first
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: normalizedEmail,
          password,
          securityQuestion,
          securityAnswer: securityAnswer.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && data?.user) {
        // Clear any stale Supabase session tokens
        const isSupabaseConfigured = Boolean(
          process.env.REACT_APP_SUPABASE_URL && !process.env.REACT_APP_SUPABASE_URL.includes('placeholder')
        );
        if (isSupabaseConfigured) {
          try {
            await supabase.auth.signOut({ scope: 'local' });
          } catch {}
        }
        if (typeof window !== 'undefined') {
          Object.keys(window.localStorage)
            .filter((key) => key.startsWith('sb-') && key.includes('auth-token'))
            .forEach((key) => window.localStorage.removeItem(key));
        }

        const sessionUser = {
          id: data.user.id,
          name: data.user.name || name.trim(),
          email: data.user.email || normalizedEmail,
          token: data.token,
          securityQuestion,
          provider: data.user.authProvider || 'local',
          authProvider: data.user.authProvider || 'local',
          hasPassword: data.user.hasPassword !== undefined ? data.user.hasPassword : true,
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(sessionUser));
        }
        setCurrentUser(sessionUser);
        return sessionUser;
      }

      if (response.status === 409) {
        throw new Error(data.message || 'An account with this email already exists.');
      }

      if (response.status === 400) {
        throw new Error(data.message || 'Invalid registration details.');
      }
    } catch (apiErr) {
      if (apiErr.message && !apiErr.message.includes('fetch') && !apiErr.message.includes('NetworkError')) {
        throw apiErr;
      }
    }

    // Fallback to Supabase if configured
    const isSupabaseConfigured = Boolean(
      process.env.REACT_APP_SUPABASE_URL && !process.env.REACT_APP_SUPABASE_URL.includes('placeholder')
    );

    if (!isSupabaseConfigured) {
      throw new Error('Unable to connect to backend server at ' + API_URL + '. Please ensure the backend is running.');
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          name: name.trim(),
          securityQuestion,
          securityAnswer,
        },
      },
    });

    if (error) {
      const errorMessage = (error.message || '').toLowerCase();
      if (errorMessage.includes('already registered')) {
        const loginResult = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (loginResult.error) {
          throw new Error('This email is already registered in Supabase. Please sign in with the existing password or use Forgot Password to reset it.');
        }

        const existingSessionUser = {
          id: loginResult.data.user.id,
          name: loginResult.data.user.user_metadata?.name || loginResult.data.user.email?.split('@')[0] || 'Student',
          email: loginResult.data.user.email,
          token: loginResult.data.session?.access_token || null,
          securityQuestion: loginResult.data.user.user_metadata?.securityQuestion || '',
          provider: 'supabase',
          authProvider: 'supabase',
        };

        if (typeof window !== 'undefined') {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(existingSessionUser));
        }
        setCurrentUser(existingSessionUser);
        return existingSessionUser;
      }

      throw error;
    }

    // If signUp did not return an active session, attempt to sign in immediately
    if (!data?.session) {
      const loginResult = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (loginResult.error) {
        const createdUser = {
          id: data.user.id,
          name: data.user.user_metadata?.name || name.trim(),
          email: data.user.email,
          token: data.session?.access_token || null,
          securityQuestion: data.user.user_metadata?.securityQuestion || '',
          provider: 'supabase',
          authProvider: 'supabase',
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(createdUser));
        }
        setCurrentUser(createdUser);
        return createdUser;
      }

      const sessionUser = {
        id: loginResult.data.user.id,
        name: loginResult.data.user.user_metadata?.name || name.trim(),
        email: loginResult.data.user.email,
        token: loginResult.data.session?.access_token || null,
        securityQuestion: data.user.user_metadata?.securityQuestion || '',
        provider: 'supabase',
        authProvider: 'supabase',
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(sessionUser));
      }
      setCurrentUser(sessionUser);
      return sessionUser;
    }

    const sessionUser = {
      id: data.user.id,
      name: data.user.user_metadata?.name || name.trim(),
      email: data.user.email,
      token: data.session?.access_token || null,
      securityQuestion: data.user.user_metadata?.securityQuestion || '',
      provider: 'supabase',
      authProvider: 'supabase',
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(sessionUser));
    }
    setCurrentUser(sessionUser);
    return sessionUser;
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      throw new Error('Please enter a valid email address.');
    }

    // Try local backend login
    try {
      const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      const loginData = await loginResponse.json().catch(() => ({}));
      if (loginResponse.ok && loginData?.user) {
        // Clear any stale Supabase session tokens
        const isSupabaseConfigured = Boolean(
          process.env.REACT_APP_SUPABASE_URL && !process.env.REACT_APP_SUPABASE_URL.includes('placeholder')
        );
        if (isSupabaseConfigured) {
          try {
            await supabase.auth.signOut({ scope: 'local' });
          } catch {}
        }
        if (typeof window !== 'undefined') {
          Object.keys(window.localStorage)
            .filter((key) => key.startsWith('sb-') && key.includes('auth-token'))
            .forEach((key) => window.localStorage.removeItem(key));
        }

        const sessionUser = {
          id: loginData.user.id,
          name: loginData.user.name,
          email: loginData.user.email,
          token: loginData.token,
          securityQuestion: loginData.user.securityQuestion || '',
          provider: loginData.user.authProvider || 'local',
          authProvider: loginData.user.authProvider || 'local',
          hasPassword: loginData.user.hasPassword !== undefined ? loginData.user.hasPassword : true,
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(sessionUser));
        }
        setCurrentUser(sessionUser);
        return sessionUser;
      }

      if (loginResponse.status === 403) {
        throw new Error(loginData.message || 'This account has been blocked by an administrator.');
      }

      if (loginResponse.status === 401) {
        throw new Error(loginData.message || 'Incorrect password.');
      }
    } catch (err) {
      if (err.message && !err.message.includes('fetch') && !err.message.includes('NetworkError')) {
        throw err;
      }
    }

    // Fallback to Supabase if configured
    const isSupabaseConfigured = Boolean(
      process.env.REACT_APP_SUPABASE_URL && !process.env.REACT_APP_SUPABASE_URL.includes('placeholder')
    );

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        if ((error.message || '').toLowerCase().includes('banned')) {
          throw new Error('This account has been blocked by an administrator. Please contact support.');
        }
        throw error;
      }

      const sessionUser = {
        id: data.user.id,
        name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Student',
        email: data.user.email,
        token: data.session?.access_token || null,
        securityQuestion: data.user.user_metadata?.securityQuestion || '',
        provider: 'supabase',
        authProvider: 'supabase',
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(sessionUser));
      }
      setCurrentUser(sessionUser);
      return sessionUser;
    }

    throw new Error('No account found with this email, or incorrect password.');
  }, []);

  const logout = useCallback(async () => {
    const currentId = currentUser?.id;
    setCurrentUser(null);

    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(USER_STORAGE_KEY);
      if (currentId) {
        window.localStorage.removeItem(userStorageKey(storageKeys.scores, currentId));
        window.localStorage.removeItem(userStorageKey(storageKeys.topCategories, currentId));
        window.localStorage.removeItem(userStorageKey('modelQuizAnswers', currentId));
        window.localStorage.removeItem(`career-guide-profile-${currentId}`);
      }
      Object.keys(window.localStorage)
        .filter((key) => key.startsWith('sb-') && key.includes('auth-token'))
        .forEach((key) => window.localStorage.removeItem(key));
    }

    const isSupabaseConfigured = Boolean(
      process.env.REACT_APP_SUPABASE_URL && !process.env.REACT_APP_SUPABASE_URL.includes('placeholder')
    );

    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (error) {
        void error;
      }
    }
  }, [currentUser]);

  const signInWithGoogle = useCallback(async () => {
    const isSupabaseConfigured = Boolean(
      process.env.REACT_APP_SUPABASE_URL && !process.env.REACT_APP_SUPABASE_URL.includes('placeholder')
    );
    if (!isSupabaseConfigured) {
      throw new Error('Google Sign-In requires an active Supabase configuration.');
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined,
      },
    });
    if (error) throw error;
    return null;
  }, []);

  const getSecurityQuestion = useCallback(async (email) => {
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      throw new Error('Please provide a valid email address.');
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/security-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.securityQuestion) {
          return data.securityQuestion;
        }
      }
    } catch (err) {
      void err;
    }

    if (currentUser?.email?.toLowerCase() === normalizedEmail) {
      return currentUser.securityQuestion || 'Use your recovery email link to reset your password.';
    }

    return 'Use your recovery email link to reset your password.';
  }, [currentUser]);

  const resetPasswordWithSecurityQuestion = useCallback(async ({ email, securityAnswer, password }) => {
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      throw new Error('Please provide a valid email address.');
    }

    if (!isStrongPassword(password)) {
      throw new Error('Password must be at least 8 characters and include uppercase, lowercase, number, and special character.');
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password-with-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          securityAnswer: (securityAnswer || '').trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        return true;
      }
      if (response.status === 401 || response.status === 404) {
        throw new Error(data.message || 'Incorrect recovery answer or account not found.');
      }
    } catch (err) {
      if (err.message && !err.message.includes('fetch') && !err.message.includes('NetworkError')) {
        throw err;
      }
    }

    const isSupabaseConfigured = Boolean(
      process.env.REACT_APP_SUPABASE_URL && !process.env.REACT_APP_SUPABASE_URL.includes('placeholder')
    );

    if (isSupabaseConfigured) {
      if (currentUser?.email?.toLowerCase() === normalizedEmail) {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData?.session) {
          throw new Error('Please login again before changing password');
        }

        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          if ((error.message || '').toLowerCase().includes('auth session missing')) {
            throw new Error('Please login again before changing password');
          }
          throw error;
        }
        return true;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: getResetRedirect(),
      });
      if (error) throw error;
      return {
        message: 'Password reset email sent. Please open the link in your inbox to finish updating your password.',
      };
    }

    throw new Error('Unable to reset password. Please check your credentials.');
  }, [currentUser]);

  const resetPassword = useCallback(async (payload) => resetPasswordWithSecurityQuestion(payload), [resetPasswordWithSecurityQuestion]);

  const verifyPassword = useCallback(async (password) => {
    if (!currentUser?.email) {
      throw new Error('No active session');
    }

    const normalizedEmail = currentUser.email.trim().toLowerCase();

    // Check with local backend
    if (currentUser.token) {
      try {
        const testResponse = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail, password }),
        });
        if (testResponse.ok) return true;
        if (testResponse.status === 401) return false;
      } catch (err) {
        void err;
      }
    }

    const isSupabaseConfigured = Boolean(
      process.env.REACT_APP_SUPABASE_URL && !process.env.REACT_APP_SUPABASE_URL.includes('placeholder')
    );

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        return !error;
      } catch (err) {
        throw err;
      }
    }

    return false;
  }, [currentUser]);

  const changePassword = useCallback(async ({ oldPassword, newPassword, isOAuth }) => {
    if (!currentUser?.email) {
      throw new Error('Please login again before changing password');
    }

    const isGoogleOAuth = Boolean(
      isOAuth ||
      currentUser.provider === 'google' ||
      currentUser.provider === 'oauth' ||
      currentUser.authProvider === 'google' ||
      !currentUser.hasPassword
    );

    // Try backend set-password endpoint
    try {
      const response = await fetch(`${API_URL}/api/auth/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.email,
          oldPassword: oldPassword || '',
          newPassword,
          isOAuth: isGoogleOAuth,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Unable to update password.');
      }
    } catch (apiErr) {
      if (apiErr.message && !apiErr.message.includes('Failed to fetch')) {
        throw apiErr;
      }
    }

    const isSupabaseConfigured = Boolean(
      process.env.REACT_APP_SUPABASE_URL && !process.env.REACT_APP_SUPABASE_URL.includes('placeholder')
    );

    if (isSupabaseConfigured) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          await supabase.auth.updateUser({ password: newPassword });
        }
      } catch {
        // Local update succeeded
      }
    }

    return true;
  }, [currentUser]);

  const deleteAccount = useCallback(async (password) => {
    if (!currentUser?.email) {
      throw new Error('No active session');
    }

    const passwordMatches = await verifyPassword(password);
    if (!passwordMatches) {
      throw new Error('Incorrect password. Account deletion was cancelled.');
    }

    if (currentUser.token) {
      try {
        const response = await fetch(`${API_URL}/api/auth/delete-account`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${currentUser.token}`,
          },
        });
        if (response.ok) {
          await logout();
          return true;
        }
      } catch (err) {
        void err;
      }
    }

    const isSupabaseConfigured = Boolean(
      process.env.REACT_APP_SUPABASE_URL && !process.env.REACT_APP_SUPABASE_URL.includes('placeholder')
    );

    if (isSupabaseConfigured) {
      throw new Error('Account deletion requires a secure server-side endpoint (Supabase service role or Edge Function). Configure that endpoint to enable delete account.');
    }

    await logout();
    return true;
  }, [currentUser, verifyPassword, logout]);

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
      changePassword,
      verifyPassword,
      deleteAccount,
    }),
    [currentUser, initialized, login, logout, register, signInWithGoogle, getSecurityQuestion, resetPasswordWithSecurityQuestion, resetPassword, verifyPassword, deleteAccount, changePassword],
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
