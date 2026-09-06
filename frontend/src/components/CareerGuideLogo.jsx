function CareerGuideLogo({ onClick, className = '' }) {
  return (
    <button type="button" className={`career-guide-logo ${className}`.trim()} onClick={onClick} aria-label="Go to CareerGuide home">
      <span className="career-guide-logo__tile" aria-hidden="true">
        <svg className="career-guide-logo__svg" viewBox="0 0 32 32" role="presentation" aria-hidden="true">
          <circle cx="16" cy="16" r="3.5" fill="#C8A882" />
          <line x1="16" y1="4" x2="16" y2="12" stroke="#FAF8F5" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="16" y1="20" x2="16" y2="28" stroke="#FAF8F5" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="4" y1="16" x2="12" y2="16" stroke="#FAF8F5" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="20" y1="16" x2="28" y2="16" stroke="#FAF8F5" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="9" y1="9" x2="12.5" y2="12.5" stroke="#C8A882" strokeWidth="1.1" strokeLinecap="round" />
          <line x1="20.5" y1="12.5" x2="24" y2="9" stroke="#C8A882" strokeWidth="1.1" strokeLinecap="round" />
          <line x1="9" y1="23" x2="12.5" y2="19.5" stroke="#C8A882" strokeWidth="1.1" strokeLinecap="round" />
          <line x1="20.5" y1="19.5" x2="24" y2="23" stroke="#C8A882" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
      </span>
      <span className="career-guide-logo__copy">
        <span className="career-guide-logo__title">CareerGuide</span>
        <span className="career-guide-logo__subtitle">Professional career guidance</span>
      </span>
    </button>
  );
}

export default CareerGuideLogo;