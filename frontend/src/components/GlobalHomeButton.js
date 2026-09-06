import { useNavigate, useLocation } from 'react-router-dom';

function GlobalHomeButton() {
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname === '/' || location.pathname === '/dashboard') {
    return null;
  }

  return (
    <button type="button" className="global-home-button" onClick={() => navigate('/')}>
      Home
    </button>
  );
}

export default GlobalHomeButton;
