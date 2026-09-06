import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import supabase from '../lib/supabase';
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
  const storedScores = JSON.parse(
    localStorage.getItem(userStorageKey(storageKeys.scores, currentUser?.id)) || 'null'
  );
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
  }, [currentUser?.id, scoreKey]);

  if (!storedScores) {
    return <Navigate to="/" replace />;
  }

  const highestCategory = getHighestCategory(storedScores);
  const topCategories = getTopCategories(storedScores);
  const recommendation =
    careerRecommendations[highestCategory];

  const handleRestart = () => {
    localStorage.removeItem(userStorageKey(storageKeys.scores, currentUser?.id));
    localStorage.removeItem(userStorageKey(storageKeys.topCategories, currentUser?.id));
    navigate('/');
  };

  return (
    <main className="page-shell">

      <section className="card result-card">

        <p className="eyebrow">
          Your Result
        </p>

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