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

function GeneralQuiz() {
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [scores, setScores] = useState(() => getEmptyScores());
  const [errorMessage, setErrorMessage] = useState('');

  const currentQuestion = generalQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === generalQuestions.length - 1;

  const progressText = useMemo(
    () => `Question ${currentQuestionIndex + 1} of ${generalQuestions.length}`,
    [currentQuestionIndex],
  );

  const handleAnswerSelect = (answer) => {
    setSelectedAnswer(answer);
    setErrorMessage('');
  };

  const handleNext = () => {
    if (!selectedAnswer) {
      setErrorMessage('Please choose an answer before continuing.');
      return;
    }

    const points = answerScores[selectedAnswer];
    const updatedScores = {
      ...scores,
      [currentQuestion.category]: scores[currentQuestion.category] + points,
    };

    if (isLastQuestion) {
      const topCategories = getTopCategories(updatedScores);
      localStorage.setItem(storageKeys.scores, JSON.stringify(updatedScores));
      localStorage.setItem(storageKeys.topCategories, JSON.stringify(topCategories));
      navigate('/specific-quiz');
      return;
    }

    setScores(updatedScores);
    setCurrentQuestionIndex((value) => value + 1);
    setSelectedAnswer('');
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
              className={`option-button ${selectedAnswer === option ? 'selected' : ''}`}
              onClick={() => handleAnswerSelect(option)}
            >
              {option}
            </button>
          ))}
        </div>

        {errorMessage ? <p className="error-text">{errorMessage}</p> : null}

        <div className="button-row">
          <button type="button" className="secondary-button" onClick={() => navigate('/')}>
            Back to Dashboard
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
