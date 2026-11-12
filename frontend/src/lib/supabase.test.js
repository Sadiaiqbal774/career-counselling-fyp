import { getSupabaseConfigError } from './supabase';

test('reports missing Supabase configuration instead of using a placeholder project', () => {
  expect(getSupabaseConfigError('', '')).toMatch(/Supabase is not configured/);
});

test('rejects an invalid Supabase URL', () => {
  expect(getSupabaseConfigError('not-a-url', 'public-key')).toMatch(/valid Supabase URL/);
});
