import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

function ForgotPassword() {
  const { getSecurityQuestion, resetPasswordWithSecurityQuestion, initialized, isAuthenticated } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQuestionLoaded, setIsQuestionLoaded] = useState(false);

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
      if (!isQuestionLoaded) {
        const question = await getSecurityQuestion(email);
        setSecurityQuestion(question);
        setIsQuestionLoaded(true);
        setMessage('Answer your security question to continue.');
        return;
      }

      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match.');
      }

      await resetPasswordWithSecurityQuestion({
        email,
        securityAnswer,
        password: newPassword,
      });

      setMessage('Password reset successfully. Redirecting to sign in...');
      setTimeout(() => window.location.assign('/login'), 1500);
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
    setIsQuestionLoaded(false);
    setSecurityQuestion('');
    setSecurityAnswer('');
    setNewPassword('');
    setConfirmPassword('');
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
            <h2>Verify your identity</h2>
            <p className="muted-text">We will ask the personal question you set during registration.</p>
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

            {isQuestionLoaded ? (
              <>
                <div className="auth-question-box">{securityQuestion}</div>

                <label className="auth-field">
                  <span>Your answer</span>
                  <input
                    type="text"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    placeholder="Type your answer"
                    required
                  />
                </label>

                <label className="auth-field">
                  <span>New password</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Create a new password"
                    required
                  />
                </label>

                <label className="auth-field">
                  <span>Confirm password</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm the password"
                    required
                  />
                </label>
              </>
            ) : null}

            {error ? <p className="auth-error">{error}</p> : null}
            {message ? <p className="auth-success">{message}</p> : null}

            <button className="auth-primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Working...' : isQuestionLoaded ? 'Reset password' : 'Find my question'}
            </button>

            {isQuestionLoaded ? (
              <button
                type="button"
                className="auth-secondary-button"
                onClick={() => setIsQuestionLoaded(false)}
                style={{ marginTop: 12 }}
              >
                Use a different email
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
