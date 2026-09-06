import { Navigate, Outlet, useLocation } from 'react-router-dom';

function AdminProtectedRoute() {
  const location = useLocation();
  const token = sessionStorage.getItem('career-guide-admin-token');

  if (!token) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export default AdminProtectedRoute;