import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PasswordField from '../components/PasswordField';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';
const ADMIN_TOKEN_KEY = 'career-guide-admin-token';

function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Admin sign-in failed.');

      sessionStorage.setItem(ADMIN_TOKEN_KEY, result.token);
      navigate(location.state?.from?.pathname || '/admin', { replace: true });
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-shell">
      <section className="admin-panel">
        <div className="admin-login-brand">
          <span className="admin-brand-mark" aria-hidden="true">CG</span>
          <div className="admin-login-brand-text">
            <strong className="admin-login-brand-name">CareerGuide</strong>
            <span className="admin-login-brand-sub">Admin Console</span>
          </div>
        </div>
        <p className="eyebrow">ADMINISTRATOR ACCESS</p>
        <h1 className="admin-login-title">Administrator <span className="admin-nowrap">Sign in</span></h1>
        <p className="admin-login-desc">Use the dedicated administrator account to manage users, data, and system reports.</p>
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="admin-field">
            <label htmlFor="admin-username">Username</label>
            <input
              id="admin-username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              autoComplete="username"
              placeholder="e.g. admin"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="admin-password">Password</label>
            <PasswordField
              id="admin-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              placeholder="Enter admin password"
            />
          </div>
          <p className="admin-login-note">
            Notice: Administrator access requires a system <strong>Username</strong> (not an email address).
          </p>
          {error && <p className="admin-error" role="alert">{error}</p>}
          <button className="primary-button admin-submit-btn" type="submit" disabled={loading}>
            <span className="admin-nowrap">{loading ? 'Signing in...' : 'Sign in as admin'}</span>
          </button>
        </form>
      </section>
    </main>
  );
}

export default AdminLogin;