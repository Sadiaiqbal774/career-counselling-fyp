// Shared auth‑related helpers

/**
 * Returns true if the Supabase user has a password‑based identity.
 * Uses app_metadata.providers as the source of truth and falls back to
 * checking the identities array for a provider of "email".
 *
 * @param {object} user – Supabase user object (session?.user)
 * @returns {boolean}
 */
export function hasPassword(user) {
  if (!user) return false;
  const providers = user.app_metadata?.providers;
  if (Array.isArray(providers)) {
    return providers.includes('email');
  }
  // Fallback – check any identity with provider 'email'
  return user.identities?.some((i) => i.provider === 'email') || false;
}

/**
 * Validates password strength: at least 8 characters, includes upper,
 * lower, number, and special character.
 *
 * @param {string} password
 * @returns {boolean}
 */
export function isStrongPassword(password) {
  return typeof password === 'string' && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password);
}

