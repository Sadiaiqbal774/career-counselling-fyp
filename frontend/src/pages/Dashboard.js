import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getEmptyScores } from '../data/quizData';
import { getProfileCompletion, readUserProfile, readUserQuizData } from '../data/userData';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const studentName = currentUser?.name || 'Student';
  const firstName = studentName.split(' ')[0];
  const profileEmail = currentUser?.email || 'No email available';
  const profile = useMemo(() => readUserProfile(currentUser?.id), [currentUser?.id]);
  const profileCompletion = getProfileCompletion(profile);

  // Stored scores with fallback to guest
  const storedScores = useMemo(() => {
    try {
      const userData = readUserQuizData(currentUser?.id);
      if (userData && userData.scores) return userData.scores;
      const guestData = readUserQuizData('guest');
      return guestData ? guestData.scores : null;
    } catch {
      return null;
    }
  }, [currentUser?.id]);

  const storedTopCategories = useMemo(() => {
    try {
      const userData = readUserQuizData(currentUser?.id);
      if (userData && userData.topCategories) return userData.topCategories;
      const guestData = readUserQuizData('guest');
      return guestData ? guestData.topCategories : null;
    } catch {
      return null;
    }
  }, [currentUser?.id]);

  const hasQuizResults = Boolean(storedScores);
  const scoreValues = storedScores ? Object.values(storedScores).map((v) => Number(v) || 0) : Object.values(getEmptyScores());
  const totalScore = scoreValues.reduce((sum, v) => sum + v, 0);
  const maxScore = 60;
  const assessmentProgress = hasQuizResults
    ? Math.min(100, Math.round((totalScore / maxScore) * 100))
    : 0;
  const savedPathsCount = hasQuizResults ? Math.max(1, storedTopCategories?.length || 0) : 0;
  const recommendedUniversitiesCount = hasQuizResults ? Math.max(3, savedPathsCount * 4) : 0;
  const topMatchedCategory = storedTopCategories && storedTopCategories.length > 0 ? storedTopCategories[0] : null;

  const handleOpenChatbot = () => {
    const toggle = document.querySelector('.chatbot-toggle');
    if (toggle) {
      toggle.click();
    } else {
      navigate('/general-quiz');
    }
  };

  return (
    <main className="cg-dashboard-page">
      <div className="cg-dashboard-wrap">
        {/* ========================================================
            1. TOP SPLIT: WELCOME & PROFILE
        ======================================================== */}
        <section className="cg-dashboard-hero-row">
          <div className="cg-dashboard-welcome-box">
            <p className="cg-eyebrow">CAREER COUNSELLING WORKSPACE</p>
            <h1 className="cg-welcome-heading">Welcome, {firstName}.</h1>
            <p className="cg-welcome-text">
              Your dashboard brings together career match insights, next steps, and university suggestions in one place.
            </p>
            <div className="cg-chips-row">
              <span className="cg-badge-chip">Career guidance</span>
              <span className="cg-badge-chip">University planning</span>
              <span className="cg-badge-chip">Scholarship support</span>
              <span className="cg-badge-chip">Aptitude assessment</span>
            </div>

            {/* Quick Actions Bar */}
            <div className="cg-quick-actions-bar">
              <button
                type="button"
                className="cg-action-btn cg-action-btn--primary"
                onClick={() => navigate('/result')}
              >
                📊 View results
              </button>
              <button
                type="button"
                className="cg-action-btn cg-action-btn--secondary"
                onClick={() => navigate('/general-quiz')}
              >
                {hasQuizResults ? '↻ Retake quiz' : '🚀 Take quiz'}
              </button>
              <button
                type="button"
                className="cg-action-btn cg-action-btn--ghost"
                onClick={() => navigate('/university-recommender')}
              >
                🏛️ Universities
              </button>
              <button
                type="button"
                className="cg-action-btn cg-action-btn--ghost"
                onClick={() => navigate('/scholarships')}
              >
                🎓 Scholarships
              </button>
            </div>
          </div>

          <aside className="cg-dashboard-profile-box">
            <div className="cg-profile-header">
              <div className="cg-avatar-circle" aria-hidden="true">
                {firstName.charAt(0).toUpperCase()}
              </div>
              <div className="cg-profile-details">
                <div className="cg-profile-name">{studentName}</div>
                <div className="cg-profile-email">{profileEmail}</div>
              </div>
            </div>

            <div className="cg-profile-completion-row">
              <span>Profile completion</span>
              <strong>{profileCompletion}%</strong>
            </div>
            <div className="cg-profile-meter">
              <div className="cg-profile-meter-fill" style={{ width: `${profileCompletion}%` }} />
            </div>
            <p className="cg-profile-hint">
              {profileCompletion === 100
                ? 'Your academic profile is fully up-to-date.'
                : 'Complete the quiz and explore your recommended universities to refine your plan.'}
            </p>
            <button
              type="button"
              className="cg-btn-edit-profile"
              onClick={() => navigate('/profile')}
            >
              Edit profile ✏️
            </button>
          </aside>
        </section>

        {/* ========================================================
            2. HIGHLIGHT BANNER IF RESULTS EXIST
        ======================================================== */}
        {hasQuizResults && (
          <section className="cg-results-highlight-card">
            <div className="cg-highlight-left">
              <span className="cg-highlight-icon">🎯</span>
              <div>
                <span className="cg-highlight-tag">LATEST ASSESSMENT REPORT</span>
                <h3 className="cg-highlight-title">
                  Top Matched Stream: {topMatchedCategory} ({assessmentProgress}% Compatibility)
                </h3>
                <p className="cg-highlight-desc">
                  Your quiz responses have been analyzed. Explore your detailed radar chart, degree compatibility, and admission merit cutoff benchmarks.
                </p>
              </div>
            </div>
            <div className="cg-highlight-actions">
              <button
                type="button"
                className="cg-highlight-btn-primary"
                onClick={() => navigate('/result')}
              >
                View results breakdown →
              </button>
              <button
                type="button"
                className="cg-highlight-btn-secondary"
                onClick={() => navigate('/general-quiz')}
              >
                Retake quiz
              </button>
            </div>
          </section>
        )}

        {/* ========================================================
            3. CORE METRIC CARDS
        ======================================================== */}
        <section className="cg-metrics-grid">
          <div className="cg-metric-card cg-metric-card--0">
            <div className="cg-metric-top">
              <span className="cg-metric-label">Assessment progress</span>
              <span className="cg-metric-icon">📝</span>
            </div>
            <div className="cg-metric-value">{assessmentProgress}%</div>
            <div className="cg-metric-hint">
              {hasQuizResults ? 'Based on your saved quiz performance.' : 'Take the quiz to generate your first result.'}
            </div>
          </div>

          <div className="cg-metric-card cg-metric-card--1">
            <div className="cg-metric-top">
              <span className="cg-metric-label">Saved paths</span>
              <span className="cg-metric-icon">🧭</span>
            </div>
            <div className="cg-metric-value">{savedPathsCount}</div>
            <div className="cg-metric-hint">
              {hasQuizResults ? 'Career matches stored from your quiz results.' : 'No saved career matches yet.'}
            </div>
          </div>

          <div className="cg-metric-card cg-metric-card--2">
            <div className="cg-metric-top">
              <span className="cg-metric-label">Recommended universities</span>
              <span className="cg-metric-icon">🏛️</span>
            </div>
            <div className="cg-metric-value">{recommendedUniversitiesCount || '50+'}</div>
            <div className="cg-metric-hint">
              {hasQuizResults ? 'Universities aligned with your current performance.' : 'Complete the assessment to see recommendations.'}
            </div>
          </div>

          <div className="cg-metric-card cg-metric-card--3">
            <div className="cg-metric-top">
              <span className="cg-metric-label">Available scholarships</span>
              <span className="cg-metric-icon">💰</span>
            </div>
            <div className="cg-metric-value">100+</div>
            <div className="cg-metric-hint">Verified HEC, PEEF & Merit financial aid.</div>
          </div>
        </section>

        {/* ========================================================
            4. RECOMMENDED NEXT STEPS (ACTION ROWS)
        ======================================================== */}
        <section className="cg-steps-section">
          <p className="cg-eyebrow cg-center">RECOMMENDED NEXT STEPS</p>
          <h2 className="cg-steps-heading">Continue your guidance journey</h2>

          <div className="cg-steps-list">
            {/* Step 1: Career fit analysis */}
            <div className="cg-step-card">
              <div className="cg-step-left">
                <div className="cg-step-iconbox cg-step-iconbox--career" aria-hidden="true">
                  <span>↻</span>
                </div>
                <div className="cg-step-copy">
                  <div className="cg-step-title">Career fit analysis</div>
                  <div className="cg-step-desc">
                    Review your quiz results and compare how your interests map to technology, business, or medical pathways.
                  </div>
                </div>
              </div>
              <div className="cg-step-buttons">
                <button
                  type="button"
                  className="cg-btn-step-primary"
                  onClick={() => navigate('/result')}
                >
                  View results
                </button>
                <button
                  type="button"
                  className="cg-btn-step-secondary"
                  onClick={() => navigate('/general-quiz')}
                >
                  {hasQuizResults ? 'Retake quiz' : 'Take quiz'}
                </button>
              </div>
            </div>

            {/* Step 2: University shortlist */}
            <div className="cg-step-card">
              <div className="cg-step-left">
                <div className="cg-step-iconbox cg-step-iconbox--university" aria-hidden="true">
                  <span>⌂</span>
                </div>
                <div className="cg-step-copy">
                  <div className="cg-step-title">University shortlist</div>
                  <div className="cg-step-desc">
                    Compare programs, merit requirements, and degree options before you apply to a university.
                  </div>
                </div>
              </div>
              <div className="cg-step-buttons">
                <button
                  type="button"
                  className="cg-btn-step-primary"
                  onClick={() => navigate('/university-recommender')}
                >
                  Open university recommender
                </button>
              </div>
            </div>

            {/* Step 3: Scholarship opportunities */}
            <div className="cg-step-card">
              <div className="cg-step-left">
                <div className="cg-step-iconbox cg-step-iconbox--scholarship" aria-hidden="true">
                  <span>★</span>
                </div>
                <div className="cg-step-copy">
                  <div className="cg-step-title">Scholarship opportunities</div>
                  <div className="cg-step-desc">
                    Check available scholarships to reduce cost and plan your application timeline more effectively.
                  </div>
                </div>
              </div>
              <div className="cg-step-buttons">
                <button
                  type="button"
                  className="cg-btn-step-primary"
                  onClick={() => navigate('/scholarships')}
                >
                  Browse scholarships
                </button>
              </div>
            </div>

            {/* Step 4: AI Career Chatbot */}
            <div className="cg-step-card">
              <div className="cg-step-left">
                <div className="cg-step-iconbox cg-step-iconbox--chat" aria-hidden="true">
                  <span>💬</span>
                </div>
                <div className="cg-step-copy">
                  <div className="cg-step-title">Instant guidance assistant</div>
                  <div className="cg-step-desc">
                    Ask questions about entry test formats, fee structures, and application deadlines anytime.
                  </div>
                </div>
              </div>
              <div className="cg-step-buttons">
                <button
                  type="button"
                  className="cg-btn-step-primary"
                  onClick={handleOpenChatbot}
                >
                  Chat with assistant
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Dashboard;