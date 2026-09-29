import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';
import { getBlock } from '@/lib/content/server';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const messages = (await import(`../messages/${locale}.json`)).default;
  // texty Ceníku jsou pro češtinu v databázi (administrace); ostatní jazyky ze souborů
  if (locale === 'cs') {
    const pricing = await getBlock('pricing_cs');
    if (pricing) messages.pricing = { ...messages.pricing, ...pricing };
  }

  return { locale, messages };
});
