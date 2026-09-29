import type { ServiceSlug } from './services';

/**
 * Ceník podle služeb — pořadí a čísla jako všude na webu (01 Weby … 05 Aplikace).
 * Název, cena, obsah balíčku, co se platí zvlášť a termín jsou v messages
 * pod pricing.plans.<id>.
 */
export type Plan = {
  id: 'web' | 'seo' | 'eshop' | 'design' | 'app';
  /** služba, ze které se bere číslo a ikona */
  slug: ServiceSlug;
  /** index v contact.needs pro předvýběr ve formuláři */
  needIndex: number;
};

export const plans: Plan[] = [
  { id: 'web', slug: 'weby', needIndex: 0 },
  { id: 'seo', slug: 'seo', needIndex: 2 },
  { id: 'eshop', slug: 'e-shopy', needIndex: 1 },
  { id: 'design', slug: 'design', needIndex: 3 },
  { id: 'app', slug: 'aplikace', needIndex: 4 },
];
