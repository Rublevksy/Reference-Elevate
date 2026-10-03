import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { DocumentTitle } from '@/components/ui/DocumentTitle';
import { site } from '@/content/site';

/** Stránka 404 má vlastní titulek (ne titulek úvodní stránky) a neindexuje se. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('notFound');
  return { title: t('title'), robots: { index: false, follow: true } };
}

export default function NotFound() {
  const t = useTranslations('notFound');

  return (
    <div className="shell grid min-h-[70vh] place-items-center py-32 text-center">
      <DocumentTitle title={`${t('title')} | ${site.name}`} />
      <div>
        <p className="font-display text-[clamp(4rem,14vw,9rem)] font-bold leading-none text-white/[0.08]">404</p>
        <h1 className="mt-4 font-display text-2xl font-bold uppercase">{t('title')}</h1>
        <p className="mt-3 text-muted">{t('lead')}</p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-btn bg-[linear-gradient(120deg,var(--blue),var(--blue-bright))] px-6 py-3 font-display text-[12px] uppercase tracking-[0.14em] text-white shadow-glow"
        >
          {t('cta')}
        </Link>
      </div>
    </div>
  );
}
