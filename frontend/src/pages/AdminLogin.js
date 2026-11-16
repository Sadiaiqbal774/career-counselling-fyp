import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PasswordField from '../components/PasswordField';
import { adminSupabase, saveAdminTokens } from '../lib/supabase';

const API_URL = (() => {
  const envUrl = (process.env.REACT_APP_API_URL || '').trim().replace(/\/+$/, '');
  if (!envUrl || envUrl.includes('example.com') || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
    if (typeof window !== 'undefined' && window.location && window.location.hostname && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
      return 'https://career-counselling-fyp.onrender.com';
    }
  }
  return envUrl || (typeof window !== 'undefined' && window.location && !window.location.hostname.includes('localhost') ? 'https://career-counselling-fyp.onrender.com' : 'http://127.0.0.1:5000');
})();

function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverReady, setServerReady] = useState(false);
  const [wakingUp, setWakingUp] = useState(false);
  const wakingTimerRef = useRef(null);
  const pingAbortRef = useRef(null);

  // Warm up Render on mount — keep pinging until it responds
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 10;

    const pingServer = async () => {
      attempts++;
      try {
        const controller = new AbortController();
        pingAbortRef.current = controller;
        const res = await fetch(`${API_URL}/api/health`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (res.ok && !cancelled) {
          setServerReady(true);
          setWakingUp(false);
          clearTimeout(wakingTimerRef.current);
          return;
        }
      } catch (err) {
        if (err.name === 'AbortError' || cancelled) return;
      }
      if (!cancelled && attempts < MAX_ATTEMPTS) {
        // Show "waking up" banner after first failed ping
        if (attempts === 1) setWakingUp(true);
        setTimeout(pingServer, 4000);
      }
    };

    // Show "waking up" banner after 2s if server hasn't responded yet
    wakingTimerRef.current = setTimeout(() => {
      if (!serverReady && !cancelled) setWakingUp(true);
    }, 2000);

    pingServer();

    return () => {
      cancelled = true;
      clearTimeout(wakingTimerRef.current);
      try { pingAbortRef.current?.abort(); } catch (_) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      // If server not yet confirmed ready, do a quick health check first
      if (!serverReady) {
        try {
          const h = await fetch(`${API_URL}/api/health`, { cache: 'no-store' });
          if (h.ok) setServerReady(true);
        } catch (_) {}
      }

      const response = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 503) {
          throw new Error(result.message || 'Admin login not configured on the backend server.');
        }
        if (response.status === 504 || response.status === 502) {
          throw new Error('Server is still starting up. Please wait a moment and try again.');
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
        setError('Cannot connect to server. Please wait a moment and try again.');
      } else {
        setError(loginError.message || 'Unable to sign in as admin.');
      }
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
        <p className="eyebrow">ADMIN ACCESS</p>
        <h1 className="admin-login-title">Admin <span className="admin-nowrap">Sign in</span></h1>
        <p className="admin-login-desc">Enter your admin username and password to access the administration console.</p>
        {wakingUp && !serverReady && (
          <p style={{ color: '#854d0e', background: '#fefce8', border: '1px solid #fde047', borderRadius: '6px', padding: '8px 12px', fontSize: '0.85rem', margin: '0 0 14px' }}>
            ⏳ Starting secure cloud server… this takes ~30 seconds on first load. You can enter your credentials now.
          </p>
        )}
        {serverReady && (
          <p style={{ color: '#14532d', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', padding: '8px 12px', fontSize: '0.85rem', margin: '0 0 14px' }}>
            ✅ Server ready.
          </p>
        )}
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="admin-field">
            <label htmlFor="admin-username">Admin username</label>
            <input id="admin-username" type="text" value={username} onChange={(event) => setUsername(event.target.value)} required autoComplete="username" placeholder="Enter admin username" />
          </div>
          <div className="admin-field">
            <label htmlFor="admin-password">Password</label>
            <PasswordField id="admin-password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" placeholder="Enter admin password" />
          </div>
          {error && <p className="admin-error" role="alert">{error}</p>}
          <button className="primary-button admin-submit-btn" type="submit" disabled={loading}>
            <span className="admin-nowrap">{loading ? 'Signing in…' : 'Sign in as admin'}</span>
          </button>
        </form>
      </section>
    </main>
  );
}

export default AdminLogin;
