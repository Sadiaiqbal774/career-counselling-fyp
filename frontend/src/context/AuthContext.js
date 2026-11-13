import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import supabase from '../lib/supabase';

const AuthContext = createContext(null);

function isValidEmail(email) {
  return /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email);
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
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        setCurrentUser(mapSessionUser(data?.session));
      } finally {
        if (!cancelled) {
          setInitialized(true);
        }
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(mapSessionUser(session));
      setInitialized(true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const register = useCallback(async ({ name, email, password, securityQuestion, securityAnswer }) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      throw new Error('Please use a valid Gmail address (example@gmail.com) to create your account.');
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

    if (error) throw error;

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
      throw new Error('Please enter a valid Gmail address (example@gmail.com).');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) throw error;

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
    await supabase.auth.signOut();
    setCurrentUser(null);
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
      throw new Error('Please provide a valid Gmail address (example@gmail.com).');
    }

    if (currentUser?.email?.toLowerCase() === normalizedEmail) {
      return currentUser.securityQuestion || 'Use your recovery email link to reset your password.';
    }

    return 'Use your recovery email link to reset your password.';
  }, [currentUser]);

  const resetPasswordWithSecurityQuestion = useCallback(async ({ email, securityAnswer, password }) => {
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      throw new Error('Please provide a valid Gmail address (example@gmail.com).');
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

    // securityAnswer is kept for API compatibility with existing pages.
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

    if (!isStrongPassword(newPassword)) {
      throw new Error('Password must be at least 8 characters and include uppercase, lowercase, number, and special character.');
    }

    const ok = await verifyPassword(oldPassword);
    if (!ok) {
      throw new Error('Current password is incorrect.');
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (sessionError || !accessToken) {
      throw new Error('Please login again before changing password');
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      if ((error.message || '').toLowerCase().includes('auth session missing')) {
        throw new Error('Please login again before changing password');
      }
      throw error;
    }

    await supabase.auth.signOut({ scope: 'others' });
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