import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

import { useAuth } from '../context/AuthContext';
import PasswordField from '../components/PasswordField';
import './Auth.css';

function Register() {
  const { register, resendVerification, initialized, isAuthenticated, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [resendNotice, setResendNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationStep, setVerificationStep] = useState(false);

  const destination = location.state?.from?.pathname || '/dashboard';

  if (initialized && isAuthenticated && !isSubmitting && !verificationStep) {
    return <Navigate to={destination} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setResendNotice('');

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await register({ name, email, password });
      toast.success(result?.message || 'Registration Successful');
      setVerificationEmail(email);
      setVerificationStep(true);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to create the account right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setErrorMessage('');
    setResendNotice('');
    try {
      const res = await resendVerification(verificationEmail);
      const msg = res?.message || 'Verification email resent successfully.';
      setResendNotice(msg);
      toast.success(msg);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to resend verification email.');
    } finally {
      setIsResending(false);
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
          {verificationStep ? (
            <div className="auth-verification-box">
              <div className="auth-verification-icon-wrap">
                <svg
                  className="auth-verification-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>

              <div className="auth-card-header auth-card-header--centered">
                <p className="eyebrow">Registration Successful</p>
                <h2>Account created</h2>
                <p className="muted-text">
                  Your profile is ready. Check your email or sign in below.
                </p>
              </div>

              <div className="auth-email-badge">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span>{verificationEmail}</span>
              </div>

              <div className="auth-verification-instructions">
                <p>
                  We sent a confirmation to your email. Check your Gmail (and Spam folder), then sign in with your password to access your dashboard.
                </p>
              </div>

              {resendNotice ? (
                <p className="auth-success" style={{ width: '100%', maxWidth: '440px', marginBottom: '14px' }}>
                  {resendNotice}
                </p>
              ) : null}

              {errorMessage ? (
                <p className="auth-error" style={{ width: '100%', maxWidth: '440px', marginBottom: '14px' }}>
                  {errorMessage}
                </p>
              ) : null}

              <div className="auth-verification-actions">
                <button
                  className="auth-primary-button auth-button--full"
                  type="button"
                  onClick={() =>
                    navigate('/login', {
                      replace: true,
                      state: {
                        registeredEmail: verificationEmail,
                        message: 'Account created! Please enter your password to sign in.',
                      },
                    })
                  }
                >
                  Sign In
                </button>

                <button
                  type="button"
                  className="auth-secondary-button auth-button--full"
                  onClick={handleResend}
                  disabled={isResending}
                >
                  {isResending ? 'Sending...' : 'Resend verification email'}
                </button>
              </div>

              <div className="auth-verification-footer">
                <p className="auth-switch-text">
                  Wrong email?{' '}
                  <button
                    type="button"
                    className="auth-link-button"
                    onClick={() => {
                      setVerificationStep(false);
                      setErrorMessage('');
                      setResendNotice('');
                    }}
                  >
                    Register with another address
                  </button>
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="auth-card-header">
                <p className="eyebrow">Start here</p>
                <h2>Create account</h2>
                <p className="muted-text">
                  Set up your profile to start career assessments and get personalized recommendations.
                </p>
              </div>

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

                {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

                <button className="auth-primary-button" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating account...' : 'Create account'}
                </button>

                <button
                  type="button"
                  className="auth-google-button"
                  onClick={async () => {
                    try {
                      await signInWithGoogle();
                    } catch (err) {
                      setErrorMessage(err?.message || 'Unable to start Google sign up.');
                    }
                  }}
                >
                  Continue with Google
                </button>
              </form>

              <p className="auth-switch-text">
                Already have an account? <Link to="/login">Sign in</Link>
              </p>
            </>
          )}
        </section>
      </section>
    </main>
  );
}

export default Register;
