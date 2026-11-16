import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import PasswordField from '../components/PasswordField';
import './Auth.css';

function Login() {
  const { login, initialized, isAuthenticated, signInWithGoogle, verifyRegistration } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.registeredEmail || '');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState(location.state?.message || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const destination = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    const apiUrl = (() => {
      if (typeof window !== 'undefined' && window.location && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return 'http://localhost:5000';
      }
      return (process.env.REACT_APP_API_URL || '').trim().replace(/\/+$/, '') || 'https://career-counselling-fyp.onrender.com';
    })();
    fetch(`${apiUrl}/api/health`).catch(() => {});
  }, []);

  useEffect(() => {
    const token = searchParams.get('verification_token');
    if (!token) return;
    setIsSubmitting(true);
    verifyRegistration(token)
      .then(() => setInfoMessage('Email verified. Your account is ready. Sign in to continue.'))
      .catch((error) => setErrorMessage(error.message || 'Unable to verify the registration.'))
      .finally(() => {
        setSearchParams({}, { replace: true });
        setIsSubmitting(false);
      });
  }, [searchParams, setSearchParams, verifyRegistration]);

  if (initialized && isAuthenticated) {
    return <Navigate to={destination} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setInfoMessage('');
    setIsSubmitting(true);

    try {
      const user = await login({ email, password });
      toast.success('Login Successful');
      navigate(user?.isAdmin ? '/admin' : destination, { replace: true });
    } catch (error) {
      setErrorMessage(error.message || 'Unable to sign in right now.');
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
            {infoMessage ? (
              <p
                style={{
                  color: '#065f46',
                  backgroundColor: '#d1fae5',
                  border: '1px solid #a7f3d0',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  marginBottom: '16px',
                }}
              >
                {infoMessage}
              </p>
            ) : null}

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
                placeholder="Your password"
                required
              />
            </label>

            {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

            <button className="auth-primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>

            <button
              type="button"
              className="auth-google-button"
              onClick={async () => {
                try {
                  await signInWithGoogle();
                } catch (err) {
                  setErrorMessage(err?.message || 'Unable to start Google sign in.');
                }
              }}
            >
              Continue with Google
            </button>
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
