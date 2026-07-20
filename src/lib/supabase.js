import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  if (supabaseAnonKey.startsWith('sb_secret_')) {
    console.error('CRITICAL SECURITY WARNING: You are using a Supabase Secret Key (sb_secret_...) in frontend client code! Secret keys must never be used in browser applications. Please use your Supabase anon/public key instead.');
    return false;
  }

  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl.includes('your-supabase-project-id') &&
    !supabaseAnonKey.includes('your-supabase-anon-key')
  );
};

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
