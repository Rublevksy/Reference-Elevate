/**
 * Projekt v sekci „Práce" — jak ho používají komponenty (z databáze nebo
 * z výchozích dat, když databáze není dostupná).
 */
export type Project = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  url: string;
  accent: string;
  tags: string[];
  desktopImage: string;
  /** výška / šířka full-page screenshotu */
  desktopRatio: number;
  mobileImage: string;
  mobileRatio: number;
};

/** Řádek tabulky public.projects. */
export type ProjectRow = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  url: string;
  accent: string;
  tags: string[];
  desktop_image: string;
  desktop_width: number;
  desktop_height: number;
  mobile_image: string;
  mobile_width: number;
  mobile_height: number;
  sort: number;
  published: boolean;
};

export const projectFromRow = (row: ProjectRow): Project => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  kind: row.kind,
  url: row.url,
  accent: row.accent,
  tags: row.tags ?? [],
  desktopImage: row.desktop_image,
  desktopRatio: row.desktop_height / Math.max(1, row.desktop_width),
  mobileImage: row.mobile_image,
  mobileRatio: row.mobile_height / Math.max(1, row.mobile_width),
});

const TAGS = ['Web od nuly', 'Návrh', 'Vývoj'];

/** Výchozí projekty (stav před napojením databáze) — záloha, když Supabase neodpovídá. */
export const FALLBACK_PROJECTS: Project[] = [
  { id: 'euromotors', slug: 'euromotors', name: 'EURO-MOTORS', kind: 'Autoservis, Praha 10', url: 'https://www.euromotors.cz/', accent: '#b3222f', tags: TAGS, desktopImage: '/cases/euromotors/desktop.jpg', desktopRatio: 4892 / 1152, mobileImage: '/cases/euromotors/mobile.jpg', mobileRatio: 15276 / 585 },
  { id: 'inhome', slug: 'inhome', name: 'InHome Praha', kind: 'Úklidová firma, celá ČR', url: 'https://inhomepraha.cz/', accent: '#1470c8', tags: TAGS, desktopImage: '/cases/inhome/desktop.jpg', desktopRatio: 2426 / 1152, mobileImage: '/cases/inhome/mobile.jpg', mobileRatio: 6485 / 585 },
  { id: 'biodent', slug: 'biodent', name: 'BioDent', kind: 'Stomatologická klinika, Praha 2', url: 'https://biodentclinic.cz/', accent: '#0e6f8a', tags: TAGS, desktopImage: '/cases/biodent/desktop.jpg', desktopRatio: 9199 / 1152, mobileImage: '/cases/biodent/mobile.jpg', mobileRatio: 26027 / 585 },
];
