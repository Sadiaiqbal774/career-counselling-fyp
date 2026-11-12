import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PasswordField from '../components/PasswordField';
import { adminSupabase, saveAdminTokens } from '../lib/supabase';

const API_URL = (process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000').trim().replace(/\/+$/, '');

function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [wakeUpNotice, setWakeUpNotice] = useState(false);

  // Early warm-up ping to wake up the Render free-tier container before user submits
  useEffect(() => {
    fetch(`${API_URL}/api/health`).catch(() => {});
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setWakeUpNotice(false);

    // If server cold start takes more than 2 seconds, reassure user
    const noticeTimer = setTimeout(() => {
      setWakeUpNotice(true);
    }, 2000);

    try {
      const response = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 503) {
          throw new Error(result.message || 'Admin login not configured on the backend server.');
        }
        if (response.status === 502 || response.status === 504) {
          throw new Error('Backend server on Render is waking up. Please wait 15 seconds and retry.');
        }
        throw new Error(result.message || 'Invalid admin username or password.');
      }

      try {
        await adminSupabase.auth.setSession({
          access_token: result.access_token,
          refresh_token: result.refresh_token,
        });
      } catch (_) {}

      saveAdminTokens({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });
      navigate(location.state?.from?.pathname || '/admin', { replace: true });
    } catch (loginError) {
      if (loginError.name === 'TypeError' && loginError.message.includes('fetch')) {
        setError('Cannot connect to backend server. Make sure your Render backend is running and REACT_APP_API_URL is configured in Vercel.');
      } else {
        setError(loginError.message || 'Unable to sign in as admin.');
      }
    } finally {
      clearTimeout(noticeTimer);
      setLoading(false);
      setWakeUpNotice(false);
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
        <p className="eyebrow">ADMIN ACCESS</p>
        <h1 className="admin-login-title">Admin <span className="admin-nowrap">Sign in</span></h1>
        <p className="admin-login-desc">Use the configured admin username and verified Supabase administrator password.</p>
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="admin-field">
            <label htmlFor="admin-username">Admin username</label>
            <input id="admin-username" type="text" value={username} onChange={(event) => setUsername(event.target.value)} required autoComplete="username" placeholder="Enter admin username" />
          </div>
          <div className="admin-field">
            <label htmlFor="admin-password">Password</label>
            <PasswordField id="admin-password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" placeholder="Enter admin password" />
          </div>
          {wakeUpNotice && (
            <p style={{ color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', padding: '8px 12px', fontSize: '0.85rem', margin: '4px 0 12px' }}>
              Connecting to secure cloud server... (Render instance waking up)
            </p>
          )}
          {error && <p className="admin-error" role="alert">{error}</p>}
          <button className="primary-button admin-submit-btn" type="submit" disabled={loading}>
            <span className="admin-nowrap">{loading ? 'Connecting & signing in...' : 'Sign in as admin'}</span>
          </button>
        </form>
      </section>
    </main>
  );
}

export default AdminLogin;
