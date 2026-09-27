/**
 * Tři reálné projekty. Texty jsou v messages pod cases.items.<slug>,
 * tady zůstává jen to, co se nepřekládá.
 * Podklady (screenshot + video) vytváří `node scripts/capture-sites.mjs`.
 */
export type CaseItem = {
  slug: string;
  url: string;
  /** tlumený akcent z webu klienta — přebarvuje pozadí sekce */
  accent: string;
  /** výška full-page screenshotu v px (z content/capture-manifest.json) */
  desktopHeight: number;
  mobileHeight: number;
};

export const cases: CaseItem[] = [
  { slug: 'euromotors', url: 'https://www.euromotors.cz/', accent: '#b3222f', desktopHeight: 6115, mobileHeight: 10184 },
  { slug: 'inhome', url: 'https://inhomepraha.cz/', accent: '#1470c8', desktopHeight: 3033, mobileHeight: 4323 },
  { slug: 'biodent', url: 'https://biodentclinic.cz/', accent: '#0e6f8a', desktopHeight: 11499, mobileHeight: 18019 },
];

export const casePath = (slug: string, file: string) => `/cases/${slug}/${file}`;
