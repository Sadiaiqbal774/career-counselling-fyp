import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PasswordField from '../components/PasswordField';
import { securityQuestions } from '../data/securityQuestions';
import './Auth.css';

function Register() {
  const { register, initialized, isAuthenticated, resendVerification, verifySignupCode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryQuestion, setRecoveryQuestion] = useState('');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationStep, setVerificationStep] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const destination = location.state?.from?.pathname || '/';

  if (initialized && isAuthenticated) {
    return <Navigate to={destination} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await register({ name, email, password, recoveryQuestion, recoveryAnswer });
      if (result?.requiresEmailVerification) {
        setVerificationEmail(result.email);
        setVerificationStep(true);
        setErrorMessage('Account created. Check your email and verify your address before signing in.');
      } else {
        navigate(destination, { replace: true });
      }
    } catch (error) {
      setErrorMessage(error.message || 'Unable to create the account right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setIsVerifying(true);
    try {
      const user = await verifySignupCode(verificationEmail, verificationCode);
      navigate(user?.isAdmin ? '/admin' : '/', { replace: true });
    } catch (error) {
      setErrorMessage(error.message || 'That verification code is invalid or expired.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-shell">
        <aside className="auth-hero auth-hero--accent">
          <div className="auth-brand-row">
            <div className="auth-brand-mark">CG</div>
            <div>
              <div className="auth-brand-name">CareerGuide</div>
              <div className="auth-brand-subtitle">Create your account</div>
            </div>
          </div>

          <h1>Create a secure account to save your progress.</h1>
          <p>
            Registration gives you access to the protected dashboard and keeps your quiz flow connected across pages.
          </p>

          <div className="auth-feature-list">
            <div>Protected access to all quiz pages</div>
            <div>Stored profile and session state</div>
            <div>Fast local sign-in experience</div>
          </div>
        </aside>

        <section className="auth-card">
          <div className="auth-card-header">
            <p className="eyebrow">Start here</p>
            <h2>{verificationStep ? 'Verify your email' : 'Create account'}</h2>
            <p className="muted-text">
              {verificationStep
                ? `We sent a verification email to ${verificationEmail}. Click its link to finish, or enter the one-time code below if your email contains a code.`
                : 'Set up your profile in a minute with a real, reachable email address. We use secure email verification and recovery links.'}
            </p>
          </div>

          {verificationStep ? (
            <form onSubmit={handleVerifyCode} className="auth-form">
              <label className="auth-field">
                <span>Email verification code</span>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value)}
                  placeholder="Enter the code from your email"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  minLength="6"
                  required
                />
              </label>

              {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
              <button className="auth-primary-button" type="submit" disabled={isVerifying}>
                {isVerifying ? 'Verifying...' : 'Verify email'}
              </button>
              <button
                type="button"
                className="auth-secondary-button"
                onClick={async () => {
                  try {
                    await resendVerification(verificationEmail);
                    setErrorMessage('A new verification email has been sent.');
                  } catch (error) {
                    setErrorMessage(error.message || 'Unable to resend verification email.');
                  }
                }}
              >
                Resend verification email
              </button>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-field">
              <span>Full name</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                required
              />
            </label>

            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="auth-field">
              <span>Password</span>
              <PasswordField
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a password"
                required
              />
            </label>

            <label className="auth-field">
              <span>Confirm password</span>
              <PasswordField
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat your password"
                required
              />
            </label>

            <label className="auth-field">
              <span>Recovery question</span>
              <select value={recoveryQuestion} onChange={(event) => setRecoveryQuestion(event.target.value)} required>
                <option value="">Choose a recovery question</option>
                {securityQuestions.map((question) => <option key={question} value={question}>{question}</option>)}
              </select>
            </label>

            <label className="auth-field">
              <span>Recovery answer</span>
              <input
                type="text"
                value={recoveryAnswer}
                onChange={(event) => setRecoveryAnswer(event.target.value)}
                placeholder="Your answer"
                autoComplete="off"
                required
              />
            </label>

            {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
            {verificationEmail ? (
              <button type="button" className="auth-secondary-button" onClick={async () => {
                try {
                  await resendVerification(verificationEmail);
                  setErrorMessage('A new verification email has been sent.');
                } catch (error) {
                  setErrorMessage(error.message || 'Unable to resend verification email.');
                }
              }}>
                Resend verification email
              </button>
            ) : null}

            <button className="auth-primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>
          )}

          <p className="auth-switch-text">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </section>
      </section>
    </main>
  );
}

export default Register;