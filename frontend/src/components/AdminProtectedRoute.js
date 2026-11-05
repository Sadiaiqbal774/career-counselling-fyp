import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import supabase from '../lib/supabase';

const API_URL = (process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000').trim().replace(/\/+$/, '');

function AdminProtectedRoute() {
  const location = useLocation();
  const [authorized, setAuthorized] = useState(null);
  const [statusMessage, setStatusMessage] = useState('Checking administrator access...');
  const [canRetry, setCanRetry] = useState(false);

  const checkAdmin = useCallback(async () => {
    setStatusMessage('Checking administrator access...');
    setCanRetry(false);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setAuthorized(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/admin/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setAuthorized(true);
      } else if (response.status === 401 || response.status === 403) {
        setAuthorized(false);
      } else if (response.status === 502 || response.status === 503 || response.status === 504) {
        setStatusMessage('Backend service on Render is waking up (takes ~30-50s on free tier). Retrying...');
        setCanRetry(true);
        setTimeout(checkAdmin, 5000);
      } else {
        setStatusMessage(`Server returned status ${response.status}. Checking admin authorization...`);
        setCanRetry(true);
      }
    } catch {
      setStatusMessage('Connecting to Render backend server... Free tier may take 30-60s to wake up.');
      setCanRetry(true);
      setTimeout(checkAdmin, 6000);
    }
  }, []);

  useEffect(() => {
    checkAdmin();
  }, [checkAdmin]);

  if (authorized === null) {
    return (
      <main className="page-shell">
        <section className="card hero-card" style={{ textAlign: 'center', padding: '36px 20px', maxWidth: '520px', margin: '40px auto' }}>
          <div style={{ fontSize: '2.2rem', marginBottom: '14px' }}>⏳</div>
          <p className="muted-text" style={{ fontSize: '1.05rem', marginBottom: '18px', lineHeight: '1.5' }}>
            {statusMessage}
          </p>
          {canRetry && (
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                className="primary-button"
                style={{ padding: '8px 20px', fontSize: '0.9rem' }}
                onClick={() => checkAdmin()}
              >
                Retry Now
              </button>
              <button
                type="button"
                className="secondary-button"
                style={{ padding: '8px 20px', fontSize: '0.9rem' }}
                onClick={() => setAuthorized(false)}
              >
                Back to Sign in
              </button>
            </div>
          )}
        </section>
      </main>
    );
  }

  if (!authorized) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export default AdminProtectedRoute;