import { useMemo, useState } from 'react';
import supabase from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
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
  const storedScores = JSON.parse(localStorage.getItem(userStorageKey(storageKeys.scores, currentUser?.id)) || 'null');
  const storedTopCategories = JSON.parse(localStorage.getItem(userStorageKey(storageKeys.topCategories, currentUser?.id)) || 'null');
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

  if (!storedScores || !storedTopCategories) {
    return <Navigate to="/" replace />;
  }

  const handleAnswerSelect = (answer) => {
    setAnswers((prevAnswers) => ({
      ...prevAnswers,
      [currentQuestion.id]: answer,
    }));
    setErrorMessage('');
  };

  const handleNext = () => {
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
      localStorage.setItem(userStorageKey(storageKeys.scores, currentUser?.id), JSON.stringify(updatedScores));
      localStorage.setItem(userStorageKey(storageKeys.topCategories, currentUser?.id), JSON.stringify(storedTopCategories));
      // Persist scores to Supabase for signed-in users
      if (currentUser?.id) {
        void supabase.from('quiz_scores').upsert({
          user_id: currentUser.id,
          scores: updatedScores,
          top_categories: storedTopCategories,
        });
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
