'use client';

import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { Mascot } from '@/components/mascot/Mascot';
import { MacbookFrame } from '@/components/mockups/MacbookFrame';
import { PhoneFrame } from '@/components/mockups/Frame';
import { useReducedMotion } from '@/lib/useReducedMotion';
import manifest from '@/content/capture-manifest.json';

const DESKTOP = manifest.demo.desktop;
const MOBILE = manifest.demo.mobile;
/** poměr výšky full-page screenshotu k jeho šířce */
const DESKTOP_RATIO = DESKTOP.pageHeight / DESKTOP.pageWidth;
const MOBILE_RATIO = MOBILE.pageHeight / MOBILE.pageWidth;

export function WhyAnimated() {
  const t = useTranslations('whyAnimated');
  const reduced = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(true);
  const [glitch, setGlitch] = useState(false);
  const [ready, setReady] = useState(false);
  const shotRef = useRef<HTMLImageElement>(null);
  const [inView, setInView] = useState(false);

  const target = useRef(0);
  const current = useRef(0);
  const raf = useRef(0);

  const { scrollYProgress } = useScroll({
    target: section,
    offset: ['start start', 'end end'],
  });

  // video se stahuje až když se sekce blíží
  useEffect(() => {
    const node = section.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setReady(true);
          observer.disconnect();
        }
      },
      { rootMargin: '600px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // skrol stránky = skrol stránky v notebooku
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const eased = Math.max(0, Math.min(1, (p - 0.08) / 0.84));
    target.current = eased;

    const node = screen.current;
    if (node) {
      const shotHeight = node.clientWidth * DESKTOP_RATIO;
      // přímý zápis — dřív setState při každém scrollu překresloval celou sekci
      const y = -eased * Math.max(0, shotHeight - node.clientHeight);
      if (shotRef.current) shotRef.current.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
    }
  });

  // smyčka videa běží jen když je sekce na obrazovce
  useEffect(() => {
    const node = section.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '100px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // plynulé dojíždění videa k cíli, ať scrubbing neseká
  useEffect(() => {
    if (!animated || reduced || !inView) return;
    const tick = () => {
      const el = video.current;
      if (el && el.duration) {
        current.current += (target.current - current.current) * 0.16;
        const time = current.current * (el.duration - 0.05);
        if (Math.abs(el.currentTime - time) > 0.02) el.currentTime = time;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [animated, reduced, inView]);

  const toggle = () => {
    setGlitch(true);
    window.setTimeout(() => setGlitch(false), 320);
    setAnimated((v) => !v);
  };

  return (
    <section
      id="proc-animace"
      ref={section}
      // pin (scrubbing videa v notebooku) jen na desktopu; mobil má telefon v běžném toku
      className={reduced ? 'relative' : 'relative md:h-[256vh]'}
      aria-labelledby="proc-animace-title"
    >
      <div className={reduced ? '' : 'md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:justify-center md:pb-4 md:pt-[88px]'}>
        <div className="shell py-16 md:py-0">
          <div className="mx-auto max-w-xl text-center">
            <SplitHeading
              as="h2"
              id="proc-animace-title"
              className="font-display text-[clamp(1.7rem,4vw,3rem)] font-bold uppercase leading-[1.08]"
              parts={[{ text: t('title') + ' ' }, { text: t('titleAccent'), accent: true }]}
            />
            <p className="mx-auto mt-3 text-sm text-muted md:text-base">{t('lead')}</p>
          </div>

          {/* přepínač */}
          <div className="mt-6 flex items-center justify-center gap-4">
            <span className={`text-sm transition-colors ${animated ? 'text-muted' : 'text-ink'}`}>{t('static')}</span>
            <button
              type="button"
              role="switch"
              aria-checked={animated}
              aria-label={t('toggleLabel')}
              onClick={toggle}
              className={`relative h-8 w-16 rounded-full border transition-colors duration-300 ${
                animated
                  ? 'border-[rgba(61,123,255,0.6)] bg-[rgba(31,91,255,0.22)] shadow-glow'
                  : 'border-[var(--line)] bg-white/[0.04]'
              }`}
            >
              <motion.span
                className="absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[var(--blue-bright)]"
                animate={{ left: animated ? 34 : 4 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            </button>
            <span className={`text-sm transition-colors ${animated ? 'text-ink' : 'text-muted'}`}>{t('animated')}</span>
          </div>

          {/* ---- notebook (desktop) ---- */}
          <div data-land="why-laptop" className="relative mx-auto mt-8 hidden w-full max-w-[min(720px,calc((100dvh-400px)*1.5))] md:block">
            {/* bez vlastní vstupní animace — notebook sem „přiveze" přechodová scéna;
                druhé objevení při dojetí do záběru působilo jako dvojitý skok */}
            <motion.div
              initial={false}
              style={{ perspective: 1400 }}
            >
              <MacbookFrame>
                <div ref={screen} data-why-screen className="absolute inset-0 overflow-hidden bg-[#04060b]">
                  {/* animovaná verze — scrubbing videa */}
                  <motion.video
                    ref={video}
                    className="absolute inset-0 h-full w-full object-cover object-top"
                    src={ready ? '/demo/desktop.mp4' : undefined}
                    poster="/demo/desktop-poster.jpg"
                    preload={ready ? 'auto' : 'none'}
                    muted
                    playsInline
                    animate={{ opacity: animated ? 1 : 0 }}
                    transition={{ duration: 0.25 }}
                  />
                  {/* statická verze — jen posun screenshotu.
                      Záměrně <img>: scrubbing posouváme transformem a obrázek
                      je už předem zmenšený, optimizér by nic nepřidal. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <motion.img
                    ref={shotRef}
                    src="/demo/desktop.jpg"
                    alt=""
                    aria-hidden
                    loading="lazy"
                    className="absolute inset-x-0 top-0 w-full max-w-none grayscale"
                    animate={{ opacity: animated ? 0 : 1 }}
                    transition={{ duration: 0.25 }}
                  />

                  {/* glitch při přepnutí */}
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(120,180,255,0.35)_48%,transparent_52%)]"
                    animate={{ opacity: glitch ? 1 : 0, y: glitch ? ['-100%', '100%'] : '0%' }}
                    transition={{ duration: 0.32 }}
                  />
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-white"
                    animate={{ opacity: glitch ? [0, 0.35, 0] : 0 }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </MacbookFrame>
            </motion.div>

            <p className="mt-8 text-center text-xs text-muted">{t('hint')}</p>

            {/* tři krátké pilulky místo argumentačních karet */}
            <ul className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              {(t.raw('pills') as string[]).map((pill, i) => (
                <motion.li
                  key={pill}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="rounded-full border border-[var(--line)] bg-white/[0.03] px-4 py-2 text-xs text-muted"
                >
                  {pill}
                </motion.li>
              ))}
            </ul>
            <p className="mt-4 text-center text-xs text-muted">{t('footnote')}</p>

            {/* maskot reaguje na režim */}
            <div className="pointer-events-none absolute -bottom-4 -left-[190px] hidden 2xl:block">
              <Mascot pose={animated ? 'celebrate' : 'bored'} height={210} followCursor={false} />
            </div>
          </div>

          {/* ---- telefon (mobil) ---- */}
          <div className="mx-auto mt-8 w-full max-w-[260px] md:hidden">
            <PhoneFrame>
              <div className="relative aspect-[390/844] w-full overflow-hidden">
                {animated ? (
                  <video
                    className="absolute inset-0 h-full w-full object-cover object-top"
                    src={ready ? '/demo/mobile.mp4' : undefined}
                    poster="/demo/mobile-poster.jpg"
                    preload={ready ? 'metadata' : 'none'}
                    muted
                    loop
                    autoPlay
                    playsInline
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src="/demo/mobile.jpg"
                    alt=""
                    aria-hidden
                    loading="lazy"
                    className="absolute inset-x-0 top-0 w-full max-w-none grayscale"
                    style={{ aspectRatio: `1 / ${MOBILE_RATIO}` }}
                  />
                )}
              </div>
            </PhoneFrame>

            <ul className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {(t.raw('pills') as string[]).map((pill) => (
                <li key={pill} className="rounded-full border border-[var(--line)] bg-white/[0.03] px-3.5 py-1.5 text-[11px] text-muted">
                  {pill}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Alias — od 3. iterace se argumenty nahradily pilulkami přímo u notebooku,
 * ale ostatní sekce dál importují `WhyAnimatedBlock` jako jeden blok. */
export function WhyAnimatedBlock() {
  return <WhyAnimated />;
}
