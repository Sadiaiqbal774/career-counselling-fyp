import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { modelQuizQuestions } from '../data/quizData';

function DetailedQuiz() {
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [errorMessage, setErrorMessage] = useState('');

  const currentQuestion = modelQuizQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === modelQuizQuestions.length - 1;
  const currentAnswer = answers[currentQuestion.id] ?? '';

  const progressText = useMemo(
    () => `Question ${currentQuestionIndex + 1} of ${modelQuizQuestions.length}`,
    [currentQuestionIndex],
  );

  const handleAnswerChange = (value) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
    setErrorMessage('');
  };

  const handleNext = () => {
    if (currentAnswer === '' || currentAnswer === undefined) {
      setErrorMessage('Please provide an answer before continuing.');
      return;
    }

    if (currentQuestionIndex < modelQuizQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // Quiz complete - store answers and navigate to results
      const modelAnswers = {
        Math: parseInt(answers.math) || 0,
        Biology: parseInt(answers.biology) || 0,
        Computer: parseInt(answers.computer) || 0,
        Communication: parseInt(answers.communication) || 0,
        Marks: parseInt(answers.marks) || 0,
        Background: answers.background || '',
        Leadership: parseInt(answers.leadership) || 0,
      };

      localStorage.setItem('modelQuizAnswers', JSON.stringify(modelAnswers));
      navigate('/result');
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    } else {
      navigate('/specific-quiz');
    }
  };

  const handleSkip = () => {
    // Allow skipping the detailed quiz and going straight to results
    if (window.confirm('Skipping will use default values. Continue?')) {
      navigate('/result');
    }
  };

  return (
    <main className="page-shell">
      <section className="card quiz-card">
        <div className="quiz-header">
          <p className="eyebrow">{progressText}</p>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${((currentQuestionIndex + 1) / modelQuizQuestions.length) * 100}%` }}
            />
          </div>
        </div>

        <h1>{currentQuestion.label}</h1>
        <p className="question-text">{currentQuestion.question}</p>

        {errorMessage && <p className="error-text">{errorMessage}</p>}

        <div className="answer-options">
          {currentQuestion.type === 'scale' && (
            <div className="scale-inputs">
              {Array.from({ length: currentQuestion.max - currentQuestion.min + 1 }, (_, i) => i + currentQuestion.min).map(
                (value) => (
                  <button
                    key={value}
                    type="button"
                    className={`scale-button ${currentAnswer == value ? 'active' : ''}`}
                    onClick={() => handleAnswerChange(value)}
                  >
                    {value}
                  </button>
                ),
              )}
            </div>
          )}

          {currentQuestion.type === 'number' && (
            <div className="number-input-wrapper">
              <input
                type="number"
                min={currentQuestion.min}
                max={currentQuestion.max}
                value={currentAnswer}
                onChange={(e) => handleAnswerChange(e.target.value)}
                className="number-input"
                placeholder={`Enter a number (${currentQuestion.min}-${currentQuestion.max})`}
              />
            </div>
          )}

          {currentQuestion.type === 'select' && (
            <div className="select-wrapper">
              <select value={currentAnswer} onChange={(e) => handleAnswerChange(e.target.value)} className="select-input">
                <option value="">-- Select an option --</option>
                {currentQuestion.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="button-row">
          <button type="button" className="secondary-button" onClick={handleBack}>
            Back
          </button>
          <button type="button" className="tertiary-button" onClick={handleSkip}>
            Skip Quiz
          </button>
          <button type="button" className="primary-button" onClick={handleNext}>
            {isLastQuestion ? 'See Results' : 'Next'}
          </button>
        </div>
      </section>

      <style>{`
        .quiz-card {
          max-width: 600px;
          margin: 2rem auto;
          padding: 2rem;
        }

        .quiz-header {
          margin-bottom: 2rem;
        }

        .progress-bar {
          width: 100%;
          height: 6px;
          background: rgba(214, 191, 168, 0.35);
          border-radius: 3px;
          overflow: hidden;
          margin-top: 0.5rem;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(135deg, #7C5D42 0%, #5a3e29 100%);
          transition: width 0.3s ease;
        }

        .question-text {
          font-size: 1.1em;
          margin-bottom: 2rem;
          color: #2b1b0e;
        }

        .error-text {
          color: #dc2626;
          margin-bottom: 1rem;
          font-weight: 500;
        }

        .answer-options {
          margin: 2rem 0;
        }

        .scale-inputs {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .scale-button {
          width: 50px;
          height: 50px;
          border: 2px solid #d6bfa8;
          background: rgba(255, 255, 255, 0.75);
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #2b1b0e;
        }

        .scale-button:hover {
          border-color: #7C5D42;
          background: #f6efe7;
        }

        .scale-button.active {
          background: linear-gradient(135deg, #7C5D42 0%, #a68a73 100%);
          color: white;
          border-color: #7C5D42;
        }

        .number-input-wrapper {
          display: flex;
          justify-content: center;
          margin: 2rem 0;
        }

        .number-input {
          padding: 0.75rem 1rem;
          font-size: 1rem;
          border: 2px solid #d6bfa8;
          border-radius: 8px;
          width: 200px;
          text-align: center;
        }

        .number-input:focus {
          outline: none;
          border-color: #7C5D42;
          box-shadow: 0 0 0 3px rgba(124, 93, 66, 0.1);
        }

        .select-wrapper {
          display: flex;
          justify-content: center;
          margin: 2rem 0;
        }

        .select-input {
          padding: 0.75rem 1rem;
          font-size: 1rem;
          border: 2px solid #d6bfa8;
          border-radius: 8px;
          width: 200px;
          background: rgba(255, 255, 255, 0.75);
          cursor: pointer;
        }

        .select-input:focus {
          outline: none;
          border-color: #7C5D42;
          box-shadow: 0 0 0 3px rgba(124, 93, 66, 0.1);
        }

        .button-row {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .primary-button,
        .secondary-button,
        .tertiary-button {
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .primary-button {
          background: linear-gradient(135deg, #7C5D42 0%, #a68a73 100%);
          color: white;
        }

        .primary-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(124, 93, 66, 0.2);
        }

        .secondary-button {
          background: #f0e2d4;
          color: #2b1b0e;
          border: 1px solid rgba(43, 33, 24, 0.08);
        }

        .secondary-button:hover {
          background: #f6efe7;
        }

        .tertiary-button {
          background: transparent;
          color: #2b1b0e;
          border: 1px dashed #d6bfa8;
        }

        .tertiary-button:hover {
          background: #f6efe7;
        }
      `}</style>
    </main>
  );
}

export default DetailedQuiz;
