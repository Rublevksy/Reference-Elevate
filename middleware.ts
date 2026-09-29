import { NextResponse, type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { routing } from './i18n/routing';

const intl = createMiddleware(routing);

/** Obnovení přihlášení do administrace (Supabase ukládá session do cookies). */
async function adminSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export default async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname.startsWith('/admin')) return adminSession(request);
  // přihlašovací odkaz, který Supabase přesměroval na úvodní stránku (adresa
  // administrace není v povolených Redirect URLs) — dokončit přihlášení
  if (searchParams.has('code') && searchParams.size === 1) {
    const target = request.nextUrl.clone();
    target.pathname = '/admin/auth/callback';
    return NextResponse.redirect(target);
  }
  return intl(request);
}

export const config = {
  // vše kromě API, statických souborů a souborů s příponou
  matcher: ['/((?!api|_next|_vercel|assets|brand|demo|cases|models|.*\\..*).*)'],
};
