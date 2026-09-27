'use client';

import { AnimatePresence, motion, useInView } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/FeatureIcon';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { Mascot } from '@/components/mascot/Mascot';
import { SpeechBubble } from '@/components/mascot/SpeechBubble';
import { services } from '@/content/services';
import type { Pose } from '@/content/mascot';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { PlatformScene } from './PlatformScene';

const COUNT = services.length;
const STAGGER = 0.12;
const SPRING = { type: 'spring' as const, stiffness: 220, damping: 28, mass: 0.9 };
/** podkmitávající pružina pro let karet dovnitř — vyšší tuhost, nižší tlumení */
const FLIGHT_SPRING = { type: 'spring' as const, stiffness: 170, damping: 15, mass: 0.9 };

/**
 * Rozložení vějíře je čistě 2D (translate + rotate + scale).
 * Žádný sdílený `preserve-3d` kontext, takže se karty nemůžou protnout —
 * pořadí řídí výhradně z-index. Vlastní 3D překlopení má každá karta
 * ve své vlastní `perspective`, tedy izolovaně od sousedů.
 */
function layout(index: number, active: number) {
  const offset = index - (COUNT - 1) / 2;
  const isActive = index === active;

  return {
    x: offset * 158,
    y: isActive ? -118 : Math.abs(offset) * 14,
    rotate: isActive ? 0 : offset * 7,
    scaleY: isActive ? 1 : 0.82,
    scale: isActive ? 1.06 : 1,
    opacity: 1,
  };
}

/** Odkud karta „přilétá" při vstupu do sekce — pro každý index jiná trajektorie. */
function offscreen(index: number) {
  const variants = [
    { x: 0, y: -640, rotate: -130, scale: 0.4, opacity: 0 }, // shora
    { x: -620, y: 40, rotate: -220, scale: 0.35, opacity: 0 }, // zleva
    { x: 0, y: 260, rotate: 200, scale: 0.25, opacity: 0 }, // zezadu/zdola
    { x: 620, y: 40, rotate: 220, scale: 0.35, opacity: 0 }, // zprava
    { x: 360, y: -520, rotate: -260, scale: 0.4, opacity: 0 }, // diagonála zprava shora
  ];
  return variants[index % variants.length];
}

export function ServicesTable() {
  const t = useTranslations('services');
  const tItems = useTranslations('services.items');
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [pose, setPose] = useState<Pose>('point');
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const walkTimer = useRef<number | null>(null);

  // vstupní choreografie: karty přiletí → kruh zabliká → nadpis/taby → maskot přijde
  const stageInViewRef = useRef<HTMLDivElement>(null);
  const stageInView = useInView(stageInViewRef, { once: true, margin: '-15% 0px' });
  const [entered, setEntered] = useState(reduced);
  const [flash, setFlash] = useState(reduced);
  const [showHeading, setShowHeading] = useState(reduced);
  const [mascotIn, setMascotIn] = useState(reduced);

  const slug = services[active].slug;
  const bubbleSide = active <= (COUNT - 1) / 2 ? 'left' : 'right';

  const choose = useCallback(
    (index: number) => {
      setActive((current) => {
        if (current === index) return current;
        if (!reduced) {
          setPose('walk');
          setAnimating(true);
          if (walkTimer.current) window.clearTimeout(walkTimer.current);
          walkTimer.current = window.setTimeout(() => {
            setPose('point');
            setAnimating(false);
          }, 780);
        }
        return index;
      });
    },
    [reduced],
  );

  // POZOR: `entered` se schválně nesmí objevit v dependency poli —
  // jakmile by se effect spustil znovu kvůli změně `entered`, React by
  // ho nejdřív ÚKLIDIL (zrušil právě nastavené timery) a hned zase
  // vrátil kvůli guard podmínce, takže by se flash/nadpis/maskot nikdy
  // nespustily. Opakované spuštění hlídá ref, ne stav.
  const startedRef = useRef(false);
  useEffect(() => {
    if (reduced || !stageInView || startedRef.current) return;
    startedRef.current = true;
    setEntered(true);
    const t1 = window.setTimeout(() => setFlash(true), STAGGER * (COUNT - 1) * 1000 + 850);
    const t2 = window.setTimeout(() => setShowHeading(true), STAGGER * (COUNT - 1) * 1000 + 950);
    const t3 = window.setTimeout(() => setMascotIn(true), STAGGER * (COUNT - 1) * 1000 + 1250);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [reduced, stageInView]);

  // ambientní pohyb (rotace platformy, dýchání sloupů) běží jen na obrazovce
  useEffect(() => {
    const node = stage.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: '120px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => {
    if (walkTimer.current) window.clearTimeout(walkTimer.current);
  }, []);

  return (
    <section id="sluzby" className="relative overflow-hidden py-24 md:py-28" aria-labelledby="sluzby-title">
      <div ref={stageInViewRef} className="shell text-center">
        <motion.div
          initial={reduced ? undefined : { opacity: 0, y: 16 }}
          animate={showHeading ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <SplitHeading
            as="h2"
            id="sluzby-title"
            className="mx-auto max-w-3xl font-display text-[clamp(1.8rem,4.2vw,3.2rem)] font-bold uppercase leading-[1.08]"
            parts={[{ text: t('title') + ' ' }, { text: t('titleAccent'), accent: true }]}
          />
          <p className="mx-auto mt-4 max-w-md text-muted">{t('subtitle')}</p>
        </motion.div>
      </div>

      {/* kulaté taby */}
      <motion.div
        className="shell mt-10"
        initial={reduced ? undefined : { opacity: 0, y: 12 }}
        animate={showHeading ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <ul className="mx-auto flex max-w-3xl flex-wrap items-start justify-center gap-5 md:gap-9">
          {services.map((item, index) => (
            <li key={item.slug}>
              <button
                type="button"
                onClick={() => choose(index)}
                aria-pressed={active === index}
                className="group flex w-20 flex-col items-center gap-2.5 text-center"
              >
                <span
                  className={`grid h-14 w-14 place-items-center rounded-full border transition-[color,border-color,background-color,box-shadow] duration-500 ${
                    active === index
                      ? 'border-[var(--blue-bright)] bg-[rgba(31,91,255,0.16)] text-[var(--blue-bright)] shadow-glow'
                      : 'border-[var(--line)] text-muted group-hover:border-[rgba(80,120,255,0.45)] group-hover:text-ink'
                  }`}
                >
                  <Icon name={item.icon} className="h-5 w-5" />
                </span>
                <span
                  className={`font-display text-[10px] uppercase tracking-[0.14em] transition-colors ${
                    active === index ? 'text-ink' : 'text-muted'
                  }`}
                >
                  {tItems(`${item.slug}.tab`)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </motion.div>

      {/* ===== STŮL (desktop) ===== */}
      <div ref={stage} className="relative mt-2 hidden h-[520px] md:block">
        <div className="pointer-events-none absolute inset-0 mx-auto h-full w-full max-w-5xl">
          <PlatformScene active={visible && !reduced} flash={flash} />
        </div>

        {/* karty */}
        <div className="absolute inset-x-0 bottom-[86px] mx-auto h-[250px] max-w-5xl">
          {services.map((item, index) => {
            const isActive = index === active;
            const target = entered ? layout(index, active) : offscreen(index);
            const start = offscreen(index);
            return (
              <motion.button
                key={item.slug}
                type="button"
                onClick={() => choose(index)}
                onMouseEnter={() => choose(index)}
                className="absolute left-1/2 top-0 h-[240px] w-[150px] -translate-x-1/2 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-bright)]"
                style={{
                  perspective: 900,
                  zIndex: isActive ? 40 : 10 + (COUNT - Math.abs(index - active)),
                  willChange: animating || !entered ? 'transform' : 'auto',
                }}
                initial={start}
                animate={target}
                transition={
                  reduced
                    ? { duration: 0 }
                    : !entered
                      ? { duration: 0 }
                      : { ...FLIGHT_SPRING, delay: index * STAGGER }
                }
              >
                {/* zbytkový „motion blur" — tlumená kopie na startovní pozici, jen doznívá opacitou */}
                {entered && !reduced ? (
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background: 'linear-gradient(160deg,#0b1330 0%,#060a18 55%,#0a1430 100%)',
                      transform: `translate(${start.x}px, ${start.y}px) rotate(${start.rotate}deg) scale(${start.scale})`,
                    }}
                    initial={{ opacity: 0.45 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.5, delay: index * STAGGER }}
                  />
                ) : null}

                <motion.div
                  className="preserve-3d relative h-full w-full"
                  initial={false}
                  animate={{ rotateY: isActive ? 180 : 0 }}
                  transition={reduced ? { duration: 0 } : { ...SPRING, damping: 26 }}
                >
                  {/* rub */}
                  <span
                    className="backface-hidden absolute inset-0 grid place-items-center overflow-hidden rounded-2xl border border-[rgba(80,120,255,0.35)]"
                    style={{ background: 'linear-gradient(160deg,#0b1330 0%,#060a18 55%,#0a1430 100%)' }}
                  >
                    <svg viewBox="0 0 120 180" className="absolute inset-0 h-full w-full text-[rgba(120,160,255,0.3)]" aria-hidden>
                      <rect x="8" y="8" width="104" height="164" rx="10" fill="none" stroke="currentColor" strokeWidth="0.7" />
                      <rect x="14" y="14" width="92" height="152" rx="7" fill="none" stroke="currentColor" strokeWidth="0.4" strokeDasharray="3 5" />
                      <circle cx="60" cy="90" r="30" fill="none" stroke="currentColor" strokeWidth="0.5" />
                      <circle cx="60" cy="90" r="20" fill="none" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 4" />
                      {Array.from({ length: 20 }).map((_, dot) => (
                        <circle key={dot} cx={12 + ((dot * 37) % 96)} cy={16 + ((dot * 53) % 148)} r={dot % 3 === 0 ? 1.1 : 0.6} fill="rgba(200,220,255,0.5)" />
                      ))}
                    </svg>
                    <span className="relative z-10 flex flex-col items-center gap-2 text-[var(--blue-bright)]">
                      <Icon name={item.icon} className="h-7 w-7" />
                      <span className="font-display text-[10px] uppercase tracking-[0.2em] text-muted">{item.num}</span>
                    </span>
                  </span>

                  {/* líc */}
                  <span
                    className="backface-hidden absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border border-[rgba(61,123,255,0.55)] p-4 text-center"
                    style={{
                      transform: 'rotateY(180deg)',
                      background: 'linear-gradient(165deg,rgba(18,30,70,0.96),rgba(6,10,22,0.98))',
                      boxShadow: '0 0 46px rgba(31,91,255,0.45)',
                    }}
                  >
                    <span className="font-display text-xs tracking-[0.22em] text-[var(--blue-bright)]">{item.num}</span>
                    <Icon name={item.icon} className="h-8 w-8 text-ink" />
                    <span className="font-display text-sm font-bold uppercase leading-tight text-ink">
                      {tItems(`${item.slug}.card`)}
                    </span>
                  </span>
                </motion.div>
              </motion.button>
            );
          })}
        </div>

        {/* maskot chodí podél předního okraje stolu — vždy nad kartami */}
        <motion.div
          className="pointer-events-none absolute bottom-6 left-1/2 z-[70] hidden lg:block"
          initial={reduced ? undefined : { x: -560, opacity: 0 }}
          animate={
            mascotIn
              ? { x: (active - (COUNT - 1) / 2) * 158 + 112, opacity: 1 }
              : reduced
                ? { x: (active - (COUNT - 1) / 2) * 158 + 112, opacity: 1 }
                : undefined
          }
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 140, damping: 22 }}
        >
          <div className="relative">
            <Mascot pose={pose} height={290} followCursor={false} />
            <AnimatePresence mode="wait">
              <motion.div
                key={slug}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`pointer-events-auto absolute -top-2 w-[220px] ${
                  bubbleSide === 'right' ? 'right-[78%]' : 'left-[78%]'
                }`}
              >
                <SpeechBubble text={tItems(`${slug}.mascotLine`)} compact side={bubbleSide} />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* ===== KARUSEL (mobil) — nativní scroll-snap, žádné JS přetahování ===== */}
      <div className="mt-8 md:hidden">
        <div className="flex justify-center">
          <Mascot pose={pose} height={180} followCursor={false} />
        </div>
        <div className="mt-3 px-5">
          <SpeechBubble text={tItems(`${slug}.mascotLine`)} compact className="mx-auto" />
        </div>

        <ul
          className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[calc(50vw-75px)] pb-6"
          data-lenis-prevent
          onScroll={(event) => {
            const el = event.currentTarget;
            const index = Math.round(el.scrollLeft / 166);
            choose(Math.max(0, Math.min(COUNT - 1, index)));
          }}
        >
          {services.map((item, index) => (
            <motion.li
              key={item.slug}
              className="shrink-0 snap-center"
              initial={reduced ? undefined : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10%' }}
              transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <button
                type="button"
                onClick={() => choose(index)}
                className={`flex h-[230px] w-[150px] flex-col items-center justify-center gap-3 rounded-2xl border p-4 text-center transition-[opacity,transform,border-color] duration-300 ${
                  active === index
                    ? 'scale-100 border-[rgba(61,123,255,0.6)] bg-[rgba(18,30,70,0.95)] opacity-100'
                    : 'scale-95 border-[var(--line)] bg-[rgba(10,15,28,0.95)] opacity-80'
                }`}
              >
                <span className="font-display text-[11px] tracking-[0.2em] text-[#c3d5ff]">{item.num}</span>
                <Icon name={item.icon} className="h-7 w-7 text-ink" />
                <span className="font-display text-sm font-bold uppercase leading-tight text-ink">
                  {tItems(`${item.slug}.card`)}
                </span>
              </button>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
