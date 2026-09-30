import type { IconName } from './icons';

export const serviceSlugs = ['weby', 'seo', 'e-shopy', 'design', 'aplikace'] as const;
export type ServiceSlug = (typeof serviceSlugs)[number];

/**
 * Struktura služeb — ikony, pořadí, předvýběr ve formuláři. Veškeré texty
 * žijí v messages/{locale}.json pod klíčem services.items.<slug>.
 *
 * Obrazový materiál panelu (public/services/<slug>/) vzniká skriptem
 * scripts/extract-cards.py z původních reklamních karet:
 *   mascot.webp — maskot v póze dané karty, vyříznutý (rembg)
 *   bg.webp     — silně rozmazané, ztmavené pozadí místnosti (atmosféra)
 */
export type ServiceMeta = {
  num: string;
  icon: IconName;
  featureIcons: IconName[];
  /** index v contact.needs, který se předvybere ve formuláři */
  needIndex: number;
};

export const serviceMeta: Record<ServiceSlug, ServiceMeta> = {
  weby: {
    num: '01',
    icon: 'Monitor',
    featureIcons: ['Monitor', 'Zap', 'Users'],
    needIndex: 0,
  },
  seo: {
    num: '02',
    icon: 'TrendingUp',
    featureIcons: ['TrendingUp', 'Search', 'Target'],
    needIndex: 2,
  },
  'e-shopy': {
    num: '03',
    icon: 'ShoppingCart',
    featureIcons: ['ShoppingCart', 'Smartphone', 'ShieldCheck'],
    needIndex: 1,
  },
  design: {
    num: '04',
    icon: 'PenTool',
    featureIcons: ['PenTool', 'Smartphone', 'Rocket'],
    needIndex: 3,
  },
  aplikace: {
    num: '05',
    icon: 'Smartphone',
    featureIcons: ['Smartphone', 'AppWindow', 'Play'],
    needIndex: 4,
  },
};

export const services = serviceSlugs.map((slug) => ({ slug, ...serviceMeta[slug] }));
