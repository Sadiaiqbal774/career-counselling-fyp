import React from 'react';
import { useNavigate } from 'react-router-dom';

function BackButton({ label = '← Back to dashboard', to = '/dashboard', className = '' }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => (to ? navigate(to) : navigate(-1))}
      className={`cg-back-nav-btn ${className}`.trim()}
      aria-label={label}
    >
      {label}
    </button>
  );
}

export default BackButton;
