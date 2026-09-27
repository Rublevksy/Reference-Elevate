'use client';

import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { Mascot } from '@/components/mascot/Mascot';
import { processSteps } from '@/content/process';
import { useReducedMotion } from '@/lib/useReducedMotion';

/** Maskot sestupuje podél světelné osy a zastavuje se u každého kroku. */
export function Process() {
  const t = useTranslations('process');
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);

  const steps = t.raw('steps') as { title: string; text: string }[];

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 65%', 'end 75%'] });
  const line = useSpring(scrollYProgress, { stiffness: 80, damping: 24, restDelta: 0.001 });
  const walkerY = useTransform(line, [0, 1], ['0%', '100%']);

  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    setStep(Math.min(steps.length - 1, Math.floor(value * steps.length)));
  });

  return (
    <section id="proces" ref={ref} className="relative py-24 md:py-32" aria-labelledby="proces-title">
      <div className="shell">
        <div className="max-w-2xl">
          <p className="eyebrow">{t('eyebrow')}</p>
          <SplitHeading
            as="h2"
            id="proces-title"
            className="mt-4 font-display text-[clamp(1.8rem,4.2vw,3rem)] font-bold uppercase leading-[1.08]"
            parts={[{ text: t('title') + ' ' }, { text: t('titleAccent'), accent: true }]}
          />
          <p className="mt-5 text-muted">{t('lead')}</p>
        </div>

        <div className="relative mt-16 pl-16 md:pl-24">
          <div className="absolute left-6 top-2 h-[calc(100%-2rem)] w-px bg-[var(--line)] md:left-10">
            <motion.div
              className="absolute inset-x-0 top-0 h-full origin-top bg-gradient-to-b from-[var(--blue-bright)] to-[var(--blue)] shadow-glow"
              style={{ scaleY: reduced ? 1 : line }}
            />
          </div>

          {!reduced ? (
            <motion.div
              className="pointer-events-none absolute left-6 top-0 hidden h-[calc(100%-2rem)] md:left-10 lg:block"
              aria-hidden
            >
              <motion.div style={{ y: walkerY }} className="sticky top-1/2">
                <div className="-translate-x-[86%] -translate-y-1/2">
                  <Mascot pose="walk" height={150} followCursor={false} />
                </div>
              </motion.div>
            </motion.div>
          ) : null}

          <ol className="space-y-12 md:space-y-16">
            {steps.map((item, index) => (
              <li key={item.title} className="relative">
                <span
                  className={`absolute -left-[3.05rem] top-1 grid h-10 w-10 place-items-center rounded-full border font-display text-[11px] transition-colors duration-500 md:-left-[4.05rem] ${
                    index <= step
                      ? 'border-[var(--blue-bright)] bg-[rgba(31,91,255,0.18)] text-[var(--blue-bright)] shadow-glow'
                      : 'border-[var(--line)] bg-[var(--bg)] text-muted'
                  }`}
                >
                  {processSteps[index]}
                </span>

                <motion.div
                  initial={{ opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-15% 0px' }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                >
                  <h3
                    className={`font-display text-xl font-bold uppercase transition-colors duration-500 md:text-2xl ${
                      index <= step ? 'text-ink' : 'text-muted'
                    }`}
                  >
                    {item.title}
                  </h3>
                  <p className="mt-2 max-w-md text-muted">{item.text}</p>
                </motion.div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
