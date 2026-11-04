import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import supabase from '../lib/supabase';

function AdminProtectedRoute() {
  const location = useLocation();
  const [authorized, setAuthorized] = useState(null);

  useEffect(() => {
    let active = true;
    async function checkAdmin() {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        if (active) setAuthorized(false);
        return;
      }
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000'}/api/admin/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (active) setAuthorized(response.ok);
    }
    checkAdmin().catch(() => {
      if (active) setAuthorized(false);
    });
    return () => { active = false; };
  }, []);

  if (authorized === null) {
    return <main className="page-shell"><section className="card hero-card"><p className="muted-text">Checking administrator access...</p></section></main>;
  }

  if (!authorized) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export default AdminProtectedRoute;