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
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.elevate-studio.cz',
  locale: 'cs_CZ',
  city: 'Praha',
  email: 'info@elevate-studio.cz', // PLACEHOLDER
  phone: '+420 777 123 456', // PLACEHOLDER
  phoneHref: '+420777123456', // PLACEHOLDER
  address: {
    street: 'Praha', // PLACEHOLDER
    city: 'Praha',
    postalCode: '110 00', // PLACEHOLDER
    country: 'CZ',
  },
  ico: '', // PLACEHOLDER
  social: [
    { label: 'Instagram', href: 'https://instagram.com/' }, // PLACEHOLDER
    { label: 'LinkedIn', href: 'https://linkedin.com/' }, // PLACEHOLDER
    { label: 'Behance', href: 'https://behance.net/' }, // PLACEHOLDER
  ],
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
