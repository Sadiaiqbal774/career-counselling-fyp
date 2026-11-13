import supabase from '../lib/supabase';

export { supabase };

export const universityService = {
  supabase,
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
