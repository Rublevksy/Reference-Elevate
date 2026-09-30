import type { Metadata, Viewport } from 'next';
import { Caveat, Manrope, Unbounded } from 'next/font/google';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import '../globals.css';
import { routing, locales, htmlLang, type Locale } from '@/i18n/routing';
import { site } from '@/content/site';
import { Backdrop } from '@/components/ui/Backdrop';
import { Cursor } from '@/components/ui/Cursor';
import { Preloader } from '@/components/ui/Preloader';
import { Navbar } from '@/components/sections/Navbar';
import { Footer } from '@/components/sections/Footer';
import { MascotGuide } from '@/components/mascot/MascotGuide';
import { SmoothScroll } from '@/lib/SmoothScroll';
import { Analytics } from '@/components/ui/Analytics';
import { ContentProvider } from '@/components/ContentProvider';
import { getProjects, getSettings } from '@/lib/content/server';

/**
 * Cyrilici tahá jen ru/uk — pro cs/en by to byla čtvrt megabajtu navíc.
 * Rukopisné Caveat se používá až v jedné sekci, proto bez preloadu.
 */
const displayLatin = Unbounded({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-display',
  display: 'swap',
  weight: ['600', '700'],
  preload: false,
});

const displayCyrillic = Unbounded({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  variable: '--font-display',
  display: 'swap',
  weight: ['600', '700'],
  preload: false,
});

const sansLatin = Manrope({ subsets: ['latin', 'latin-ext'], variable: '--font-sans', display: 'swap' });
const sansCyrillic = Manrope({ subsets: ['latin', 'latin-ext', 'cyrillic'], variable: '--font-sans', display: 'swap' });

const hand = Caveat({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-hand',
  display: 'swap',
  weight: ['600'],
  preload: false,
});

const CYRILLIC = new Set(['ru', 'uk']);

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });

  const languages = Object.fromEntries(
    locales.map((l) => [htmlLang[l], `${site.url}/${l}`]),
  );

  return {
    metadataBase: new URL(site.url),
    title: { default: t('home.title'), template: '%s | ELEVATE' },
    description: t('home.description'),
    keywords: t.raw('keywords') as string[],
    alternates: {
      canonical: `/${locale}`,
      languages: { ...languages, 'x-default': `${site.url}/cs` },
    },
    openGraph: {
      type: 'website',
      locale,
      url: `${site.url}/${locale}`,
      siteName: site.name,
      title: t('ogTitle'),
      description: t('home.description'),
      images: [{ url: `/${locale}/opengraph-image`, width: 1200, height: 630, alt: site.name }],
    },
    twitter: { card: 'summary_large_image', title: t('ogTitle'), description: t('home.description') },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: '#04060B',
  colorScheme: 'dark',
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'a11y' });

  const [projects, settings] = await Promise.all([getProjects(), getSettings()]);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: site.name,
    url: `${site.url}/${locale}`,
    email: settings.contactEmail,
    ...(site.phone ? { telephone: site.phone } : {}),
    areaServed: 'CZ',
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      addressLocality: site.address.city,
      postalCode: site.address.postalCode,
      addressCountry: site.address.country,
    },
    sameAs: site.social.map((s) => s.href),
  };

  const cyrillic = CYRILLIC.has(locale);
  const display = cyrillic ? displayCyrillic : displayLatin;
  const sans = cyrillic ? sansCyrillic : sansLatin;

  return (
    <html lang={htmlLang[locale as Locale]} className={`${display.variable} ${sans.variable} ${hand.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh antialiased" suppressHydrationWarning>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <a
          href="#obsah"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[300] focus:rounded-btn focus:bg-[var(--blue)] focus:px-4 focus:py-2 focus:text-white"
        >
          {t('skip')}
        </a>
        <NextIntlClientProvider>
          <ContentProvider value={{ projects, contactEmail: settings.contactEmail }}>
          <Preloader />
          <Backdrop />
          <Cursor />
          <SmoothScroll>
            <Navbar />
            <main id="obsah">{children}</main>
            <Footer />
            <MascotGuide />
          </SmoothScroll>
          </ContentProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
