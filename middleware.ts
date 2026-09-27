import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // vše kromě API, statických souborů a souborů s příponou
  matcher: ['/((?!api|_next|_vercel|assets|brand|demo|cases|models|.*\\..*).*)'],
};
