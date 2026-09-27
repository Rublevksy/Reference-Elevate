'use client';

import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { Eye, MousePointerClick, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { Mascot } from '@/components/mascot/Mascot';
import { LaptopShell } from '@/components/mockups/LaptopShell';
import { PhoneFrame } from '@/components/mockups/Frame';
import { useReducedMotion } from '@/lib/useReducedMotion';
import manifest from '@/content/capture-manifest.json';

const ICONS = [Eye, Sparkles, MousePointerClick];

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
  const [shotOffset, setShotOffset] = useState(0);

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
      setShotOffset(-eased * Math.max(0, shotHeight - node.clientHeight));
    }
  });

  // plynulé dojíždění videa k cíli, ať scrubbing neseká
  useEffect(() => {
    if (!animated || reduced) return;
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
  }, [animated, reduced]);

  const toggle = () => {
    setGlitch(true);
    window.setTimeout(() => setGlitch(false), 320);
    setAnimated((v) => !v);
  };

  const args = t.raw('args') as { title: string; text: string }[];

  return (
    <section
      id="proc-animace"
      ref={section}
      className="relative"
      style={{ height: reduced ? 'auto' : '300vh' }}
      aria-labelledby="proc-animace-title"
    >
      <div className={reduced ? '' : 'md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:justify-center'}>
        <div className="shell py-16 md:py-0">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">{t('eyebrow')}</p>
            <SplitHeading
              as="h2"
              className="mt-3 font-display text-[clamp(1.7rem,4vw,3rem)] font-bold uppercase leading-[1.08]"
              parts={[{ text: t('title') + ' ' }, { text: t('titleAccent'), accent: true }]}
            />
            <p className="mx-auto mt-4 max-w-xl text-sm text-muted md:text-base">{t('lead')}</p>
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
          <div className="relative mx-auto mt-8 hidden w-full max-w-[720px] md:block">
            <motion.div
              initial={{ rotateX: 14, y: 30, opacity: 0 }}
              whileInView={{ rotateX: 0, y: 0, opacity: 1 }}
              viewport={{ once: true, margin: '-20%' }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              style={{ perspective: 1400 }}
            >
              <LaptopShell screenClassName="aspect-[16/10]">
                <div ref={screen} className="absolute inset-0 overflow-hidden">
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
                    src="/demo/desktop.jpg"
                    alt=""
                    aria-hidden
                    loading="lazy"
                    className="absolute inset-x-0 top-0 w-full max-w-none grayscale"
                    style={{ y: shotOffset }}
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
              </LaptopShell>
            </motion.div>

            <p className="mt-12 text-center text-xs text-muted">{t('hint')}</p>

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
          </div>
        </div>
      </div>

    </section>
  );
}

/** Argumenty jdou do vlastní sekce — uvnitř připnutého bloku by se překrývaly. */
function Arguments() {
  const t = useTranslations('whyAnimated');
  const args = t.raw('args') as { title: string; text: string }[];

  return (
    <section className="shell relative z-10 pb-20 pt-10">
      <div className="grid gap-5 md:grid-cols-3">
          {args.map((arg, index) => {
            const ItemIcon = ICONS[index];
            return (
              <motion.article
                key={arg.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-10% 0px' }}
                transition={{ duration: 0.65, delay: index * 0.1 }}
                className="glass rounded-card p-6"
              >
                <span className="grid h-12 w-12 place-items-center rounded-xl border border-[rgba(61,123,255,0.4)] bg-[rgba(10,20,50,0.6)] text-[var(--blue-bright)]">
                  <ItemIcon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-base font-bold uppercase leading-tight">{arg.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{arg.text}</p>
              </motion.article>
            );
          })}
      </div>
      <p className="mt-8 text-center text-sm text-muted">{t('footnote')}</p>
    </section>
  );
}

/** Scéna + argumenty pohromadě, aby se stránka skládala z jednoho importu. */
export function WhyAnimatedBlock() {
  return (
    <>
      <WhyAnimated />
      <Arguments />
    </>
  );
}
