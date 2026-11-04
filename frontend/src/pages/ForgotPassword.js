import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

function ForgotPassword() {
  const { resetPassword, initialized, isAuthenticated } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const destination = location.state?.from?.pathname || '/dashboard';

  if (initialized && isAuthenticated) {
    return <Navigate to={destination} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      await resetPassword(email);
      setMessage('If an account exists for that email, a password reset link has been sent.');
    } catch (err) {
      setError(err.message || 'Unable to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailChange = (value) => {
    setEmail(value);
    setError('');
    setMessage('');
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

          <h1>Forgot your password?</h1>
          <p>
            No problem! Enter the email address associated with your account and we’ll send a secure reset link.
          </p>
        </aside>

        <section className="auth-card">
          <div className="auth-card-header">
            <p className="eyebrow">Password recovery</p>
            <h2>Verify your identity</h2>
            <p className="muted-text">We will send a secure password reset link to your email.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>

            {error ? <p className="auth-error">{error}</p> : null}
            {message ? <p className="auth-success">{message}</p> : null}

            <button className="auth-primary-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send reset link'}
            </button>
          </form>

          <p className="auth-switch-text">
            Remembered? <Link to="/login">Sign in</Link>
          </p>
        </section>
      </section>
    </main>
  );
}

export default ForgotPassword;
