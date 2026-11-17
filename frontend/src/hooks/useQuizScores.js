import { useEffect, useState } from 'react';
import supabase from '../lib/supabase';
import { userStorageKey, storageKeys } from '../data/quizData';

/**
 * Hook to fetch the latest quiz scores for the logged-in user.
 * - If a cached entry exists in localStorage, it is returned immediately.
 * - Then the hook queries quiz_scores for the user, picks the most recent
 *   row (by updated_at) and overwrites the localStorage cache.
 * - Also fetches model_answers so the Result page works on a fresh device.
 * - If the fetch fails or returns no rows, falls back to cached value.
 *
 * Returns { scores, topCategories, modelAnswers, loading }
 */
export default function useQuizScores(currentUser) {
  const [scores, setScores] = useState(null);
  const [topCategories, setTopCategories] = useState(null);
  const [modelAnswers, setModelAnswers] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // No authenticated user → use guest cache if present.
    if (!currentUser?.id) {
      const guestKey = userStorageKey(storageKeys.scores, 'guest');
      const guestScores = JSON.parse(localStorage.getItem(guestKey) || 'null');
      const guestTopKey = userStorageKey(storageKeys.topCategories, 'guest');
      const guestTop = JSON.parse(localStorage.getItem(guestTopKey) || 'null');
      setScores(guestScores);
      setTopCategories(guestTop);
      setModelAnswers(null);
      return;
    }

    // Keys
    const cacheKey = userStorageKey(storageKeys.scores, currentUser.id);
    const topCacheKey = userStorageKey(storageKeys.topCategories, currentUser.id);
    const modelCacheKey = userStorageKey('modelQuizAnswers', currentUser.id);

    // Return cached values immediately while fetching fresh data
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
    const cachedTop = JSON.parse(localStorage.getItem(topCacheKey) || 'null');
    const cachedModel = JSON.parse(localStorage.getItem(modelCacheKey) || 'null');
    if (cached) setScores(cached);
    if (cachedTop) setTopCategories(cachedTop);
    if (cachedModel) setModelAnswers(cachedModel);
    if (!cached) setLoading(true);

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('quiz_scores')
          .select('scores, top_categories, model_answers, highest_category, recommendation, updated_at')
          .eq('user_id', currentUser.id)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (cancelled) return;

        if (!error && data && data.length) {
          const latest = data[0];

          // Cache and apply scores
          if (latest.scores) {
            localStorage.setItem(cacheKey, JSON.stringify(latest.scores));
            setScores(latest.scores);
          } else if (cached) {
            setScores(cached);
          }

          // Cache and apply top_categories
          if (latest.top_categories) {
            localStorage.setItem(topCacheKey, JSON.stringify(latest.top_categories));
            setTopCategories(latest.top_categories);
          } else if (cachedTop) {
            setTopCategories(cachedTop);
          }

          // Cache and apply model_answers (needed by Result page on fresh device)
          if (latest.model_answers) {
            localStorage.setItem(modelCacheKey, JSON.stringify(latest.model_answers));
            setModelAnswers(latest.model_answers);
          } else if (cachedModel) {
            setModelAnswers(cachedModel);
          }
        } else {
          // Supabase returned nothing — fall back to whatever was cached locally
          if (cached) setScores(cached);
          if (cachedTop) setTopCategories(cachedTop);
          if (cachedModel) setModelAnswers(cachedModel);
        }
      } catch {
        if (cached) setScores(cached);
        if (cachedTop) setTopCategories(cachedTop);
        if (cachedModel) setModelAnswers(cachedModel);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [currentUser?.id]);

  return { scores, topCategories, modelAnswers, loading };
}
