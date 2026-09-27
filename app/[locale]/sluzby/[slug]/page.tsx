import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { locales } from '@/i18n/routing';
import { getServiceMeta, serviceSlugs } from '@/content/services';
import { ServiceHero } from '@/components/sections/ServiceHero';
import { ServiceShowcase } from '@/components/sections/ServiceShowcase';
import { Faq } from '@/components/sections/Faq';
import { Contact } from '@/components/sections/Contact';
import { Reveal } from '@/components/ui/Reveal';
import { site } from '@/content/site';

type Params = { params: Promise<{ slug: string; locale: string }> };

export function generateStaticParams() {
  return locales.flatMap((locale) => serviceSlugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, locale } = await params;
  if (!getServiceMeta(slug)) return {};
  const t = await getTranslations({ locale, namespace: `services.items.${slug}` });

  return {
    title: t('meta.title'),
    description: t('meta.description'),
    alternates: {
      canonical: `/${locale}/sluzby/${slug}`,
      languages: Object.fromEntries(locales.map((l) => [l, `${site.url}/${l}/sluzby/${slug}`])),
    },
    openGraph: {
      title: t('meta.title'),
      description: t('meta.description'),
      url: `${site.url}/${locale}/sluzby/${slug}`,
      type: 'website',
    },
  };
}

export default async function ServicePage({ params }: Params) {
  const { slug, locale } = await params;
  const meta = getServiceMeta(slug);
  if (!meta) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'services' });
  const tItem = await getTranslations({ locale, namespace: `services.items.${slug}` });

  const includes = tItem.raw('includes') as { title: string; text: string }[];
  const faq = tItem.raw('faq') as { q: string; a: string }[];

  return (
    <>
      <ServiceHero slug={slug} />

      <section className="shell py-16 md:py-20" aria-labelledby="co-vse">
        <Reveal>
          <h2 id="co-vse" className="font-display text-[clamp(1.5rem,3.4vw,2.3rem)] font-bold uppercase">
            {t('included')} <span className="text-[var(--blue-bright)]">{t('includedAccent')}</span>
          </h2>
        </Reveal>
        <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {includes.map((item, index) => (
            <Reveal key={item.title} delay={index} as="li">
              <div className="glass h-full rounded-card p-6">
                <span className="font-display text-xs tracking-[0.2em] text-[var(--blue-bright)]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-3 font-display text-base font-bold uppercase leading-tight">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.text}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </section>

      <ServiceShowcase slug={slug} />

      <Faq items={faq} title={t('faqLabel')} accent={tItem('tab')} id="faq-sluzba" />

      <div className="shell">
        <Link href="/#sluzby" className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t('backToServices')}
        </Link>
      </div>

      <Contact preselectIndex={meta.needIndex} />
    </>
  );
}
