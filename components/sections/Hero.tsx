'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { Mascot } from '@/components/mascot/Mascot';
import { SpeechBubble } from '@/components/mascot/SpeechBubble';
import { HeroMedia } from '@/components/sections/HeroMedia';
import { useDeviceTier } from '@/lib/useDeviceTier';
import { useReducedMotion } from '@/lib/useReducedMotion';
import type { HeroPointer } from '@/components/three/MacbookScene';

/** Cyrilice má v průměru delší slova — nadpis dostane o trochu menší clamp. */
const HEADING_SIZE: Record<string, string> = {
  cs: 'text-[clamp(1.7rem,3.4vw,2.85rem)]',
  en: 'text-[clamp(1.7rem,3.4vw,2.85rem)]',
  ru: 'text-[clamp(1.5rem,2.9vw,2.4rem)]',
  uk: 'text-[clamp(1.5rem,2.9vw,2.4rem)]',
};

export function Hero() {
  const t = useTranslations('hero');
  const locale = useLocale();
  const pointer = useRef({ x: 0, y: 0 }) as HeroPointer;
  const fallbackRef = useRef<HTMLDivElement>(null);
  const { tier, reducedMotion, ready } = useDeviceTier();
  const reduced = useReducedMotion();
  const [bubble, setBubble] = useState(true);
  const [idle, setIdle] = useState(false);

  // Scéna se připojí, až má prohlížeč chvilku klid — hero je bez ní kompletní.
  useEffect(() => {
    const schedule =
      window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 900));
    const handle = schedule(() => setIdle(true), { timeout: 2200 });
    return () => {
      if (window.cancelIdleCallback && typeof handle === 'number') {
        window.cancelIdleCallback(handle);
      }
    };
  }, []);

  const use3d = ready && idle && tier === 'high' && !reducedMotion;

  useEffect(() => {
    if (reducedMotion) return;
    const onMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [reducedMotion]);

  return (
    <section id="hero" className="relative min-h-dvh overflow-hidden pt-[92px] md:pt-0" aria-label={t('eyebrow')}>
      <div className="flex min-h-dvh items-center overflow-hidden md:min-h-dvh">
        {/* 3D scéna / statický obrázek — celá šířka, scéna je posunutá doprava,
            takže vlevo zůstává klid pro text. */}
        <div className="absolute inset-x-0 bottom-0 h-[46%] md:inset-0 md:h-full">
          {use3d ? (
            <HeroMedia mode="3d" pointer={pointer} />
          ) : (
            <div ref={fallbackRef} className="relative h-full w-full">
              <Image
                src="/assets/hero-laptop.jpg"
                alt={t('laptopAlt')}
                fill
                priority
                unoptimized
                sizes="(max-width: 768px) 100vw, 60vw"
                className="object-contain object-bottom md:object-right-bottom"
              />
            </div>
          )}

          {/* scrim: měkký přechod do --bg, ať se text nikdy nemíchá se scénou */}
          <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[52%] bg-gradient-to-r from-[var(--bg)] via-[var(--bg)]/70 to-transparent md:block" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-[var(--bg)] to-transparent md:hidden" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-[var(--bg)] to-transparent" />
        </div>

        {/* text — sloupec omezený na ~46 % šířky kontejneru, ať nikdy nezasahuje do scény */}
        <div className="shell relative z-10 grid w-full items-center">
          <motion.div
            className="max-w-md lg:max-w-[52%]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <motion.p
              className="eyebrow flex items-center gap-3"
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <span className="inline-block h-px w-8 bg-[var(--text-muted)]" />
              {t('eyebrow')}
            </motion.p>

            <SplitHeading
              as="h1"
              delay={0.4}
              className={`mt-5 font-display font-bold uppercase leading-[1.08] ${HEADING_SIZE[locale] ?? HEADING_SIZE.cs}`}
              parts={[{ text: t('title') + ' ' }, { text: t('titleAccent'), accent: true }]}
            />

            <motion.p
              className="mt-5 max-w-sm text-base leading-relaxed text-muted"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85, duration: 0.7 }}
            >
              {t('subtitle')}
            </motion.p>

            <motion.ul
              className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] uppercase tracking-[0.2em] text-muted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.7 }}
            >
              {(t.raw('tags') as string[]).map((tag, index) => (
                <li key={tag} className="flex items-center gap-3">
                  {index > 0 ? <span className="h-1 w-1 rounded-full bg-[var(--blue)]" /> : null}
                  {tag}
                </li>
              ))}
            </motion.ul>

            <motion.div
              className="mt-8 flex flex-wrap items-center gap-3"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.7 }}
            >
              <Button href="#kontakt">{t('ctaPrimary')}</Button>
              <Button href="#sluzby" variant="ghost" withArrow={false}>
                {t('ctaSecondary')}
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* maskot — celý, nikdy neuřezaný, vychází zdola z gradientu */}
        <div className="pointer-events-none absolute bottom-0 right-[3%] z-10 hidden items-end gap-3 lg:flex">
          {bubble ? (
            <div className="pointer-events-auto mb-48">
              <SpeechBubble text={t('mascot')} onClose={() => setBubble(false)} />
            </div>
          ) : null}
          <Mascot pose="wave" height={280} priority />
        </div>

        {/* indikátor skrolu */}
        <div className="absolute bottom-8 left-5 z-10 hidden items-center gap-4 md:left-10 md:flex">
          <span className="font-display text-[10px] uppercase tracking-[0.3em] text-muted [writing-mode:vertical-rl]">
            {t('scroll')}
          </span>
          <div className="relative h-24 w-px bg-[var(--line)]">
            <motion.span
              className="absolute left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-[var(--blue-bright)] shadow-glow"
              animate={reduced ? undefined : { top: ['0%', '85%', '0%'] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
