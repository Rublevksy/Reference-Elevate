import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { htmlLang, locales, type Locale } from '@/i18n/routing';
import { site } from '@/content/site';
import { getSettings } from '@/lib/content/server';
import { languageLinks, shareCard } from '@/lib/seo';

type Params = { params: Promise<{ locale: string }> };

/** Datum poslední úpravy textu (při změně textů v messages/*.json přepsat). */
const UPDATED = '2026-10-03';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

const PATH = '/ochrana-osobnich-udaju';

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const [t, tMeta] = await Promise.all([getTranslations({ locale, namespace: 'privacy' }), getTranslations({ locale, namespace: 'meta' })]);
  return {
    title: t('title'),
    description: t('metaDescription'),
    alternates: languageLinks(locale, PATH),
    ...shareCard({ locale, path: PATH, title: `${t('title')} | ${site.name}`, description: t('metaDescription'), imageAlt: tMeta('ogImageAlt') }),
    // právní text nemá ve vyhledávání co nabídnout — neindexuje se (a není ani v mapě webu)
    robots: { index: false, follow: true },
  };
}

export default async function PrivacyPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'privacy' });

  const sections = t.raw('sections') as { title: string; body: string }[];
  const settings = await getSettings();
  const company = settings.ico ? `${settings.legalName}, IČO ${settings.ico}` : settings.legalName;
  const fill = (body: string) =>
    body
      .replace('{company}', company)
      .replace('{city}', settings.city)
      // PSČ jen když je vyplněné — vymyšlené do právního textu nepatří
      .replace('{postal}, ', site.address.postalCode ? `${site.address.postalCode}, ` : '')
      .replace('{email}', settings.contactEmail);

  return (
    <article className="shell max-w-3xl pb-24 pt-[136px] md:pt-[180px]">
      <p className="eyebrow">{t('eyebrow')}</p>
      <h1 className="mt-4 font-display text-[clamp(1.8rem,4vw,2.8rem)] font-bold uppercase leading-tight">
        {t('title')}
      </h1>
      <p className="mt-5 text-muted">{t('lead')}</p>

      <div className="mt-12 space-y-10">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="font-display text-lg font-bold uppercase text-ink">{section.title}</h2>
            <p className="mt-3 leading-relaxed text-muted">{fill(section.body)}</p>
          </section>
        ))}
      </div>

      <p className="mt-14 text-xs text-muted">
        {t('updated')}: {new Intl.DateTimeFormat(htmlLang[locale as Locale] ?? locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${UPDATED}T12:00:00Z`))}
      </p>
    </article>
  );
}
