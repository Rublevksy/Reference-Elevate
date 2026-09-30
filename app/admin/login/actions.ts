'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { isAdminEmail } from '@/lib/supabase/env';
import { supabaseServer } from '@/lib/supabase/server';

export type LoginState = { status: 'idle' | 'sent' | 'error'; message?: string };

/** Přihlášení e-mailem a heslem (Supabase Auth). */
export async function loginWithPassword(_: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  if (!email.includes('@') || !password) return { status: 'error', message: 'Vyplňte e-mail i heslo.' };
  // neoprávněný e-mail dostane stejnou odpověď jako špatné heslo
  if (!isAdminEmail(email)) return { status: 'error', message: 'Nesprávný e-mail nebo heslo.' };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      status: 'error',
      message: /confirm/i.test(error.message)
        ? 'E-mail ještě není potvrzený — přihlaste se jednou odkazem z e-mailu.'
        : 'Nesprávný e-mail nebo heslo. Heslo si nastavíte po přihlášení odkazem (Účet → Heslo).',
    };
  }
  redirect('/admin');
}

/**
 * Náhradní přihlášení odkazem na e-mail (první přihlášení, zapomenuté heslo).
 * Neprozrazuje, jestli je e-mail oprávněný.
 */
export async function sendMagicLink(_: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  if (!email.includes('@')) return { status: 'error', message: 'Zadejte e-mail.' };
  if (isAdminEmail(email)) {
    const h = await headers();
    const host = h.get('x-forwarded-host') ?? h.get('host');
    const proto = h.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https');
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${proto}://${host}/admin/auth/callback`, shouldCreateUser: true },
    });
    if (error) return { status: 'error', message: `Odkaz se nepodařilo odeslat: ${error.message}` };
  }
  return { status: 'sent' };
}
