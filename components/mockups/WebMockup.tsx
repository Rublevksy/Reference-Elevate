'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { BrowserFrame } from './Frame';
import { useSteps } from './useSteps';

/**
 * 01 — web se skládá: drátěný model → text se „píše" → bloky dostanou barvu
 * → checklist se odškrtá.
 */
export function WebMockup({ active }: { active: boolean }) {
  const t = useTranslations('mockups.web');
  const step = useSteps(active, 5, 560);
  const checks = t.raw('checklist') as string[];

  const wire = step < 2;
  const colored = step >= 3;

  return (
    <div className="relative">
      <BrowserFrame>
        <div className="relative aspect-[16/10] w-full overflow-hidden p-5 md:p-7">
          <motion.div
            className="absolute inset-0"
            animate={{ opacity: colored ? 1 : 0 }}
            transition={{ duration: 0.7 }}
            style={{ background: 'radial-gradient(120% 90% at 80% 0%, rgba(31,91,255,0.3), transparent 60%)' }}
          />

          <div className="relative flex items-center justify-between">
            <motion.span
              className="font-display text-[11px] tracking-[0.3em]"
              animate={{ color: colored ? '#f2f5ff' : 'rgba(138,147,168,0.7)' }}
            >
              E L E V A T E
            </motion.span>
            <span className="hidden gap-2 sm:flex">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="block h-1.5 rounded-full"
                  animate={{
                    width: step >= 1 ? 26 : 16,
                    backgroundColor: colored ? 'rgba(242,245,255,0.55)' : 'rgba(120,160,255,0.25)',
                  }}
                  transition={{ delay: i * 0.06 }}
                />
              ))}
            </span>
          </div>

          {/* nadpis se „píše" */}
          <div className="relative mt-7 font-display text-lg font-bold uppercase leading-tight md:text-2xl">
            <TypeLine text={t('headline1')} show={step >= 1} />
            <TypeLine text={t('headline2')} show={step >= 2} accent={colored} delay={0.35} />
          </div>

          <motion.div
            className="relative mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[10px] font-semibold uppercase tracking-widest"
            animate={{
              opacity: step >= 2 ? 1 : 0,
              backgroundColor: colored ? 'rgba(31,91,255,1)' : 'rgba(255,255,255,0.08)',
              color: colored ? '#fff' : 'rgba(138,147,168,1)',
              boxShadow: colored ? '0 0 26px rgba(31,91,255,0.5)' : '0 0 0 rgba(0,0,0,0)',
            }}
            transition={{ duration: 0.5 }}
          >
            {t('cta')} →
          </motion.div>

          <div className="relative mt-6 grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-16 origin-bottom rounded-lg border"
                animate={{
                  opacity: step >= 1 ? 1 : 0,
                  scaleY: step >= 1 ? 1 : 0.2,
                  borderColor: colored ? 'rgba(80,120,255,0.35)' : 'rgba(120,160,255,0.22)',
                  backgroundColor: colored ? 'rgba(31,91,255,0.1)' : 'rgba(255,255,255,0.02)',
                  borderStyle: wire ? 'dashed' : 'solid',
                }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.09 }}
              />
            ))}
          </div>
        </div>
      </BrowserFrame>

      <motion.ul
        className="glass absolute -bottom-6 -right-3 hidden w-[168px] rounded-xl p-3.5 sm:block md:-right-8"
        animate={{ opacity: step >= 3 ? 1 : 0, y: step >= 3 ? 0 : 10 }}
        transition={{ duration: 0.4 }}
      >
        <li className="mb-2 font-display text-[9px] uppercase tracking-[0.2em] text-muted">{t('label')}</li>
        {checks.map((label, i) => (
          <motion.li
            key={label}
            className="flex items-center gap-2 py-1 text-[11px] uppercase tracking-wide text-ink"
            animate={{ opacity: step >= 4 ? 1 : 0.25, x: step >= 4 ? 0 : -6 }}
            transition={{ duration: 0.35, delay: i * 0.12 }}
          >
            <Check className="h-3.5 w-3.5 text-[var(--blue-bright)]" aria-hidden />
            {label}
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}

function TypeLine({
  text,
  show,
  accent,
  delay = 0,
}: {
  text: string;
  show: boolean;
  accent?: boolean;
  delay?: number;
}) {
  return (
    <span className={`block overflow-hidden whitespace-nowrap ${accent ? 'text-[var(--blue-bright)]' : ''}`}>
      <motion.span
        className="inline-block"
        initial={{ width: '0%' }}
        animate={{ width: show ? '100%' : '0%' }}
        transition={{ duration: 0.7, delay, ease: 'linear' }}
        style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom' }}
      >
        {text}
      </motion.span>
    </span>
  );
}
