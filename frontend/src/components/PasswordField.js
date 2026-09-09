import { useState } from 'react';

function PasswordField({ ...inputProps }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span className="password-field">
      <input {...inputProps} type={isVisible ? 'text' : 'password'} />
      <button
        type="button"
        className="password-field__toggle"
        onClick={() => setIsVisible((visible) => !visible)}
        aria-label={isVisible ? 'Hide password' : 'Show password'}
        aria-pressed={isVisible}
      >
        {isVisible ? (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10.8 10.8 0 0 1 12 5c5 0 8.7 4.2 10 7-0.4 1-1.2 2.2-2.3 3.4M6.2 6.2C4.1 7.7 2.7 10 2 12c1.3 2.8 5 7 10 7 1 0 2-.2 2.9-.5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M2 12s3.7-7 10-7 10 7 10 7-3.7 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </span>
  );
}

export default PasswordField;