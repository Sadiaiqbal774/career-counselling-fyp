export function themeKeyFor(userId) {
  return `career-guide-settings:${userId || 'guest'}`;
}

export function readThemeSettings(userId) {
  const defaults = { darkMode: false };
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaults;
  }
  try {
    const raw = window.localStorage.getItem(themeKeyFor(userId));
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return { ...defaults, ...parsed };
  } catch (_) {
    return defaults;
  }
}

export function saveThemeSettings(userId, settings) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(themeKeyFor(userId), JSON.stringify(settings));
  } catch (_) {}
}

export function applyTheme(isDark) {
  if (typeof document === 'undefined' || !document.documentElement) {
    return;
  }
  const root = document.documentElement;
  const dark = Boolean(isDark);
  root.classList.toggle('dark', dark);
  root.classList.toggle('dark-mode', dark);
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
}

