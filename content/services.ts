import type { IconName } from './icons';

export type MockupKind = 'web' | 'seo' | 'shop' | 'design' | 'app';

export const serviceSlugs = ['weby', 'seo', 'e-shopy', 'design', 'aplikace'] as const;
export type ServiceSlug = (typeof serviceSlugs)[number];

/**
 * Struktura služeb — ikony, mockupy, pořadí. Veškeré texty žijí
 * v messages/{locale}.json pod klíčem services.items.<slug>.
 */
export type ServiceMeta = {
  num: string;
  icon: IconName;
  mockup: MockupKind;
  featureIcons: IconName[];
  /** index v contact.needs, který se předvybere ve formuláři */
  needIndex: number;
};

export const serviceMeta: Record<ServiceSlug, ServiceMeta> = {
  weby: { num: '01', icon: 'Monitor', mockup: 'web', featureIcons: ['Monitor', 'Zap', 'Users'], needIndex: 0 },
  seo: { num: '02', icon: 'TrendingUp', mockup: 'seo', featureIcons: ['TrendingUp', 'Search', 'Target'], needIndex: 2 },
  'e-shopy': { num: '03', icon: 'ShoppingCart', mockup: 'shop', featureIcons: ['ShoppingCart', 'Smartphone', 'ShieldCheck'], needIndex: 1 },
  design: { num: '04', icon: 'PenTool', mockup: 'design', featureIcons: ['PenTool', 'Smartphone', 'Rocket'], needIndex: 3 },
  aplikace: { num: '05', icon: 'Smartphone', mockup: 'app', featureIcons: ['Smartphone', 'AppWindow', 'Play', 'Rocket'], needIndex: 4 },
};

export const services = serviceSlugs.map((slug) => ({ slug, ...serviceMeta[slug] }));
export const getServiceMeta = (slug: string) =>
  serviceSlugs.includes(slug as ServiceSlug) ? serviceMeta[slug as ServiceSlug] : undefined;
