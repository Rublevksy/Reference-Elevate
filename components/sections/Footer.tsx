'use client';

import Image from 'next/image';
import { ArrowUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Logo } from '@/components/ui/Logo';
import { serviceSlugs } from '@/content/services';
import { site } from '@/content/site';
import { poseSprite } from '@/content/mascot';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useSiteContact } from '@/components/ContentProvider';

export function Footer() {
  const { contactEmail, city, social } = useSiteContact();
  const t = useTranslations('footer');
  const tServices = useTranslations('services.items');
  const tNav = useTranslations('nav');
  const reduced = useReducedMotion();

  const toTop = () => {
    const lenis = window.__lenis;
    if (lenis) lenis.scrollTo(0, { duration: 1.4 });
    else window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  };

  return (
    <footer className="relative mt-24 overflow-hidden border-t border-[var(--line)] pt-20">
      <div className="shell grid gap-12 pb-16 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Logo height={28} glow />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted">{t('tagline')}</p>
        </div>

        <nav aria-label={t('services')}>
          <h2 className="eyebrow mb-4">{t('services')}</h2>
          <ul className="space-y-2.5">
            {serviceSlugs.map((slug) => (
              <li key={slug}>
                <Link href={`/sluzby/${slug}`} className="text-sm text-muted transition-colors hover:text-ink">
                  {tServices(`${slug}.card`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={t('studio')}>
          <h2 className="eyebrow mb-4">{t('studio')}</h2>
          <ul className="space-y-2.5 text-sm text-muted">
            <li><a href="#proces" className="transition-colors hover:text-ink">{tNav('process')}</a></li>
            <li><a href="#reference" className="transition-colors hover:text-ink">{tNav('references')}</a></li>
            <li><a href="#cenik" className="transition-colors hover:text-ink">{tNav('pricing')}</a></li>
            <li>
              <Link href="/ochrana-osobnich-udaju" className="transition-colors hover:text-ink">
                {t('privacy')}
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="eyebrow mb-4">{t('contact')}</h2>
          <ul className="space-y-2.5 text-sm text-muted">
            <li><a href={`mailto:${contactEmail}`} className="transition-colors hover:text-ink">{contactEmail}</a></li>
            {site.phone ? <li><a href={`tel:${site.phoneHref}`} className="transition-colors hover:text-ink">{site.phone}</a></li> : null}
            <li>{city}</li>
          </ul>
          <ul className="mt-5 flex flex-wrap gap-2">
            {social.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-block rounded-full border border-[var(--line)] px-4 py-2 text-xs uppercase tracking-wider text-muted transition-colors hover:border-[rgba(80,120,255,0.5)] hover:text-ink"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="shell relative flex items-end justify-between gap-6 border-t border-[var(--line)] py-10">
        <p className="text-xs text-muted">
          © {new Date().getFullYear()} {site.name}. {t('rights')}
        </p>

        <button
          type="button"
          onClick={toTop}
          className="group relative flex items-center gap-3 rounded-full border border-[var(--line)] px-5 py-3 text-xs uppercase tracking-[0.18em] text-muted transition-colors hover:border-[rgba(80,120,255,0.5)] hover:text-ink"
          aria-label={t('toTop')}
        >
          <span className="pointer-events-none absolute -top-16 right-1 h-16 w-24 overflow-hidden opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            {/* 3D maskot vykoukne nad tlačítkem a zajásá */}
            <Image
              src={poseSprite.celebrate}
              alt=""
              aria-hidden
              width={853}
              height={1400}
              loading="lazy"
              sizes="120px"
              className="absolute bottom-0 left-1/2 h-[150px] w-auto max-w-none -translate-x-1/2 translate-y-[62%] transition-transform duration-500 group-hover:translate-y-[38%]"
            />
          </span>
          {t('up')}
          <ArrowUp className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-1" aria-hidden />
        </button>
      </div>

      <motion.div
        aria-hidden
        className="pointer-events-none flex select-none justify-center px-4 pb-6 opacity-[0.045]"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 0.045, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
      >
        <Logo height={110} className="!h-auto w-full max-w-4xl" />
      </motion.div>
    </footer>
  );
}
