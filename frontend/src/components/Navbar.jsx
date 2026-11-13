import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CareerGuideLogo from './CareerGuideLogo';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, deleteAccount, currentUser } = useAuth();
  const dashboardActive = location.pathname.startsWith('/dashboard');
  const displayName = currentUser?.name?.trim() || 'Student';
  const isHomePage = location.pathname === '/';
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);

  const stats = ['5–7 min', '4 career paths', '50+ institutions'];
  const trustItems = ['AI-powered assessment', 'Real student data', '4 major career paths', '100% confidential'];

  useEffect(() => {
    const handleWindowClick = (event) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleWindowClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleWindowClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleLogout = () => {
    setAccountMenuOpen(false);
    logout();
    navigate('/', { replace: true });
  };

  const handleDeleteAccount = async () => {
    const password = window.prompt('Enter your password to delete this account.');
    if (!password) {
      return;
    }

    const confirmed = window.confirm('This will permanently delete your account. Continue?');
    if (!confirmed) {
      return;
    }

    try {
      setAccountMenuOpen(false);
      await deleteAccount(password);
      navigate('/login', { replace: true });
    } catch (error) {
      window.alert(error?.message || 'Unable to delete account right now.');
    }
  };

  const handleTakeAssessment = () => {
    if (currentUser) {
      navigate('/quiz');
    } else {
      navigate('/register');
    }
  };

  return (
    <header className="app-navbar">
      <div className="app-navbar__inner">
        <CareerGuideLogo className="app-navbar__brand" onClick={() => navigate('/')} />

        <nav className="app-navbar__nav" aria-label="Primary navigation">
          <a href="/#features">How it works</a>
          <span className="app-navbar__bullet" aria-hidden="true">·</span>
          <a href="/#stories">Student voices</a>
          <span className="app-navbar__divider" aria-hidden="true" />
          <span className="app-navbar__bullet" aria-hidden="true">·</span>
          <button
            type="button"
            className={dashboardActive ? 'app-navbar__link app-navbar__link--active' : 'app-navbar__link'}
            onClick={() => navigate('/dashboard')}
          >
            Dashboard
          </button>
          <div className="app-navbar__nav-account" ref={accountMenuRef}>
            <button
              type="button"
              className="app-navbar__nav-account-button"
              onClick={() => setAccountMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              aria-label="Open account menu"
            >
              {displayName.charAt(0).toUpperCase()}
            </button>

            {accountMenuOpen && (
              <div className="app-navbar__hero-menu" role="menu" aria-label="Account menu">
                <div className="app-navbar__hero-menu-header">
                  <div className="app-navbar__hero-menu-avatar">{displayName.charAt(0).toUpperCase()}</div>
                  <div>
                    <p className="app-navbar__hero-menu-title">Account</p>
                    <p className="app-navbar__hero-menu-email">{currentUser ? currentUser.email : 'Guest account'}</p>
                  </div>
                </div>
                {currentUser ? (
                  <>
                    <button type="button" className="app-navbar__hero-menu-item" onClick={() => navigate('/change-password')}>
                      Change password
                    </button>
                    <button type="button" className="app-navbar__hero-menu-item app-navbar__hero-menu-item--danger" onClick={handleLogout}>
                      Sign out
                    </button>
                    <button type="button" className="app-navbar__hero-menu-item app-navbar__hero-menu-item--danger" onClick={handleDeleteAccount}>
                      Delete account
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="app-navbar__hero-menu-item" onClick={() => navigate('/login')}>
                      Sign in
                    </button>
                    <button type="button" className="app-navbar__hero-menu-item" onClick={() => navigate('/register')}>
                      Create account
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </nav>
      </div>

      {isHomePage && (
        <div className="app-navbar__hero">
          <div className="app-navbar__hero-content">
            <div className="app-navbar__hero-welcome">
              <div className="app-navbar__pill">
                <span className="app-navbar__dot" aria-hidden="true" />
                <span className="app-navbar__pill-welcome">Welcome {displayName}</span>
                <span className="app-navbar__pill-subline">Your personalized career journey continues here.</span>
              </div>

              <h1 className="app-navbar__hero-title">
                Know yourself. Choose your path.
                <br />
                <span>Own your future.</span>
              </h1>

              <p className="app-navbar__hero-body">
                CareerGuide combines structured assessment and student data to help you understand your strengths,
                compare career paths, and move forward with confidence.
              </p>

              <div className="app-navbar__hero-actions">
                <button type="button" className="app-navbar__hero-button app-navbar__hero-button--primary" onClick={handleTakeAssessment}>
                  {currentUser ? 'Take the assessment' : 'Create account'}
                </button>
                <button type="button" className="app-navbar__hero-button app-navbar__hero-button--ghost" onClick={() => navigate(currentUser ? '/dashboard' : '/login')}>
                  {currentUser ? 'Dashboard' : 'Sign in'}
                </button>
              </div>

              <div className="app-navbar__hero-stats">
                {stats.map((item, index) => (
                  <span key={item} className="app-navbar__hero-stat">
                    {index > 0 && <span className="app-navbar__hero-stat-divider" aria-hidden="true" />}
                    <strong>{item}</strong>
                  </span>
                ))}
              </div>
            </div>

            <div className="app-navbar__hero-visual" aria-hidden="true">
              <img src="/landing image.jpg" alt="" />
            </div>
          </div>

          <div className="app-navbar__hero-trust">
            {trustItems.map((item) => (
              <div key={item} className="app-navbar__hero-trust-item">
                <span className="app-navbar__hero-trust-check" aria-hidden="true">
                  <svg viewBox="0 0 16 16" role="presentation" aria-hidden="true">
                    <circle cx="8" cy="8" r="7" fill="#5C8A4A" />
                    <path d="M5.2 8.4l1.8 1.8 3.8-4.1" fill="none" stroke="#FAF8F5" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;