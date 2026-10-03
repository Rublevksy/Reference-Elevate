/**
 * Central place for everything the studio needs to swap before launch.
 * Anything marked PLACEHOLDER is safe to edit without touching components.
 */
export const site = {
  name: 'ELEVATE',
  legalName: 'ELEVATE — digitální studio', // PLACEHOLDER: doplnit právní název / IČO
  tagline: 'Digitální studio z Prahy',
  description:
    'Tvoříme moderní weby, e-shopy a aplikace, které spojují design, výkon a výsledky. Animované weby na míru z Prahy.',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.elevateit.cz').replace(/\/$/, ''),
  locale: 'cs_CZ',
  city: 'Praha',
  email: 'elevateitcz@gmail.com',
  /** telefon zatím nezveřejňujeme — prázdná hodnota ho skryje všude na webu */
  phone: '' as string,
  phoneHref: '' as string,
  address: {
    street: 'Praha', // PLACEHOLDER
    city: 'Praha',
    postalCode: '' as string, // PLACEHOLDER: skutečné PSČ sídla (prázdné = v textech se neuvádí)
    country: 'CZ',
  },
  ico: '', // PLACEHOLDER
  /**
   * Sociální sítě a messengery se zadávají v administraci (Kontakt a firma),
   * dokud tam nic není, web žádné neukazuje — žádné zástupné odkazy „do nikam".
   */
  social: [] as { label: string; value: string }[],
  /**
   * The rigged mascot.glb is optional. Drop it into /public/models/mascot.glb
   * and flip this to true — every <Mascot /> instance upgrades itself,
   * the 2D sprite stays as the low-end / reduced-motion fallback.
   */
  mascot3d: false,
} as const;

export const nav = [
  { label: 'Služby', href: '/#sluzby' },
  { label: 'Proces', href: '/#proces' },
  { label: 'Proč animace', href: '/#proc-animace' },
  { label: 'Reference', href: '/#reference' },
  { label: 'Kontakt', href: '/#kontakt' },
] as const;
