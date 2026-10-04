import type { MetadataRoute } from 'next';
import { htmlLang, locales } from '@/i18n/routing';
import { site } from '@/content/site';
import { getProjects } from '@/lib/content/server';
import { shareImage } from '@/lib/seo';

/** hreflang odkazy stejné jako ve značkách stránek (včetně x-default). */
const alternates = (path: string) => ({
  languages: {
    ...Object.fromEntries(locales.map((l) => [htmlLang[l], `${site.url}/${l}${path}`])),
    'x-default': `${site.url}/cs${path}`,
  },
});

const absolute = (url: string) => (url.startsWith('/') ? `${site.url}${url}` : url);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  // obrázky pro vyhledávání obrázků: karta webu + snímky hotových projektů
  let work: string[] = [];
  try {
    work = (await getProjects()).map((project) => absolute(project.desktopImage)).filter(Boolean);
  } catch {
    /* databáze nedostupná → mapa webu bez snímků projektů */
  }

  // Jen stránky určené do vyhledávání: úvodní stránka v každém jazyce.
  // Ochrana osobních údajů má noindex, administrace a API jsou zakázané v robots.txt.
  return locales.map((locale) => ({
    url: `${site.url}/${locale}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: locale === 'cs' ? 1 : 0.8,
    alternates: alternates(''),
    images: [`${site.url}${shareImage(locale)}`, ...work],
  }));
}
