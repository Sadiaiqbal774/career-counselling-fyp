import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  // Do not show on landing/root path
  if (location.pathname === '/') return null;

  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      aria-label="Go back"
      title="Go back"
      /*style={{
        position: 'fixed',
        top: 60,
        left: 12,
        zIndex: 9999,
         background: 'var(--accent-dk, #4f2909)',
         border: '1px solid rgba(0,0,0,0.12)',
        borderRadius: '50%',
        width: 32,
        height: 32,
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
         boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
        cursor: 'pointer',
        color: '#fff',
        fontSize: 14,
        lineHeight: 1,
      }}*/
    >
      ←
    </button>
  );
}

export default BackButton;
