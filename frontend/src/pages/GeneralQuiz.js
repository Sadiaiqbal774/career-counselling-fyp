import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  answerScores,
  generalQuestions,
  getEmptyScores,
  getTopCategories,
  storageKeys,
} from '../data/quizData';

const answerOptions = Object.keys(answerScores);

const calculateScores = (answers) =>
  generalQuestions.reduce(
    (accumulator, question) => {
      const answer = answers[question.id];
      if (answer) {
        accumulator[question.category] += answerScores[answer];
      }
      return accumulator;
    },
    getEmptyScores(),
  );

function GeneralQuiz() {
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [errorMessage, setErrorMessage] = useState('');

  const currentQuestion = generalQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === generalQuestions.length - 1;
  const currentAnswer = answers[currentQuestion.id] ?? '';

  const progressText = useMemo(
    () => `Question ${currentQuestionIndex + 1} of ${generalQuestions.length}`,
    [currentQuestionIndex],
  );

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
    const updatedScores = calculateScores(nextAnswers);

    if (isLastQuestion) {
      const topCategories = getTopCategories(updatedScores);
      localStorage.setItem(storageKeys.scores, JSON.stringify(updatedScores));
      localStorage.setItem(storageKeys.topCategories, JSON.stringify(topCategories));
      navigate('/specific-quiz');
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

    navigate('/dashboard');
  };

  return (
    <main className="page-shell">
      <section className="card quiz-card">
        <div className="quiz-header">
          <p className="eyebrow">General Interest Quiz</p>
          <span className="progress-pill">{progressText}</span>
        </div>

        <h2>{currentQuestion.text}</h2>
        <p className="category-label">Category: {currentQuestion.category}</p>

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
            {isLastQuestion ? 'Finish Quiz' : 'Next Question'}
          </button>
        </div>
      </section>
    </main>
  );
}

export default GeneralQuiz;
