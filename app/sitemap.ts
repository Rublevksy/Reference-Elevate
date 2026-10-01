import type { MetadataRoute } from 'next';
import { locales } from '@/i18n/routing';
import { site } from '@/content/site';

const alternates = (path: string) => ({
  languages: Object.fromEntries(locales.map((l) => [l, `${site.url}/${l}${path}`])),
});

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // stránka Ochrana osobních údajů má noindex, takže v mapě webu není
  return locales.flatMap((locale) => [
    {
      url: `${site.url}/${locale}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 1,
      alternates: alternates(''),
    },
  ]);
}
