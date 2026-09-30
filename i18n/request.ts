import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';
import { getBlock } from '@/lib/content/server';
import { applyTextOverrides } from '@/lib/content/editable';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const messages = (await import(`../messages/${locale}.json`)).default;
  // texty Ceníku jsou pro češtinu v databázi (administrace); ostatní jazyky ze souborů
  if (locale === 'cs') {
    const [pricing, texts] = await Promise.all([getBlock('pricing_cs'), getBlock('messages_cs')]);
    const merged = applyTextOverrides(messages, texts);
    if (pricing) merged.pricing = { ...merged.pricing, ...pricing };
    return { locale, messages: merged };
  }

  return { locale, messages };
});
