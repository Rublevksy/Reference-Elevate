'use client';

import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useRef, useState, type ComponentType } from 'react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/FeatureIcon';
import { Mascot } from '@/components/mascot/Mascot';
import { AppMockup, DesignMockup, SeoDashboard, ShopMockup, WebMockup } from '@/components/mockups';
import { services, type MockupKind } from '@/content/services';
import { useReducedMotion } from '@/lib/useReducedMotion';

const MOCKUPS: Record<MockupKind, ComponentType<{ active: boolean }>> = {
  web: WebMockup,
  seo: SeoDashboard,
  shop: ShopMockup,
  design: DesignMockup,
  app: AppMockup,
};

const COUNT = services.length;

const item = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
};

function CardBody({ index, active }: { index: number; active: boolean }) {
  const service = services[index];
  const t = useTranslations('services');
  const tItems = useTranslations(`services.items.${service.slug}`);
  const Mockup = MOCKUPS[service.mockup];
  const headline = tItems.raw('headline') as string[];
  const features = tItems.raw('features') as { title: string; sub: string }[];

  return (
    <motion.div
      className="grid h-full grid-rows-[auto_1fr] gap-6 p-6 md:grid-cols-[1.02fr_0.98fr] md:grid-rows-1 md:items-center md:gap-10 md:p-10 lg:p-12"
      initial="hidden"
      animate={active ? 'show' : 'hidden'}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.12 } } }}
    >
      <div className="min-w-0">
        <motion.p variants={item} className="eyebrow flex items-center gap-3">
          <span className="font-display text-[var(--blue-bright)]">{service.num}</span>
          <span className="inline-block h-px w-8 bg-[var(--line)]" />
          {tItems('tab')}
        </motion.p>

        {/* nadpis po slovech zpod masky */}
        <h3 className="mt-4 font-display text-[clamp(1.4rem,2.9vw,2.4rem)] font-bold uppercase leading-[1.08]">
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

        <motion.p variants={item} className="mt-4 max-w-md text-sm text-muted md:text-base">
          {tItems('lead')}
        </motion.p>

        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {service.featureIcons.map((icon, i) => (
            <motion.li key={icon + i} variants={item} className="flex items-center gap-3">
              <motion.span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[rgba(61,123,255,0.45)] bg-[rgba(10,20,50,0.6)] text-[var(--blue-bright)]"
                variants={{
                  hidden: { scale: 0.6, opacity: 0 },
                  show: {
                    scale: 1,
                    opacity: 1,
                    transition: { type: 'spring', stiffness: 420, damping: 18 },
                  },
                }}
              >
                <Icon name={icon} className="h-5 w-5" />
              </motion.span>
              <span className="text-sm leading-tight">
                <span className="block font-semibold text-ink">{features[i]?.title}</span>
                <span className="text-muted">{features[i]?.sub}</span>
              </span>
            </motion.li>
          ))}
        </ul>

        <motion.div variants={item} className="mt-7 flex flex-wrap gap-3">
          <Button href="#kontakt" className="!px-5 !py-3 !text-[11px]">
            {tItems('cta')}
          </Button>
          <Link
            href={`/sluzby/${service.slug}`}
            className="inline-flex items-center rounded-btn border border-[var(--line)] px-5 py-3 font-display text-[11px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-[rgba(80,120,255,0.45)] hover:text-ink"
          >
            {t('learnMore')}
          </Link>
        </motion.div>
      </div>

      <motion.div variants={item} className="relative min-w-0">
        <Mockup active={active} />
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
      {/* ---- MOBIL / reduced-motion: prostý stack ---- */}
      <div className={reduced ? 'shell space-y-8 py-16' : 'shell space-y-8 py-16 md:hidden'}>
        {services.map((service, i) => (
          <div
            key={service.slug}
            className="glass overflow-hidden rounded-card"
            style={{ position: 'sticky', top: `${88 + i * 10}px`, zIndex: i + 1 }}
          >
            <CardBody index={i} active />
          </div>
        ))}
      </div>

      {/* ---- DESKTOP: kolota karet ---- */}
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

          {/* vnitřní obal drží karty uvnitř odsazení, aby je nepřekrývala osa 01–05 */}
          <div className="relative mx-auto h-[min(76vh,620px)] w-full max-w-[1180px] px-6 lg:pl-28 lg:pr-8">
            <div className="relative h-full w-full">
            {services.map((service, i) => {
              const depth = i - index;
              const isActive = depth === 0;
              const isPast = depth < 0;

              // aktivní karta odjíždí dozadu podle `local`, další se narovnává
              const exit = isActive ? local : 0;
              const stackDepth = isPast ? -1 : Math.min(depth, 3);

              return (
                <motion.article
                  key={service.slug}
                  className="glass absolute inset-0 overflow-hidden rounded-[28px] border border-[rgba(80,120,255,0.28)]"
                  initial={false}
                  animate={{
                    y: isPast ? -80 : stackDepth * 18 - exit * 70,
                    scale: isPast ? 0.88 : 1 - stackDepth * 0.045 - exit * 0.06,
                    opacity: isPast ? 0 : depth > 2 ? 0 : 1 - exit * 0.35,
                    rotateX: isActive ? exit * 6 : 0,
                  }}
                  transition={{ duration: 0.25, ease: 'linear' }}
                  style={{
                    zIndex: COUNT - Math.abs(depth),
                    pointerEvents: isActive ? 'auto' : 'none',
                    transformPerspective: 1400,
                  }}
                >
                  {/* rubová ornamentální lišta — vizuální pouto se stolem karet */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-[28px]"
                    style={{
                      background:
                        'radial-gradient(120% 90% at 85% 0%, rgba(31,91,255,0.16), transparent 55%)',
                      boxShadow: 'inset 0 0 0 1px rgba(120,160,255,0.08)',
                    }}
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(61,123,255,0.8), transparent)' }}
                  />
                  {/* ztmavení karet v hloubce stohu */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-[28px] bg-[#04060b] transition-opacity duration-200"
                    style={{ opacity: isActive ? exit * 0.45 : Math.min(0.55, stackDepth * 0.28) }}
                  />
                  <CardBody index={i} active={isActive && local < 0.85} />
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
