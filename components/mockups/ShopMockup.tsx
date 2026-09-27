'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, ShieldCheck, ShoppingCart, Truck, Undo2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { BrowserFrame } from './Frame';
import { useSteps } from './useSteps';

const STRIP_ICONS = [Truck, Undo2, ShieldCheck];

/** Neutrální silueta produktu — bez cizích značek. */
function Sneaker({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 110" className={className} aria-hidden>
      <defs>
        <linearGradient id="shoe" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a3246" />
          <stop offset="100%" stopColor="#0b0e16" />
        </linearGradient>
      </defs>
      <path
        d="M14 82 C 18 60, 34 52, 56 52 L 86 34 C 96 28, 108 30, 114 40 L 126 58 C 140 62, 176 62, 194 72 C 206 78, 208 88, 198 92 L 30 92 C 18 92, 12 88, 14 82 Z"
        fill="url(#shoe)" stroke="rgba(120,160,255,0.35)" strokeWidth="1.4"
      />
      <path d="M58 52 C 74 62, 96 68, 126 58" stroke="rgba(160,190,255,0.35)" strokeWidth="1.2" fill="none" />
      <path d="M22 92 L 198 92" stroke="rgba(200,220,255,0.55)" strokeWidth="3" strokeLinecap="round" />
      <path d="M92 40 L 104 58" stroke="rgba(61,123,255,0.8)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 03 — produkt se proklikne, odletí obloukem do košíku, počítadlo poskočí
 * a nahoře vyskočí potvrzení objednávky.
 */
export function ShopMockup({ active }: { active: boolean }) {
  const t = useTranslations('mockups.shop');
  const step = useSteps(active, 5, 700);

  const nav = t.raw('nav') as string[];
  const strip = t.raw('strip') as { title: string; sub: string }[];
  const products = t.raw('products') as string[];

  const pressed = step >= 1;
  const flying = step === 2;
  const inCart = step >= 3;
  const ordered = step >= 4;

  return (
    <div className="relative">
      <ShoppingCart
        className="pointer-events-none absolute -right-4 -top-10 hidden h-24 w-24 text-[var(--blue)] opacity-25 blur-[1px] lg:block"
        aria-hidden
      />

      <BrowserFrame label="iconic.cz">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-[radial-gradient(120%_90%_at_70%_0%,rgba(31,91,255,0.2),transparent_60%)] p-4 md:p-5">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
            <span className="font-display text-[11px] tracking-[0.2em] text-ink">ICONIC</span>
            <div className="hidden gap-3 text-[9px] uppercase tracking-widest text-muted sm:flex">
              {nav.map((n) => <span key={n}>{n}</span>)}
            </div>
            <div className="relative">
              <motion.div animate={{ scale: inCart ? [1, 1.35, 1] : 1 }} transition={{ duration: 0.45 }}>
                <ShoppingCart className="h-4 w-4 text-ink" aria-hidden />
              </motion.div>
              <AnimatePresence>
                {inCart ? (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -right-2 -top-2 grid h-4 w-4 place-items-center rounded-full bg-[var(--blue)] text-[8px] font-bold text-white"
                  >
                    1
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-[1.1fr_1fr] items-center gap-3 rounded-xl border border-[var(--line)] bg-white/[0.03] p-3.5">
            <div>
              <p className="font-display text-sm font-bold uppercase leading-tight md:text-lg">
                {t('banner1')}
                <br />
                {t('banner2')}
              </p>
              <p className="mt-1.5 font-display text-base font-bold text-[var(--blue-bright)]">{t('price')}</p>
              <motion.div
                className="mt-2.5 w-fit rounded-lg bg-[linear-gradient(120deg,var(--blue),var(--blue-bright))] px-3 py-1.5 text-[9.5px] font-semibold uppercase tracking-wider text-white shadow-glow"
                animate={{ scale: pressed && !inCart ? 0.94 : 1 }}
                transition={{ duration: 0.18 }}
              >
                {t('addToCart')}
              </motion.div>
            </div>

            <div className="relative">
              <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
                <Sneaker className="w-full" />
              </motion.div>

              {/* let do košíku po oblouku */}
              <AnimatePresence>
                {flying ? (
                  <motion.div
                    className="absolute left-1/2 top-1/2 h-7 w-12"
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{ x: [0, 40, 96], y: [0, -70, -118], opacity: [1, 1, 0], scale: [1, 0.7, 0.25] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.75, ease: [0.4, 0, 0.2, 1], times: [0, 0.5, 1] }}
                  >
                    <Sneaker className="w-full" />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {strip.map((s, i) => {
              const ItemIcon = STRIP_ICONS[i];
              return (
                <div key={s.title} className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] p-1.5">
                  <ItemIcon className="h-3 w-3 shrink-0 text-[var(--blue-bright)]" aria-hidden />
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-[8px] font-semibold text-ink">{s.title}</span>
                    <span className="block truncate text-[7px] text-muted">{s.sub}</span>
                  </span>
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-[8.5px] uppercase tracking-widest text-muted">{t('recommended')}</p>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {products.map((p, i) => (
              <motion.div
                key={p}
                className="grid h-11 place-items-center rounded-lg border border-[var(--line)] bg-white/[0.03] text-[8px] text-muted"
                animate={{ opacity: step >= 1 ? 1 : 0.3, y: step >= 1 ? 0 : 8 }}
                transition={{ delay: i * 0.08 }}
              >
                {p}
              </motion.div>
            ))}
          </div>

          {/* potvrzení objednávky */}
          <AnimatePresence>
            {ordered ? (
              <motion.div
                initial={{ opacity: 0, y: -14, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[rgba(61,123,255,0.6)] bg-[rgba(10,20,45,0.95)] px-3.5 py-2 text-[10px] font-semibold text-ink shadow-[0_0_24px_rgba(31,91,255,0.45)]"
              >
                <Check className="h-3.5 w-3.5 text-[var(--blue-bright)]" aria-hidden />
                {t('ordered')}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </BrowserFrame>
    </div>
  );
}
