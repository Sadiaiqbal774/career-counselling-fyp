import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.REACT_APP_SUPABASE_URL || '').trim();
const supabaseAnonKey = (process.env.REACT_APP_SUPABASE_ANON_KEY || '').trim();

export function getSupabaseConfigError(url = supabaseUrl, anonKey = supabaseAnonKey) {
  if (!url || !anonKey) {
    return 'Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY, then restart the frontend.';
  }
  try {
    new URL(url);
  } catch {
    return 'REACT_APP_SUPABASE_URL must be a valid Supabase URL.';
  }
  return null;
}

export function ensureSupabaseConfigured() {
  const error = getSupabaseConfigError();
  if (error) throw new Error(error);
}

// Student / general user Supabase client
const supabase = createClient(
  supabaseUrl || 'https://invalid.supabase.local',
  supabaseAnonKey || 'invalid-anon-key',
);

export default supabase;

// --------------------------------------------------------------
// Dedicated, completely isolated Admin Supabase client
// NEVER shares storage with student/user sessions
// --------------------------------------------------------------
export const adminSupabase = createClient(
  supabaseUrl || 'https://invalid.supabase.local',
  supabaseAnonKey || 'invalid-anon-key',
  {
    auth: {
      storageKey: 'cg-admin-supabase-auth',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);

/** Save admin JWTs to localStorage */
export function saveAdminTokens({ access_token, refresh_token }) {
  try {
    const payload = JSON.stringify({ access_token, refresh_token });
    localStorage.setItem('adminTokens', payload);
  } catch (_) {}
}

/** Load admin JWTs from localStorage */
export function loadAdminTokens() {
  try {
    const raw = localStorage.getItem('adminTokens');
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

/** Get the current admin access token from isolated admin session */
export async function getAdminAccessToken() {
  try {
    const { data } = await adminSupabase.auth.getSession();
    if (data?.session?.access_token) {
      return data.session.access_token;
    }
  } catch (_) {}

  const stored = loadAdminTokens();
  if (stored?.access_token) {
    if (stored.refresh_token) {
      try {
        await adminSupabase.auth.setSession({
          access_token: stored.access_token,
          refresh_token: stored.refresh_token,
        });
      } catch (_) {}
    }
    return stored.access_token;
  }
  return null;
}

/** Attempt to refresh admin access token using refresh_token */
export async function refreshAdminAccessToken() {
  const stored = loadAdminTokens();
  if (!stored?.refresh_token) return null;
  try {
    const { data, error } = await adminSupabase.auth.setSession({
      access_token: stored.access_token,
      refresh_token: stored.refresh_token,
    });
    if (!error && data?.session?.access_token) {
      saveAdminTokens({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token || stored.refresh_token,
      });
      return data.session.access_token;
    }
  } catch (_) {}
  return null;
}

/** Clear all admin session data on logout */
export async function clearAdminSession() {
  try { localStorage.removeItem('adminTokens'); } catch (_) {}
  try { localStorage.removeItem('adminActiveTab'); } catch (_) {}
  try { await adminSupabase.auth.signOut(); } catch (_) {}
}

/** Backwards-compatible session restoration */
export async function restoreAdminSession() {
  const token = await getAdminAccessToken();
  return Boolean(token);
}
