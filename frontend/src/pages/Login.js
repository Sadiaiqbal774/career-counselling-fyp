import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

function Login() {
  const { login, initialized, isAuthenticated } = useAuth();
  const { signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const destination = location.state?.from?.pathname || '/dashboard';

  if (initialized && isAuthenticated) {
    return <Navigate to={destination} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await login({ email, password });
      navigate(destination, { replace: true });
    } catch (error) {
      setErrorMessage(error.message || 'Unable to sign in right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      navigate(destination, { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Google sign-in failed.');
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
              <div className="auth-brand-subtitle">Secure career assessment</div>
            </div>
          </div>

          <h1>Sign in to continue your career journey.</h1>
          <p>
            Your account saves quiz progress and keeps your dashboard, results, and recommendations in one place.
          </p>

          <div className="auth-feature-list">
            <div>Protected dashboard access</div>
            <div>Saved quiz progress in session</div>
            <div>Local account persistence</div>
          </div>
        </aside>

        <section className="auth-card">
          <div className="auth-card-header">
            <p className="eyebrow">Welcome back</p>
            <h2>Sign in</h2>
            <p className="muted-text">Use your registered email address to open the app.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
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
                placeholder="Your password"
                required
              />
            </label>

            {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

            <button className="auth-primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button type="button" className="auth-secondary-button" onClick={handleGoogleSignIn} disabled={isSubmitting}>
                Continue with Google
              </button>
            </div>
          </form>

          <p className="auth-switch-text">
            <Link to="/forgot-password">Forgot password?</Link>
          </p>

          <p className="auth-switch-text">
            New here? <Link to="/register">Create an account</Link>
          </p>
        </section>
      </section>
    </main>
  );
}

export default Login;