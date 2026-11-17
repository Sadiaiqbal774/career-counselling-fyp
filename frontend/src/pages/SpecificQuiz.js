import { useMemo, useState, useEffect } from 'react';
import supabase from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  answerScores,
  careerRecommendations,
  getEmptyScores,
  specificQuestionsByCategory,
  storageKeys,
  userStorageKey,
} from '../data/quizData';

const answerOptions = Object.keys(answerScores);

const calculateStagePoints = (answers) =>
  Object.values(answers).reduce((total, answer) => total + answerScores[answer], 0);

function SpecificQuiz() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Read from localStorage first
  const [storedScores, setStoredScores] = useState(() =>
    JSON.parse(localStorage.getItem(userStorageKey(storageKeys.scores, currentUser?.id)) || 'null')
  );
  const [storedTopCategories, setStoredTopCategories] = useState(() =>
    JSON.parse(localStorage.getItem(userStorageKey(storageKeys.topCategories, currentUser?.id)) || 'null')
  );
  const [loadingFromSupabase, setLoadingFromSupabase] = useState(false);

  // If localStorage is empty, try fetching from Supabase (cross-device support)
  useEffect(() => {
    if (!currentUser?.id) return;
    if (storedScores && storedTopCategories) return; // already have data locally

    setLoadingFromSupabase(true);
    supabase
      .from('quiz_scores')
      .select('scores, top_categories')
      .eq('user_id', currentUser.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .then(({ data, error }) => {
        if (!error && data && data.length) {
          const row = data[0];
          if (row.scores) {
            localStorage.setItem(userStorageKey(storageKeys.scores, currentUser.id), JSON.stringify(row.scores));
            setStoredScores(row.scores);
          }
          if (row.top_categories) {
            localStorage.setItem(userStorageKey(storageKeys.topCategories, currentUser.id), JSON.stringify(row.top_categories));
            setStoredTopCategories(row.top_categories);
          }
        }
        setLoadingFromSupabase(false);
      })
      .catch(() => setLoadingFromSupabase(false));
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const focusCategory = storedTopCategories?.[0] || 'Technology';
  const questions = specificQuestionsByCategory[focusCategory] || specificQuestionsByCategory.Technology;
  const baseScores = { ...getEmptyScores(), ...(storedScores || {}) };

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [errorMessage, setErrorMessage] = useState('');

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const currentAnswer = answers[currentQuestion.id] ?? '';

  const progressText = useMemo(
    () => `Question ${currentQuestionIndex + 1} of ${questions.length}`,
    [currentQuestionIndex, questions.length],
  );

  // Show loading while fetching from Supabase
  if (loadingFromSupabase) {
    return (
      <main className="page-shell">
        <section className="card quiz-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p style={{ color: 'var(--muted)', fontSize: '1rem' }}>Loading your quiz data…</p>
        </section>
      </main>
    );
  }

  // If no data even after Supabase fetch, redirect to general quiz
  if (!storedScores || !storedTopCategories) {
    return (
      <main className="page-shell">
        <section className="card quiz-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p style={{ marginBottom: '16px' }}>Please complete the General Quiz first.</p>
          <button type="button" className="primary-button" onClick={() => navigate('/general-quiz')}>
            Take General Quiz
          </button>
        </section>
      </main>
    );
  }

  const handleAnswerSelect = (answer) => {
    setAnswers((prevAnswers) => ({
      ...prevAnswers,
      [currentQuestion.id]: answer,
    }));
    setErrorMessage('');
  };

  const handleNext = async () => {
    if (!currentAnswer) {
      setErrorMessage('Please choose an answer before continuing.');
      return;
    }

    const nextAnswers = {
      ...answers,
      [currentQuestion.id]: currentAnswer,
    };
    const updatedScores = {
      ...baseScores,
      [focusCategory]: baseScores[focusCategory] + calculateStagePoints(nextAnswers),
    };

    if (isLastQuestion) {
      // Determine highest category from final updated scores
      const highestCategory = Object.entries(updatedScores)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || focusCategory;
      const recommendation = careerRecommendations[highestCategory] || highestCategory;

      localStorage.setItem(userStorageKey(storageKeys.scores, currentUser?.id), JSON.stringify(updatedScores));
      localStorage.setItem(userStorageKey(storageKeys.topCategories, currentUser?.id), JSON.stringify(storedTopCategories));

      // Persist final scores to Supabase (await so data saves before navigation)
      // Only save columns that exist in the quiz_scores table
      if (currentUser?.id) {
        try {
          await supabase.from('quiz_scores').upsert({
            user_id: currentUser.id,
            scores: updatedScores,
            top_categories: storedTopCategories,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
        } catch (_) {}
      }
      navigate('/result');
      return;
    }

    setAnswers(nextAnswers);
    setCurrentQuestionIndex((value) => value + 1);
    setErrorMessage('');
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((value) => value - 1);
      setErrorMessage('');
      return;
    }

    navigate('/general-quiz');
  };

  return (
    <main className="page-shell">
      <section className="card quiz-card">
        <div className="quiz-header">
          <p className="eyebrow">Specific Quiz</p>
          <span className="progress-pill">{progressText}</span>
        </div>

        <h2>{currentQuestion.text}</h2>
        <p className="category-label">Focus category: {focusCategory}</p>
        <p className="muted-text">{careerRecommendations[focusCategory]}</p>

        <div className="option-grid">
          {answerOptions.map((option) => (
            <button
              key={option}
              type="button"
              className={`option-button ${currentAnswer === option ? 'selected' : ''}`}
              onClick={() => handleAnswerSelect(option)}
            >
              {option}
            </button>
          ))}
        </div>

        {errorMessage ? <p className="error-text">{errorMessage}</p> : null}

        <div className="button-row">
          <button type="button" className="secondary-button" onClick={handleBack}>
            Back
          </button>
          <button type="button" className="primary-button" onClick={handleNext}>
            {isLastQuestion ? 'See Result' : 'Next Question'}
          </button>
        </div>
      </section>
    </main>
  );
}

export default SpecificQuiz;
