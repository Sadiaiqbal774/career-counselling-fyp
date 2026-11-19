import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import supabase from '../lib/supabase';
import { isStrongPassword } from '../lib/authHelpers';
import './Auth.css';
import PasswordField from '../components/PasswordField';

function ResetPassword() {
  const { initialized, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [recoveryChecked, setRecoveryChecked] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const code = searchParams.get('code');

  useEffect(() => {
    let mounted = true;

    // Listen for auth events. Enable the form if a session is established
    // (covers PASSWORD_RECOVERY, SIGNED_IN, INITIAL_SESSION, TOKEN_REFRESHED)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (session) {
        setRecoveryReady(true);
        setRecoveryChecked(true);
      }
    });

    const initRecovery = async () => {
      const hash = typeof window !== 'undefined' ? (window.location.hash || '') : '';
      const search = typeof window !== 'undefined' ? (window.location.search || '') : '';

      // Check for explicit error from Supabase in URL hash or query params
      if (hash.includes('error=') || search.includes('error=')) {
        if (!mounted) return;
        let desc = 'The reset link is invalid or has expired. Please request a new one.';
        if (hash.includes('error_description=')) {
          try {
            desc = decodeURIComponent(hash.split('error_description=')[1].split('&')[0].replace(/\+/g, ' '));
          } catch (_) {}
        } else if (searchParams.get('error_description')) {
          desc = searchParams.get('error_description');
        }
        setErrorMessage(desc);
        setRecoveryReady(false);
        setRecoveryChecked(true);
        return;
      }

      // 1. PKCE flow with code param
      if (code) {
        try {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (!mounted) return;
          if (!exchangeError && data?.session) {
            setRecoveryReady(true);
            setRecoveryChecked(true);
            return;
          }
          if (exchangeError) {
            setErrorMessage(exchangeError.message || 'The reset code is invalid or expired.');
          }
        } catch (_) {}
      }

      // 2. Recovery / Access token present in hash or query
      if (
        hash.includes('type=recovery') ||
        search.includes('type=recovery') ||
        hash.includes('access_token=') ||
        searchParams.get('type') === 'recovery'
      ) {
        if (!mounted) return;
        setRecoveryReady(true);
        setRecoveryChecked(true);
        return;
      }

      // 3. Existing authenticated session (e.g. Supabase client already parsed hash or logged-in user)
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        if (data?.session) {
          setRecoveryReady(true);
          setRecoveryChecked(true);
          return;
        }
      } catch (_) {}

      // 4. Grace period for asynchronous URL hash parsing by Supabase JS client
      setTimeout(async () => {
        if (!mounted) return;
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session) {
            setRecoveryReady(true);
          }
        } catch (_) {}
        setRecoveryChecked(true);
      }, 600);
    };

    initRecovery();

    return () => {
      mounted = false;
      if (authListener?.subscription?.unsubscribe) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [code, searchParams]);

  if (initialized && recoveryChecked && !recoveryReady) {
    return (
      <main className="auth-screen">
        <section className="auth-shell">
          <aside className="auth-hero">
            <div className="auth-brand-row">
              <div className="auth-brand-mark">CG</div>
              <div>
                <div className="auth-brand-name">CareerGuide</div>
                <div className="auth-brand-subtitle">Reset your password</div>
              </div>
            </div>
            <h1>Invalid or Expired Link</h1>
            <p>
              {errorMessage || 'This password reset link has expired or has already been used. Please request a new link.'}
            </p>
          </aside>
          <section className="auth-card">
            <div className="auth-card-header">
              <p className="eyebrow">Password recovery</p>
              <h2>Link Expired</h2>
              <p className="muted-text">
                Password reset links are valid for 1 hour and can only be used once for security.
              </p>
            </div>
            <p className="auth-error">
              {errorMessage || 'Invalid or expired reset link. Please request a new one.'}
            </p>
            <div style={{ marginTop: '20px' }}>
              <Link to="/forgot-password" className="auth-primary-button" style={{ display: 'inline-block', textAlign: 'center', textDecoration: 'none' }}>
                Request New Reset Link →
              </Link>
            </div>
          </section>
        </section>
      </main>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!isStrongPassword(password)) {
      setError('Password must be at least 8 characters and include uppercase, lowercase, number, and special character.');
      return;
    }

    setIsSubmitting(true);

    try {
      await updatePassword(password);

      setMessage('Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message || 'Unable to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-shell">
        <aside className="auth-hero">
          <div className="auth-brand-row">
            <div className="auth-brand-mark">CG</div>
            <div>
              <div className="auth-brand-name">CareerGuide</div>
              <div className="auth-brand-subtitle">Reset your password</div>
            </div>
          </div>

          <h1>Create a new password</h1>
          <p>Enter your new password below to reset your account access.</p>
        </aside>

        <section className="auth-card">
          <div className="auth-card-header">
            <p className="eyebrow">Password reset</p>
            <h2>Set new password</h2>
            <p className="muted-text">Your reset session is active. Create a strong password.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-field">
              <span>New password</span>
              <PasswordField
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                minLength="8"
              />
            </label>

            <label className="auth-field">
              <span>Confirm password</span>
              <PasswordField
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                minLength="8"
              />
            </label>

            {error ? <p className="auth-error">{error}</p> : null}
            {message ? <p className="auth-success">{message}</p> : null}

            <button className="auth-primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Resetting...' : 'Reset password'}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}

export default ResetPassword;
