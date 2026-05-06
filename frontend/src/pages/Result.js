import { Navigate, useNavigate } from 'react-router-dom';
import {
  careerRecommendations,
  getHighestCategory,
  getTopCategories,
  storageKeys,
} from '../data/quizData';

function Result() {
  const navigate = useNavigate();
  const storedScores = JSON.parse(localStorage.getItem(storageKeys.scores) || 'null');

  if (!storedScores) {
    return <Navigate to="/" replace />;
  }

  const highestCategory = getHighestCategory(storedScores);
  const topCategories = getTopCategories(storedScores);
  const recommendation = careerRecommendations[highestCategory];

  const handleRestart = () => {
    localStorage.removeItem(storageKeys.scores);
    localStorage.removeItem(storageKeys.topCategories);
    navigate('/');
  };

  return (
    <main className="page-shell">
      <section className="card result-card">
        <p className="eyebrow">Your Result</p>
        <h1>{recommendation}</h1>
        <p className="muted-text">
          Based on your highest score, your strongest career fit is in the {highestCategory} field.
        </p>


        <div className="result-panel">
          <h2>Top Categories</h2>
          <ul className="result-list">
            {topCategories.map((category) => (
              <li key={category}>{category}: {storedScores[category]} points</li>
            ))}
          </ul>
        </div>

        <div className="result-panel">
          <h2>Score Summary</h2>
          <ul className="result-list">
            {Object.entries(storedScores).map(([category, score]) => (
              <li key={category}>{category}: {score} points</li>
            ))}
          </ul>
        </div>

        <div className="button-row">
          <button type="button" className="secondary-button" onClick={handleRestart}>
            Start Over
          </button>
          <button type="button" className="primary-button" onClick={() => navigate('/general-quiz')}>
            Retake Quiz
          </button>
        </div>
      </section>
    </main>
  );
}

export default Result;
