import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute() {
  const { initialized, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!initialized) {
    return (
      <main className="page-shell">
        <section className="card hero-card">
          <p className="eyebrow">CareerGuide</p>
          <h1>Loading secure session</h1>
          <p className="muted-text">Checking your account before opening protected pages.</p>
        </section>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;