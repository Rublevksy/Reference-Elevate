'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/ui/FeatureIcon';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { Mascot } from '@/components/mascot/Mascot';
import { SpeechBubble } from '@/components/mascot/SpeechBubble';
import { services } from '@/content/services';
import type { Pose } from '@/content/mascot';
import { useReducedMotion } from '@/lib/useReducedMotion';

const COUNT = services.length;

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
    // „ležení na stole" naznačíme zploštěním, ne rotací v 3D
    scaleY: isActive ? 1 : 0.82,
    scale: isActive ? 1.06 : 1,
  };
}

export function ServicesTable() {
  const t = useTranslations('services');
  const tItems = useTranslations('services.items');
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [pose, setPose] = useState<Pose>('point');
  const [visible, setVisible] = useState(false);
  // will-change držíme jen po dobu přeskupení karet
  const [animating, setAnimating] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const walkTimer = useRef<number | null>(null);

  const slug = services[active].slug;

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

  const spring = { type: 'spring' as const, stiffness: 220, damping: 28, mass: 0.9 };

  return (
    <section id="sluzby" className="relative overflow-hidden py-24 md:py-28" aria-labelledby="sluzby-title">
      <div className="shell text-center">
        <p className="eyebrow">{t('eyebrow')}</p>
        <SplitHeading
          as="h2"
          className="mx-auto mt-4 max-w-3xl font-display text-[clamp(1.8rem,4.2vw,3.2rem)] font-bold uppercase leading-[1.08]"
          parts={[{ text: t('title') + ' ' }, { text: t('titleAccent'), accent: true }]}
        />
        <p className="mx-auto mt-5 max-w-md text-muted">{t('subtitle')}</p>
      </div>

      {/* kulaté taby */}
      <div className="shell mt-10">
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
      </div>

      {/* ===== STŮL (desktop) ===== */}
      <div ref={stage} className="relative mt-2 hidden h-[520px] md:block">
        {/* celá atmosféra stolu je jedno SVG s jednou rotací, ne desítky uzlů */}
        <svg
          viewBox="0 0 900 520"
          className="pointer-events-none absolute inset-0 mx-auto h-full w-full max-w-5xl"
          aria-hidden
        >
          <defs>
            <radialGradient id="table-glow" cx="50%" cy="72%" r="50%">
              <stop offset="0%" stopColor="rgba(31,91,255,0.38)" />
              <stop offset="100%" stopColor="rgba(31,91,255,0)" />
            </radialGradient>
            <linearGradient id="column" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="rgba(61,123,255,0)" />
              <stop offset="55%" stopColor="rgba(61,123,255,0.55)" />
              <stop offset="100%" stopColor="rgba(190,214,255,0.95)" />
            </linearGradient>
          </defs>

          <ellipse cx="450" cy="380" rx="430" ry="130" fill="url(#table-glow)" />

          {/* světelné sloupy */}
          <g opacity="0.85">
            {[90, 190, 300, 420, 540, 660, 770].map((x, i) => (
              <rect
                key={x}
                x={x}
                y={120 + (i % 3) * 34}
                width="2"
                height={190 - (i % 3) * 30}
                rx="1"
                fill="url(#column)"
                className={visible && !reduced ? 'column-breathe' : ''}
                style={{ animationDelay: `${i * 0.45}s` }}
              />
            ))}
          </g>

          {/* kruhový rastr platformy — jediná rotující skupina */}
          <g
            transform="translate(450 380)"
            className={visible && !reduced ? 'platform-spin' : ''}
          >
            <g transform="scale(1 0.3)">
              <circle r="400" fill="none" stroke="rgba(120,160,255,0.28)" strokeWidth="1.4" />
              <circle r="340" fill="none" stroke="rgba(120,160,255,0.16)" strokeWidth="1" strokeDasharray="4 14" />
              <circle r="240" fill="none" stroke="rgba(120,160,255,0.2)" strokeWidth="1" />
              <circle r="150" fill="none" stroke="rgba(120,160,255,0.24)" strokeWidth="1.2" strokeDasharray="22 16" />
              {Array.from({ length: 48 }).map((_, i) => {
                const a = (i / 48) * Math.PI * 2;
                const inner = i % 4 === 0 ? 352 : 372;
                return (
                  <line
                    key={i}
                    x1={Math.cos(a) * inner}
                    y1={Math.sin(a) * inner}
                    x2={Math.cos(a) * 400}
                    y2={Math.sin(a) * 400}
                    stroke="rgba(120,160,255,0.3)"
                    strokeWidth="1.2"
                  />
                );
              })}
            </g>
          </g>
        </svg>

        {/* karty */}
        <div className="absolute inset-x-0 bottom-[86px] mx-auto h-[250px] max-w-5xl">
          {services.map((item, index) => {
            const isActive = index === active;
            const l = layout(index, active);
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
                  willChange: animating ? 'transform' : 'auto',
                }}
                initial={false}
                animate={l}
                transition={reduced ? { duration: 0 } : spring}
              >
                <motion.div
                  className="preserve-3d relative h-full w-full"
                  initial={false}
                  animate={{ rotateY: isActive ? 180 : 0 }}
                  transition={reduced ? { duration: 0 } : { ...spring, damping: 26 }}
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
                    {/* záře: hotový gradient, mění se jen opacity */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500"
                      style={{ boxShadow: '0 0 46px rgba(31,91,255,0.5)' }}
                    />
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

        {/* maskot chodí podél stolu — jen translateX */}
        <motion.div
          className="pointer-events-none absolute bottom-6 left-1/2 z-30 hidden lg:block"
          initial={false}
          animate={{ x: -560 + active * 26 }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 160, damping: 24 }}
        >
          <div className="relative">
            <Mascot pose={pose} height={290} followCursor={false} />
            <AnimatePresence mode="wait">
              <motion.div
                key={slug}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="pointer-events-auto absolute -top-2 left-[78%] w-[224px]"
              >
                <SpeechBubble text={tItems(`${slug}.mascotLine`)} compact />
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
            <li key={item.slug} className="shrink-0 snap-center">
              <div
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
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* panel s detailem */}
      <div className="shell mt-4 md:mt-8">
        <AnimatePresence mode="wait">
          <motion.article
            key={slug}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: reduced ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="glass mx-auto max-w-4xl rounded-card p-7 md:p-10"
          >
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-xl">
                <p className="eyebrow">
                  {services[active].num} — {tItems(`${slug}.tab`)}
                </p>
                <h3 className="mt-3 font-display text-2xl font-bold uppercase leading-tight md:text-3xl">
                  {(tItems.raw(`${slug}.headline`) as string[])[0]}
                  <span className="text-[var(--blue-bright)]">
                    {(tItems.raw(`${slug}.headline`) as string[])[1]}
                  </span>
                  {(tItems.raw(`${slug}.headline`) as string[])[2]}
                </h3>
                <p className="mt-4 text-muted">{tItems(`${slug}.lead`)}</p>
              </div>

              <Link
                href={`/sluzby/${slug}`}
                className="group inline-flex items-center gap-2 rounded-btn border border-[rgba(61,123,255,0.5)] px-5 py-3 font-display text-[11px] uppercase tracking-[0.14em] text-ink transition-shadow hover:shadow-glow"
              >
                {t('learnMore')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>

            <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {services[active].featureIcons.map((icon, i) => (
                <li key={icon + i} className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[rgba(61,123,255,0.4)] bg-[rgba(10,20,50,0.6)] text-[var(--blue-bright)]">
                    <Icon name={icon} className="h-5 w-5" />
                  </span>
                  <span className="text-sm leading-tight">
                    <span className="block font-semibold text-ink">
                      {(tItems.raw(`${slug}.features`) as { title: string; sub: string }[])[i]?.title}
                    </span>
                    <span className="text-muted">
                      {(tItems.raw(`${slug}.features`) as { title: string; sub: string }[])[i]?.sub}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </motion.article>
        </AnimatePresence>
      </div>
    </section>
  );
}
