import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

function ForgotPassword() {
  const { resetPassword, getRecoveryQuestion, verifyRecoveryAnswer, completeRecoveryQuestion, initialized, isAuthenticated } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [method, setMethod] = useState('question');

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
      if (method === 'email') {
        await resetPassword(email);
        setMessage('If an account exists for that email, a password reset link has been sent.');
      } else if (!question) {
        setQuestion(await getRecoveryQuestion(email));
        setMessage('Answer your recovery question to continue.');
      } else if (!recoveryToken) {
        setRecoveryToken(await verifyRecoveryAnswer(email, answer));
        setMessage('Answer accepted. Set a new password.');
      } else {
        if (newPassword !== confirmPassword) throw new Error('Passwords do not match.');
        await completeRecoveryQuestion(recoveryToken, newPassword);
        setMessage('Password reset successfully. You can now sign in.');
      }
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
    setQuestion('');
    setAnswer('');
    setRecoveryToken('');
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
            <h2>{method === 'email' ? 'Reset by email' : 'Recover your password'}</h2>
            <p className="muted-text">
              {method === 'email' ? 'We will send a secure password reset link to your email.' : 'Use your recovery question, or choose another recovery method.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {!question || method === 'email' ? null : (
              <div className="auth-question-box"><strong>{question}</strong></div>
            )}
            {question && method === 'question' && !recoveryToken ? (
              <label className="auth-field">
                <span>Recovery answer</span>
                <input type="text" value={answer} onChange={(e) => setAnswer(e.target.value)} autoComplete="off" required />
              </label>
            ) : null}
            {recoveryToken ? (
              <>
                <label className="auth-field"><span>New password</span><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></label>
                <label className="auth-field"><span>Confirm new password</span><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></label>
              </>
            ) : null}
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
                {isSubmitting ? 'Please wait...' : recoveryToken ? 'Set new password' : question && method === 'question' ? 'Verify answer' : method === 'email' ? 'Send reset link' : 'Continue'}
            </button>
            {!recoveryToken ? (
              <button type="button" className="auth-secondary-button" onClick={() => { setMethod(method === 'email' ? 'question' : 'email'); setError(''); setMessage(''); setQuestion(''); setAnswer(''); }}>
                {method === 'email' ? 'Use recovery question' : 'Try another way'}
              </button>
            ) : null}
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
