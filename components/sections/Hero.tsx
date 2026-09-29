'use client';

import { motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { HeroBook, HeroLink } from '@/components/ui/HeroCta';
import { markHeroRevealed } from '@/lib/heroReveal';
import { SITE_SHOT, homography, lerpQuad, publishHeroFrame, screenQuad, type Quad } from '@/lib/heroScreen';
import { useReducedMotion } from '@/lib/useReducedMotion';

/** Cyrilice má v průměru delší slova — nadpis dostane o trochu menší clamp. */
const HEADING_SIZE: Record<string, string> = {
  cs: 'text-[clamp(2rem,3vw,3.1rem)]',
  en: 'text-[clamp(2rem,3vw,3.1rem)]',
  ru: 'text-[clamp(1.7rem,2.5vw,2.6rem)]',
  uk: 'text-[clamp(1.7rem,2.5vw,2.6rem)]',
};

const DESKTOP_FRAMES = 361;
const MOBILE_FRAMES = 181;
const desktopSrc = (i: number) => `/hero/frames-desktop/${String(i).padStart(3, '0')}.webp`;
const mobileSrc = (i: number) => `/hero/frames-mobile/${String(i).padStart(3, '0')}.webp`;

/** Úsek scroll progressu, během kterého text „rozletí" a zmizí. */
const SCATTER_FROM = 0.004;
const SCATTER_TO = 0.09;
/**
 * Časová osa hera (progress pinu) na desktopu — 424vh, aby každá fáze měla
 * při běžném kolečku/touchpadu dost scrollu:
 *   0 … 0.4    maskot, otevření víka (web se rozsvítí na displeji), ukázání
 *   0.4 … 0.8  kamera pomalu najíždí do displeje; 0.46–0.66 z něj vylétají
 *              karty služeb a rozestoupí se kolem notebooku (ServicesTable)
 *   0.8 … 0.9  screenshot se srovná se skutečnou sekcí, modrá záře ustoupí
 *   0.84 … 0.99 karty dosednou na stůl; 0.88 … 1 film se rozplyne
 * Stůl služeb leží posledních 165vh pod filmem a je připnutý, takže se
 * s ním screenshot kryje přesně.
 */
const DESKTOP = { height: '424vh', overlap: '-165dvh', frames: [0, 0.4, 0.8], frameAt: [0, 250, 360] };
/**
 * Mobil: film končí dřív (snímek 125 ≈ desktop 250), dokud je notebook celý
 * a web na displeji čitelný — najetí až do desktopového screenshotu by na
 * úzkém displeji ořezalo stránku a pak ji vyměnilo za jiné (mobilní) rozvržení.
 * Pak se film klidně rozplyne do mobilní sekce.
 */
const MOBILE = { height: '280vh', overlap: '-100dvh', frames: [0, 0.78], frameAt: [0, 125] };
const SHOT_IN: [number, number] = [101, 111]; // snímky: web se rozsvítí spolu s displejem (hned po otevření víka)
const ALIGN: [number, number] = [0.79, 0.84]; // progress: screenshot → přesná poloha sekce
/**
 * Pak zhasne samotné video (plátno). Film nemá vlastní pozadí, takže kolem
 * srovnaného screenshotu je vidět přímo skutečná stránka pod ním — žádná
 * modrá záře ani okraj kadru, šev není kde vzniknout.
 */
const CANVAS_OUT: [number, number] = [0.84, 0.88];
/** přesah kolem screenshotu zmizí až po zhasnutí videa (pod ním je už jen stránka) */
const EXTEND_OUT: [number, number] = [0.88, 0.93];
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const seg = (v: number, [a, b]: [number, number]) => clamp01((v - a) / (b - a));
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Poloha snímku v plátně stejně jako CSS `object-fit: cover`. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cw: number, ch: number) {
  const ir = img.naturalWidth / img.naturalHeight;
  const cr = cw / ch;
  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;
  if (ir > cr) {
    sw = sh * cr;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = sw / cr;
    sy = (img.naturalHeight - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
}

/** Deterministický pseudonáhodný šum 0..1 — stejný na serveru i v prohlížeči. */
function noise(i: number, salt: number) {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Vektor rozletu pro jedno písmeno — do stran a mírně nahoru. */
function letterVector(i: number) {
  const angle = -Math.PI / 2 + (noise(i, 1) - 0.5) * Math.PI * 1.6;
  const distance = 120 + noise(i, 2) * 220;
  return {
    x: Math.round(Math.cos(angle) * distance),
    y: Math.round(Math.sin(angle) * distance * 0.8),
    r: Math.round((noise(i, 3) - 0.5) * 90),
  };
}

/** Prvek, který při odchodu textu odletí daným směrem (hodnoty čte scroll handler). */
function Fly({ x, y, r = 0, className = '', children }: { x: number; y: number; r?: number; className?: string; children: ReactNode }) {
  return (
    <div data-fly="" data-x={x} data-y={y} data-r={r} className={className}>
      {children}
    </div>
  );
}

/**
 * Nadpis rozdělený na písmena. Slova drží pohromadě (nowrap), takže se
 * zalamuje stejně jako běžný text; čtečky dostanou celou větu přes sr-only.
 */
function ScatterHeading({ parts, className }: { parts: { text: string; accent?: boolean }[]; className: string }) {
  let letterIndex = 0;
  let wordIndex = 0;
  const full = parts.map((part) => part.text).join('').trim();

  return (
    <h1 className={className}>
      <span className="sr-only">{full}</span>
      <span aria-hidden>
        {parts.flatMap((part, partIndex) =>
          part.text
            .split(' ')
            .filter(Boolean)
            .map((word) => {
              const currentWord = wordIndex++;
              return (
                <motion.span
                  key={`${partIndex}-${currentWord}`}
                  className={`inline-block whitespace-nowrap ${part.accent ? 'text-[var(--blue-bright)]' : ''}`}
                  initial={{ opacity: 0, y: '40%' }}
                  animate={{ opacity: 1, y: '0%' }}
                  transition={{ delay: 0.4 + currentWord * 0.05, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                  {[...word].map((char) => {
                    const v = letterVector(letterIndex++);
                    return (
                      <span key={letterIndex} data-fly="" data-x={v.x} data-y={v.y} data-r={v.r} className="inline-block">
                        {char}
                      </span>
                    );
                  })}
                  {' '}
                </motion.span>
              );
            }),
        )}
      </span>
    </h1>
  );
}

/**
 * Hero jako jeden nepřetržitý film (Higgsfield/Seedance, 15 s, 361 snímků):
 * maskot mává → otevře notebook → otočí se a ukáže na obrazovku → kamera
 * najede, až obrazovka vyplní celý kadr. Skrolluje se to jako produktové
 * stránky Apple — sekvence WebP snímků na `<canvas>` podle scroll progressu,
 * s lehkým lerpem.
 *
 * Sekce má `margin-bottom: -100dvh`: stůl služeb tak leží přímo pod
 * posledním viewportem pinu. Na konci se plátno rozplyne a odhalí skutečnou
 * sekci (jen kruh platformy, karty ještě nepřiletěly) — žádný prázdný mezikus.
 *
 * Pozn.: `style={{ opacity: motionValue }}` se v tomhle stromu (pod Lenis/GSAP
 * tickerem) do DOM spolehlivě nepropisoval, proto všechno scroll-řízené jde
 * přes `useMotionValueEvent` → přímý zápis do `ref.style`.
 */
export function Hero() {
  const t = useTranslations('hero');
  const locale = useLocale();
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const filmRef = useRef<HTMLDivElement>(null);
  const shotRef = useRef<HTMLDivElement>(null);
  const tintRef = useRef<HTMLDivElement>(null);
  const extendRef = useRef<HTMLDivElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const flyNodesRef = useRef<HTMLElement[]>([]);

  const [isMobile, setIsMobile] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (reduced) markHeroRevealed();
  }, [reduced]);

  const totalFrames = isMobile ? MOBILE_FRAMES : DESKTOP_FRAMES;
  const srcFor = isMobile ? mobileSrc : desktopSrc;

  const imagesRef = useRef<HTMLImageElement[]>([]);
  const loadedRef = useRef<boolean[]>([]);

  // Načtení snímků: nultý hned a prioritně, zbytek postupně na pozadí.
  useEffect(() => {
    if (reduced) return;
    imagesRef.current = new Array(totalFrames);
    loadedRef.current = new Array(totalFrames).fill(false);
    setReady(false);
    let cancelled = false;

    const loadOne = (i: number) =>
      new Promise<void>((resolve) => {
        const img = new window.Image();
        img.decoding = 'async';
        img.onload = () => {
          loadedRef.current[i] = true;
          resolve();
        };
        img.onerror = () => resolve();
        img.src = srcFor(i);
        imagesRef.current[i] = img;
      });

    (async () => {
      await loadOne(0);
      if (cancelled) return;
      setReady(true);
      const CONCURRENCY = 6;
      let next = 1;
      await Promise.all(
        Array.from({ length: CONCURRENCY }, async () => {
          while (!cancelled) {
            const i = next++;
            if (i >= totalFrames) return;
            await loadOne(i);
          }
        }),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [reduced, totalFrames, srcFor]);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });
  // film doběhne do posledního (plně modrého) snímku ještě před rozplynutím
  const timeline = isMobile ? MOBILE : DESKTOP;
  const frameIndexMV = useTransform(scrollYProgress, timeline.frames, timeline.frameAt);
  const fadeFrom = isMobile ? 0.82 : 0.9;

  const targetFrameRef = useRef(0);
  const currentFrameRef = useRef(0);
  const [inView, setInView] = useState(true);

  const applyScroll = (p: number) => {
    // rozlet textu
    const s = Math.min(1, Math.max(0, (p - SCATTER_FROM) / (SCATTER_TO - SCATTER_FROM)));
    const e = s * s * (3 - 2 * s);
    const layer = textLayerRef.current;
    if (layer) {
      if (!flyNodesRef.current.length) {
        flyNodesRef.current = Array.from(layer.querySelectorAll<HTMLElement>('[data-fly]'));
      }
      for (const node of flyNodesRef.current) {
        const x = Number(node.dataset.x) * e;
        const y = Number(node.dataset.y) * e;
        const r = Number(node.dataset.r) * e;
        node.style.transform = e > 0 ? `translate3d(${x}px, ${y}px, 0) rotate(${r}deg) scale(${1 - 0.25 * e})` : '';
        node.style.opacity = String(1 - s);
      }
      const scrim = layer.querySelector<HTMLElement>('[data-scrim]');
      if (scrim) scrim.style.opacity = String(1 - e);
      layer.style.visibility = s >= 1 ? 'hidden' : 'visible';
      layer.style.pointerEvents = s > 0.4 ? 'none' : '';
    }

    // rozplynutí filmu do stolu služeb
    const f = smooth(seg(p, [fadeFrom, 1]));
    if (filmRef.current) filmRef.current.style.opacity = String(1 - f);
    if (f > 0.8) markHeroRevealed();
  };

  useMotionValueEvent(frameIndexMV, 'change', (v) => {
    targetFrameRef.current = v;
  });
  useMotionValueEvent(scrollYProgress, 'change', applyScroll);

  // Stránka načtená už odskrolovaná (reload, kotva) — stav nastavit hned.
  useEffect(() => {
    if (reduced) return;
    const id = window.setTimeout(() => applyScroll(scrollYProgress.get()), 60);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, scrollYProgress]);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: '200px',
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /**
   * Screenshot webu na displeji notebooku — přesně ve stejném snímku, jaký
   * je na plátně (rohy displeje změřené ze snímků, viz lib/heroScreenTrack).
   * Ke konci se čtyřúhelník plynule srovná na skutečnou polohu sekce
   * stolu služeb, takže rozplynutí filmu je neviditelné.
   */
  const placeShot = (frame: number, fw: number, fh: number) => {
    const shot = shotRef.current;
    if (!shot) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const p = scrollYProgress.get();
    const desktopFrame = isMobile ? frame * 2 : frame;
    let quad = screenQuad(frame, isMobile, fw, fh, vw, vh);
    const lit = seg(desktopFrame, SHOT_IN);
    if (!quad || lit <= 0) {
      shot.style.visibility = 'hidden';
      if (canvasRef.current) canvasRef.current.style.opacity = '';
      publishHeroFrame({ p, map: null, shot: 0 });
      return;
    }
    const align = isMobile ? 0 : smooth(seg(p, ALIGN));
    if (align > 0) {
      // připnutý obsah stolu služeb (sticky) — s ním se screenshot kryje
      const top = document.querySelector('#sluzby [data-shot-anchor]')?.getBoundingClientRect().top ?? 0;
      const left = (vw - SITE_SHOT.w) / 2;
      const target: Quad = [
        { x: left, y: top },
        { x: left + SITE_SHOT.w, y: top },
        { x: left + SITE_SHOT.w, y: top + SITE_SHOT.h },
        { x: left, y: top + SITE_SHOT.h },
      ];
      quad = lerpQuad(quad, target, align);
    }
    const h = homography(SITE_SHOT.w, SITE_SHOT.h, quad);
    shot.style.visibility = 'visible';
    shot.style.transform = h.css;
    shot.style.opacity = smooth(lit).toFixed(3);
    // po stranách (širší okno než screenshot) se okraje jemně rozplynou do pozadí
    const canvasOut = isMobile ? 0 : smooth(seg(p, CANVAS_OUT));
    // okraje screenshotu se rozplývají jen na širším okně než screenshot, a až
    // když pod nimi místo videa prosvítá skutečná stránka
    const edgePct = vw > SITE_SHOT.w + 2 ? align * 6 : 0;
    const shotImg = shot.querySelector('img');
    if (shotImg) shotImg.style.maskImage = edgePct > 0.05 ? `linear-gradient(90deg, transparent, #000 ${edgePct.toFixed(2)}%, #000 ${(100 - edgePct).toFixed(2)}%, transparent)` : '';
    if (tintRef.current) tintRef.current.style.opacity = (0.55 * (1 - seg(desktopFrame, [290, 350]))).toFixed(3);
    if (canvasRef.current) canvasRef.current.style.opacity = (1 - canvasOut).toFixed(3);
    // přesah naskočí hned na začátku srovnávání (polovičatý by nechal prosvítat modrou)
    if (extendRef.current) extendRef.current.style.opacity = isMobile ? '0' : (Math.min(1, align * 4) * (1 - smooth(seg(p, EXTEND_OUT)))).toFixed(3);
    publishHeroFrame({ p, map: h.map, shot: lit });
  };

  const placeShotRef = useRef(placeShot);
  placeShotRef.current = placeShot;

  // Vykreslovací smyčka — vždy nejbližší JIŽ NAČTENÝ snímek, cíl doháněný lerpem.
  useEffect(() => {
    if (reduced || !ready) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let raf = 0;
    // kreslit jen při změně — jinak by se stejný snímek překresloval každý frame
    let lastIdx = -1;
    let lastP = -1;
    let lastW = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      if (!inView) return;
      const gap = targetFrameRef.current - currentFrameRef.current;
      // daleký skok (navigace) = rovnou cílový snímek, jinak jemný lerp
      currentFrameRef.current = Math.abs(gap) > 24 ? targetFrameRef.current : currentFrameRef.current + gap * 0.18;
      const idx = Math.max(0, Math.min(totalFrames - 1, Math.round(currentFrameRef.current)));

      let drawIdx = idx;
      if (!loadedRef.current[drawIdx]) {
        let lo = drawIdx;
        let hi = drawIdx;
        while (lo > 0 || hi < totalFrames - 1) {
          if (lo > 0 && loadedRef.current[--lo]) {
            drawIdx = lo;
            break;
          }
          if (hi < totalFrames - 1 && loadedRef.current[++hi]) {
            drawIdx = hi;
            break;
          }
        }
      }

      const img = imagesRef.current[drawIdx];
      if (img?.complete && img.naturalWidth > 0) {
        const p = scrollYProgress.get();
        const sizeChanged = canvas.width !== lastW;
        if (drawIdx !== lastIdx || sizeChanged) drawCover(ctx, img, canvas.width, canvas.height);
        if (drawIdx !== lastIdx || sizeChanged || p !== lastP) placeShotRef.current(drawIdx, img.naturalWidth, img.naturalHeight);
        lastIdx = drawIdx;
        lastP = p;
        lastW = canvas.width;
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [reduced, ready, inView, totalFrames, scrollYProgress]);

  // Titulek na volné stěně vpravo od neonové šipky — poloha ve snímku 1600 × 900
  // (x 1105–1570, y od 150) přepočtená stejně jako object-fit: cover plátna.
  useEffect(() => {
    const layer = textLayerRef.current;
    if (!layer) return;
    const place = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const s = Math.max(vw / 1600, vh / 900);
      const ox = (vw - 1600 * s) / 2;
      const oy = (vh - 900 * s) / 2;
      let left = ox + 1105 * s;
      const right = Math.min(vw - 32, ox + 1570 * s);
      let top = Math.max(104, oy + 150 * s);
      let width = right - left;
      // užší okna (4:3): vedle šipky není místo — blok sjede pod ni, nad stůl
      if (width < 340) {
        width = Math.min(420, vw - 64);
        left = vw - 32 - width;
        top = Math.max(104, oy + 440 * s);
      }
      layer.style.setProperty('--hero-x', `${left.toFixed(0)}px`);
      layer.style.setProperty('--hero-w', `${width.toFixed(0)}px`);
      layer.style.setProperty('--hero-y', `${top.toFixed(0)}px`);
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, []);

  // Plátno v device-pixel rozlišení podle velikosti viewportu.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reduced) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      currentFrameRef.current = targetFrameRef.current;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [reduced]);

  const headingClass = `mt-4 font-display font-bold uppercase leading-[1.02] text-ink ${HEADING_SIZE[locale] ?? HEADING_SIZE.cs}`;
  const tagline = t.raw('tagline') as string[];
  const headingParts = [...tagline.map((line) => ({ text: line + ' ' })), { text: t('taglineAccent'), accent: true }];

  /**
   * Titulek sedí na prázdné stěně vpravo od neonové šipky — šipka na něj
   * „ukazuje", jako plakát ve scéně. Jedna jasná akce (konzultace), tichý
   * odkaz na práce a dole uprostřed pozvánka ke skrolování — film je příběh.
   */
  const BLOCK =
    'shell pointer-events-auto relative z-10 pt-[max(112px,19vh)] md:absolute md:left-[var(--hero-x,62vw)] md:top-[var(--hero-y,18vh)] md:w-[var(--hero-w,30vw)] md:px-0 md:pt-0';

  if (reduced) {
    return (
      <section id="hero" className="relative min-h-dvh overflow-hidden" aria-label={t('eyebrow')}>
        <div className="absolute inset-0" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={desktopSrc(0)} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[rgba(4,6,11,0.5)]" />
        </div>
        <div className={`${BLOCK} min-h-dvh md:min-h-0`}>
          <p className="eyebrow flex items-center gap-3">
            <span className="inline-block h-px w-8 bg-[var(--text-muted)]" />
            {t('eyebrow')}
          </p>
          <h1 className={headingClass}>
            {tagline.join(' ')} <span className="text-[var(--blue-bright)]">{t('taglineAccent')}</span>
          </h1>
          <p className="mt-5 max-w-sm text-base leading-relaxed text-muted">{t('subtitle')}</p>
          <div className="mt-8 flex flex-col items-start gap-5">
            <HeroBook href="#kontakt" label={t('ctaBook')} note={t('ctaBookNote')} />
            <HeroLink href="#reference" label={t('ctaWork')} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="hero"
      ref={sectionRef}
      className="pointer-events-none relative z-10"
      style={{ height: timeline.height, marginBottom: timeline.overlap }}
      aria-label={t('eyebrow')}
    >
      <div className="sticky top-0 h-dvh overflow-hidden">
        {/* film bez vlastního pozadí: na konci zhasne plátno a pod srovnaným
            screenshotem je rovnou skutečná stránka */}
        <div ref={filmRef} className="absolute inset-0 overflow-hidden" aria-hidden>
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
          {/* skutečný web na displeji notebooku (perspektivně, podle snímku) */}
          <div
            ref={shotRef}
            className="invisible absolute left-0 top-0 origin-top-left"
            style={{ width: SITE_SHOT.w, height: SITE_SHOT.h, opacity: 0 }}
          >
            {/* „přesah" stránky kolem screenshotu — na širších oknech, než je
                screenshot (1440 × 900), zakryje modrý kadr videa kolem */}
            <div
              ref={extendRef}
              className="absolute -inset-[150%] opacity-0"
              style={{ background: 'radial-gradient(40% 40% at 50% 50%, #070b18, var(--bg) 70%)' }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/hero/site-shot-${locale}.webp`} alt="" className="relative h-full w-full" />
            {/* světlo displeje: web zpočátku „prosvítá" modrou září scény */}
            <div
              ref={tintRef}
              className="absolute inset-0 mix-blend-screen"
              style={{ background: 'radial-gradient(90% 80% at 50% 45%, rgba(60,130,255,0.35), rgba(40,90,255,0.6))' }}
            />
          </div>
        </div>

        <div ref={textLayerRef} className="absolute inset-0">
          <div
            data-scrim=""
            className="absolute inset-0 bg-[radial-gradient(70%_80%_at_78%_32%,rgba(4,6,11,0.62),rgba(4,6,11,0.18)_70%)] max-md:bg-[rgba(4,6,11,0.45)]"
            aria-hidden
          />

          <div className={BLOCK}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
              <Fly x={220} y={-90} r={8}>
                <motion.p
                  className="eyebrow flex items-center gap-3"
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                >
                  <span className="inline-block h-px w-8 bg-[var(--text-muted)]" />
                  {t('eyebrow')}
                </motion.p>
              </Fly>

              <ScatterHeading parts={headingParts} className={headingClass} />

              {/* neonová čára pod „výš" — navazuje na neonovou šipku na zdi */}
              <Fly x={260} y={40} r={10}>
                <motion.span
                  aria-hidden
                  className="mt-4 block h-[3px] w-28 origin-left rounded-full bg-[#9fc0ff]"
                  style={{ boxShadow: '0 0 12px 2px rgba(61,123,255,0.9), 0 0 28px 6px rgba(31,91,255,0.5)' }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 1.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                />
              </Fly>

              <Fly x={240} y={80} r={6}>
                <motion.p
                  className="mt-5 max-w-sm text-base leading-relaxed text-muted"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.85, duration: 0.7 }}
                >
                  {t('subtitle')}
                </motion.p>
              </Fly>

              <motion.div
                className="mt-8 flex flex-col items-start gap-5"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.7 }}
              >
                <Fly x={200} y={200} r={10}>
                  <HeroBook href="#kontakt" label={t('ctaBook')} note={t('ctaBookNote')} />
                </Fly>
                <Fly x={300} y={240} r={-8}>
                  <HeroLink href="#reference" label={t('ctaWork')} />
                </Fly>
              </motion.div>
            </motion.div>
          </div>

          {/* pozvánka ke skrolování — dole uprostřed, film je příběh */}
          <Fly x={0} y={140} className="absolute bottom-7 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-3 md:flex">
            <span className="relative block h-9 w-6 rounded-full border border-[rgba(160,185,255,0.45)]">
              <motion.span
                className="absolute left-1/2 top-2 h-2 w-1 -translate-x-1/2 rounded-full bg-[var(--blue-bright)] shadow-glow"
                animate={{ y: [0, 10, 0], opacity: [1, 0.2, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />
            </span>
            <span className="font-display text-[10px] uppercase tracking-[0.3em] text-muted">{t('scrollHint')}</span>
          </Fly>
        </div>
      </div>
    </section>
  );
}
