import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const universityService = {
  // Universities
  getAll: () => supabase.from('universities').select('*').order('name'),
  getById: (id) =>
    supabase
      .from('universities')
      .select('*, programs(*)')
      .eq('id', id)
      .single(),
  // Programs (nested under a university)
  createProgram: (universityId, payload) =>
    supabase.from('programs').insert({ university_id: universityId, ...payload }).select(),
  updateProgram: (programId, payload) =>
    supabase.from('programs').update(payload).eq('id', programId).select(),
  deleteProgram: (programId) => supabase.from('programs').delete().eq('id', programId),
};
