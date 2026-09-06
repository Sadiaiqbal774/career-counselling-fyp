import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import supabase from '../lib/supabase';
import { storageKeys, userStorageKey } from '../data/quizData';

const AuthContext = createContext(null);
const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';
const ADMIN_TOKEN_KEY = 'career-guide-admin-token';

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
        const adminToken = typeof window !== 'undefined'
          ? window.sessionStorage.getItem(ADMIN_TOKEN_KEY)
          : null;

        if (adminToken) {
          try {
            const adminResponse = await fetch(`${API_URL}/api/admin/me`, {
              headers: { Authorization: `Bearer ${adminToken}` },
            });

            if (adminResponse.ok) {
              const adminData = await adminResponse.json();
              if (!cancelled) {
                setCurrentUser({
                  id: 'admin',
                  name: 'Administrator',
                  email: adminData.admin.email,
                  token: adminToken,
                  isAdmin: true,
                });
              }
              return;
            }

            window.sessionStorage.removeItem(ADMIN_TOKEN_KEY);
          } catch (error) {
            void error;
          }
        }

        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        const user = mapSessionUser(data?.session);
        setCurrentUser(user);

        if (user?.id) {
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
            } else {
              localStorage.removeItem(userStorageKey(storageKeys.scores, user.id));
              localStorage.removeItem(userStorageKey(storageKeys.topCategories, user.id));
              localStorage.removeItem(userStorageKey('modelQuizAnswers', user.id));
            }
          } catch (err) {
            void err;
          }
        }
      } finally {
        if (!cancelled) {
          setInitialized(true);
        }
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = mapSessionUser(session);
      setCurrentUser(user);
      setInitialized(true);

      if (user?.id) {
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
          } else {
            localStorage.removeItem(userStorageKey(storageKeys.scores, user.id));
            localStorage.removeItem(userStorageKey(storageKeys.topCategories, user.id));
            localStorage.removeItem(userStorageKey('modelQuizAnswers', user.id));
          }
        } catch (err) {
          void err;
        }
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
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
        };

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
        // return the created user data without an active session
        const createdUser = {
          id: data.user.id,
          name: data.user.user_metadata?.name || name.trim(),
          email: data.user.email,
          token: data.session?.access_token || null,
          securityQuestion: data.user.user_metadata?.securityQuestion || '',
        };
        setCurrentUser(createdUser);
        return createdUser;
      }

      const sessionUser = {
        id: loginResult.data.user.id,
        name: loginResult.data.user.user_metadata?.name || name.trim(),
        email: loginResult.data.user.email,
        token: loginResult.data.session?.access_token || null,
        securityQuestion: loginResult.data.user.user_metadata?.securityQuestion || '',
      };

      setCurrentUser(sessionUser);
      return sessionUser;
    }

    const sessionUser = {
      id: data.user.id,
      name: data.user.user_metadata?.name || name.trim(),
      email: data.user.email,
      token: data.session?.access_token || null,
      securityQuestion: data.user.user_metadata?.securityQuestion || '',
    };

    setCurrentUser(sessionUser);
    return sessionUser;
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      throw new Error('Please enter a valid email address.');
    }

    try {
      const adminResponse = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      if (adminResponse.ok) {
        const adminData = await adminResponse.json();
        sessionStorage.setItem(ADMIN_TOKEN_KEY, adminData.token);
        const adminUser = {
          id: 'admin',
          name: 'Administrator',
          email: adminData.admin.email,
          token: adminData.token,
          isAdmin: true,
        };
        setCurrentUser(adminUser);
        return adminUser;
      }
    } catch (error) {
      void error;
    }

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
    };

    setCurrentUser(sessionUser);
    return sessionUser;
  }, []);

  const logout = useCallback(async () => {
    setCurrentUser(null);

    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    }

    if (currentUser?.id) {
      localStorage.removeItem(userStorageKey(storageKeys.scores, currentUser.id));
      localStorage.removeItem(userStorageKey(storageKeys.topCategories, currentUser.id));
      localStorage.removeItem(userStorageKey('modelQuizAnswers', currentUser.id));
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      Object.keys(window.localStorage)
        .filter((key) => key.startsWith('sb-') && key.includes('auth-token'))
        .forEach((key) => window.localStorage.removeItem(key));
    }

    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      throw error;
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
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

    void securityAnswer;
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: getResetRedirect(),
    });
    if (error) throw error;
    return {
      message: 'Password reset email sent. Please open the link in your inbox to finish updating your password.',
    };
  }, [currentUser]);

  const resetPassword = useCallback(async (payload) => resetPasswordWithSecurityQuestion(payload), [resetPasswordWithSecurityQuestion]);

  const verifyPassword = useCallback(async (password) => {
    if (!currentUser?.email) {
      throw new Error('No active session');
    }

    const normalizedEmail = currentUser.email.trim().toLowerCase();
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) {
        return false;
      }
      return true;
    } catch (err) {
      throw err;
    }
  }, [currentUser]);

  const changePassword = useCallback(async ({ oldPassword, newPassword }) => {
    if (!currentUser?.email) {
      throw new Error('Please login again before changing password');
    }

    if (currentUser.provider !== 'google') {
      const ok = await verifyPassword(oldPassword);
      if (!ok) {
        throw new Error('Old password is incorrect');
      }
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData?.session) {
      throw new Error('Please login again before changing password');
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      if ((error.message || '').toLowerCase().includes('auth session missing')) {
        throw new Error('Please login again before changing password');
      }
      throw error;
    }

    return true;
  }, [currentUser, verifyPassword]);

  const deleteAccount = useCallback(async (password) => {
    if (!currentUser?.email) {
      throw new Error('No active session');
    }

    const passwordMatches = await verifyPassword(password);
    if (!passwordMatches) {
      throw new Error('Incorrect password. Account deletion was cancelled.');
    }

    throw new Error('Account deletion requires a secure server-side endpoint (Supabase service role or Edge Function). Configure that endpoint to enable delete account.');
  }, [currentUser, verifyPassword]);

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
