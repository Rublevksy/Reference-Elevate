import { defineRouting } from 'next-intl/routing';

export const locales = ['cs', 'en', 'ru', 'uk'] as const;
export type Locale = (typeof locales)[number];

/** Jazyk → jak se jmenuje sám u sebe (bez vlajek, jazyk ≠ země) */
export const localeNames: Record<Locale, { code: string; name: string }> = {
  cs: { code: 'CZ', name: 'Čeština' },
  en: { code: 'EN', name: 'English' },
  ru: { code: 'RU', name: 'Русский' },
  uk: { code: 'UA', name: 'Українська' },
};

/** Kód pro atribut lang / hreflang */
export const htmlLang: Record<Locale, string> = {
  cs: 'cs',
  en: 'en',
  ru: 'ru',
  uk: 'uk',
};

export const routing = defineRouting({
  locales,
  defaultLocale: 'cs',
  localePrefix: 'always',
});
