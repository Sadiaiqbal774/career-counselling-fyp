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

  // ── Persist / load from localStorage + Supabase ───────────────────────────
  const [storedScores, setStoredScores] = useState(() =>
    JSON.parse(localStorage.getItem(userStorageKey(storageKeys.scores, currentUser?.id)) || 'null')
  );
  const [storedTopCategories, setStoredTopCategories] = useState(() =>
    JSON.parse(localStorage.getItem(userStorageKey(storageKeys.topCategories, currentUser?.id)) || 'null')
  );
  const [loadingFromSupabase, setLoadingFromSupabase] = useState(false);

  useEffect(() => {
    if (!currentUser?.id) return;
    if (storedScores && storedTopCategories) return;

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

  // ── Derive the ordered list of tied-top categories ────────────────────────
  // storedTopCategories now contains ALL categories that share the highest
  // general-quiz score (saved by GeneralQuiz using getTopTiedCategories).
  const focusCategories = useMemo(() => {
    if (!storedTopCategories || !storedTopCategories.length) return ['Technology'];
    return storedTopCategories;
  }, [storedTopCategories]);

  // Build a flat question list: all questions for every tied category, in order.
  // Each question gets a unique compound id so answers don't collide across categories.
  const allQuestions = useMemo(() => {
    return focusCategories.flatMap((cat) =>
      (specificQuestionsByCategory[cat] || []).map((q) => ({
        ...q,
        id: `${cat}__${q.id}`,   // e.g. "Technology__1"
        category: cat,
      }))
    );
  }, [focusCategories]);

  // ── Quiz state ─────────────────────────────────────────────────────────────
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [errorMessage, setErrorMessage] = useState('');

  const baseScores = useMemo(
    () => ({ ...getEmptyScores(), ...(storedScores || {}) }),
    [storedScores]
  );

  const currentQuestion = allQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === allQuestions.length - 1;
  const currentAnswer = currentQuestion ? (answers[currentQuestion.id] ?? '') : '';

  const progressText = useMemo(
    () => `Question ${currentQuestionIndex + 1} of ${allQuestions.length}`,
    [currentQuestionIndex, allQuestions.length]
  );

  // ── Derived score boost per category from current answers ──────────────────
  const updatedScoresFromAnswers = useMemo(() => {
    const updated = { ...baseScores };
    focusCategories.forEach((cat) => {
      const catAnswers = {};
      allQuestions.forEach((q) => {
        if (q.category === cat && answers[q.id]) catAnswers[q.id] = answers[q.id];
      });
      updated[cat] = baseScores[cat] + calculateStagePoints(catAnswers);
    });
    return updated;
  }, [answers, baseScores, focusCategories, allQuestions]);

  // ── Loading / gate states ──────────────────────────────────────────────────
  if (loadingFromSupabase) {
    return (
      <main className="page-shell">
        <section className="card quiz-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p style={{ color: 'var(--muted)', fontSize: '1rem' }}>Loading your quiz data…</p>
        </section>
      </main>
    );
  }

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

  if (!currentQuestion) return null;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAnswerSelect = (answer) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: answer }));
    setErrorMessage('');
  };

  const handleNext = async () => {
    if (!currentAnswer) {
      setErrorMessage('Please choose an answer before continuing.');
      return;
    }

    const nextAnswers = { ...answers, [currentQuestion.id]: currentAnswer };

    if (isLastQuestion) {
      // Build final scores from all specific-quiz answers
      const finalScores = { ...baseScores };
      focusCategories.forEach((cat) => {
        const catAnswers = {};
        allQuestions.forEach((q) => {
          if (q.category === cat && nextAnswers[q.id]) catAnswers[q.id] = nextAnswers[q.id];
        });
        finalScores[cat] = baseScores[cat] + calculateStagePoints(catAnswers);
      });

      localStorage.setItem(userStorageKey(storageKeys.scores, currentUser?.id), JSON.stringify(finalScores));
      localStorage.setItem(userStorageKey(storageKeys.topCategories, currentUser?.id), JSON.stringify(storedTopCategories));

      if (currentUser?.id) {
        try {
          await supabase.from('quiz_scores').upsert({
            user_id: currentUser.id,
            scores: finalScores,
            top_categories: storedTopCategories,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
        } catch (_) {}
      }
      navigate('/result');
      return;
    }

    setAnswers(nextAnswers);
    setCurrentQuestionIndex((v) => v + 1);
    setErrorMessage('');
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((v) => v - 1);
      setErrorMessage('');
      return;
    }
    navigate('/general-quiz');
  };

  // ── Category banner (which category are we on right now?) ─────────────────
  const currentCategory = currentQuestion.category;
  const categoryLabel =
    focusCategories.length > 1
      ? `${currentCategory} (${focusCategories.indexOf(currentCategory) + 1} of ${focusCategories.length})`
      : currentCategory;

  return (
    <main className="page-shell">
      <section className="card quiz-card">
        <div className="quiz-header">
          <p className="eyebrow">Specific Quiz</p>
          <span className="progress-pill">{progressText}</span>
        </div>

        {/* Show all categories this quiz covers */}
        {focusCategories.length > 1 && (
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '4px', marginTop: '0' }}>
            Covering: {focusCategories.join(' · ')}
          </p>
        )}

        <h2>{currentQuestion.text}</h2>

        {/* Career recommendation for the current category */}
        <p className="muted-text">{careerRecommendations[currentCategory]}</p>

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
