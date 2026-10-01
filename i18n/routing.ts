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

/**
 * Bez automatické detekce jazyka: návštěvník bez vlastní volby vždy dostane
 * češtinu, ať má prohlížeč nastavený jakkoli (dřív se podle Accept-Language
 * otevírala ruština). Jiný jazyk jen po výslovné volbě v přepínači — ta se
 * pamatuje v cookie LOCALE_COOKIE (viz middleware a LocaleSwitcher).
 */
export const LOCALE_COOKIE = 'elevate-locale';

export const routing = defineRouting({
  locales,
  defaultLocale: 'cs',
  localePrefix: 'always',
  localeDetection: false,
  localeCookie: false,
  // hreflang je v HTML (layout); hlavička Link od next-intl brala doménu z požadavku
  // (www i bez www) a Googlu by dávala jiné adresy než kanonické
  alternateLinks: false,
});
