'use client';

import {
  motion,
  type MotionValue,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { MacbookFrame } from '@/components/mockups/MacbookFrame';
import { PhoneFrame } from '@/components/mockups/Frame';
import { useProjects } from '@/components/ContentProvider';
import type { Project } from '@/lib/content/projects';
import { useReducedMotion } from '@/lib/useReducedMotion';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Auto-scroll screenshotu uvnitř zařízení — jako když někdo web opravdu
 * prochází: plynulý posun o kus obrazovky, zastavení, další posun…
 * Na konci chvíli počká a klouže zpět nahoru. Hover zkracuje pauzy.
 * Zápis přímo do DOM, hover NErestartuje pozici (čte se přes ref).
 */
function useAutoScroll(active: boolean, contentRatio: number, hovered: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const hoveredRef = useRef(hovered);
  hoveredRef.current = hovered;
  const reduced = useReducedMotion();

  useEffect(() => {
    const img = imgRef.current;
    if (img) img.style.transform = 'translate3d(0,0,0)';
    if (!active || reduced) return;

    let raf = 0;
    let pos = 0;
    let from = 0;
    let to = 0;
    let phase: 'pause' | 'move' = 'pause';
    let phaseStart = performance.now();
    let phaseLen = 1100;

    const tick = (now: number) => {
      const el = containerRef.current;
      const node = imgRef.current;
      if (el && node) {
        const maxOffset = Math.max(0, el.clientWidth * contentRatio - el.clientHeight);
        const t = clamp01((now - phaseStart) / phaseLen);
        if (phase === 'move') {
          pos = from + (to - from) * easeInOut(t);
          if (t >= 1) {
            phase = 'pause';
            phaseStart = now;
            phaseLen = pos >= maxOffset - 1 ? 2200 : hoveredRef.current ? 380 : 1300;
          }
        } else if (t >= 1 && maxOffset > 0) {
          from = pos;
          const atEnd = pos >= maxOffset - 1;
          to = atEnd ? 0 : Math.min(maxOffset, pos + el.clientHeight * 0.62);
          phase = 'move';
          phaseStart = now;
          phaseLen = atEnd ? 1700 : hoveredRef.current ? 650 : 1050;
        }
        node.style.transform = `translate3d(0, ${(-pos).toFixed(1)}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, contentRatio, reduced]);

  return { containerRef, imgRef };
}

/** Pás odlesku na skle — pozici (0…1) řídí scroll stránky. */
function writeGlare(el: HTMLDivElement | null, g: number) {
  if (!el) return;
  const parent = el.parentElement;
  const w = parent ? parent.clientWidth : 0;
  el.style.transform = `translate3d(${(-0.6 * w + g * 1.9 * w).toFixed(1)}px, 0, 0) rotate(14deg)`;
  el.style.opacity = (Math.sin(clamp01(g) * Math.PI) * 0.95).toFixed(3);
}

function DeviceScreen({
  src,
  ratio,
  active,
  hovered,
  glare,
  wipeDelay = 0,
  alt,
}: {
  alt: string;
  src: string;
  ratio: number;
  active: boolean;
  hovered: boolean;
  glare: MotionValue<number>;
  wipeDelay?: number;
}) {
  const { containerRef, imgRef } = useAutoScroll(active, ratio, hovered);
  const glareRef = useRef<HTMLDivElement>(null);
  // předchozí projekt zůstane pod stíráním nového — obrazovka nikdy nezčerná
  const prevSrc = useRef(src);
  const [under, setUnder] = useState<string | null>(null);
  useEffect(() => {
    if (prevSrc.current === src) return;
    setUnder(prevSrc.current);
    prevSrc.current = src;
    const id = window.setTimeout(() => setUnder(null), 900);
    return () => window.clearTimeout(id);
  }, [src]);

  useMotionValueEvent(glare, 'change', (g) => writeGlare(glareRef.current, g));
  useEffect(() => writeGlare(glareRef.current, glare.get()), [glare]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-[#04060b]">
      {under ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={under} alt="" aria-hidden className="absolute inset-x-0 top-0 w-full max-w-none" />
      ) : null}
      <motion.div
        key={src}
        className="absolute inset-0"
        initial={{ clipPath: 'inset(100% 0% 0% 0%)' }}
        animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
        transition={{ duration: 0.55, delay: wipeDelay, ease: [0.76, 0, 0.24, 1] }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="absolute inset-x-0 top-0 w-full max-w-none will-change-transform"
        />
      </motion.div>
      {/* hloubka skla: stín při okrajích + statický odraz nahoře */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          boxShadow: 'inset 0 0 28px rgba(0,0,0,0.55)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 22%, transparent 78%, rgba(0,0,0,0.25) 100%)',
        }}
      />
      {/* odlesk, který přejede po skle se scrollem */}
      <div
        ref={glareRef}
        aria-hidden
        className="pointer-events-none absolute -inset-y-1/4 left-0 w-[38%] opacity-0 mix-blend-screen"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(190,215,255,0.07) 30%, rgba(255,255,255,0.2) 48%, rgba(255,255,255,0.26) 50%, rgba(190,215,255,0.07) 70%, transparent 100%)',
        }}
      />
    </div>
  );
}

/**
 * Notebook a telefon stojí odděleně vedle sebe ve skutečném poměru
 * (iPhone ≈ čtvrtina šířky MacBooku). Scroll stránky jimi hýbe s mírně
 * odlišnou hloubkou (telefon je blíž — posouvá se víc), po skle přejede
 * odlesk — nejdřív notebook, pak telefon, jako jeden zdroj světla —
 * a pod zařízeními dýchá odraz světla obrazovky v barvě projektu.
 */
function DeviceComposition({
  project,
  accent,
  active,
  progress,
  segments = 1,
  label,
}: {
  /** „název (obor)" projektu pro popisky obrázků */
  label: { name: string; kind: string };
  project: Project;
  accent: string;
  active: boolean;
  /** progress scrollu, který řídí odlesk a hloubku; bez něj vlastní průchod viewportem */
  progress?: MotionValue<number>;
  /** kolikrát má odlesk přejet během progressu 0…1 (jednou na projekt) */
  segments?: number;
}) {
  const reduced = useReducedMotion();
  const tCases = useTranslations('cases');
  const [hovered, setHovered] = useState(false);
  // Screenshot se začne posouvat až po otevření sekce (progress > 0), ne už
  // při načtení stránky — jinak by při předání z přechodu byl odscrollovaný.
  const [opened, setOpened] = useState(!progress);
  const root = useRef<HTMLDivElement>(null);
  const laptopDepth = useRef<HTMLDivElement>(null);
  const phoneDepth = useRef<HTMLDivElement>(null);
  const spill = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-1, 1], [4, -4]), { stiffness: 90, damping: 16 });
  const rotateY = useSpring(useTransform(mx, [-1, 1], [-4, 4]), { stiffness: 90, damping: 16 });
  const rotateYPhone = useSpring(useTransform(mx, [-1, 1], [-6, 6]), { stiffness: 90, damping: 16 });

  const own = useScroll({ target: root, offset: ['start end', 'end start'] }).scrollYProgress;
  const source = progress ?? own;
  // lokální průchod jednoho projektu 0…1
  const local = useTransform(source, (v) => {
    const x = clamp01(v) * segments;
    return x >= segments ? 1 : x - Math.floor(x);
  });
  const glareLaptop = useTransform(local, [0.12, 0.62], [0, 1]);
  const glarePhone = useTransform(local, [0.3, 0.8], [0, 1]);

  const applyDepth = (l: number) => {
    if (reduced) return;
    const d = l - 0.5;
    if (laptopDepth.current) laptopDepth.current.style.transform = `translate3d(0, ${(-d * 14).toFixed(1)}px, 0)`;
    if (phoneDepth.current) phoneDepth.current.style.transform = `translate3d(0, ${(-d * 40).toFixed(1)}px, 0) rotate(${(d * 2.5).toFixed(2)}deg)`;
    if (spill.current) {
      const bump = Math.sin(clamp01((l - 0.12) / 0.68) * Math.PI);
      spill.current.style.opacity = (0.35 + 0.45 * bump).toFixed(3);
    }
  };
  useMotionValueEvent(local, 'change', applyDepth);
  useMotionValueEvent(source, 'change', (v) => {
    if (progress) setOpened(v > 0.002);
  });
  // smyčky auto-scrollu běží jen na obrazovce (dřív běžely i dávno po odscrollování)
  const [onScreen, setOnScreen] = useState(false);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { rootMargin: '100px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const running = active && opened && onScreen;
  useEffect(() => applyDepth(local.get()));

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reduced) return;
    const rect = event.currentTarget.getBoundingClientRect();
    mx.set(((event.clientX - rect.left) / rect.width) * 2 - 1);
    my.set(((event.clientY - rect.top) / rect.height) * 2 - 1);
  };

  return (
    <motion.div
      ref={root}
      className="relative mx-auto flex w-full max-w-[720px] items-end gap-4 sm:gap-6"
      style={{ perspective: 1400 }}
      onPointerMove={onMove}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => {
        setHovered(false);
        mx.set(0);
        my.set(0);
      }}
    >
      {/* odraz světla obrazovek na „stole" */}
      <div
        ref={spill}
        aria-hidden
        className="pointer-events-none absolute inset-x-[6%] -bottom-8 h-20 rounded-[50%] blur-2xl transition-[background] duration-700"
        style={{ background: `radial-gradient(closest-side, ${accent}66, transparent)`, opacity: 0.35 }}
      />

      <div ref={laptopDepth} data-land="cases-laptop" className="relative min-w-0 flex-[4.2]">
        <motion.div style={reduced ? undefined : { rotateX, rotateY, transformStyle: 'preserve-3d' }}>
          <MacbookFrame className="drop-shadow-[0_50px_90px_-30px_rgba(0,0,0,0.9)]">
            <DeviceScreen alt={tCases('altDesktop', label)} src={project.desktopImage} ratio={project.desktopRatio} active={running} hovered={hovered} glare={glareLaptop} />
          </MacbookFrame>
        </motion.div>
      </div>

      <div ref={phoneDepth} className="relative z-10 min-w-0 flex-1 pb-[1.5%]">
        <motion.div style={reduced ? undefined : { rotateX, rotateY: rotateYPhone, transformStyle: 'preserve-3d' }}>
          <PhoneFrame className="!w-full drop-shadow-[0_30px_50px_-18px_rgba(0,0,0,0.95)]">
            <div data-land="cases-phone" className="relative aspect-[390/844] overflow-hidden">
              <DeviceScreen alt={tCases('altMobile', label)} src={project.mobileImage} ratio={project.mobileRatio} active={running} hovered={hovered} glare={glarePhone} wipeDelay={0.1} />
            </div>
          </PhoneFrame>
        </motion.div>
      </div>
    </motion.div>
  );
}

/**
 * Texty projektu: čeština z databáze (administrace), ostatní jazyky
 * z překladů, pokud je projekt má — jinak rovněž z databáze.
 */
function caseText(locale: string, tItems: ReturnType<typeof useTranslations>, tagsFallback: string[]) {
  return (item: Project) => {
    const translated = locale !== 'cs' && tItems.has(`${item.slug}.name`);
    return {
      name: translated ? tItems(`${item.slug}.name`) : item.name,
      kind: translated ? tItems(`${item.slug}.kind`) : item.kind,
      tags: locale === 'cs' && item.tags.length ? item.tags : tagsFallback,
    };
  };
}

export function Cases() {
  const t = useTranslations('cases');
  const tItems = useTranslations('cases.items');
  const locale = useLocale();
  const cases = useProjects();
  const COUNT = Math.max(1, cases.length);
  const text = caseText(locale, tItems, t.raw('tags') as string[]);
  const reduced = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);

  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });

  // screenshoty všech projektů předem stáhnout a dekódovat — při přepnutí projektu
  // pak obrazovka nezčerná na dobu dekódování velkého obrázku. Až když se sekce
  // blíží (2 obrazovky předem): na mobilu jde o ~2 MB, které by jinak při
  // načtení stránky soupeřily s písmem a skripty úvodní obrazovky.
  useEffect(() => {
    const node = section.current;
    if (!node) return;
    let imgs: HTMLImageElement[] = [];
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        imgs = cases.flatMap((item) => [item.desktopImage, item.mobileImage].map((src) => {
          const img = new window.Image();
          img.src = src;
          img.decode?.().catch(() => undefined);
          return img;
        }));
      },
      { rootMargin: '200% 0px' },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      imgs.forEach((img) => (img.src = ''));
    };
  }, [cases]);

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

  const accent = cases[index].accent;

  return (
    <section
      id="reference"
      ref={section}
      // výška pinu jen na desktopu — na mobilu jsou projekty pod sebou v běžném toku
      className={reduced ? 'relative' : 'relative md:h-[var(--pin-h)]'}
      style={reduced ? undefined : ({ '--pin-h': `${Math.round((COUNT * 92 - 100) * 1.3 + 100)}vh` } as React.CSSProperties)}
      aria-labelledby="reference-title"
    >
      <div className={reduced ? 'py-16' : 'py-16 md:sticky md:top-0 md:h-dvh md:overflow-hidden md:py-0'}>
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          animate={{ background: `radial-gradient(90% 60% at 30% 50%, ${accent}20, transparent 70%)` }}
          transition={{ duration: 0.8 }}
        />

        <div className={reduced ? 'shell' : 'shell md:flex md:h-full md:flex-col md:justify-center md:pb-10 md:pt-[max(104px,13vh)]'}>
          {/* hlavička: hned je jasné, že jde o hotové weby skutečných klientů */}
          <header className="md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,400px)] md:items-end md:gap-12">
            <div>
              <p className="eyebrow flex flex-wrap items-center gap-x-4 gap-y-2">
                {t('eyebrow')}
                <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(61,220,151,0.28)] bg-[rgba(61,220,151,0.06)] px-3 py-1 text-[10px] tracking-[0.16em] text-[#9ff0c9]">
                  <span className="relative flex h-1.5 w-1.5">
                    {!reduced ? <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3ddc97] opacity-70" /> : null}
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#3ddc97]" />
                  </span>
                  {t('live', { count: cases.length })}
                </span>
              </p>
              <SplitHeading
                as="h2"
                id="reference-title"
                className="mt-4 font-display text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold uppercase leading-[1.08]"
                parts={[{ text: t('title') + ' ' }, { text: t('titleAccent'), accent: true, newLine: true }]}
              />
            </div>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted md:mt-0 md:text-[15px]">{t('lead')}</p>
          </header>

          {/* ---- DESKTOP: pevná kompozice zařízení, projekty se mění vlevo ---- */}
          {!reduced ? (
            <div className="mt-8 hidden flex-1 items-center gap-10 md:grid md:grid-cols-[0.85fr_1.15fr] md:gap-14">
              <div>
                <ol className="space-y-1">
                  {cases.map((item, i) => {
                    const active = i === index;
                    return (
                      <li key={item.id}>
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
                            {String(i + 1).padStart(2, '0')} {text(item).name}
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
                            <p className="mt-1.5 text-sm text-muted">{text(item).kind}</p>
                            <ul className="mt-3 flex flex-wrap gap-2">
                              {text(item).tags.map((tag) => (
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
                label={text(cases[index])}
                project={cases[index]}
                accent={accent}
                progress={scrollYProgress}
                segments={COUNT}
                active
              />
            </div>
          ) : null}

          {/* ---- MOBIL / reduced-motion: tři bloky pod sebou ---- */}
          <div className={reduced ? 'mt-10 space-y-16' : 'mt-10 space-y-16 md:hidden'}>
            {cases.map((item, i) => (
              <MobileCase key={item.id} item={item} i={i} text={text} visitLabel={t('visit')} />
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
  text,
  visitLabel,
}: {
  item: Project;
  i: number;
  text: ReturnType<typeof caseText>;
  visitLabel: string;
}) {
  const tags = text(item).tags;
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
        {String(i + 1).padStart(2, '0')} {text(item).name}
      </p>
      <p className="mt-1.5 text-sm text-muted">{text(item).kind}</p>

      <div className="mt-6">
        <DeviceComposition
          label={text(item)}
          project={item}
          accent={item.accent}
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
