import type { IconName } from './icons';

export type MockupKind = 'web' | 'seo' | 'shop' | 'design' | 'app';

export const serviceSlugs = ['weby', 'seo', 'e-shopy', 'design', 'aplikace'] as const;
export type ServiceSlug = (typeof serviceSlugs)[number];

/**
 * Struktura služeb — ikony, mockupy, pořadí, scéna panelu. Veškeré texty
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
  mockup: MockupKind;
  featureIcons: IconName[];
  /** index v contact.needs, který se předvybere ve formuláři */
  needIndex: number;
  /** pozice a měřítko vyříznutého maskota v panelu (v % plochy scény) */
  mascot: { width: number; bottom: number; left?: number; right?: number };
  /** pozice miniaturního "oživlého" UI mockupu vůči scéně */
  widget: { width: number; top?: number; bottom?: number; left?: number; right?: number; rotate?: number };
};

export const serviceMeta: Record<ServiceSlug, ServiceMeta> = {
  weby: {
    num: '01',
    icon: 'Monitor',
    mockup: 'web',
    featureIcons: ['Monitor', 'Zap', 'Users'],
    needIndex: 0,
    mascot: { width: 62, bottom: -4, right: 2 },
    widget: { width: 46, bottom: 2, left: 0, rotate: -2 },
  },
  seo: {
    num: '02',
    icon: 'TrendingUp',
    mockup: 'seo',
    featureIcons: ['TrendingUp', 'Search', 'Target'],
    needIndex: 2,
    mascot: { width: 54, bottom: -6, right: 0 },
    widget: { width: 48, top: 2, left: 0, rotate: 1.5 },
  },
  'e-shopy': {
    num: '03',
    icon: 'ShoppingCart',
    mockup: 'shop',
    featureIcons: ['ShoppingCart', 'Smartphone', 'ShieldCheck'],
    needIndex: 1,
    mascot: { width: 58, bottom: -4, left: 2 },
    widget: { width: 50, bottom: -2, right: -2, rotate: 2 },
  },
  design: {
    num: '04',
    icon: 'PenTool',
    mockup: 'design',
    featureIcons: ['PenTool', 'Smartphone', 'Rocket'],
    needIndex: 3,
    mascot: { width: 56, bottom: -4, right: 4 },
    widget: { width: 48, top: 4, left: -2, rotate: -1.5 },
  },
  aplikace: {
    num: '05',
    icon: 'Smartphone',
    mockup: 'app',
    featureIcons: ['Smartphone', 'AppWindow', 'Play'],
    needIndex: 4,
    mascot: { width: 60, bottom: -6, left: 6 },
    widget: { width: 30, top: 6, right: 2, rotate: 3 },
  },
};

export const services = serviceSlugs.map((slug) => ({ slug, ...serviceMeta[slug] }));
export const getServiceMeta = (slug: string) =>
  serviceSlugs.includes(slug as ServiceSlug) ? serviceMeta[slug as ServiceSlug] : undefined;
