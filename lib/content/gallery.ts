/**
 * Obory a galerie ukázek (skutečné weby studia podle oboru).
 *
 * Obory jsou jeden společný seznam: volby „Obor podnikání" ve formuláři
 * i kategorie galerie. Spravují se v administraci (Galerie ukázek → Obory),
 * ukládají se do content_blocks pod klíčem „industries"; dokud tam nic není,
 * platí výchozích osm oborů z messages (contact.niches).
 *
 * Obrázky galerie jsou v úložišti Supabase (bucket media, složka gallery/)
 * a jejich seznam v content_blocks pod klíčem „gallery".
 */
export const INDUSTRY_LOCALES = ['cs', 'en', 'ru', 'uk'] as const;
export type IndustryLocale = (typeof INDUSTRY_LOCALES)[number];

export type Industry = {
  /** stabilní id (slug) — ukládá se do poptávky a ke snímkům */
  id: string;
  /** název v jazycích webu; chybějící překlad = česky */
  names: Partial<Record<IndustryLocale, string>>;
  /** index ve výchozích contact.niches — kvůli reakcím maskota u původních oborů */
  legacy?: number;
};

/** „Jiný obor" — vždy poslední, nejde smazat, upřesnění je u něj nejdůležitější. */
export const OTHER_INDUSTRY = 'other';

/** Výchozí id osmi původních oborů (pořadí = contact.niches). */
export const DEFAULT_INDUSTRY_IDS = [
  'sluzby-remesla',
  'auto-moto',
  'zdravi-krasa',
  'gastro-ubytovani',
  'reality-stavebnictvi',
  'obchod-eshop',
  'vzdelavani-kurzy',
  OTHER_INDUSTRY,
] as const;

export function industryName(industry: Industry | undefined, locale: string) {
  if (!industry) return '';
  return industry.names[locale as IndustryLocale]?.trim() || industry.names.cs?.trim() || industry.id;
}

/** Typ projektu, ke kterému ukázka patří (druhý štítek vedle oboru). */
export const GALLERY_TYPES = ['web', 'eshop', 'logo', 'app'] as const;
export type GalleryType = (typeof GALLERY_TYPES)[number];
export const GALLERY_TYPE_LABEL: Record<GalleryType, string> = { web: 'Web', eshop: 'E-shop', logo: 'Logo a design', app: 'Aplikace' };

/**
 * Volby „Typ projektu" ve formuláři (indexy contact.needs) → typ ukázek.
 * SEO, projekt na míru a „nevím" vlastní ukázky nemají — berou se weby.
 */
const NEED_TO_TYPE: Record<number, GalleryType> = { 0: 'web', 1: 'eshop', 3: 'logo', 4: 'app' };
export function galleryTypesForNeeds(needs: number[]): GalleryType[] {
  const types = GALLERY_TYPES.filter((type) => needs.some((need) => NEED_TO_TYPE[need] === type));
  return types.length ? types : ['web'];
}

/**
 * Patří ukázka k dané kombinaci? Typ musí sedět přesně (weby se nikdy
 * nemíchají s e-shopy). Obor: ukázka bez oboru je obecná (loga, aplikace)
 * a sedí ke každému oboru.
 */
export function galleryMatches(item: Pick<GalleryItem, 'type' | 'industries'>, type: GalleryType, industry: string) {
  return item.type === type && (!item.industries.length || item.industries.includes(industry));
}

export type GalleryItem = {
  id: string;
  /** typ projektu: web / e-shop / logo / aplikace */
  type: GalleryType;
  /** krátké video (animovaný web) — přehraje se v náhledu; `url` je pak jeho statický snímek */
  video?: string;
  /** plný obrázek (náhled v lightboxu) */
  url: string;
  /** zmenšenina 16:10 pro mřížku ve formuláři a v e-mailu */
  thumb: string;
  width: number;
  height: number;
  /** obory, do kterých snímek patří (aspoň jeden) */
  industries: string[];
  /** popisek pro správce (např. název projektu) — návštěvník ho vidí v lightboxu */
  label: string;
  created_at: string;
  /** cesty v úložišti, které patří jen galerii (při smazání se odstraní) */
  owned: string[];
};

/** Co z galerie dostane návštěvník (bez interních údajů). */
export type PublicGalleryItem = Pick<GalleryItem, 'id' | 'type' | 'url' | 'thumb' | 'width' | 'height' | 'label' | 'video'>;

/** Kolik ukázek se ve formuláři ukazuje najednou. */
export const GALLERY_PAGE = 5;
/** Nejvýš vybraných ukázek v jedné poptávce. */
export const MAX_LIKES = 20;

export const slugifyIndustry = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'obor';

/** Obrázek z úložiště (https) nebo ze složky webu (/cases/… u původních projektů). */
export const isImageUrl = (url: string) => /^https:\/\//.test(url) || (/^\/[a-z0-9]/i.test(url) && !url.includes('..'));

/** Ošetření dat z databáze — cokoli nečekaného se zahodí. */
export function sanitizeIndustries(raw: unknown): Industry[] {
  const list = Array.isArray((raw as { items?: unknown })?.items) ? ((raw as { items: unknown[] }).items) : [];
  const out: Industry[] = [];
  const seen = new Set<string>();
  for (const entry of list) {
    const e = entry as Partial<Industry>;
    if (typeof e?.id !== 'string' || !/^[a-z0-9-]{1,40}$/.test(e.id) || seen.has(e.id)) continue;
    const names: Industry['names'] = {};
    for (const l of INDUSTRY_LOCALES) {
      const n = e.names?.[l];
      if (typeof n === 'string' && n.trim()) names[l] = n.trim().slice(0, 60);
    }
    if (!names.cs) continue;
    seen.add(e.id);
    out.push({ id: e.id, names, ...(typeof e.legacy === 'number' ? { legacy: e.legacy } : {}) });
  }
  return out;
}

export function sanitizeGallery(raw: unknown): GalleryItem[] {
  const list = Array.isArray((raw as { items?: unknown })?.items) ? ((raw as { items: unknown[] }).items) : [];
  return list
    .map((entry) => entry as Partial<GalleryItem>)
    .filter((e) => typeof e?.id === 'string' && typeof e.url === 'string' && isImageUrl(e.url))
    .map((e) => ({
      id: e.id!,
      type: GALLERY_TYPES.includes(e.type as GalleryType) ? (e.type as GalleryType) : 'web',
      ...(typeof e.video === 'string' && isImageUrl(e.video) ? { video: e.video } : {}),
      url: e.url!,
      thumb: typeof e.thumb === 'string' && e.thumb ? e.thumb : e.url!,
      width: Number(e.width) || 0,
      height: Number(e.height) || 0,
      industries: Array.isArray(e.industries) ? e.industries.filter((x): x is string => typeof x === 'string') : [],
      label: typeof e.label === 'string' ? e.label.slice(0, 80) : '',
      created_at: typeof e.created_at === 'string' ? e.created_at : '',
      owned: Array.isArray(e.owned) ? e.owned.filter((x): x is string => typeof x === 'string' && x.startsWith('gallery/')) : [],
    }));
}
