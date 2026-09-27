'use client';

import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { MacbookFrame } from '@/components/mockups/MacbookFrame';
import { PhoneFrame } from '@/components/mockups/Frame';
import { cases } from '@/content/cases';
import { useReducedMotion } from '@/lib/useReducedMotion';

const COUNT = cases.length;

/** Auto-skrolující screenshot uvnitř zařízení — čas, ne pozice stránky. */
function useAutoScroll(active: boolean, contentRatio: number, hovered: boolean) {
  const y = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const start = useRef(0);

  useEffect(() => {
    y.set(0);
    if (!active) return;
    start.current = performance.now();

    const tick = (now: number) => {
      const el = containerRef.current;
      if (el) {
        const contentH = el.clientWidth * contentRatio;
        const maxOffset = Math.max(0, contentH - el.clientHeight);
        const speed = hovered ? 46 : 14; // px/s
        const elapsed = (now - start.current) / 1000;
        y.set(-Math.min(maxOffset, elapsed * speed));
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [active, contentRatio, hovered, y]);

  return { y, containerRef };
}

function DeviceScreen({
  slug,
  file,
  ratio,
  active,
  hovered,
  wipeDelay = 0,
}: {
  slug: string;
  file: 'desktop' | 'mobile';
  ratio: number;
  active: boolean;
  hovered: boolean;
  wipeDelay?: number;
}) {
  const { y, containerRef } = useAutoScroll(active, ratio, hovered);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-[#04060b]">
      <motion.div
        key={slug}
        className="absolute inset-0"
        initial={{ clipPath: 'inset(100% 0% 0% 0%)' }}
        animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
        transition={{ duration: 0.55, delay: wipeDelay, ease: [0.76, 0, 0.24, 1] }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <motion.img
          src={`/cases/${slug}/${file}.jpg`}
          alt=""
          aria-hidden
          loading="eager"
          className="absolute inset-x-0 top-0 w-full max-w-none"
          style={{ y }}
        />
      </motion.div>
    </div>
  );
}

/** Notebook + telefon, telefon přesahuje přes pravý dolní roh (~20 %). */
function DeviceComposition({
  slug,
  desktopRatio,
  mobileRatio,
  active,
}: {
  slug: string;
  desktopRatio: number;
  mobileRatio: number;
  active: boolean;
}) {
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-1, 1], [4, -4]), { stiffness: 90, damping: 16 });
  const rotateY = useSpring(useTransform(mx, [-1, 1], [-4, 4]), { stiffness: 90, damping: 16 });

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reduced) return;
    const rect = event.currentTarget.getBoundingClientRect();
    mx.set(((event.clientX - rect.left) / rect.width) * 2 - 1);
    my.set(((event.clientY - rect.top) / rect.height) * 2 - 1);
  };

  return (
    <motion.div
      className="relative mx-auto w-full max-w-[560px]"
      style={{ perspective: 1400 }}
      onPointerMove={onMove}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => {
        setHovered(false);
        mx.set(0);
        my.set(0);
      }}
    >
      <motion.div style={reduced ? undefined : { rotateX, rotateY, transformStyle: 'preserve-3d' }}>
        <MacbookFrame className="drop-shadow-[0_50px_90px_-30px_rgba(0,0,0,0.9)]">
          <DeviceScreen slug={slug} file="desktop" ratio={desktopRatio} active={active} hovered={hovered} />
        </MacbookFrame>

        <div className="absolute -bottom-[9%] -right-[6%] w-[26%] drop-shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)]">
          <PhoneFrame className="!w-full">
            <div className="relative aspect-[390/844] overflow-hidden">
              <DeviceScreen slug={slug} file="mobile" ratio={mobileRatio} active={active} hovered={hovered} wipeDelay={0.1} />
            </div>
          </PhoneFrame>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function Cases() {
  const t = useTranslations('cases');
  const tItems = useTranslations('cases.items');
  const reduced = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);

  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const raw = Math.floor(Math.max(0, Math.min(0.9999, p)) * COUNT);
    setIndex(raw);
  });

  const goTo = (target: number) => {
    const node = section.current;
    if (!node) return;
    const top = node.offsetTop + (node.offsetHeight / COUNT) * (target + 0.4);
    window.__lenis ? window.__lenis.scrollTo(top, { duration: 1.1 }) : window.scrollTo({ top, behavior: 'smooth' });
  };

  const tags = t.raw('tags') as string[];
  const accent = cases[index].accent;

  return (
    <section
      id="reference"
      ref={section}
      className="relative"
      style={{ height: reduced ? 'auto' : `${COUNT * 100}vh` }}
      aria-labelledby="reference-title"
    >
      <div className={reduced ? 'py-16' : 'sticky top-0 h-dvh overflow-hidden'}>
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          animate={{ background: `radial-gradient(90% 60% at 30% 50%, ${accent}20, transparent 70%)` }}
          transition={{ duration: 0.8 }}
        />

        <div className={reduced ? 'shell' : 'shell flex h-full flex-col justify-center'}>
          <SplitHeading
            as="h2"
            id="reference-title"
            className="font-display text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold uppercase leading-[1.08]"
            parts={[{ text: t('title') + ' ' }, { text: t('titleAccent'), accent: true }]}
          />

          {/* ---- DESKTOP: pevná kompozice zařízení, projekty se mění vlevo ---- */}
          {!reduced ? (
            <div className="mt-8 hidden flex-1 items-center gap-10 md:grid md:grid-cols-[0.85fr_1.15fr] md:gap-14">
              <div>
                <ol className="space-y-1">
                  {cases.map((item, i) => {
                    const active = i === index;
                    return (
                      <li key={item.slug}>
                        <button
                          type="button"
                          onClick={() => goTo(i)}
                          className="group block text-left"
                        >
                          <motion.span
                            className="block overflow-hidden font-display font-bold uppercase leading-[1.15] tracking-tight"
                            animate={{
                              color: active ? '#F2F5FF' : 'rgba(138,147,168,0.55)',
                              fontSize: active ? 'clamp(1.6rem,3vw,2.5rem)' : 'clamp(1.1rem,2vw,1.6rem)',
                            }}
                            transition={{ duration: 0.4 }}
                          >
                            {String(i + 1).padStart(2, '0')} {tItems(`${item.slug}.name`)}
                          </motion.span>
                        </button>

                        {active ? (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.4 }}
                            className="overflow-hidden"
                          >
                            <p className="mt-1.5 text-sm text-muted">{tItems(`${item.slug}.kind`)}</p>
                            <ul className="mt-3 flex flex-wrap gap-2">
                              {tags.map((tag) => (
                                <li key={tag} className="rounded-full border border-[var(--line)] px-3 py-1 text-[10px] uppercase tracking-widest text-muted">
                                  {tag}
                                </li>
                              ))}
                            </ul>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="group/link mt-4 inline-flex items-center gap-2 rounded-btn border px-5 py-2.5 font-display text-[11px] uppercase tracking-[0.12em] text-ink transition-colors"
                              style={{ borderColor: `${item.accent}88` }}
                            >
                              {t('visit')}
                              <ArrowUpRight className="h-4 w-4 transition-transform group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" aria-hidden />
                            </a>
                          </motion.div>
                        ) : (
                          <div className="h-0" />
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>

              <DeviceComposition
                slug={cases[index].slug}
                desktopRatio={cases[index].desktopHeight / 1440}
                mobileRatio={cases[index].mobileHeight / 390}
                active
              />
            </div>
          ) : null}

          {/* ---- MOBIL / reduced-motion: tři bloky pod sebou ---- */}
          <div className={reduced ? 'mt-10 space-y-16' : 'mt-10 space-y-16 md:hidden'}>
            {cases.map((item, i) => (
              <MobileCase key={item.slug} item={item} i={i} tags={tags} visitLabel={t('visit')} tItems={tItems} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MobileCase({
  item,
  i,
  tags,
  visitLabel,
  tItems,
}: {
  item: (typeof cases)[number];
  i: number;
  tags: string[];
  visitLabel: string;
  tItems: ReturnType<typeof useTranslations>;
}) {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.4 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-15%' }}
      transition={{ duration: 0.7 }}
    >
      <p className="font-display text-lg font-bold uppercase leading-none">
        {String(i + 1).padStart(2, '0')} {tItems(`${item.slug}.name`)}
      </p>
      <p className="mt-1.5 text-sm text-muted">{tItems(`${item.slug}.kind`)}</p>

      <div className="mt-6">
        <DeviceComposition
          slug={item.slug}
          desktopRatio={item.desktopHeight / 1440}
          mobileRatio={item.mobileHeight / 390}
          active={inView}
        />
      </div>

      <ul className="mt-8 flex flex-wrap justify-center gap-2">
        {tags.map((tag) => (
          <li key={tag} className="rounded-full border border-[var(--line)] px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted">
            {tag}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex justify-center">
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-2 rounded-btn border px-5 py-3 font-display text-[11px] uppercase tracking-[0.12em] text-ink"
          style={{ borderColor: `${item.accent}88` }}
        >
          {visitLabel}
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </a>
      </div>
    </motion.div>
  );
}
