'use client';

import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/FeatureIcon';
import { Mascot } from '@/components/mascot/Mascot';
import { services } from '@/content/services';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { ServiceScene } from './ServiceScene';

const COUNT = services.length;

/**
 * Z celého scroll-rozpočtu jednoho panelu (1/COUNT stránky) je většina
 * jen klidné „čtecí" okno (karta stojí, uvnitř doběhne stagger reveal) —
 * samotný přechod do dalšího panelu se odehraje až v posledním úseku.
 * Bez týhle rezervy by karta začala mizet hned od první píxelu scrollu
 * a nešlo by ji vůbec přečíst.
 */
const DWELL = 0.62;
const transitionT = (local: number) => (local <= DWELL ? 0 : (local - DWELL) / (1 - DWELL));

/** Přechod mezi panelem `i` a `i+1` — každá dvojice má jiný pohyb. */
const TRANSITIONS = ['flip', 'stack', 'diagonal', 'fold'] as const;
type Transition = (typeof TRANSITIONS)[number];

type Role = 'current' | 'next' | 'hidden';

/**
 * Framer Motion nikdy sám neresetuje transform vlastnost, kterou `animate`
 * mezi rendery vynechá — prostě zůstane na poslední hodnotě, kterou
 * dostala. Když by tedy jeden typ přechodu vracel `rotateY`, ale druhý
 * ho vynechal, karta by po přeskoku (rychlý scroll, návrat prohlížeče
 * na uloženou pozici) mohla „uvíznout" pootočená. Proto obě funkce vždy
 * vrací STEJNOU úplnou sadu klíčů — neutrální hodnotu tam, kde ji daný
 * přechod nepoužívá.
 */
const IDENTITY = { x: 0, y: 0, rotate: 0, rotateY: 0, scale: 1, scaleX: 1, opacity: 1, clipPath: 'inset(0% 0% 0% 0%)' };

function currentStyle(type: Transition, local: number) {
  switch (type) {
    case 'flip':
      return { ...IDENTITY, rotateY: -local * 180, opacity: local < 0.5 ? 1 : 0 };
    case 'stack':
      return { ...IDENTITY, y: -local * 90, scale: 1 - local * 0.12, opacity: 1 - local * 0.75 };
    case 'diagonal':
      return {
        ...IDENTITY,
        clipPath: `polygon(0% 0%, 100% 0%, ${100 - local * 150}% 100%, ${-local * 50}% 100%)`,
      };
    case 'fold':
      return { ...IDENTITY, scaleX: 1 - Math.min(1, local * 2), opacity: local < 0.5 ? 1 : 0 };
  }
}

function nextStyle(type: Transition, local: number) {
  switch (type) {
    case 'flip':
      return { ...IDENTITY, rotateY: (1 - local) * 180, opacity: local < 0.5 ? 0 : 1 };
    case 'stack':
      return { ...IDENTITY, y: (1 - local) * 70, scale: 0.96 + local * 0.04, opacity: 0.15 + local * 0.85 };
    case 'diagonal':
      return { ...IDENTITY, opacity: 1 };
    case 'fold':
      return { ...IDENTITY, scaleX: Math.max(0, (local - 0.5) * 2), opacity: local < 0.5 ? 0 : 1 };
  }
}

function CardBody({ index, role }: { index: number; role: Role }) {
  const service = services[index];
  const t = useTranslations('services');
  const tItems = useTranslations(`services.items.${service.slug}`);
  const headline = tItems.raw('headline') as string[];
  const features = tItems.raw('features') as { title: string; sub: string }[];
  const active = role !== 'hidden';

  const item = {
    hidden: { opacity: 0, y: 22 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
  };

  return (
    <motion.div
      className="grid h-full grid-rows-[auto_1fr] gap-5 p-6 md:grid-cols-[0.85fr_1.3fr] md:grid-rows-1 md:items-center md:gap-6 md:p-10 lg:p-12"
      initial="hidden"
      animate={role === 'current' ? 'show' : 'hidden'}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } } }}
    >
      <div className="order-2 min-w-0 md:order-1">
        <motion.p variants={item} className="flex items-center gap-3 text-xs text-muted">
          <span className="font-display text-[var(--blue-bright)]">{service.num}</span>
        </motion.p>

        {/* nadpis po slovech zpod masky — přesné znění z reklamní karty */}
        <h3 className="mt-2 font-display text-[clamp(1.5rem,3.1vw,2.5rem)] font-bold uppercase leading-[1.06]">
          {[headline[0], headline[1], headline[2]].map((part, partIndex) =>
            part
              ? part
                  .split(' ')
                  .filter(Boolean)
                  .map((word, wordIndex) => (
                    <span key={`${partIndex}-${wordIndex}`} className="inline-block overflow-hidden align-bottom">
                      <motion.span
                        className={`inline-block ${partIndex === 1 ? 'text-[var(--blue-bright)]' : ''}`}
                        variants={{
                          hidden: { y: '110%', opacity: 0 },
                          show: { y: '0%', opacity: 1, transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] } },
                        }}
                      >
                        {word}&nbsp;
                      </motion.span>
                    </span>
                  ))
              : null,
          )}
        </h3>

        {/* dekorativní výplň — čistě vizuální „signální" linka, žádný text */}
        <motion.svg
          aria-hidden
          variants={item}
          viewBox="0 0 260 28"
          className="mt-6 h-6 w-full max-w-[260px] text-[rgba(120,160,255,0.55)]"
        >
          <motion.path
            d="M0 20 C 30 20, 34 6, 60 6 S 92 22, 120 22 S 150 4, 180 4 S 216 18, 260 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={role === 'current' ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          />
          {[60, 180].map((cx, i) => (
            <circle key={i} cx={cx} cy={i === 0 ? 6 : 4} r="2.6" fill="var(--blue-bright)" />
          ))}
        </motion.svg>

        <ul className="mt-5 flex flex-wrap items-start gap-x-6 gap-y-4">
          {service.featureIcons.map((icon, i) => (
            <motion.li key={icon + i} variants={item} className="flex items-center gap-3">
              <motion.span
                className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[rgba(61,123,255,0.45)] bg-[rgba(10,20,50,0.6)] text-[var(--blue-bright)]"
                variants={{
                  hidden: { scale: 0.6, opacity: 0 },
                  show: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 420, damping: 18 } },
                }}
              >
                <Icon name={icon} className="h-7 w-7" />
              </motion.span>
              <span className="text-xs leading-tight">
                <span className="block font-semibold text-ink">{features[i]?.title}</span>
                <span className="text-muted">{features[i]?.sub}</span>
              </span>
            </motion.li>
          ))}
        </ul>

        <motion.div variants={item} className="mt-7 flex items-center gap-4">
          <Button href="#kontakt" className="!px-5 !py-3 !text-[11px]">
            {tItems('cta')}
          </Button>
          <Link
            href={`/sluzby/${service.slug}`}
            aria-label={t('learnMore')}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--line)] text-ink transition-colors hover:border-[rgba(80,120,255,0.5)] hover:text-[var(--blue-bright)]"
          >
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        </motion.div>
      </div>

      <motion.div variants={item} className="relative order-1 min-w-0 md:order-2">
        <div className="aspect-[4/3] w-full">
          <ServiceScene slug={service.slug} meta={service} active={active} />
        </div>
      </motion.div>
    </motion.div>
  );
}

export function ServiceDeck() {
  const reduced = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const [local, setLocal] = useState(0);

  const { scrollYProgress } = useScroll({
    target: section,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const raw = Math.max(0, Math.min(0.9999, p)) * COUNT;
    setIndex(Math.floor(raw));
    setLocal(raw % 1);
  });

  const goTo = (target: number) => {
    const node = section.current;
    if (!node) return;
    const top = node.offsetTop + (node.offsetHeight / COUNT) * (target + 0.25);
    window.__lenis ? window.__lenis.scrollTo(top, { duration: 1.1 }) : window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <section
      id="detaily"
      ref={section}
      className="relative"
      style={{ height: reduced ? 'auto' : `${COUNT * 105}vh` }}
      aria-label="Detaily služeb"
    >
      {/* ---- MOBIL / reduced-motion: sticky stack, scéna nahoře, text dole ---- */}
      <div className={reduced ? 'shell space-y-6 py-16' : 'shell space-y-6 py-16 md:hidden'}>
        {services.map((service, i) => (
          <div
            key={service.slug}
            className="glass overflow-hidden rounded-card"
            style={{ position: 'sticky', top: `${88 + i * 10}px`, zIndex: i + 1 }}
          >
            <CardBody index={i} role="current" />
          </div>
        ))}
      </div>

      {/* ---- DESKTOP: kolota s odlišným přechodem pro každou dvojici ---- */}
      {!reduced ? (
        <div className="sticky top-0 hidden h-dvh items-center overflow-hidden md:flex">
          {/* svislý průběh 01–05 */}
          <div className="absolute left-5 top-1/2 z-30 hidden -translate-y-1/2 lg:block">
            <div className="relative flex flex-col items-center gap-5">
              <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[var(--line)]" />
              <motion.span
                className="absolute left-1/2 top-0 w-px -translate-x-1/2 bg-gradient-to-b from-[var(--blue-bright)] to-[var(--blue)] shadow-glow"
                style={{ height: `${((index + local) / COUNT) * 100}%` }}
              />
              {services.map((service, i) => (
                <button
                  key={service.slug}
                  type="button"
                  onClick={() => goTo(i)}
                  className="relative z-10 grid place-items-center"
                  aria-label={service.num}
                  aria-current={i === index}
                >
                  <motion.span
                    className={`grid place-items-center rounded-full border font-display transition-colors ${
                      i === index
                        ? 'border-[var(--blue-bright)] bg-[rgba(31,91,255,0.18)] text-[var(--blue-bright)]'
                        : 'border-[var(--line)] bg-[var(--bg)] text-muted'
                    }`}
                    animate={{
                      width: i === index ? 44 : 32,
                      height: i === index ? 44 : 32,
                      fontSize: i === index ? 12 : 10,
                    }}
                    transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                  >
                    {service.num}
                  </motion.span>
                </button>
              ))}
            </div>
          </div>

          <div className="relative mx-auto h-[min(76vh,620px)] w-full max-w-[1180px] px-6 lg:pl-28 lg:pr-8">
            <div className="relative h-full w-full" style={{ perspective: 1600 }}>
              {services.map((service, i) => {
                const role: Role = i === index ? 'current' : i === index + 1 ? 'next' : 'hidden';
                if (role === 'hidden') return null;

                const type = TRANSITIONS[Math.min(index, TRANSITIONS.length - 1)];
                const t = transitionT(local);
                const style = role === 'current' ? currentStyle(type, t) : nextStyle(type, t);

                return (
                  <motion.article
                    key={service.slug}
                    className="glass absolute inset-0 overflow-hidden rounded-[28px] border border-[rgba(80,120,255,0.28)]"
                    initial={false}
                    animate={style}
                    transition={{ duration: 0.25, ease: 'linear' }}
                    style={{
                      zIndex: role === 'current' ? 2 : 1,
                      transformStyle: 'preserve-3d',
                      pointerEvents: role === 'current' && local < 0.4 ? 'auto' : 'none',
                    }}
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[3px]"
                      style={{ background: 'linear-gradient(90deg, transparent, rgba(61,123,255,0.8), transparent)' }}
                    />
                    <CardBody index={i} role={role} />
                  </motion.article>
                );
              })}
            </div>

            {/* maskot stojí vedle karty, nikdy nezasahuje do textu ani tlačítek */}
            <div className="pointer-events-none absolute -bottom-3 right-[-40px] z-[60] hidden 2xl:block">
              <motion.div
                key={index}
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <Mascot pose={index % 2 === 0 ? 'point' : 'thumbsUp'} height={200} followCursor={false} />
              </motion.div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
