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

const supabase = createClient(
  supabaseUrl || 'https://invalid.supabase.local',
  supabaseAnonKey || 'invalid-anon-key',
);

export default supabase;