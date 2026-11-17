import { useEffect, useState } from 'react';
import supabase from '../lib/supabase';
import { userStorageKey, storageKeys } from '../data/quizData';

/**
 * Hook to fetch the latest quiz scores for the logged-in user.
 * - Always fetches fresh data from Supabase (source of truth for cross-device sync).
 * - Shows a loading state until Supabase responds so stale cached data is never shown.
 * - Updates localStorage cache with the fresh Supabase data once received.
 * - Falls back to localStorage only if Supabase fetch fails (offline / error).
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

    // Keys for localStorage cache
    const cacheKey = userStorageKey(storageKeys.scores, currentUser.id);
    const topCacheKey = userStorageKey(storageKeys.topCategories, currentUser.id);
    const modelCacheKey = userStorageKey('modelQuizAnswers', currentUser.id);

    // Always show loading and fetch fresh from Supabase.
    // This ensures cross-device sync: mobile always gets the latest result
    // even if its localStorage has an older cached value.
    setLoading(true);

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('quiz_scores')
          .select('scores, top_categories, model_answers, updated_at')
          .eq('user_id', currentUser.id)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (cancelled) return;

        if (!error && data && data.length) {
          const latest = data[0];

          // Always use Supabase data (overwrite any stale localStorage cache)
          if (latest.scores) {
            localStorage.setItem(cacheKey, JSON.stringify(latest.scores));
            setScores(latest.scores);
          }

          if (latest.top_categories) {
            localStorage.setItem(topCacheKey, JSON.stringify(latest.top_categories));
            setTopCategories(latest.top_categories);
          }

          if (latest.model_answers) {
            localStorage.setItem(modelCacheKey, JSON.stringify(latest.model_answers));
            setModelAnswers(latest.model_answers);
          }

          // If Supabase row exists but some fields are missing, fall back to cache
          if (!latest.scores) {
            const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
            if (cached) setScores(cached);
          }
          if (!latest.top_categories) {
            const cachedTop = JSON.parse(localStorage.getItem(topCacheKey) || 'null');
            if (cachedTop) setTopCategories(cachedTop);
          }
          if (!latest.model_answers) {
            const cachedModel = JSON.parse(localStorage.getItem(modelCacheKey) || 'null');
            if (cachedModel) setModelAnswers(cachedModel);
          }
        } else {
          // Supabase returned nothing — fall back to localStorage cache
          const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
          const cachedTop = JSON.parse(localStorage.getItem(topCacheKey) || 'null');
          const cachedModel = JSON.parse(localStorage.getItem(modelCacheKey) || 'null');
          if (cached) setScores(cached);
          if (cachedTop) setTopCategories(cachedTop);
          if (cachedModel) setModelAnswers(cachedModel);
        }
      } catch {
        // Network error — fall back to localStorage cache
        const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
        const cachedTop = JSON.parse(localStorage.getItem(topCacheKey) || 'null');
        const cachedModel = JSON.parse(localStorage.getItem(modelCacheKey) || 'null');
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
