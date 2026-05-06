import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { securityQuestions } from '../data/securityQuestions';
import './Auth.css';

function Register() {
  const { register, initialized, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState(securityQuestions[0]);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const destination = location.state?.from?.pathname || '/dashboard';

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
      await register({ name, email, password, securityQuestion, securityAnswer });
      navigate(destination, { replace: true });
    } catch (error) {
      setErrorMessage(error.message || 'Unable to create the account right now.');
    } finally {
      setIsSubmitting(false);
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
            <h2>Create account</h2>
            <p className="muted-text">Set up your profile in a minute with a real, reachable email address.</p>
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
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a password"
                required
              />
            </label>

            <label className="auth-field">
              <span>Confirm password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat your password"
                required
              />
            </label>

            <label className="auth-field">
              <span>Security question</span>
              <select value={securityQuestion} onChange={(event) => setSecurityQuestion(event.target.value)} required>
                {securityQuestions.map((question) => (
                  <option key={question} value={question}>
                    {question}
                  </option>
                ))}
              </select>
            </label>

            <label className="auth-field">
              <span>Security answer</span>
              <input
                type="text"
                value={securityAnswer}
                onChange={(event) => setSecurityAnswer(event.target.value)}
                placeholder="Your answer"
                autoComplete="off"
                required
              />
            </label>

            {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

            <button className="auth-primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="auth-switch-text">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </section>
      </section>
    </main>
  );
}

export default Register;