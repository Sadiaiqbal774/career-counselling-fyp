import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

function ForgotPassword() {
  const { initialized, isAuthenticated } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [devResetLink, setDevResetLink] = useState('');

  const destination = location.state?.from?.pathname || '/dashboard';

  if (initialized && isAuthenticated) {
    return <Navigate to={destination} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setDevResetLink('');
    setIsSubmitting(true);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const res = await fetch(`${apiUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Unable to send reset email');
      }

      const body = await res.json();
      
      // Check if development mode (SMTP not configured)
      if (body.devMode && body.resetLink) {
        setDevResetLink(body.resetLink);
        setMessage('Development mode: Click the link below to reset your password:');
      } else {
        setMessage(`A password reset code has been sent to ${email}. Check your email and follow the link to reset your password.`);
      }
      setEmail('');
    } catch (err) {
      setError(err.message || 'Unable to send reset email.');
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

          <h1>Forgot your password?</h1>
          <p>
            No problem! Enter the email address associated with your account and we'll send you a code to reset your password.
          </p>
        </aside>

        <section className="auth-card">
          <div className="auth-card-header">
            <p className="eyebrow">Password recovery</p>
            <h2>Get reset code</h2>
            <p className="muted-text">We'll email you a secure reset code to verify your identity.</p>
          </div>

          {!message ? (
            <form onSubmit={handleSubmit} className="auth-form">
              <label className="auth-field">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>

              {error ? <p className="auth-error">{error}</p> : null}

              <button className="auth-primary-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send reset code'}
              </button>
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p className="auth-success">{message}</p>
              {devResetLink && (
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f0f7ff', borderRadius: '4px', border: '1px solid #b3d9ff' }}>
                  <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>🔧 Development Mode - Reset Link:</p>
                  <a
                    href={devResetLink}
                    style={{
                      display: 'inline-block',
                      color: '#007bff',
                      textDecoration: 'none',
                      wordBreak: 'break-all',
                      fontSize: '12px',
                      padding: '8px',
                      backgroundColor: 'white',
                      borderRadius: '3px',
                      border: '1px solid #e0e0e0',
                    }}
                  >
                    {devResetLink}
                  </a>
                </div>
              )}
              <p style={{ marginTop: '16px', fontSize: '14px', color: '#666' }}>
                Didn't receive the email? <button onClick={() => setMessage('')} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}>Try again</button>
              </p>
            </div>
          )}

          <p className="auth-switch-text">
            Remembered? <Link to="/login">Sign in</Link>
          </p>
        </section>
      </section>
    </main>
  );
}

export default ForgotPassword;
