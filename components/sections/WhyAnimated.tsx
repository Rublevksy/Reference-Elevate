'use client';

import { motion, useScroll } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { Mascot } from '@/components/mascot/Mascot';
import { MacbookFrame } from '@/components/mockups/MacbookFrame';
import { PhoneFrame } from '@/components/mockups/Frame';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { clamp01, seg } from '@/lib/fx';
import { DemoScreen } from './DemoScreen';

/** Sleduje, jestli je prvek poblíž / na obrazovce (pro stahování a vykreslování). */
function useNear(ref: RefObject<HTMLElement | null>, rootMargin: string) {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { rootMargin });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, rootMargin]);
  return near;
}

function useIsMobile() {
  const [mobile, setMobile] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return mobile;
}

/** Přepínač statický / animovaný (sdílí desktop i mobil). */
function ModeSwitch({ animated, onToggle, label, staticLabel, animatedLabel }: { animated: boolean; onToggle: () => void; label: string; staticLabel: string; animatedLabel: string }) {
  return (
    <div className="flex items-center justify-center gap-4">
      <span className={`text-sm transition-colors ${animated ? 'text-muted' : 'text-ink'}`}>{staticLabel}</span>
      <button
        type="button"
        role="switch"
        aria-checked={animated}
        aria-label={label}
        onClick={onToggle}
        className={`relative h-8 w-16 rounded-full border transition-colors duration-300 ${
          animated ? 'border-[rgba(61,123,255,0.6)] bg-[rgba(31,91,255,0.22)] shadow-glow' : 'border-[var(--line)] bg-white/[0.04]'
        }`}
      >
        <motion.span
          className="absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[var(--blue-bright)]"
          animate={{ left: animated ? 34 : 4 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      </button>
      <span className={`text-sm transition-colors ${animated ? 'text-ink' : 'text-muted'}`}>{animatedLabel}</span>
    </div>
  );
}

/** Záblesk při přepnutí verze — přes obrazovku přejede světelný pruh. */
function Glitch({ on }: { on: boolean }) {
  return (
    <>
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(120,180,255,0.35)_48%,transparent_52%)]"
        animate={{ opacity: on ? 1 : 0, y: on ? ['-100%', '100%'] : '0%' }}
        transition={{ duration: 0.32 }}
      />
      <motion.span aria-hidden className="pointer-events-none absolute inset-0 bg-white" animate={{ opacity: on ? [0, 0.3, 0] : 0 }} transition={{ duration: 0.3 }} />
    </>
  );
}

export function WhyAnimated() {
  const t = useTranslations('whyAnimated');
  const reduced = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const laptopBox = useRef<HTMLDivElement>(null);
  const phoneStage = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(true);
  const [glitch, setGlitch] = useState(false);
  const isMobile = useIsMobile();

  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });

  const nearDesktop = useNear(laptopBox, '1400px 0px');
  const onDesktop = useNear(laptopBox, '120px 0px');
  const nearPhone = useNear(phoneStage, '1400px 0px');
  const onPhone = useNear(phoneStage, '120px 0px');

  // desktop: sekce je připnutá — skrol stránky = skrol webu v notebooku
  // (na okrajích kus klidu, kde navazují přechodové scény)
  const desktopProgress = () => (reduced ? 0 : seg(scrollYProgress.get(), 0.06, 0.94));
  // mobil: telefon stojí (sticky), jeho web se posouvá, dokud jím projíždí prst
  const phoneProgress = () => {
    const node = phoneStage.current;
    if (!node || reduced) return 0;
    const rect = node.getBoundingClientRect();
    const range = rect.height - window.innerHeight;
    return clamp01((-rect.top - range * 0.04) / (range * 0.92));
  };

  const toggle = () => {
    setGlitch(true);
    window.setTimeout(() => setGlitch(false), 320);
    setAnimated((v) => !v);
  };

  const heading = (
    <div className="mx-auto max-w-xl text-center">
      <SplitHeading
        as="h2"
        id="proc-animace-title"
        className="font-display text-[clamp(1.7rem,4vw,3rem)] font-bold uppercase leading-[1.08]"
        parts={[{ text: t('title') + ' ' }, { text: t('titleAccent'), accent: true }]}
      />
      <p className="mx-auto mt-3 text-sm text-muted md:text-base">{t('lead')}</p>
    </div>
  );
  const pills = t.raw('pills') as string[];

  return (
    <section
      id="proc-animace"
      ref={section}
      // pin jen na desktopu; mobil má vlastní připnutý telefon v běžném toku
      className={reduced ? 'relative' : 'relative md:h-[256vh]'}
      aria-labelledby="proc-animace-title"
    >
      {/* ---- DESKTOP ---- */}
      <div className={`hidden md:block ${reduced ? '' : 'md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:justify-center md:pb-4 md:pt-[88px]'}`}>
        <div className="shell">
          {heading}
          <div className="mt-6">
            <ModeSwitch animated={animated} onToggle={toggle} label={t('toggleLabel')} staticLabel={t('static')} animatedLabel={t('animated')} />
          </div>

          <div ref={laptopBox} data-land="why-laptop" className="relative mx-auto mt-8 w-full max-w-[min(720px,calc((100dvh-400px)*1.5))]">
            {/* bez vlastní vstupní animace — notebook sem „přiveze" přechodová scéna */}
            <MacbookFrame>
              <div data-why-screen className="absolute inset-0 overflow-hidden">
                <DemoScreen
                  kind="desktop"
                  animated={animated}
                  progress={desktopProgress}
                  load={isMobile === false && nearDesktop}
                  active={isMobile === false && onDesktop}
                />
                <Glitch on={glitch} />
              </div>
            </MacbookFrame>

            <p className="mt-8 text-center text-xs text-muted">{t('hint')}</p>
            <ul className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              {pills.map((pill, i) => (
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
        </div>
      </div>

      {/* ---- MOBIL: nadpis, pak telefon stojí a jeho web se posouvá s prstem ---- */}
      <div className="md:hidden">
        <div className="shell pt-16">{heading}</div>
        <div ref={phoneStage} className="relative" style={{ height: reduced ? 'auto' : '230svh' }}>
          <div className={reduced ? 'py-8' : 'sticky top-[84px] flex h-[calc(100svh-84px)] flex-col items-center justify-center gap-5 px-5'}>
            <ModeSwitch animated={animated} onToggle={toggle} label={t('toggleLabel')} staticLabel={t('static')} animatedLabel={t('animated')} />
            <PhoneFrame className="!w-[min(250px,calc((100svh-270px)/2.25))]">
              <div data-why-screen-m className="relative aspect-[390/844] w-full overflow-hidden">
                <DemoScreen kind="mobile" animated={animated} progress={phoneProgress} load={isMobile === true && nearPhone} active={isMobile === true && onPhone} />
                <Glitch on={glitch} />
              </div>
            </PhoneFrame>
            <ul className="flex flex-wrap items-center justify-center gap-2">
              {pills.map((pill) => (
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
