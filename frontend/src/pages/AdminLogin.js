import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PasswordField from '../components/PasswordField';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';
const ADMIN_TOKEN_KEY = 'career-guide-admin-token';

function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
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
        body: JSON.stringify({ email, password }),
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
        <p className="eyebrow">CAREERGUIDE ADMIN</p>
        <h1>Administrator sign in</h1>
        <p className="muted-text">Use the server-configured administrator account to access management data.</p>
        <form className="admin-form" onSubmit={handleSubmit}>
          <label htmlFor="admin-email">Email</label>
          <input id="admin-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="username" />
          <label htmlFor="admin-password">Password</label>
          <PasswordField id="admin-password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />
          {error && <p className="admin-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in as admin'}</button>
        </form>
      </section>
    </main>
  );
}

export default AdminLogin;