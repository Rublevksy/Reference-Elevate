'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, Clock3, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { Icon } from '@/components/ui/FeatureIcon';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { plans, type Plan } from '@/content/pricing';
import { serviceMeta } from '@/content/services';
import { useScrollFrame, viewProgress } from '@/lib/useScrollFrame';
import { useReducedMotion } from '@/lib/useReducedMotion';

/** Přenese vybranou službu do formuláře a odskrolí k němu. */
function pick(needIndex: number, plan: string) {
  window.dispatchEvent(new CustomEvent('elevate:preselect', { detail: { needIndex, plan } }));
  const target = document.getElementById('kontakt');
  if (!target) return;
  if (window.__lenis) window.__lenis.scrollTo(target, { offset: -90, duration: 1.1 });
  else target.scrollIntoView({ behavior: 'smooth' });
}

/** Pozadí karty — sdílené se scénou přechodu, aby se při předání kryly. */
export const PRICE_CARD_BG = 'linear-gradient(165deg, rgba(20,30,58,0.96), rgba(8,12,24,0.97) 62%)';

/**
 * Obsah ceníkové karty. Stejná komponenta kreslí skutečnou kartu v Ceníku
 * i klon v přechodové scéně (tam bez interakce) — texty se při předání kryjí.
 */
export function PriceCardFace({ plan, interactive = false }: { plan: Plan; interactive?: boolean }) {
  const t = useTranslations('pricing');
  const meta = serviceMeta[plan.slug];
  const key = `plans.${plan.id}`;
  const features = t.raw(`${key}.features`) as string[];
  const ctaClass =
    'group/cta mt-6 flex w-full items-center justify-center gap-2 rounded-btn border border-[rgba(80,120,255,0.45)] px-4 py-3 font-display text-[11px] uppercase tracking-[0.12em] text-ink transition-[border-color,box-shadow,background-color] duration-300';

  return (
    <>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[rgba(61,123,255,0.45)] bg-[rgba(31,91,255,0.12)] text-[var(--blue-bright)]">
          <Icon name={meta.icon} className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0">
          <span className="block font-display text-[10px] tracking-[0.22em] text-[#9fc0ff]">{meta.num}</span>
          <span className="block font-display text-[15px] font-bold uppercase leading-tight tracking-[0.06em] text-ink">{t(`${key}.name`)}</span>
        </span>
      </div>

      <p className="mt-5 flex items-baseline gap-1.5">
        <span className="text-xs uppercase tracking-widest text-muted">{t('from')}</span>
        <span className="font-display text-[clamp(1.45rem,1.9vw,1.75rem)] font-bold leading-none text-ink">{t(`${key}.price`)}</span>
      </p>
      <p className="mt-3 text-[13px] leading-snug text-muted">{t(`${key}.tagline`)}</p>

      <span aria-hidden className="mt-5 block h-px w-full bg-[linear-gradient(90deg,rgba(80,120,255,0.45),rgba(80,120,255,0.08))]" />

      <p className="mt-4 font-display text-[10px] uppercase tracking-[0.2em] text-[#9fc0ff]">{t('includes')}</p>
      <ul className="mt-3 space-y-2">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-[12.5px] leading-[1.45] text-[rgba(226,232,248,0.86)]">
            <span className="mt-[3px] grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-[rgba(31,91,255,0.22)] text-[var(--blue-bright)]">
              <Check className="h-2.5 w-2.5" aria-hidden />
            </span>
            {feature}
          </li>
        ))}
      </ul>

      <p className="mt-5 text-[12px] leading-snug text-muted">
        <span className="mr-1 font-display text-[10px] uppercase tracking-[0.16em] text-[rgba(160,178,214,0.9)]">{t('extra')}:</span>
        {t(`${key}.extra`)}
      </p>

      <div className="mt-auto">
        <p className="mt-5 flex items-center gap-2 text-[12px] text-muted">
          <Clock3 className="h-3.5 w-3.5 text-[var(--blue-bright)]" aria-hidden />
          <span>
            {t('term')}: <span className="text-ink">{t(`${key}.term`)}</span>
          </span>
        </p>
        {interactive ? (
          <button
            type="button"
            onClick={() => pick(plan.needIndex, t(`${key}.name`))}
            className={`${ctaClass} hover:border-[rgba(120,160,255,0.85)] hover:bg-[rgba(31,91,255,0.14)] hover:shadow-[0_0_28px_rgba(31,91,255,0.45)]`}
          >
            {t(`${key}.cta`)}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/cta:translate-x-1" aria-hidden />
          </button>
        ) : (
          <span className={ctaClass}>
            {t(`${key}.cta`)}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        )}
      </div>
    </>
  );
}

/** Obal karty — stejný rozměr a vzhled pro skutečnou kartu i klon ve scéně přechodu. */
export const PRICE_CARD_CLASS = 'relative flex flex-col overflow-hidden rounded-card border border-[rgba(80,120,255,0.22)] p-6';

export function Pricing() {
  const t = useTranslations('pricing');
  const reduced = useReducedMotion();
  const gridRef = useRef<HTMLDivElement>(null);

  const custom = t.raw('custom') as { name: string; tagline: string; items: string[] };
  const faqPills = t.raw('faq') as { q: string; a: string }[];
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // mobil: karty jdou pod sebou a vyjíždějí zespodu (na desktopu je přiveze
  // přechodová scéna — vlastní vstup by je ukázal podruhé)
  useScrollFrame(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const mobile = window.innerWidth < 768 && !reduced;
    grid.querySelectorAll<HTMLElement>('[data-land="price-card"]').forEach((card) => {
      if (!mobile) {
        card.style.opacity = '';
        card.style.transform = '';
        return;
      }
      const v = viewProgress(card, 1.02, 0.72);
      const e = 1 - Math.pow(1 - v, 3);
      card.style.opacity = (0.15 + 0.85 * e).toFixed(3);
      card.style.transform = e >= 0.999 ? '' : `translate3d(0, ${((1 - e) * 42).toFixed(1)}px, 0) scale(${(0.97 + 0.03 * e).toFixed(4)})`;
    });
  });

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqPills.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <section id="cenik" className="relative overflow-hidden py-24 md:py-32" aria-labelledby="cenik-title">
      {/* linie horizontu, zpoza které karty vystupují */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[38%] h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(80,120,255,0.35), transparent)' }}
      />

      <div className="shell">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">{t('eyebrow')}</p>
          <SplitHeading
            as="h2"
            id="cenik-title"
            className="mt-4 font-display text-[clamp(1.8rem,4.2vw,3rem)] font-bold uppercase leading-[1.08]"
            parts={[{ text: t('title') + ' ' }, { text: t('titleAccent'), accent: true }]}
          />
          <p className="mx-auto mt-5 max-w-xl text-muted">{t('lead')}</p>
        </div>
      </div>

      {/* pět služeb — na širokém okně vedle sebe, užší 3 + 2, na mobilu pod sebou */}
      <div ref={gridRef} className="mx-auto mt-14 flex max-w-[1480px] flex-wrap justify-center gap-4 px-5 md:px-6">
        {plans.map((plan) => (
          <article
            key={plan.id}
            data-land="price-card"
            className={`${PRICE_CARD_CLASS} group w-full transition-[border-color,box-shadow] duration-300 hover:border-[rgba(90,140,255,0.55)] hover:shadow-[0_0_46px_-12px_rgba(31,91,255,0.55)] md:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)] xl:w-[calc(20%-13px)]`}
            style={{ background: PRICE_CARD_BG }}
          >
            {/* neonová linka nahoře, při hoveru se rozsvítí */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-6 top-0 h-px opacity-50 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(97,150,255,0.95), transparent)' }}
            />
            <PriceCardFace plan={plan} interactive />
          </article>
        ))}
      </div>

      <div className="shell">
        {/* větší zakázky */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: reduced ? 0 : 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="glass mt-6 flex flex-wrap items-center justify-between gap-6 rounded-card p-7"
        >
          <div>
            <h3 className="font-display text-lg font-bold tracking-[0.06em] text-ink">{custom.name}</h3>
            <p className="mt-1.5 max-w-xl text-sm text-muted">{custom.tagline}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {custom.items.map((cat) => (
                <li key={cat} className="rounded-full border border-[var(--line)] px-3.5 py-1.5 text-xs text-muted">
                  {cat}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex w-full flex-wrap items-center justify-between gap-4 sm:w-auto sm:justify-end sm:gap-5">
            <span className="whitespace-nowrap font-display text-base font-bold text-[var(--blue-bright)] sm:text-lg">{t('customPrice')}</span>
            <button
              type="button"
              onClick={() => pick(5, custom.name)}
              className="group/cta inline-flex items-center gap-2 whitespace-nowrap rounded-btn border border-[rgba(61,123,255,0.5)] px-5 py-3.5 font-display text-[11px] uppercase tracking-[0.12em] text-ink transition-shadow duration-300 hover:shadow-glow"
            >
              {t('customCta')}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/cta:translate-x-1" aria-hidden />
            </button>
          </div>
        </motion.div>

        {/* tři krátké „otázka-pilulky" — hlavní námitky rovnou u ceny */}
        <div className="mt-10 flex flex-wrap items-start justify-center gap-2.5">
          {faqPills.map((item, i) => {
            const isOpen = openFaq === i;
            return (
              <button
                key={item.q}
                type="button"
                onClick={() => setOpenFaq(isOpen ? null : i)}
                aria-expanded={isOpen}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs transition-colors duration-300 ${
                  isOpen
                    ? 'border-[rgba(61,123,255,0.6)] bg-[rgba(31,91,255,0.14)] text-ink'
                    : 'border-[var(--line)] text-muted hover:border-[rgba(80,120,255,0.4)] hover:text-ink'
                }`}
              >
                {item.q}
                <motion.span animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.3 }}>
                  <Plus className="h-3 w-3" aria-hidden />
                </motion.span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {openFaq !== null ? (
            <motion.p
              key={openFaq}
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mx-auto mt-4 max-w-md overflow-hidden text-center text-sm text-muted"
            >
              {faqPills[openFaq].a}
            </motion.p>
          ) : null}
        </AnimatePresence>

        <p className="mt-8 text-center text-xs text-muted">{t('vat')}</p>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </section>
  );
}
