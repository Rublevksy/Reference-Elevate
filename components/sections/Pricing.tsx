'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { Odometer } from '@/components/ui/Odometer';
import { plans } from '@/content/pricing';
import { useReducedMotion } from '@/lib/useReducedMotion';

/** Přenese vybraný balíček do formuláře a odskrolí k němu. */
function pick(needIndex: number, plan: string) {
  window.dispatchEvent(new CustomEvent('elevate:preselect', { detail: { needIndex, plan } }));
  const target = document.getElementById('kontakt');
  if (!target) return;
  if (window.__lenis) window.__lenis.scrollTo(target, { offset: -90, duration: 1.1 });
  else target.scrollIntoView({ behavior: 'smooth' });
}

export function Pricing() {
  const t = useTranslations('pricing');
  const reduced = useReducedMotion();
  const [alive, setAlive] = useState(false);

  const custom = t.raw('custom') as { name: string; tagline: string; items: string[] };

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
            className="mt-4 font-display text-[clamp(1.8rem,4.2vw,3rem)] font-bold uppercase leading-[1.08]"
            parts={[{ text: t('title') + ' ' }, { text: t('titleAccent'), accent: true }]}
          />
          <p className="mt-5 text-muted">{t('lead')}</p>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {plans.map((plan, index) => {
            const features = t.raw(`plans.${plan.id}.features`) as string[];
            const isAnimated = plan.id === 'animated';

            return (
              <motion.article
                key={plan.id}
                initial={{ opacity: 0, y: 90, rotate: index === 0 ? -2.5 : index === 2 ? 2.5 : 0 }}
                whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                viewport={{ once: true, margin: '-12%' }}
                transition={{
                  duration: reduced ? 0 : 0.95,
                  delay: reduced ? 0 : index * 0.16,
                  ease: [0.16, 1, 0.3, 1],
                }}
                onMouseEnter={() => isAnimated && setAlive(true)}
                onMouseLeave={() => isAnimated && setAlive(false)}
                className={`group relative flex flex-col overflow-hidden rounded-card p-7 ${
                  plan.featured
                    ? 'border border-[rgba(61,123,255,0.45)] bg-[linear-gradient(170deg,rgba(18,30,70,0.85),rgba(6,10,22,0.92))] lg:-mt-5 lg:pb-9'
                    : 'glass'
                }`}
              >
                {/* paprsek po rámečku u vybraného balíčku */}
                {plan.featured && !reduced ? <span aria-hidden className="beam" /> : null}

                {/* jemný šum + vnitřní modré světlo */}
                {plan.featured ? (
                  <>
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 opacity-45"
                      style={{ background: 'radial-gradient(70% 50% at 50% 0%, rgba(31,91,255,0.35), transparent 70%)' }}
                    />
                    <span aria-hidden className="grain pointer-events-none absolute inset-0 opacity-30" />
                  </>
                ) : null}

                <div className="relative">
                  {plan.featured ? (
                    <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[rgba(61,123,255,0.5)] bg-[rgba(31,91,255,0.16)] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--blue-bright)]">
                      <Sparkles className="h-3 w-3" aria-hidden />
                      {t('badge')}
                    </span>
                  ) : null}

                  <h3 className="font-display text-xl font-bold tracking-[0.12em] text-ink">
                    {t(`plans.${plan.id}.name`)}
                  </h3>
                  <p className="mt-1.5 text-sm text-muted">{t(`plans.${plan.id}.tagline`)}</p>

                  <p className="mt-6 flex items-baseline gap-2">
                    <span className="text-xs uppercase tracking-widest text-muted">{t('from')}</span>
                    <motion.span
                      className="font-display text-[clamp(1.5rem,2.6vw,2rem)] font-bold text-ink"
                      animate={isAnimated && alive && !reduced ? { y: [0, -3, 0] } : { y: 0 }}
                      transition={{ duration: 1.2, repeat: isAnimated && alive ? Infinity : 0 }}
                    >
                      <Odometer value={t(`plans.${plan.id}.price`)} />
                    </motion.span>
                  </p>

                  <ul className="mt-7 space-y-2.5">
                    {features.map((feature, i) => (
                      <motion.li
                        key={feature}
                        className="flex items-start gap-2.5 text-sm text-muted"
                        initial={{ opacity: 0, x: -8 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{
                          duration: 0.4,
                          delay: reduced ? 0 : 0.35 + index * 0.16 + i * 0.09,
                        }}
                      >
                        <motion.span
                          className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[rgba(31,91,255,0.2)] text-[var(--blue-bright)]"
                          animate={
                            isAnimated && alive && !reduced
                              ? { scale: [1, 1.25, 1], rotate: [0, 8, 0] }
                              : { scale: 1, rotate: 0 }
                          }
                          transition={{ duration: 0.9, delay: i * 0.08, repeat: isAnimated && alive ? Infinity : 0 }}
                        >
                          <Check className="h-2.5 w-2.5" aria-hidden />
                        </motion.span>
                        {feature}
                      </motion.li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => pick(plan.needIndex, t(`plans.${plan.id}.name`))}
                    className={`group/cta mt-8 flex w-full items-center justify-center gap-2 rounded-btn px-5 py-3.5 font-display text-[11px] uppercase tracking-[0.12em] transition-shadow ${
                      plan.featured
                        ? 'bg-[linear-gradient(120deg,var(--blue),var(--blue-bright))] text-white shadow-[0_0_26px_var(--blue-glow)] hover:shadow-[0_0_44px_var(--blue-glow)]'
                        : 'border border-[var(--line)] text-ink hover:border-[rgba(80,120,255,0.5)] hover:shadow-glow'
                    }`}
                  >
                    {t('cta')}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-1" aria-hidden />
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>

        {/* individuální kalkulace */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: reduced ? 0 : 0.9, delay: reduced ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="glass mt-5 flex flex-wrap items-center justify-between gap-6 rounded-card p-7"
        >
          <div>
            <h3 className="font-display text-lg font-bold tracking-[0.12em] text-ink">{custom.name}</h3>
            <p className="mt-1.5 text-sm text-muted">{custom.tagline}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {custom.items.map((cat) => (
                <li
                  key={cat}
                  className="rounded-full border border-[var(--line)] px-3.5 py-1.5 text-xs text-muted"
                >
                  {cat}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-5">
            <span className="font-display text-lg font-bold text-[var(--blue-bright)]">{t('customPrice')}</span>
            <button
              type="button"
              onClick={() => pick(5, custom.name)}
              className="group/cta inline-flex items-center gap-2 rounded-btn border border-[rgba(61,123,255,0.5)] px-5 py-3.5 font-display text-[11px] uppercase tracking-[0.12em] text-ink transition-shadow hover:shadow-glow"
            >
              {t('customCta')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-1" aria-hidden />
            </button>
          </div>
        </motion.div>

        <p className="mt-6 text-center text-xs text-muted">{t('vat')}</p>
      </div>
    </section>
  );
}
