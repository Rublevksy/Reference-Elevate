import type { Metadata } from 'next';
import { site } from '@/content/site';
import { htmlLang, locales, type Locale } from '@/i18n/routing';

/** Open Graph chce jazyk i zemi (cs_CZ), ne samotný kód jazyka. */
const OG_LOCALE: Record<Locale, string> = { cs: 'cs_CZ', en: 'en_US', ru: 'ru_RU', uk: 'uk_UA' };

const isLocale = (value: string): value is Locale => (locales as readonly string[]).includes(value);

/** Obrázek karty při sdílení odkazu (1200 × 630): public/og/<jazyk>.jpg, vyrábí scripts/make-og-images.mjs. */
export const shareImage = (locale: string) => `/og/${isLocale(locale) ? locale : 'cs'}.jpg`;

/**
 * Kanonická adresa stránky + hreflang odkazy na tutéž stránku v ostatních
 * jazycích. `path` je cesta za jazykem ('' = úvodní stránka).
 */
export function languageLinks(locale: string, path = ''): NonNullable<Metadata['alternates']> {
  return {
    canonical: `${site.url}/${locale}${path}`,
    languages: {
      ...Object.fromEntries(locales.map((l) => [htmlLang[l], `${site.url}/${l}${path}`])),
      'x-default': `${site.url}/cs${path}`,
    },
  };
}

/**
 * Karta odkazu ve WhatsAppu, Telegramu, na Facebooku a X (Open Graph +
 * Twitter Card). Společný základ pro všechny stránky — stránka dodá titulek,
 * popis a svou adresu. Next značky slučuje po celých polích, takže stránka
 * s vlastním `openGraph` musí dostat kartu celou, jinak by zdědila adresu
 * a titulek úvodní stránky.
 */
export function shareCard({
  locale,
  path = '',
  title,
  description,
  imageAlt,
}: {
  locale: string;
  /** cesta za jazykem; null = stránka bez vlastní adresy (404) */
  path?: string | null;
  title: string;
  description: string;
  imageAlt: string;
}): Pick<Metadata, 'openGraph' | 'twitter'> {
  const image = { url: shareImage(locale), width: 1200, height: 630, alt: imageAlt, type: 'image/jpeg' };
  return {
    openGraph: {
      type: 'website',
      siteName: site.name,
      locale: OG_LOCALE[isLocale(locale) ? locale : 'cs'],
      alternateLocale: locales.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      ...(path === null ? {} : { url: `${site.url}/${locale}${path}` }),
      title,
      description,
      images: [image],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}
