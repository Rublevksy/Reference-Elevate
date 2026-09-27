'use client';

import { motion } from 'framer-motion';
import { Check, Search, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CountUp } from '@/components/ui/CountUp';
import { BrowserFrame } from './Frame';
import { useSteps } from './useSteps';

const METRIC_VALUES = [220, 180, 150];

/**
 * 02 — nejdřív výsledky vyhledávání: karta webu se propracuje z 9. místa
 * na 1., pak se scéna překlopí do reportu s křivkou a čísly.
 */
export function SeoDashboard({ active }: { active: boolean }) {
  const t = useTranslations('mockups.seo');
  const tCommon = useTranslations('mockups');
  const step = useSteps(active, 6, 620);

  const months = t.raw('months') as string[];
  const metrics = t.raw('metrics') as string[];
  const planSteps = t.raw('steps') as string[];

  const showDashboard = step >= 3;
  // 9. → 1. místo ve dvou skocích
  const rank = step >= 2 ? 0 : step >= 1 ? 4 : 8;

  return (
    <div className="relative">
      <BrowserFrame label={showDashboard ? 'report' : 'google.com'}>
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-[radial-gradient(120%_90%_at_20%_0%,rgba(31,91,255,0.2),transparent_60%)]">
          {/* --- fáze 1: výsledky vyhledávání --- */}
          <motion.div
            className="absolute inset-0 p-4 md:p-5"
            animate={{ opacity: showDashboard ? 0 : 1, y: showDashboard ? -18 : 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/[0.04] px-3 py-1.5">
              <Search className="h-3 w-3 text-muted" aria-hidden />
              <span className="text-[10px] text-muted">{t('query')}</span>
            </div>
            <p className="mt-2 text-[8px] uppercase tracking-widest text-muted">{t('serp')}</p>

            <div className="relative mt-2 space-y-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-7 rounded-md border border-[var(--line)] bg-white/[0.02]" />
              ))}

              {/* naše karta se posouvá nahoru */}
              <motion.div
                className="absolute inset-x-0 flex h-7 items-center gap-2 rounded-md border border-[rgba(61,123,255,0.65)] bg-[rgba(18,32,74,0.95)] px-2 shadow-[0_0_20px_rgba(31,91,255,0.45)]"
                initial={false}
                animate={{ top: rank * 34 }}
                transition={{ type: 'spring', stiffness: 130, damping: 18 }}
              >
                <span className="grid h-4 w-4 place-items-center rounded bg-[var(--blue)] text-[8px] font-bold text-white">
                  {rank === 0 ? 1 : rank === 4 ? 5 : 9}
                </span>
                <span className="font-display text-[9px] tracking-[0.18em] text-ink">E L E V A T E</span>
                <span className="ml-auto h-1.5 w-12 rounded-full bg-white/15" />
              </motion.div>
            </div>
          </motion.div>

          {/* --- fáze 2: report --- */}
          <motion.div
            className="absolute inset-0 p-4 md:p-5"
            animate={{ opacity: showDashboard ? 1 : 0, y: showDashboard ? 0 : 18 }}
            transition={{ duration: 0.5, delay: showDashboard ? 0.15 : 0 }}
            style={{ pointerEvents: showDashboard ? 'auto' : 'none' }}
          >
            <p className="font-display text-[11px] uppercase tracking-[0.2em] text-ink">{t('title')}</p>

            <div className="mt-3 grid grid-cols-3 gap-2.5">
              {metrics.map((label, i) => (
                <motion.div
                  key={label}
                  className="rounded-xl border border-[var(--line)] bg-white/[0.03] p-2.5"
                  animate={{ opacity: step >= 4 ? 1 : 0, y: step >= 4 ? 0 : 10 }}
                  transition={{ delay: i * 0.1, duration: 0.45 }}
                >
                  <p className="truncate text-[8.5px] uppercase tracking-widest text-muted">{label}</p>
                  <p className="mt-1 font-display text-base font-bold text-[var(--blue-bright)] md:text-xl">
                    {step >= 4 ? <CountUp to={METRIC_VALUES[i]} prefix="+" suffix=" %" /> : '—'}
                  </p>
                </motion.div>
              ))}
            </div>

            <div className="relative mt-3 h-[38%]">
              <svg viewBox="0 0 400 140" className="h-full w-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="seo-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(61,123,255,0.35)" />
                    <stop offset="100%" stopColor="rgba(61,123,255,0)" />
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3].map((line) => (
                  <line key={line} x1="0" x2="400" y1={20 + line * 32} y2={20 + line * 32} stroke="rgba(80,120,255,0.12)" strokeWidth="1" />
                ))}
                <motion.path
                  d="M4 120 C 60 108, 84 96, 120 100 S 190 70, 230 78 S 300 40, 340 30 L 392 12"
                  fill="none"
                  stroke="var(--blue-bright)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  initial={false}
                  animate={{ pathLength: step >= 5 ? 1 : 0 }}
                  transition={{ duration: 1.5, ease: 'easeInOut' }}
                  style={{ filter: 'drop-shadow(0 0 8px rgba(61,123,255,0.8))' }}
                />
                <motion.path
                  d="M4 120 C 60 108, 84 96, 120 100 S 190 70, 230 78 S 300 40, 340 30 L 392 12 L 392 140 L 4 140 Z"
                  fill="url(#seo-fill)"
                  animate={{ opacity: step >= 6 ? 1 : 0 }}
                  transition={{ duration: 0.7 }}
                />
              </svg>

              <motion.span
                className="absolute right-1 top-0 text-[var(--blue-bright)]"
                animate={{ opacity: step >= 6 ? 1 : 0, scale: step >= 6 ? 1 : 0.5 }}
                transition={{ type: 'spring', stiffness: 260 }}
              >
                <TrendingUp className="h-5 w-5" aria-hidden />
              </motion.span>

              <div className="mt-1 flex justify-between text-[8px] uppercase tracking-widest text-muted">
                {months.map((month) => (
                  <span key={month}>{month}</span>
                ))}
              </div>
            </div>

            <p className="mt-1.5 text-[8.5px] italic text-muted">{tCommon('illustrative')}</p>
          </motion.div>
        </div>
      </BrowserFrame>

      <motion.ul
        className="glass absolute -bottom-8 -left-3 hidden w-[180px] rounded-xl p-3.5 sm:block md:-left-10"
        animate={{ opacity: step >= 1 ? 1 : 0, y: step >= 1 ? 0 : 10 }}
        transition={{ duration: 0.4 }}
      >
        <li className="mb-2 font-display text-[9px] uppercase tracking-[0.2em] text-muted">{t('plan')}</li>
        {planSteps.map((label, i) => (
          <motion.li
            key={label}
            className="flex items-center gap-2 py-[3px] text-[11px] text-ink"
            animate={{ opacity: step > i ? 1 : 0.22, x: step > i ? 0 : -5 }}
            transition={{ duration: 0.3 }}
          >
            <Check className="h-3.5 w-3.5 text-[var(--blue-bright)]" aria-hidden />
            {label}
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}
