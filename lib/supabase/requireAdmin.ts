import 'server-only';
import { isAdminEmail } from './env';
import { supabaseServer } from './server';

/** Přihlášený administrátor, nebo null. Ověřuje token u Supabase (ne jen cookie). */
export async function currentAdmin() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? null;
  return isAdminEmail(email) ? { email: email as string } : null;
}

export async function requireAdmin() {
  const admin = await currentAdmin();
  if (!admin) throw new Error('Nepřihlášeno.');
  return admin;
}
