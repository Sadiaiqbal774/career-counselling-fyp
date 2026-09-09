import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';
import PasswordField from '../components/PasswordField';

function ChangePassword() {
  const navigate = useNavigate();
  const { currentUser, initialized, isAuthenticated, changePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const email = useMemo(() => currentUser?.email || '', [currentUser]);

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
      await changePassword({ oldPassword: '', newPassword: password, isOAuth: true });
      setMessage('Password updated successfully.');
      setTimeout(() => navigate('/dashboard', { replace: true }), 900);
    } catch (err) {
      setError(err.message || 'Unable to change password.');
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

            <button className="auth-primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update password'}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}

export default ChangePassword;
