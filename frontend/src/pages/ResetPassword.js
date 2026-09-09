import { useState } from 'react';
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import supabase from '../lib/supabase';
import './Auth.css';
import PasswordField from '../components/PasswordField';

function ResetPassword() {
  const { initialized, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = searchParams.get('token');
  const code = searchParams.get('code');

  if (initialized && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!token && !code) {
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
            <h1>Invalid reset link</h1>
            <p>The reset link is missing or invalid. Please request a new password reset email.</p>
          </aside>
          <section className="auth-card">
            <p className="auth-error">No Supabase reset code found in link.</p>
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

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        throw error;
      }

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
            <p className="muted-text">Your reset code is valid. Create a strong password.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-field">
              <span>New password</span>
              <PasswordField
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                minLength="6"
              />
            </label>

            <label className="auth-field">
              <span>Confirm password</span>
              <PasswordField
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                minLength="6"
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
