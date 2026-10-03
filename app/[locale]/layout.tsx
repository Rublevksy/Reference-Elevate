import type { Metadata, Viewport } from 'next';
import { Caveat, Manrope, Unbounded } from 'next/font/google';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import '../globals.css';
import { routing, locales, htmlLang, type Locale } from '@/i18n/routing';
import { site } from '@/content/site';
import { plans } from '@/content/pricing';
import { Backdrop } from '@/components/ui/Backdrop';
import { Cursor } from '@/components/ui/Cursor';
import { Preloader } from '@/components/ui/Preloader';
import { Navbar } from '@/components/sections/Navbar';
import { Footer } from '@/components/sections/Footer';
import { MascotGuide } from '@/components/mascot/MascotGuide';
import { SmoothScroll } from '@/lib/SmoothScroll';
import { Analytics } from '@/components/ui/Analytics';
import { ContentProvider } from '@/components/ContentProvider';
import { getIndustries, getProjects, getSettings, getSiteStatus } from '@/lib/content/server';
import { MaintenancePreview, MaintenanceScreen } from '@/components/ui/MaintenanceScreen';

/**
 * Jedna instance na rodinu. Dvě instance téže rodiny (latinka / cyrilice)
 * dostanou v CSS stejné jméno, jejich @font-face se přepíšou a prohlížeč pak
 * stahuje tytéž soubory dvakrát (přednačtený .p.woff2 i ten z pozdějšího
 * pravidla). `subsets` určuje jen to, co se přednačítá — ostatní rozsahy
 * (cyrilice u nadpisů) si prohlížeč stáhne sám podle unicode-range, až když
 * je na stránce potřebuje.
 */
const display = Unbounded({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-display',
  display: 'swap',
  weight: ['600', '700'],
  // nadpis úvodní obrazovky je největší prvek stránky (LCP) — písmo hned
  preload: true,
});

const sans = Manrope({ subsets: ['latin', 'latin-ext', 'cyrillic'], variable: '--font-sans', display: 'swap' });

const hand = Caveat({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-hand',
  display: 'swap',
  weight: ['600'],
  preload: false,
});


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
  // během údržby vyhledávače stránku neindexují (jinak by si uložily obrazovku údržby)
  const { maintenance } = await getSiteStatus();

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
    // produkce = index, follow; noindex jen při údržbě a na preview nasazeních Vercelu
    robots: maintenance || process.env.VERCEL_ENV === 'preview' ? { index: false, follow: false } : { index: true, follow: true },
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

  const [projects, settings, status, industries] = await Promise.all([getProjects(), getSettings(), getSiteStatus(), getIndustries()]);
  // Schema.org pro Google: firma (služby s cenami „od" z Ceníku) + web.
  // Adresa jen město z administrace — bez vymyšleného PSČ či ulice.
  const [tMeta, tPricing] = await Promise.all([
    getTranslations({ locale, namespace: 'meta' }),
    getTranslations({ locale, namespace: 'pricing' }),
  ]);
  const price = (v: string) => Number(v.replace(/[^\d]/g, '')) || undefined;
  const businessId = `${site.url}/#business`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfessionalService',
        '@id': businessId,
        name: site.name,
        description: tMeta('home.description'),
        url: `${site.url}/${locale}`,
        logo: `${site.url}/brand/icon-512.png`,
        image: `${site.url}/${locale}/opengraph-image`,
        email: settings.contactEmail,
        ...(site.phone ? { telephone: site.phone } : {}),
        address: {
          '@type': 'PostalAddress',
          addressLocality: settings.city,
          addressRegion: 'Hlavní město Praha',
          addressCountry: site.address.country,
        },
        areaServed: [
          { '@type': 'City', name: 'Praha' },
          { '@type': 'Country', name: 'Česko' },
        ],
        knowsLanguage: ['cs', 'en', 'ru', 'uk'],
        priceRange: '2 000–15 000+ Kč',
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: tPricing('title'),
          itemListElement: plans.map((plan) => ({
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: tPricing(`plans.${plan.id}.name`),
              description: tPricing(`plans.${plan.id}.tagline`),
              areaServed: { '@type': 'City', name: 'Praha' },
            },
            priceSpecification: {
              '@type': 'PriceSpecification',
              minPrice: price(tPricing(`plans.${plan.id}.price`)),
              priceCurrency: 'CZK',
            },
          })),
        },
        sameAs: settings.social.filter((s) => s.kind === 'social').map((s) => s.href),
      },
      {
        '@type': 'WebSite',
        '@id': `${site.url}/#website`,
        url: site.url,
        name: site.name,
        inLanguage: htmlLang[locale as Locale],
        publisher: { '@id': businessId },
      },
    ],
  };

  return (
    <html lang={htmlLang[locale as Locale]} className={`${display.variable} ${sans.variable} ${hand.variable}`} suppressHydrationWarning>
      <body className="relative min-h-dvh antialiased" suppressHydrationWarning>
        {/* úvodní clona jen poprvé v session — při dalším načtení skrýt ještě před vykreslením */}
        <script dangerouslySetInnerHTML={{ __html: "try{if(sessionStorage.getItem('elevate:preloader')==='1')document.documentElement.classList.add('pl-seen')}catch(e){}" }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <a
          href="#obsah"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[300] focus:rounded-btn focus:bg-[var(--blue)] focus:px-4 focus:py-2 focus:text-white"
        >
          {t('skip')}
        </a>
        {status.maintenance ? (
          // režim údržby (administrace): místo webu jen obrazovka „Technické práce"
          <MaintenanceScreen email={settings.contactEmail} />
        ) : (
          <NextIntlClientProvider>
            <ContentProvider value={{ projects, contactEmail: settings.contactEmail, city: settings.city, social: settings.social, industries }}>
            <Preloader />
            <MaintenancePreview email={settings.contactEmail} />
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
        )}
        <Analytics />
      </body>
    </html>
  );
}
