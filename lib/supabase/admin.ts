import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from './env';

/**
 * Klient se service role klíčem — obchází RLS, proto jen na serveru a jen
 * po ověření administrátora (viz app/admin/actions.ts).
 */
export function supabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) throw new Error('Supabase není nastavený (SUPABASE_SERVICE_ROLE_KEY).');
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
