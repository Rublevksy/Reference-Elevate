import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/** Dokončení přihlášení z e-mailového odkazu (PKCE kód → session v cookies). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL('/admin', url.origin));
  }
  return NextResponse.redirect(new URL('/admin/login?error=1', url.origin));
}
