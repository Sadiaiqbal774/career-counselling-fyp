import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import UniversityEdit from './pages/UniversityEdit';
import ScholarshipFinder from './pages/ScholarshipFinder';
import UniversityRecommender from './pages/UniversityRecommender';
import { AuthProvider, useAuth } from './context/AuthContext';
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
import SavedOpportunities from './pages/SavedOpportunities';
import CareerGuideLogo from './components/CareerGuideLogo';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import ChatbotWidget from './components/ChatbotWidget';
import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { readThemeSettings, applyTheme } from './lib/theme';

function Header() {
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
        <CareerGuideLogo className="app-navbar__brand" />
        <button
          type="button"
          className="app-navbar__menu-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className={menuOpen ? 'app-navbar__menu-icon app-navbar__menu-icon--open' : 'app-navbar__menu-icon'} aria-hidden="true" />
        </button>
        <nav className={menuOpen ? 'app-navbar__nav app-navbar__nav--open' : 'app-navbar__nav'} aria-label="Primary navigation">
          {!isAdmin && (
            <Link className={location.pathname === '/' ? 'app-navbar__link app-navbar__link--active' : 'app-navbar__link'} to="/">
              Home
            </Link>
          )}
          {isAdmin ? (
            <Link className={location.pathname === '/admin' ? 'app-navbar__link app-navbar__link--active' : 'app-navbar__link'} to="/admin">
              Admin console
            </Link>
          ) : (
            <>
              <Link className={location.pathname === '/dashboard' ? 'app-navbar__link app-navbar__link--active' : 'app-navbar__link'} to={currentUser ? '/dashboard' : '/login'}>
                Dashboard
              </Link>
              {currentUser && (
                <Link className={location.pathname === '/profile' ? 'app-navbar__link app-navbar__link--active' : 'app-navbar__link'} to="/profile">
                  Profile
                </Link>
              )}
            </>
          )}
          {currentUser ? (
            <button type="button" className="app-navbar__link app-navbar__logout-btn" onClick={handleSignOut}>
              Sign out
            </button>
          ) : (
            <Link className={location.pathname === '/login' ? 'app-navbar__link app-navbar__link--active' : 'app-navbar__link'} to="/login">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function AppFooter() {
  const location = useLocation();
  if (location.pathname.startsWith('/admin') || location.pathname === '/' || location.pathname === '/university-recommender') return null;

  return (
    <footer className="app-footer">
      <span>© 2026 CareerGuide</span>
    </footer>
  );
}

function AppLayout() {
  const location = useLocation();
  const { currentUser } = useAuth();
  const isAdminPortal = location.pathname.startsWith('/admin');

  useEffect(() => {
    if (isAdminPortal) {
      applyTheme(false);
      return;
    }
    applyTheme(Boolean(readThemeSettings(currentUser?.id).darkMode));
  }, [isAdminPortal, currentUser?.id]);

  return (
    <div className="app-shell">
      {!isAdminPortal && <Header />}
      <main className={isAdminPortal ? 'app-main app-main--admin' : 'app-main'}>
        <Routes>
          <Route path="/" Component={ModernLanding} />
          <Route path="/login" Component={Login} />
          <Route path="/register" Component={Register} />
          <Route path="/forgot-password" Component={ForgotPassword} />
          <Route path="/reset-password" Component={ResetPassword} />
          <Route path="/change-password" Component={ChangePassword} />
          <Route path="/admin/login" Component={AdminLogin} />
          <Route path="/settings" element={<Navigate to="/profile" replace />} />
          <Route element={<AdminProtectedRoute />}>
            <Route path="/admin/universities/:id" Component={UniversityEdit} />
          <Route path="/admin" Component={AdminDashboard} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" Component={Dashboard} />
            <Route path="/profile" Component={Profile} />
            <Route path="/saved" Component={SavedOpportunities} />
            <Route path="/saved-opportunities" Component={SavedOpportunities} />
            <Route path="/university-recommender" Component={UniversityRecommender} />
            <Route path="/scholarships" Component={ScholarshipFinder} />
            <Route path="/quiz" Component={GeneralQuiz} />
            <Route path="/general-quiz" Component={GeneralQuiz} />
            <Route path="/specific-quiz" Component={SpecificQuiz} />
            <Route path="/result" Component={Result} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <AppFooter />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
          },
        }}
      />
      {!isAdminPortal && <ChatbotWidget />}
    </div>
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
