import { useEffect, useState } from 'react';
import supabase from '../lib/supabase';
import { userStorageKey, storageKeys } from '../data/quizData';

/**
 * Hook to fetch the latest quiz scores for the logged‑in user.
 * - If a cached entry exists in localStorage, it is returned immediately.
 * - Then the hook queries **all** rows of `quiz_scores` for the user, picks the most recent
 *   (by `updated_at`) and overwrites the localStorage cache.
 * - If the fetch fails or returns no rows, the hook falls back to the cached value without
 *   throwing.
 *
 * Returns an object `{ scores, loading }` where `scores` is the scores object or `null`.
 */
export default function useQuizScores(currentUser) {
  const [scores, setScores] = useState(null);
  const [topCategories, setTopCategories] = useState(null);
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
      return;
    }

    // Attempt to read cached scores first.
    const cacheKey = userStorageKey(storageKeys.scores, currentUser.id);
    const topCacheKey = userStorageKey(storageKeys.topCategories, currentUser.id);
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
    const cachedTop = JSON.parse(localStorage.getItem(topCacheKey) || 'null');
    if (cached) setScores(cached);
    if (cachedTop) setTopCategories(cachedTop);
    if (!cached) setLoading(true);

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('quiz_scores')
          .select('scores, top_categories, updated_at')
          .eq('user_id', currentUser.id);

        if (cancelled) return;

        if (!error && data && data.length) {
          const latest = data.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];
          localStorage.setItem(cacheKey, JSON.stringify(latest.scores));
          if (latest.top_categories) {
            localStorage.setItem(topCacheKey, JSON.stringify(latest.top_categories));
          }
          setScores(latest.scores);
          setTopCategories(latest.top_categories || null);
        } else if (cached) {
          setScores(cached);
          setTopCategories(cachedTop);
        }
      } catch {
        if (cached) {
          setScores(cached);
          setTopCategories(cachedTop);
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [currentUser?.id]);

  return { scores, topCategories, loading };
}

