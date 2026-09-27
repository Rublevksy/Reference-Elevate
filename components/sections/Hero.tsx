'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { Mascot } from '@/components/mascot/Mascot';
import { SpeechBubble } from '@/components/mascot/SpeechBubble';
import { useDeviceTier } from '@/lib/useDeviceTier';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import type { HeroProgress } from '@/components/three/MacbookScene';

const MacbookScene = dynamic(() => import('@/components/three/MacbookScene'), {
  ssr: false,
  loading: () => <SceneLoader />,
});

function SceneLoader() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="relative h-24 w-24">
        <div className="absolute inset-0 animate-spin-slow rounded-full border border-[var(--line)]" />
        <div className="absolute inset-3 rounded-full border border-[rgba(61,123,255,0.4)] animate-pulse-glow" />
        <div className="absolute inset-0 grid place-items-center font-display text-[10px] tracking-[0.3em] text-muted">
          3D
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  const t = useTranslations('hero');
  const section = useRef<HTMLElement>(null);
  const progress = useRef({ scroll: 0, pointerX: 0, pointerY: 0 }) as HeroProgress;
  const fallbackRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const mascotRef = useRef<HTMLDivElement>(null);
  const { tier, reducedMotion, ready } = useDeviceTier();
  const [bubble, setBubble] = useState(true);
  const [idle, setIdle] = useState(false);

  // Scéna se připojí, až když má prohlížeč chvilku klid — hero je do té doby
  // kompletní i bez ní a hydratace zbytku stránky se nezdržuje.
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
    const node = section.current;
    if (!node) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: node,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => {
          progress.current.scroll = self.progress;

          // Při náletu do displeje text ustoupí, ať nekoliduje s obrazovkou.
          const fade = Math.max(0, Math.min(1, (self.progress - 0.68) / 0.22));
          const hide = (node: HTMLDivElement | null, shift: number) => {
            if (!node) return;
            node.style.opacity = String(1 - fade);
            node.style.transform = `translate3d(0, ${-shift * fade}px, 0)`;
          };
          hide(copyRef.current, 60);
          hide(mascotRef.current, 30);

          if (fallbackRef.current) {
            fallbackRef.current.style.transform = `translate3d(0, ${self.progress * -40}px, 0) scale(${
              1 + self.progress * 0.16
            })`;
          }
        },
      });
    }, node);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const onMove = (event: PointerEvent) => {
      progress.current.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      progress.current.pointerY = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [reducedMotion]);

  return (
    <section
      id="hero"
      ref={section}
      className="relative h-[250vh] md:h-[260vh]"
      aria-label={t('eyebrow')}
    >
      <div className="sticky top-0 flex h-dvh items-start overflow-hidden pt-[92px] md:items-center md:pt-0">
        {/* 3D scéna / fallback */}
        {/* Plátno je přes celou šířku — scéna je posunutá doprava v 3D,
            takže na okraji plátna nevzniká viditelná hrana.
            Na mobilu vizuál sedí v dolní polovině a text má klid nahoře. */}
        <div className="absolute inset-x-0 bottom-0 h-[46%] md:inset-0 md:h-full">
          {use3d ? (
            <MacbookScene progress={progress} />
          ) : (
            <div ref={fallbackRef} className="relative h-full w-full will-change-transform">
              {/* Soubor je už zmenšený, optimizér by jen přidal round-trip navíc. */}
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
          <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-2/3 bg-gradient-to-r from-[var(--bg)] via-[var(--bg)]/60 to-transparent md:block" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-[var(--bg)] to-transparent md:hidden" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/5 bg-gradient-to-t from-[var(--bg)] to-transparent" />
        </div>

        {/* text */}
        <div
          ref={copyRef}
          className="shell relative z-10 grid w-full items-center will-change-[opacity,transform]"
        >
          <motion.div
            className="max-w-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <motion.p
              className="eyebrow flex items-center gap-3"
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35, duration: 0.7 }}
            >
              <span className="inline-block h-px w-8 bg-[var(--text-muted)]" />
              {t('eyebrow')}
            </motion.p>

            <SplitHeading
              as="h1"
              delay={0.45}
              className="mt-6 font-display text-[clamp(1.9rem,4.4vw,3.5rem)] font-bold uppercase leading-[1.05]"
              parts={[{ text: t('title') + ' ' }, { text: t('titleAccent'), accent: true }]}
            />

            <motion.p
              className="mt-6 max-w-sm text-base leading-relaxed text-muted"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.8 }}
            >
              {t('subtitle')}
            </motion.p>

            <motion.ul
              className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] uppercase tracking-[0.2em] text-muted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.15, duration: 0.8 }}
            >
              {(t.raw('tags') as string[]).map((tag, index) => (
                <li key={tag} className="flex items-center gap-3">
                  {index > 0 ? <span className="h-1 w-1 rounded-full bg-[var(--blue)]" /> : null}
                  {tag}
                </li>
              ))}
            </motion.ul>

            <motion.div
              className="mt-9 flex flex-wrap items-center gap-3"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.25, duration: 0.8 }}
            >
              <Button href="#kontakt">{t('ctaPrimary')}</Button>
              <Button href="#sluzby" variant="ghost" withArrow={false}>
                {t('ctaSecondary')}
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* maskot vedle notebooku */}
        <div
          ref={mascotRef}
          className="pointer-events-none absolute bottom-0 right-[3%] z-10 hidden items-end gap-3 will-change-[opacity,transform] lg:flex"
        >
          {bubble ? (
            <div className="pointer-events-auto mb-52">
              <SpeechBubble text={t('mascot')} onClose={() => setBubble(false)} />
            </div>
          ) : null}
          <Mascot pose="wave" height={300} priority />
        </div>

        {/* indikátor skrolu */}
        <div className="absolute bottom-8 left-5 z-10 hidden items-center gap-4 md:left-10 md:flex">
          <span className="font-display text-[10px] uppercase tracking-[0.3em] text-muted [writing-mode:vertical-rl]">
            {t('scroll')}
          </span>
          <div className="relative h-24 w-px bg-[var(--line)]">
            <motion.span
              className="absolute left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-[var(--blue-bright)] shadow-glow"
              animate={{ top: ['0%', '85%', '0%'] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
