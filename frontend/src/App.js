import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import ScholarshipFinder from './pages/ScholarshipFinder';
import UniversityRecommender from './pages/UniversityRecommender';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ModernLanding from './pages/ModernLanding';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import GeneralQuiz from './pages/GeneralQuiz';
import SpecificQuiz from './pages/SpecificQuiz';
import Result from './pages/Result';
import BackButton from './components/BackButton';
import { useAuth } from './context/AuthContext';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import Settings from './pages/Settings';
import ChatbotWidget from './components/ChatbotWidget';
import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';

function AppNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const isAdmin = Boolean(currentUser?.isAdmin);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const handleSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="app-navbar">
      <div className="app-navbar__inner">
        <button type="button" className="career-guide-logo app-navbar__brand" onClick={() => navigate('/')}>
          <span className="career-guide-logo__tile" aria-hidden="true">CG</span>
          <span className="career-guide-logo__copy">
            <span className="career-guide-logo__title">CareerGuide</span>
            <span className="career-guide-logo__subtitle">Professional career guidance</span>
          </span>
        </button>
        <button type="button" className="app-navbar__menu-toggle" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
          <span className={menuOpen ? 'app-navbar__menu-icon app-navbar__menu-icon--open' : 'app-navbar__menu-icon'} aria-hidden="true" />
        </button>
        <nav className={menuOpen ? 'app-navbar__nav app-navbar__nav--open' : 'app-navbar__nav'} aria-label="Primary navigation">
          {!isAdmin && <Link to="/">Home</Link>}
          {isAdmin ? (
            <>
              <Link className={location.pathname === '/admin' ? 'app-navbar__link app-navbar__link--active' : 'app-navbar__link'} to="/admin">Admin console</Link>
              <Link className={location.pathname === '/settings' ? 'app-navbar__link app-navbar__link--active' : 'app-navbar__link'} to="/settings">Settings</Link>
            </>
          ) : (
            <>
              <Link className={location.pathname === '/dashboard' ? 'app-navbar__link app-navbar__link--active' : 'app-navbar__link'} to={currentUser ? '/dashboard' : '/login'}>Dashboard</Link>
              {currentUser && <><Link to="/profile">Profile</Link><Link className={location.pathname === '/settings' ? 'app-navbar__link app-navbar__link--active' : 'app-navbar__link'} to="/settings">Settings</Link></>}
            </>
          )}
          {currentUser ? (
            <button type="button" className="app-navbar__link" onClick={handleSignOut}>Sign out</button>
          ) : (
            <Link to="/login">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function AppFooter() {
  const location = useLocation();
  if (location.pathname.startsWith('/admin')) return null;

  return (
    <footer className="app-footer">
      <span>© 2026 CareerGuide</span>
      <Link to="/admin/login" className="app-footer__admin-link">Admin</Link>
    </footer>
  );
}

function AppLayout() {
  const location = useLocation();
  const isAdminPortal = location.pathname.startsWith('/admin');

  useEffect(() => {
    try {
      const settings = JSON.parse(localStorage.getItem('career-guide-settings') || '{}');
      document.documentElement.classList.toggle('dark-mode', Boolean(settings.darkMode));
    } catch {
      document.documentElement.classList.remove('dark-mode');
    }
  }, []);

  return (
    <>
      {!isAdminPortal && <BackButton />}
      {!isAdminPortal && <AppNavigation />}
      <div className={isAdminPortal ? 'app-content app-content--admin' : 'app-content'}>
        <Routes>
          <Route path="/" Component={ModernLanding} />
          <Route path="/login" Component={Login} />
          <Route path="/register" Component={Register} />
          <Route path="/forgot-password" Component={ForgotPassword} />
          <Route path="/reset-password" Component={ResetPassword} />
          <Route path="/change-password" Component={ChangePassword} />
          <Route path="/admin/login" Component={AdminLogin} />
          <Route path="/settings" Component={Settings} />
          <Route element={<AdminProtectedRoute />}>
            <Route path="/admin" Component={AdminDashboard} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" Component={Dashboard} />
            <Route path="/profile" Component={Profile} />
            <Route path="/university-recommender" Component={UniversityRecommender} />
            <Route path="/scholarships" Component={ScholarshipFinder} />
            <Route path="/quiz" Component={GeneralQuiz} />
            <Route path="/general-quiz" Component={GeneralQuiz} />
            <Route path="/specific-quiz" Component={SpecificQuiz} />
            <Route path="/result" Component={Result} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <AppFooter />
      <Toaster />
      {!isAdminPortal && <ChatbotWidget />}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppLayout />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;