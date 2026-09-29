'use server';

import { headers } from 'next/headers';
import { isAdminEmail } from '@/lib/supabase/env';
import { supabaseServer } from '@/lib/supabase/server';

export type LoginState = { status: 'idle' | 'sent' | 'error'; message?: string };

/**
 * Pošle přihlašovací odkaz. Neprozrazuje, jestli je e-mail oprávněný —
 * odkaz ale odejde jen na adresy ze seznamu ADMIN_EMAILS.
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
