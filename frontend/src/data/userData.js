import { storageKeys, userStorageKey } from './quizData';

export const profileStorageKey = (userId) => `career-guide-profile-${userId}`;

export function readUserProfile(userId) {
  if (!userId) return {};
  try {
    return JSON.parse(localStorage.getItem(profileStorageKey(userId)) || 'null') || {};
  } catch {
    return {};
  }
}

export function readUserQuizData(userId) {
  if (!userId) return { scores: null, topCategories: null, modelAnswers: {} };
  try {
    return {
      scores: JSON.parse(localStorage.getItem(userStorageKey(storageKeys.scores, userId)) || 'null'),
      topCategories: JSON.parse(localStorage.getItem(userStorageKey(storageKeys.topCategories, userId)) || 'null'),
      modelAnswers: JSON.parse(localStorage.getItem(userStorageKey('modelQuizAnswers', userId)) || '{}'),
    };
  } catch {
    return { scores: null, topCategories: null, modelAnswers: {} };
  }
}

export function getProfileCompletion(profile) {
  const required = ['fullName', 'email', 'phone', 'city', 'school', 'marks', 'intermediateMarks'];
  if (profile.entryTest !== 'None') required.push('entryTestScore');
  return Math.round((required.filter((key) => String(profile[key] || '').trim()).length / required.length) * 100);
}
