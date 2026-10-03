import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// The app supports local backend authentication when Supabase is not configured.
// Keep the client constructible so importing auth-related components cannot blank the app.
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;