'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CountUp } from '@/components/ui/CountUp';
import { PhoneFrame } from './Frame';
import { useSteps } from './useSteps';

const BARS = [0.42, 0.58, 0.5, 0.74, 0.62, 0.88, 1];

/**
 * 05 — telefon se otočí v prostoru, přelistuje obrazovky, graf vyroste
 * a kroužek výkonu se dopočítá.
 */
export function AppMockup({ active }: { active: boolean }) {
  const t = useTranslations('mockups.app');
  const step = useSteps(active, 5, 700);

  const ring = 2 * Math.PI * 26;
  const screen = step >= 2 ? 1 : 0;

  return (
    <div className="relative">
      <div className="pointer-events-none absolute -right-2 top-4 hidden flex-col gap-4 opacity-80 lg:flex" aria-hidden>
        {['iOS', 'Play'].map((label) => (
          <span
            key={label}
            className="grid h-14 w-14 place-items-center rounded-2xl border border-[rgba(61,123,255,0.5)] text-[9px] uppercase tracking-widest text-[#a9c4ff] shadow-glow"
          >
            {label}
          </span>
        ))}
      </div>

      <motion.div
        style={{ perspective: 1200 }}
        initial={false}
        animate={{ rotateY: step >= 1 ? 0 : -32, rotateX: step >= 1 ? 0 : 8, scale: step >= 1 ? 1 : 0.94 }}
        transition={{ type: 'spring', stiffness: 90, damping: 18 }}
      >
        <PhoneFrame>
          <div className="relative h-[420px] overflow-hidden">
            <div className="flex items-center justify-between p-4 pb-0 text-[8px] text-muted">
              <span>9:41</span>
              <span className="font-display tracking-[0.2em] text-ink">ELEVATE</span>
              <span>100 %</span>
            </div>

            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={screen}
                initial={{ x: screen ? 120 : -120, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: screen ? -120 : 120, opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col p-4"
              >
                {screen === 0 ? (
                  <>
                    <div className="mt-6 flex items-center gap-1.5 text-[11px] text-muted">
                      <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                      {t('back')}
                    </div>
                    <div className="mt-8 space-y-3">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="h-14 rounded-xl border border-[var(--line)] bg-white/[0.03]"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 + i * 0.09 }}
                        />
                      ))}
                    </div>
                    <div className="mt-8 h-9 rounded-lg bg-[linear-gradient(120deg,var(--blue),var(--blue-bright))] shadow-glow" />
                  </>
                ) : (
                  <>
                    <div className="mt-4 flex items-center gap-1.5 text-[11px] text-muted">
                      <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                      {t('back')}
                    </div>
                    <p className="mt-1 font-display text-lg font-bold text-ink">{t('title')}</p>

                    <div className="mt-4 rounded-xl border border-[var(--line)] bg-white/[0.03] p-3">
                      <p className="text-[8.5px] uppercase tracking-widest text-muted">{t('revenue')}</p>
                      <p className="mt-1 font-display text-lg font-bold text-ink">
                        <CountUp to={128540} /> Kč
                      </p>
                      <div className="mt-3 flex h-20 items-end gap-1.5">
                        {BARS.map((value, index) => (
                          <motion.span
                            key={index}
                            className="flex-1 rounded-t-sm bg-[linear-gradient(to_top,rgba(31,91,255,0.25),var(--blue-bright))]"
                            initial={{ height: '4%' }}
                            animate={{ height: step >= 3 ? `${value * 100}%` : '4%' }}
                            transition={{ duration: 0.8, delay: 0.06 * index, ease: [0.16, 1, 0.3, 1] }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-[var(--line)] bg-white/[0.03] p-2.5">
                        <p className="text-[8px] uppercase tracking-widest text-muted">{t('users')}</p>
                        <p className="font-display text-sm font-bold text-[var(--blue-bright)]">
                          <CountUp to={2482} prefix="+" />
                        </p>
                      </div>
                      <div className="rounded-xl border border-[var(--line)] bg-white/[0.03] p-2.5">
                        <p className="text-[8px] uppercase tracking-widest text-muted">{t('revenueShort')}</p>
                        <p className="font-display text-sm font-bold text-[var(--blue-bright)]">
                          <CountUp to={18.6} decimals={1} prefix="+" suffix=" %" />
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-3 rounded-xl border border-[var(--line)] bg-white/[0.03] p-2.5">
                      <svg viewBox="0 0 64 64" className="h-14 w-14 -rotate-90">
                        <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(80,120,255,0.18)" strokeWidth="6" />
                        <motion.circle
                          cx="32" cy="32" r="26" fill="none" stroke="var(--blue-bright)" strokeWidth="6"
                          strokeLinecap="round" strokeDasharray={ring}
                          initial={{ strokeDashoffset: ring }}
                          animate={{ strokeDashoffset: step >= 4 ? ring * 0.08 : ring }}
                          transition={{ duration: 1.2, ease: 'easeOut' }}
                        />
                      </svg>
                      <div>
                        <p className="text-[8px] uppercase tracking-widest text-muted">{t('performance')}</p>
                        <p className="font-display text-base font-bold text-ink">
                          {step >= 4 ? <CountUp to={92} suffix=" %" /> : '—'}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </PhoneFrame>
      </motion.div>
    </div>
  );
}
