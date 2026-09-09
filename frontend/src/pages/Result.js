import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import supabase from '../lib/supabase';
import { readUserQuizData } from '../data/userData';
import CareerRadarChart from '../components/CareerRadarChart';
import { exportElementToPdf } from '../utils/pdfExport';
import {
  careerRecommendations,
  getHighestCategory,
  getTopCategories,
  storageKeys,
  userStorageKey,
} from '../data/quizData';

function Result() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const storedScores = readUserQuizData(currentUser?.id).scores;
  const scoreKey = JSON.stringify(storedScores);

  useEffect(() => {
    if (!currentUser?.id || !storedScores) return;

    const highestCategory = getHighestCategory(storedScores);
    const topCategories = getTopCategories(storedScores);
    const recommendation = careerRecommendations[highestCategory];

    supabase.from('recommendations').insert({
      user_id: currentUser.id,
      recommendation,
      highest_category: highestCategory,
      top_categories: topCategories,
      scores: storedScores,
    }).then(({ error }) => {
      if (error) console.error('Unable to save recommendation history.', error);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, scoreKey]);

  if (!storedScores) {
    return <Navigate to="/" replace />;
  }

  const highestCategory = getHighestCategory(storedScores);
  const topCategories = getTopCategories(storedScores);
  const recommendation =
    careerRecommendations[highestCategory];

  const handleRestart = () => {
    if (currentUser?.id) {
      localStorage.removeItem(userStorageKey(storageKeys.scores, currentUser.id));
      localStorage.removeItem(userStorageKey(storageKeys.topCategories, currentUser.id));
      localStorage.removeItem(`career-guide-scores-${currentUser.id}`);
      localStorage.removeItem(`career-guide-top-categories-${currentUser.id}`);
    }
    localStorage.removeItem(userStorageKey(storageKeys.scores, 'guest'));
    localStorage.removeItem(userStorageKey(storageKeys.topCategories, 'guest'));
    navigate('/');
  };

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    const toastId = toast.loading('Generating Career Assessment PDF Report...');
    try {
      await exportElementToPdf('career-assessment-report-section', `${currentUser?.name || 'Student'}_Career_Report.pdf`);
      toast.success('Career Report downloaded successfully!', { id: toastId });
    } catch (err) {
      toast.error('Could not generate PDF. Please try again.', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="page-shell">

      <section className="card result-card" id="career-assessment-report-section">

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <p className="eyebrow" style={{ margin: 0 }}>
            Official Career Assessment Report
          </p>
          <button
            type="button"
            className="primary-button"
            onClick={handleDownloadPdf}
            disabled={isExporting}
            style={{
              padding: '8px 18px',
              fontSize: '13.5px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: '999px',
            }}
          >
            <span>📥</span>
            <span>{isExporting ? 'Generating PDF...' : 'Download Career Report (PDF)'}</span>
          </button>
        </div>

        {currentUser?.name && (
          <p style={{ fontSize: '0.92rem', color: '#7a6555', margin: '-8px 0 16px' }}>
            Prepared for: <strong>{currentUser.name}</strong> · Date: {new Date().toLocaleDateString()}
          </p>
        )}

        <h1>
          {recommendation}
        </h1>

        <p
          className="muted-text result-emphasis"
          style={{
            fontWeight: 700,
            fontSize: '1.125rem',
          }}
        >
          Based on your highest score, your strongest
          career fit is in the {highestCategory} field.
        </p>

        {/* Visual Career Strengths Radar Chart */}
        <div className="result-panel" style={{ padding: '24px 16px', background: '#ffffff', borderRadius: '16px', border: '1px solid var(--border, #E0D0BF)' }}>
          <CareerRadarChart scores={storedScores} title="Assessed Dimension Strengths (Radar Profile)" />
        </div>

        {/* Top Categories */}

        <div className="result-panel">

          <h2>
            Top Categories
          </h2>

          <ul className="result-list">
            {topCategories.map((category) => (
              <li key={category}>
                {category}: {storedScores[category]} points
              </li>
            ))}
          </ul>

        </div>

        {/* Score Summary */}

        <div className="result-panel">

          <h2>
            Score Summary
          </h2>

          <ul className="result-list">
            {Object.entries(storedScores).map(
              ([category, score]) => (
                <li key={category}>
                  {category}: {score} points
                </li>
              )
            )}
          </ul>

        </div>

        {/* Scholarship Section */}

        <div
          className="result-panel"
          style={{
            textAlign: 'center',
            padding: '32px',
          }}
        >

          <h2
            style={{
              marginBottom: '14px',
            }}
          >
            Eligible Scholarships
          </h2>

          <p
            style={{
              color: '#6d4c41',
              lineHeight: '1.8',
              maxWidth: '650px',
              margin: '0 auto 28px auto',
              fontSize: '15px',
            }}
          >
            Based on your academic profile and career
            interests, you may qualify for various
            national and international scholarships.
          </p>

          <button
            type="button"
            className="primary-button"
            style={{
              padding: '14px 28px',
              fontSize: '15px',
              fontWeight: '600',
            }}
            onClick={() => navigate('/scholarships')}
          >
            🎓 Explore All Scholarships
          </button>

        </div>

        {/* Buttons */}

        <div className="button-row">

          <button
            type="button"
            className="secondary-button"
            onClick={handleRestart}
          >
            Start Over
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={() =>
              navigate('/university-recommender')
            }
          >
            University Recommender
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={handleDownloadPdf}
            disabled={isExporting}
          >
            {isExporting ? 'Generating...' : '📥 Download Report (PDF)'}
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={() => navigate('/general-quiz')}
          >
            Retake Quiz
          </button>

        </div>

      </section>

    </main>
  );
}

export default Result;