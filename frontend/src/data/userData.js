import { storageKeys, userStorageKey } from './quizData';

export const profileStorageKey = (userId) => `career-guide-profile-${userId}`;

export function readUserProfile(userId) {
  if (!userId) return {};
  try {
    const data = JSON.parse(localStorage.getItem(profileStorageKey(userId)) || 'null');
    return data || {};
  } catch {
    return {};
  }
}

export function saveUserProfile(userId, profile) {
  if (!userId) return;
  try {
    localStorage.setItem(profileStorageKey(userId), JSON.stringify(profile));
  } catch (err) {
    console.error('Error saving local profile:', err);
  }
}

export function readUserQuizData(userId) {
  try {
    const primaryKey = userId ? userStorageKey(storageKeys.scores, userId) : null;
    let scores = primaryKey ? JSON.parse(localStorage.getItem(primaryKey) || 'null') : null;

    const primaryTopCatKey = userId ? userStorageKey(storageKeys.topCategories, userId) : null;
    let topCategories = primaryTopCatKey ? JSON.parse(localStorage.getItem(primaryTopCatKey) || 'null') : null;

    const primaryModelKey = userId ? userStorageKey('modelQuizAnswers', userId) : null;
    let modelAnswers = primaryModelKey ? JSON.parse(localStorage.getItem(primaryModelKey) || '{}') : {};

    // Only read scores for the requested userId; do not steal from other users' keys
    if (!scores && userId === 'guest') {
      const guestKey = userStorageKey(storageKeys.scores, 'guest');
      scores = JSON.parse(localStorage.getItem(guestKey) || 'null');
    }

    if (!topCategories && userId === 'guest') {
      const guestTopCatKey = userStorageKey(storageKeys.topCategories, 'guest');
      topCategories = JSON.parse(localStorage.getItem(guestTopCatKey) || 'null');
    }

    return {
      scores: scores || null,
      topCategories: topCategories || null,
      modelAnswers: modelAnswers || {},
    };
  } catch {
    return { scores: null, topCategories: null, modelAnswers: {} };
  }
}

export function getProfileCompletion(profile) {
  if (!profile || typeof profile !== 'object') return 0;

  // Base required profile fields
  const required = ['fullName', 'email', 'phone', 'city', 'school', 'marks', 'intermediateMarks'];

  // Only require entryTestScore if an actual test was selected and is NOT 'None'
  if (profile.entryTest && profile.entryTest !== 'None') {
    required.push('entryTestScore');
  }

  const filledCount = required.filter((key) => {
    const val = profile[key];
    return val !== undefined && val !== null && String(val).trim() !== '';
  }).length;

  return Math.min(100, Math.round((filledCount / required.length) * 100));
}

export function getUserComprehensiveData(userId) {
  const profile = readUserProfile(userId);
  const quiz = readUserQuizData(userId);
  return {
    ...profile,
    quizScores: quiz.scores,
    quizTopCategories: quiz.topCategories,
    quizModelAnswers: quiz.modelAnswers,
    completion: getProfileCompletion(profile),
  };
}
