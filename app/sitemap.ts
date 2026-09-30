import type { MetadataRoute } from 'next';
import { locales } from '@/i18n/routing';
import { site } from '@/content/site';

const alternates = (path: string) => ({
  languages: Object.fromEntries(locales.map((l) => [l, `${site.url}/${l}${path}`])),
});

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return locales.flatMap((locale) => [
    {
      url: `${site.url}/${locale}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 1,
      alternates: alternates(''),
    },
    {
      url: `${site.url}/${locale}/ochrana-osobnich-udaju`,
      lastModified: now,
      changeFrequency: 'yearly' as const,
      priority: 0.2,
      alternates: alternates('/ochrana-osobnich-udaju'),
    },
  ]);
}
