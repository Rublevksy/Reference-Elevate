import { NextResponse, type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { LOCALE_COOKIE, locales, routing } from './i18n/routing';
import { serviceSlugs } from './content/services';

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
  // Dřívější podstránky služeb (/cs/sluzby/weby…) už neexistují — služby žijí
  // na úvodní stránce. Staré odkazy a záznamy ve vyhledávačích přesměrovat
  // přímo na panel dané služby.
  const legacy = pathname.match(/^\/(?:(cs|en|ru|uk)\/)?sluzby(?:\/([a-z-]+))?\/?$/);
  if (legacy) {
    const [, locale = routing.defaultLocale, slug] = legacy;
    const target = request.nextUrl.clone();
    target.pathname = `/${locale}`;
    target.search = '';
    target.hash = slug && (serviceSlugs as readonly string[]).includes(slug) ? `sluzba-${slug}` : 'sluzby';
    return NextResponse.redirect(target, 308);
  }
  // úvodní adresa bez jazyka: čeština, pokud si návštěvník dřív sám nevybral jiný jazyk
  if (pathname === '/') {
    const chosen = request.cookies.get(LOCALE_COOKIE)?.value;
    const locale = chosen && (locales as readonly string[]).includes(chosen) ? chosen : routing.defaultLocale;
    const target = request.nextUrl.clone();
    target.pathname = `/${locale}`;
    return NextResponse.redirect(target, 307);
  }
  return intl(request);
}

export const config = {
  // vše kromě API, statických souborů a souborů s příponou
  matcher: ['/((?!api|_next|_vercel|assets|brand|demo|cases|models|.*\\..*).*)'],
};
