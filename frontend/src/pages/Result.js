import { useState } from 'react';
import useQuizScores from '../hooks/useQuizScores';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

import { exportElementToPdf } from '../utils/pdfExport';
import {
  careerRecommendations,
  getHighestCategory,
  getTopCategories,
  storageKeys,
  userStorageKey,
} from '../data/quizData';
import './Result.css';

const careerFieldTitleMap = {
  Medical: 'Healthcare',
  Technology: 'Technology',
  Business: 'Business',
  Arts: 'Creative Arts',
};

const careerDescriptions = {
  Medical: 'Doctor, nurse or healthcare professional. Your answers leaned toward medicine and helping people.',
  Technology: 'Software developer, engineer or IT specialist. Your answers leaned toward computing and problem solving.',
  Business: 'Business analyst, marketer or entrepreneur. Your answers leaned toward leadership, strategy and management.',
  Arts: 'Graphic designer, artist or creative professional. Your answers leaned toward creative expression and visual design.',
};

// Existing brown and tan tokens mapped to descending point tiers
const tierFills = ['url(#bubble0Gradient)', '#C9B39C', '#DCCBBA', '#EFE4D6'];
const tierDotColors = ['#4A3324', '#C9B39C', '#DCCBBA', '#EFE4D6'];
const tierTextColors = ['#FFFFFF', '#2C2016', '#2C2016', '#2C2016'];

// Anchors calibrated for larger 460x280 SVG canvas with >=10px spacing
const bubbleAnchors = [
  { cx: 145, cy: 140 },
  { cx: 320, cy: 85 },
  { cx: 375, cy: 195 },
  { cx: 265, cy: 215 },
];

function Result() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  // Start with whatever is in localStorage (works for same device) or Supabase via hook
  const { scores: storedScores, loading: loadingScores } = useQuizScores(currentUser);

  if (loadingScores) {
    return (
      <div className="result-page">
        <div className="page-container" style={{ textAlign: 'center', paddingTop: '80px' }}>
          <p style={{ color: 'var(--muted)', fontSize: '1rem' }}>Loading your results…</p>
        </div>
      </div>
    );
  }

  if (!storedScores) {
    return (
      <div className="result-page">
        <div className="page-container">
          <div className="result-back-nav">
            <button
              type="button"
              className="cg-back-nav-btn"
              onClick={() => navigate('/dashboard')}
            >
              ← Back to Dashboard
            </button>
          </div>
          <section className="result-chart-card" style={{ textAlign: 'center', padding: '48px 24px', maxWidth: '520px', margin: '40px auto' }}>
            <div style={{ fontSize: '3rem', marginBottom: '14px' }}>📊</div>
            <h2 style={{ fontFamily: "'Fraunces', 'Playfair Display', Georgia, serif", margin: '0 0 12px 0', fontSize: '1.75rem', color: 'var(--text)' }}>
              No Assessment Results Found
            </h2>
            <p style={{ color: 'var(--muted)', maxWidth: '380px', margin: '0 auto 24px auto', lineHeight: '1.6', fontSize: '0.98rem' }}>
              You haven't completed the career assessment quiz yet. Take our quiz to generate your personalized career report.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button type="button" className="result-btn-solid" onClick={() => navigate('/general-quiz')}>
                Take Career Quiz Now →
              </button>
              <button type="button" className="result-btn-outline" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  const highestCategory = getHighestCategory(storedScores);
  const topMatchTitle = careerFieldTitleMap[highestCategory] || highestCategory;
  const heroDescription = careerDescriptions[highestCategory] || `Your answers show strong alignment with the ${highestCategory} field.`;

  // Dynamic user name, initial, and date
  const userName = currentUser?.name || currentUser?.full_name || 'Student';
  const userInitial = (userName.trim().charAt(0) || 'S').toUpperCase();
  const formattedDate = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  // Category point breakdown
  const categoryKeys = ['Technology', 'Medical', 'Business', 'Arts'];
  const totalPoints = categoryKeys.reduce((acc, cat) => acc + (Number(storedScores[cat]) || 0), 0) || 1;

  const sortedCategories = categoryKeys
    .map((cat) => {
      const pts = Number(storedScores[cat]) || 0;
      const pct = Math.round((pts / totalPoints) * 100);
      return { category: cat, points: pts, percent: pct };
    })
    .sort((a, b) => b.points - a.points);

  const topCategoryPoints = Number(storedScores[highestCategory]) || sortedCategories[0].points;
  const topPercent = Math.round((topCategoryPoints / totalPoints) * 100);

  // Group unique point tiers so equal scores share the same visual fill & dot color
  const uniquePointTiers = [...new Set(sortedCategories.map((c) => c.points))].sort((a, b) => b - a);
  const minPoints = Math.min(...sortedCategories.map((c) => c.points));
  const maxPoints = sortedCategories[0].points || 1;

  // Dynamic tie detection
  let tieMessage = null;
  if (sortedCategories[0].points === sortedCategories[1].points && sortedCategories[0].points > 0) {
    tieMessage = `${sortedCategories[0].category} and ${sortedCategories[1].category} tied for the top match, so both are strong career directions to explore.`;
  } else if (sortedCategories[1].points === sortedCategories[2].points && sortedCategories[1].points > 0) {
    tieMessage = `${sortedCategories[1].category} and ${sortedCategories[2].category} tied for second place, so both are worth exploring as backup paths.`;
  } else if (sortedCategories[2].points === sortedCategories[3].points && sortedCategories[2].points > 0) {
    tieMessage = `${sortedCategories[2].category} and ${sortedCategories[3].category} tied with ${sortedCategories[2].points} points.`;
  }

  // Circular ring calculations (r=38, C ≈ 238.76)
  const ringCircumference = 238.76;
  const strokeDashoffset = ringCircumference * (1 - Math.min(100, Math.max(0, topPercent)) / 100);

  // Enlarged bubble radius calculation with ample space for labels
  const getBubbleRadius = (pts, idx) => {
    if (idx === 0) return 85;
    const ratio = Math.sqrt(Math.max(0, pts) / maxPoints);
    return Math.round(42 + 16 * ratio);
  };

  // Accessibility summary for chart
  const chartAriaLabel = `Interest comparison bubble chart: ${sortedCategories.map((c) => `${c.category} ${c.points} points (${c.percent}%)`).join(', ')}`;

  const handleRetakeQuiz = () => {
    if (currentUser?.id) {
      localStorage.removeItem(userStorageKey(storageKeys.scores, currentUser.id));
      localStorage.removeItem(userStorageKey(storageKeys.topCategories, currentUser.id));
      localStorage.removeItem(`career-guide-scores-${currentUser.id}`);
      localStorage.removeItem(`career-guide-top-categories-${currentUser.id}`);
    }
    localStorage.removeItem(userStorageKey(storageKeys.scores, 'guest'));
    localStorage.removeItem(userStorageKey(storageKeys.topCategories, 'guest'));
    navigate('/general-quiz');
  };

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    const toastId = toast.loading('Generating Career Assessment PDF Report...');
    try {
      await exportElementToPdf('career-assessment-report-section', `${userName.replace(/\s+/g, '_')}_Career_Report.pdf`);
      toast.success('Career Report downloaded successfully!', { id: toastId });
    } catch (err) {
      toast.error('Could not generate PDF. Please try again.', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="result-page">
      <div className="page-container result-page-container">

        {/* Back navigation button inside page container */}
        <div className="result-back-nav">
          <button
            type="button"
            className="cg-back-nav-btn"
            onClick={() => navigate('/dashboard')}
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* PRINTABLE REPORT SECTION */}
        <div id="career-assessment-report-section" className="result-report-section">

          {/* 1. HEADER ROW: AVATAR, TITLE/NAME & DATE PILL */}
          <header className="result-topbar">
            <div className="result-header-avatar" aria-hidden="true">
              {userInitial}
            </div>
            <div className="result-header-user-info">
              <span className="result-header-label">Career report prepared for</span>
              <span className="result-header-fullname" title={userName}>{userName}</span>
            </div>
            <div className="result-topbar-pill">{formattedDate}</div>
          </header>

          {/* 2. TOP MATCH: FULL WIDTH ON TOP */}
          <section className="result-hero-card">
            <div className="result-hero-row1">
              <div className="result-hero-titles">
                <span className="result-hero-label">Your top match</span>
                <h1 className="result-hero-h1">{topMatchTitle}</h1>
              </div>

              <div className="result-hero-ring-wrap" aria-label={`Match score: ${topPercent}%`}>
                <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true">
                  <circle
                    cx="48"
                    cy="48"
                    r="38"
                    stroke="rgba(255, 255, 255, 0.18)"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="38"
                    stroke="#E8D4C0"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={strokeDashoffset}
                    fill="none"
                    transform="rotate(-90 48 48)"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                  <text
                    x="48"
                    y="57"
                    textAnchor="middle"
                    fill="#FFFFFF"
                    style={{
                      fontFamily: "'Fraunces', 'Playfair Display', Georgia, serif",
                      fontSize: '26px',
                      fontWeight: 600,
                    }}
                  >
                    {topPercent}%
                  </text>
                </svg>
              </div>
            </div>

            <p className="result-hero-desc">{heroDescription}</p>
          </section>

          {/* 3. RESPONSIVE GRID (2 columns desktop, 1 mobile) */}
          <div className="result-grid">

            {/* Column 1: Larger Bubble Chart */}
            <section className="result-chart-card">
              <div className="result-chart-header">
                <h2 className="result-chart-title">How your interests compare</h2>
                <p className="result-chart-subtitle">Bigger bubble means a stronger interest</p>
              </div>

              <div className="result-svg-wrap">
                <svg
                  viewBox="0 0 460 280"
                  className="result-bubble-svg"
                  role="img"
                  aria-label={chartAriaLabel}
                >
                  <defs>
                    <linearGradient id="bubble0Gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#523624" />
                      <stop offset="100%" stopColor="#372216" />
                    </linearGradient>
                  </defs>

                  {sortedCategories.map((item, idx) => {
                    const anchor = bubbleAnchors[idx];
                    const radius = getBubbleRadius(item.points, idx);
                    const tierIdx = Math.min(uniquePointTiers.indexOf(item.points), tierFills.length - 1);
                    const bubbleFill = tierFills[tierIdx];
                    const textColor = tierTextColors[tierIdx];
                    const isSmallest = item.points === minPoints;

                    let stroke = 'none';
                    let strokeWidth = 0;
                    if (tierIdx === 0) {
                      stroke = 'rgba(255, 255, 255, 0.2)';
                      strokeWidth = 3;
                    } else if (isSmallest) {
                      stroke = '#C5B19D';
                      strokeWidth = 1.5;
                    }

                    // Scaled fonts and max width constraint so "Technology" never overflows
                    const pctFontSize = idx === 0 ? '28' : '17';
                    const labelFontSize = idx === 0 ? '15' : radius < 48 ? '10.5' : '12';
                    const maxLabelWidth = idx === 0 ? 110 : Math.min(radius * 1.55, 68);

                    return (
                      <g key={item.category}>
                        <circle
                          cx={anchor.cx}
                          cy={anchor.cy}
                          r={radius}
                          fill={bubbleFill}
                          stroke={stroke}
                          strokeWidth={strokeWidth}
                        />
                        <text
                          x={anchor.cx}
                          y={anchor.cy - (idx === 0 ? 8 : 4)}
                          textAnchor="middle"
                          fill={textColor}
                          fontSize={pctFontSize}
                          fontWeight="700"
                          fontFamily={idx === 0 ? "'Fraunces', 'Playfair Display', Georgia, serif" : 'inherit'}
                        >
                          {item.percent}%
                        </text>
                        <text
                          x={anchor.cx}
                          y={anchor.cy + (idx === 0 ? 18 : 14)}
                          textAnchor="middle"
                          fill={textColor}
                          fontSize={labelFontSize}
                          fontWeight="600"
                          textLength={item.category.length > 7 && idx > 0 ? maxLabelWidth : undefined}
                          lengthAdjust={item.category.length > 7 && idx > 0 ? 'spacingAndGlyphs' : undefined}
                          opacity={idx === 0 ? 0.95 : 1}
                        >
                          {item.category}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* 2x2 Legend Grid */}
              <div className="result-legend-grid">
                {sortedCategories.map((item) => {
                  const tierIdx = Math.min(uniquePointTiers.indexOf(item.points), tierDotColors.length - 1);
                  const dotColor = tierDotColors[tierIdx];
                  const isSmallest = item.points === minPoints;

                  return (
                    <div key={item.category} className="result-legend-pill">
                      <div className="result-legend-left">
                        <span
                          className="result-legend-dot"
                          style={{
                            backgroundColor: dotColor,
                            border: isSmallest ? '1.5px solid #C5B19D' : 'none',
                            boxSizing: 'border-box',
                          }}
                          aria-hidden="true"
                        />
                        <span className="result-legend-name">{item.category}</span>
                      </div>
                      <span className="result-legend-points">{item.points} pts</span>
                    </div>
                  );
                })}
              </div>

              {tieMessage && <p className="result-tie-notice">{tieMessage}</p>}
            </section>

            {/* Column 2: Career Pathways & Next Steps */}
            <section className="result-actions-card">
              <div className="result-actions-card__header">
                <span className="result-actions-eyebrow">CAREER PATHWAYS & NEXT STEPS</span>
                <h2 className="result-actions-heading">Take Action on Your Results</h2>
                <p className="result-actions-desc">
                  Based on your strong compatibility with {topMatchTitle}, explore programs, estimate merit eligibility, and secure financial aid.
                </p>
              </div>

              <div className="result-recommended-path-box">
                <span className="result-recommended-tag">PRIMARY CAREER MATCH</span>
                <div className="result-recommended-role">
                  {careerRecommendations[highestCategory] || topMatchTitle}
                </div>
                <p className="result-recommended-detail">
                  Your assessment reflects aptitude for structured problem solving, strategic thinking, and applied expertise in {topMatchTitle.toLowerCase()}.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="result-actions-group">
                <button
                  type="button"
                  className="result-btn-solid"
                  onClick={() => navigate('/university-recommender')}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c3 3 9 3 12 0v-5" />
                  </svg>
                  <span>University Recommender</span>
                </button>

                <button
                  type="button"
                  className="result-btn-outline"
                  onClick={handleDownloadPdf}
                  disabled={isExporting}
                >
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>{isExporting ? 'Generating PDF...' : 'Download Report (PDF)'}</span>
                </button>

                <button
                  type="button"
                  className="result-btn-outline"
                  onClick={() => navigate('/scholarships')}
                >
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <span>Explore Scholarships</span>
                </button>

                <div className="result-text-links">
                  <button
                    type="button"
                    className="result-text-link"
                    onClick={handleRetakeQuiz}
                  >
                    Retake Quiz
                  </button>
                  <span className="result-link-separator" aria-hidden="true">·</span>
                  <button
                    type="button"
                    className="result-text-link"
                    onClick={() => navigate('/dashboard')}
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            </section>

          </div>

        </div>

        {/* FOOTER */}
        <footer className="result-footer">
          <p className="result-footer-text">Your results are based on your quiz answers.</p>
          <p className="result-footer-brand">CareerGuide · Professional career guidance</p>
        </footer>

      </div>
    </div>
  );
}

export default Result;
