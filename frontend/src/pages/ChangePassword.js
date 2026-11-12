import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';
import PasswordField from '../components/PasswordField';

function ChangePassword() {
  const navigate = useNavigate();
  const { currentUser, initialized, isAuthenticated, changePassword, resetPassword } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alternativeMessage, setAlternativeMessage] = useState('');

  const email = useMemo(() => currentUser?.email || '', [currentUser]);
  const usesPassword = currentUser?.provider === 'email' || currentUser?.authProvider === 'email';

  if (initialized && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email) {
      setError('Please login again before changing password');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword({ oldPassword, newPassword: password });
      setMessage('Password updated successfully.');
      setTimeout(() => navigate('/dashboard', { replace: true }), 900);
    } catch (err) {
      setError(err.message || 'Unable to change password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tryAnotherWay = async () => {
    setAlternativeMessage('');
    try {
      await resetPassword(email);
      setAlternativeMessage('If an account exists for this email, a secure reset link has been sent.');
    } catch (err) {
      setError(err.message || 'Unable to send the reset link.');
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
              <div className="auth-brand-subtitle">Account security</div>
            </div>
          </div>
          <h1>Change your password</h1>
          <p>Choose a new secure password for your account.</p>
        </aside>

        <section className="auth-card">
          <div className="auth-card-header">
            <p className="eyebrow">Account security</p>
            <h2>Change password</h2>
            <p className="muted-text">Set a strong new password for your account.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {usesPassword ? (
              <label className="auth-field">
                <span>Current password</span>
                <PasswordField value={oldPassword} onChange={(ev) => setOldPassword(ev.target.value)} required />
              </label>
            ) : (
              <p className="muted-text">
                This account uses Google sign-in and has no current password. To create one, use the{' '}
                <Link to="/forgot-password">password recovery email</Link>.
              </p>
            )}
            <label className="auth-field">
              <span>New password</span>
              <PasswordField value={password} onChange={(ev) => setPassword(ev.target.value)} required />
            </label>

            <label className="auth-field">
              <span>Confirm password</span>
              <PasswordField value={confirmPassword} onChange={(ev) => setConfirmPassword(ev.target.value)} required />
            </label>

            {error ? <p className="auth-error">{error}</p> : null}
            {message ? <p className="auth-success">{message}</p> : null}
            {alternativeMessage ? <p className="auth-success">{alternativeMessage}</p> : null}

            <button className="auth-primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update password'}
            </button>
          </form>
          <button type="button" className="auth-secondary-button" onClick={tryAnotherWay}>
            Try another way (send reset link)
          </button>
        </section>
      </section>
    </main>
  );
}

export default ChangePassword;
