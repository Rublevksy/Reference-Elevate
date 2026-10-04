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
import { languageLinks, shareCard, shareImage } from '@/lib/seo';

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

/**
 * Jen čtyři jazykové verze. Cokoli jiného na místě jazyka (/soubor.png,
 * /wp-login.php — adresy s tečkou obcházejí middleware) dostane rovnou 404
 * a stránka se pro ně vůbec nesestavuje. Bez toho se taková adresa
 * generovala jako statická stránka, značky stránky 404 si při tom řekly
 * o hlavičky požadavku a server odpověděl chybou 500.
 */
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: requested } = await params;
  // Neplatný „jazyk" v adrese (např. /soubor.png, /wp-login.php) končí stránkou 404 — ta se popíše
  // výchozím jazykem. Jazyk se tu nastaví dřív, než si o něj řeknou značky stránky 404: jinak by
  // ho next-intl hledal v hlavičkách požadavku, což staticky generovaná cesta nesmí (chyba 500).
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'meta' });
  // během údržby vyhledávače stránku neindexují (jinak by si uložily obrazovku údržby)
  const { maintenance } = await getSiteStatus();

  return {
    metadataBase: new URL(site.url),
    title: { default: t('home.title'), template: '%s | ELEVATE' },
    description: t('home.description'),
    keywords: t.raw('keywords') as string[],
    applicationName: site.name,
    authors: [{ name: site.name, url: site.url }],
    creator: site.name,
    publisher: site.name,
    // kanonická adresa + hreflang; karta pro sdílení (lib/seo.ts)
    alternates: languageLinks(locale),
    ...shareCard({ locale, title: t('ogTitle'), description: t('home.description'), imageAlt: t('ogImageAlt') }),
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
  if (!hasLocale(routing.locales, locale)) {
    // stránka 404 se vykreslí ve výchozím jazyce (bez čtení hlaviček, viz generateMetadata)
    setRequestLocale(routing.defaultLocale);
    notFound();
  }
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'a11y' });

  const [projects, settings, status, industries] = await Promise.all([getProjects(), getSettings(), getSiteStatus(), getIndustries()]);
  // Schema.org pro Google: firma (služby s cenami „od" z Ceníku) + web.
  // Jen skutečné údaje: adresa je město z administrace (bez vymyšlené ulice a PSČ),
  // telefon, sociální sítě a IČO se přidají samy, jakmile je v administraci vyplníte.
  // Hodnocení (hvězdičky) tu záměrně není — smí se uvádět jen se skutečnými recenzemi.
  const [tMeta, tPricing, tHero] = await Promise.all([
    getTranslations({ locale, namespace: 'meta' }),
    getTranslations({ locale, namespace: 'pricing' }),
    getTranslations({ locale, namespace: 'hero' }),
  ]);
  const price = (v: string) => Number(v.replace(/[^\d]/g, '')) || undefined;
  const prices = plans.map((plan) => price(tPricing(`plans.${plan.id}.price`))).filter((v): v is number => Boolean(v));
  const czk = (v: number) => new Intl.NumberFormat('cs-CZ').format(v).replace(/\u00a0/g, ' ');
  const businessId = `${site.url}/#business`;
  const profiles = settings.social.filter((s) => s.kind === 'social').map((s) => s.href);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        // ProfessionalService je podtyp LocalBusiness (místní firma poskytující odborné služby)
        '@type': 'ProfessionalService',
        '@id': businessId,
        name: site.name,
        // právní název a IČO až po vyplnění v administraci (výchozí název je jen zástupný)
        ...(settings.ico ? { legalName: settings.legalName, identifier: { '@type': 'PropertyValue', propertyID: 'IČO', value: settings.ico } } : {}),
        slogan: `${(tHero.raw('tagline') as string[]).join(' ')} ${tHero('taglineAccent')}`,
        description: tMeta('home.description'),
        url: `${site.url}/${locale}`,
        logo: `${site.url}/brand/icon-512.png`,
        image: `${site.url}${shareImage(locale)}`,
        email: settings.contactEmail,
        ...(site.phone ? { telephone: site.phone } : {}),
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer service',
          email: settings.contactEmail,
          ...(site.phone ? { telephone: site.phone } : {}),
          availableLanguage: ['Czech', 'English', 'Russian', 'Ukrainian'],
          areaServed: 'CZ',
        },
        address: {
          '@type': 'PostalAddress',
          addressLocality: settings.city,
          addressRegion: 'Hlavní město Praha',
          ...(site.address.postalCode ? { postalCode: site.address.postalCode } : {}),
          addressCountry: site.address.country,
        },
        areaServed: [
          { '@type': 'City', name: 'Praha' },
          { '@type': 'Country', name: 'Česko' },
        ],
        knowsLanguage: ['cs', 'en', 'ru', 'uk'],
        ...(prices.length ? { priceRange: `${czk(Math.min(...prices))}–${czk(Math.max(...prices))}+ Kč` } : {}),
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: tPricing('title'),
          itemListElement: plans.map((plan) => ({
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: tPricing(`plans.${plan.id}.name`),
              description: tPricing(`plans.${plan.id}.tagline`),
              provider: { '@id': businessId },
              areaServed: { '@type': 'City', name: 'Praha' },
            },
            priceSpecification: {
              '@type': 'PriceSpecification',
              minPrice: price(tPricing(`plans.${plan.id}.price`)),
              priceCurrency: 'CZK',
            },
          })),
        },
        ...(profiles.length ? { sameAs: profiles } : {}),
      },
      {
        '@type': 'WebSite',
        '@id': `${site.url}/#website`,
        url: site.url,
        name: site.name,
        description: tMeta('home.description'),
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
