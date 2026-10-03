// Bookmark & Saved Opportunities Storage Utilities
export const BOOKMARK_STORAGE_KEY = (userId) => `career-guide-bookmarks-${userId || 'guest'}`;

export function getBookmarks(userId) {
  try {
    const raw = localStorage.getItem(BOOKMARK_STORAGE_KEY(userId));
    if (!raw) return { universities: [], scholarships: [] };
    const parsed = JSON.parse(raw);
    return {
      universities: Array.isArray(parsed.universities) ? parsed.universities : [],
      scholarships: Array.isArray(parsed.scholarships) ? parsed.scholarships : [],
    };
  } catch {
    return { universities: [], scholarships: [] };
  }
}

export function saveBookmarks(userId, bookmarks) {
  try {
    localStorage.setItem(BOOKMARK_STORAGE_KEY(userId), JSON.stringify(bookmarks));
  } catch (err) {
    console.error('Error saving bookmarks:', err);
  }
}

export function isItemBookmarked(userId, type, item) {
  const bookmarks = getBookmarks(userId);
  const list = bookmarks[type] || [];
  const itemId = item.id || item.name || item.University || item.degree_name;
  return list.some((b) => (b.id || b.name || b.University || b.degree_name) === itemId);
}

export function toggleItemBookmark(userId, type, item) {
  const bookmarks = getBookmarks(userId);
  const list = bookmarks[type] || [];
  const itemId = item.id || item.name || item.University || item.degree_name;
  const existsIndex = list.findIndex((b) => (b.id || b.name || b.University || b.degree_name) === itemId);

  let isNowSaved = false;
  if (existsIndex >= 0) {
    list.splice(existsIndex, 1);
    isNowSaved = false;
  } else {
    list.push({
      ...item,
      savedAt: new Date().toISOString(),
    });
    isNowSaved = true;
  }

  bookmarks[type] = list;
  saveBookmarks(userId, bookmarks);
  return isNowSaved;
}
