'use client';

import { motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { HeroBook, HeroLink } from '@/components/ui/HeroCta';
import { markHeroRevealed } from '@/lib/heroReveal';
import { introSeen } from '@/lib/scrollTo';
import { SITE_SHOT, anchorBox, coverZoom, homography, lerpQuad, publishHeroFrame, quadCenter, screenQuad, type Quad } from '@/lib/heroScreen';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useScrollFrame } from '@/lib/useScrollFrame';

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
 * Časová osa hera (progress pinu) na desktopu — 521vh (pin 421vh), aby každá
 * fáze měla při běžném kolečku/touchpadu dost scrollu:
 *   0 … 0.4     maskot, otevření víka (web se rozsvítí na displeji), ukázání
 *   0.4 … 0.78  kamera najíždí do displeje; 0.44–0.64 z něj vylétají karty
 *               služeb a rozestoupí se kolem notebooku (ServicesTable)
 *   0.7 … 0.84  PUSH — kamera „projde sklem": displej se dozoomuje, až celý
 *               kadr kryje web a rámeček notebooku odjede za okraje okna
 *   0.84 … 0.95 SETTLE — screenshot se rozplyne do skutečné sekce, která
 *               ze stejného záběru (měřítka) plynule „odjede" na své místo
 *   0.86 … 0.98 karty dosednou na stůl
 * Stůl služeb leží posledních 184vh pod filmem a je připnutý od p 0.8.
 */
const DESKTOP = { height: '521vh', overlap: '-184.2dvh', frames: [0, 0.4, 0.78], frameAt: [0, 250, 360] };
/**
 * Mobil: film končí dřív (snímek 125 ≈ desktop 250), dokud je notebook celý
 * a web na displeji čitelný — najetí až do desktopového screenshotu by na
 * úzkém displeji ořezalo stránku a pak ji vyměnilo za jiné (mobilní) rozvržení.
 * Pak se film klidně rozplyne do mobilní sekce.
 */
const MOBILE = { height: '340vh', overlap: '-100dvh', frames: [0, 0.78], frameAt: [0, 125] };
/**
 * Snímky, kdy se na displeji rozsvítí web: až když ruka pustí víko
 * (ve snímcích 106–109 drží prsty roh displeje a web přes ně by je „propíchl").
 */
const SHOT_IN: [number, number] = [112, 122];
const PUSH: [number, number] = [0.7, 0.84];
const SETTLE: [number, number] = [0.84, 0.95];
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const seg = (v: number, [a, b]: [number, number]) => clamp01((v - a) / (b - a));
const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * Opakovaná návštěva v téže session (obnovení stránky, návrat z jiné
 * stránky): úvodní nástup textů hera se znovu nepřehrává — texty jsou
 * hned na místě. Ovlivňuje jen `transition`, ne vykreslený DOM, takže
 * hydratace sedí.
 */
const IntroQuick = createContext(false);
const QUICK = { duration: 0 };
function useIntroTransition() {
  const quick = useContext(IntroQuick);
  return <T,>(t: T) => (quick ? QUICK : t);
}

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
  const tr = useIntroTransition();
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
                  transition={tr({ delay: 0.4 + currentWord * 0.05, duration: 0.8, ease: [0.16, 1, 0.3, 1] })}
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
  // úvod už viděl → nástup textů bez zpoždění (lib/scrollTo: introSeen)
  const [quick] = useState(() => typeof window !== 'undefined' && introSeen());
  const tr = <T,>(value: T) => (quick ? QUICK : value);
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const filmRef = useRef<HTMLDivElement>(null);
  const shotRef = useRef<HTMLDivElement>(null);
  const tintRef = useRef<HTMLDivElement>(null);
  const dimRef = useRef<HTMLDivElement>(null);
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
    // mobil má vlastní hero bez filmu (MobileHero) — snímky se nestahují
    if (reduced || window.matchMedia('(max-width: 767px)').matches) return;
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
  }, [reduced, totalFrames, srcFor, isMobile]);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });
  // film doběhne do posledního (plně modrého) snímku ještě před rozplynutím
  const timeline = isMobile ? MOBILE : DESKTOP;
  const frameIndexMV = useTransform(scrollYProgress, timeline.frames, timeline.frameAt);
  const fadeFrom = isMobile ? 0.82 : 0.95;

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
   *
   * Konec filmu (desktop) je jeden pohyb kamery bez střihu:
   *  PUSH   — kamera dál najíždí za poslední snímek videa (plátno i screenshot
   *           stejnou afinní transformací), až displej kryje celé okno i na
   *           ultrawide; rámeček notebooku a jeho modrá záře odjedou za okraj.
   *           Teprve pak plátno zhasne — pod screenshotem, tedy neviditelně.
   *  SETTLE — screenshot se zmenšuje na polohu skutečné sekce a rozplývá se;
   *           skutečná sekce stojí pod ním ve STEJNÉM měřítku a poloze
   *           (transform kotvy) a spolu s ním dojede na své místo. Žádná
   *           podkladová vrstva, žádná hrana, kde by mohla prosvitnout modrá.
   */
  const placeShot = (frame: number, fw: number, fh: number) => {
    const shot = shotRef.current;
    const canvas = canvasRef.current;
    if (!shot) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const p = scrollYProgress.get();
    const desktopFrame = isMobile ? frame * 2 : frame;
    let quad = screenQuad(frame, isMobile, fw, fh, vw, vh);
    const lit = seg(desktopFrame, SHOT_IN);
    const anchor = isMobile ? null : document.querySelector<HTMLElement>('#sluzby [data-shot-anchor]');
    if (!quad || lit <= 0) {
      shot.style.visibility = 'hidden';
      if (canvas) {
        canvas.style.opacity = '';
        canvas.style.transform = '';
      }
      if (anchor) anchor.style.transform = '';
      if (dimRef.current) dimRef.current.style.opacity = '0';
      publishHeroFrame({ p, map: null, shot: 0 });
      return;
    }

    const push = isMobile ? 0 : smooth(seg(p, PUSH));
    const settleRaw = isMobile ? 0 : seg(p, SETTLE);
    const settle = smooth(settleRaw);

    // PUSH: x' = c2 + Z·(x − c), c = střed displeje, c2 → střed okna
    if (push > 0) {
      const c = quadCenter(quad);
      const c2 = { x: c.x + (vw / 2 - c.x) * push, y: c.y + (vh / 2 - c.y) * push };
      const need = Math.max(1, coverZoom(quad, c, c2, vw, vh) * 1.02);
      const Z = 1 + (need - 1) * push;
      quad = quad.map((pt) => ({ x: c2.x + Z * (pt.x - c.x), y: c2.y + Z * (pt.y - c.y) })) as Quad;
      if (canvas) canvas.style.transform = `translate3d(${(c2.x - Z * c.x).toFixed(2)}px, ${(c2.y - Z * c.y).toFixed(2)}px, 0) scale(${Z.toFixed(5)})`;
    } else if (canvas) canvas.style.transform = '';
    // plátno zhasne až pod plně krycím screenshotem
    if (canvas) canvas.style.opacity = push >= 0.999 ? '0' : '1';

    // SETTLE: screenshot → poloha skutečné sekce (1440 × 900 uprostřed, nahoře kotvy)
    const aligned = anchor ? anchorBox(anchor, vw) : null;
    if (aligned && settle > 0) {
      const target: Quad = [
        { x: aligned.left, y: aligned.top },
        { x: aligned.left + SITE_SHOT.w, y: aligned.top },
        { x: aligned.left + SITE_SHOT.w, y: aligned.top + SITE_SHOT.h },
        { x: aligned.left, y: aligned.top + SITE_SHOT.h },
      ];
      quad = lerpQuad(quad, target, settle);
    }
    // skutečná sekce pod screenshotem: STEJNÁ projekce jako screenshot (včetně
    // perspektivy), takže se při prolnutí obsah kryje a nic se nezdvojí
    if (anchor && aligned) {
      if (p >= PUSH[0] && settleRaw < 1) {
        const local = homography(
          SITE_SHOT.w,
          SITE_SHOT.h,
          quad.map((pt) => ({ x: pt.x, y: pt.y - aligned.top })) as Quad,
        );
        anchor.style.transformOrigin = '0 0';
        anchor.style.transform = `${local.css} translate3d(${(-aligned.left).toFixed(2)}px, 0, 0)`;
      } else anchor.style.transform = '';
    }

    const h = homography(SITE_SHOT.w, SITE_SHOT.h, quad);
    shot.style.visibility = 'visible';
    shot.style.transform = h.css;
    // kde se rozvržení okna liší od screenshotu (malé notebooky), je prolnutí
    // kratší a odcházející záběr se lehce rozostří — nepůsobí jako dvojí obraz
    const mismatch = vw < 1220 || vh < 820;
    const out = seg(settleRaw, [0, mismatch ? 0.28 : 0.5]);
    shot.style.opacity = (smooth(lit) * (1 - smooth(out))).toFixed(3);
    shot.style.filter = mismatch && out > 0.01 && out < 1 ? `blur(${(6 * out).toFixed(2)}px)` : '';
    // ztmavení patří k plátnu — s ním i zhasne (jinak by kalilo skutečnou sekci)
    if (dimRef.current) dimRef.current.style.opacity = isMobile || push >= 0.999 ? '0' : (0.92 * smooth(seg(desktopFrame, [312, 352]))).toFixed(3);
    // při zmenšování na užší obdélník než okno se okraje screenshotu rozplynou do stránky
    const edge = settle * 7;
    const shotImg = shot.querySelector('img');
    if (shotImg) {
      const mask =
        edge > 0.05
          ? `linear-gradient(90deg, transparent, #000 ${edge.toFixed(2)}%, #000 ${(100 - edge).toFixed(2)}%, transparent), linear-gradient(180deg, #000 ${(100 - edge).toFixed(2)}%, transparent)`
          : '';
      shotImg.style.maskImage = mask;
      shotImg.style.maskComposite = mask ? 'intersect' : '';
    }
    if (tintRef.current) tintRef.current.style.opacity = (0.55 * (1 - seg(desktopFrame, [290, 350]))).toFixed(3);
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

    let lastFrac = -1;
    let lastT = performance.now();
    const loaded = (i: number) => i >= 0 && i < totalFrames && loadedRef.current[i];
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (!inView) return;
      const dt = Math.min(0.1, (now - lastT) / 1000);
      lastT = now;
      const gap = targetFrameRef.current - currentFrameRef.current;
      // skok přes navigaci = rovnou cíl; jinak dotahování nezávislé na fps
      // (dřív se nad 24 snímků skočilo rovnou — při rychlém tahu kolečkem viditelný cuk)
      currentFrameRef.current = Math.abs(gap) > 90 ? targetFrameRef.current : currentFrameRef.current + gap * (1 - Math.exp(-dt * 11));
      const f = Math.max(0, Math.min(totalFrames - 1, currentFrameRef.current));

      // Mezi dvěma sousedními snímky filmu se prolíná podle zlomku — dřív se
      // kreslilo jen při změně celého snímku (24 fps záznam), takže při pomalém
      // skrolu obraz stál a pak poskočil.
      let i0 = Math.floor(f);
      let frac = f - i0;
      if (!loaded(i0)) {
        let lo = i0;
        let hi = i0;
        i0 = -1;
        while (lo > 0 || hi < totalFrames - 1) {
          if (lo > 0 && loaded(--lo)) { i0 = lo; break; }
          if (hi < totalFrames - 1 && loaded(++hi)) { i0 = hi; break; }
        }
        frac = 0;
        if (i0 < 0) return;
      }
      const i1 = loaded(i0 + 1) ? i0 + 1 : -1;
      if (i1 < 0) frac = 0;

      const img = imagesRef.current[i0];
      if (img?.complete && img.naturalWidth > 0) {
        const p = scrollYProgress.get();
        const sizeChanged = canvas.width !== lastW;
        const fracChanged = Math.abs(frac - lastFrac) > 0.004;
        if (i0 !== lastIdx || sizeChanged || fracChanged) {
          drawCover(ctx, img, canvas.width, canvas.height);
          if (frac > 0.004 && i1 >= 0) {
            ctx.globalAlpha = frac;
            drawCover(ctx, imagesRef.current[i1], canvas.width, canvas.height);
            ctx.globalAlpha = 1;
          }
        }
        if (i0 !== lastIdx || sizeChanged || fracChanged || p !== lastP) placeShotRef.current(i0 + frac, img.naturalWidth, img.naturalHeight);
        lastIdx = i0;
        lastFrac = frac;
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
    <IntroQuick.Provider value={quick}>
    <MobileHero headingParts={headingParts} headingClass={headingClass} />
    <section
      id="hero"
      ref={sectionRef}
      className="pointer-events-none relative z-10 hidden md:block"
      style={{ height: timeline.height, marginBottom: timeline.overlap }}
      aria-label={t('eyebrow')}
    >
      <div className="sticky top-0 h-dvh overflow-hidden">
        {/* film bez vlastního pozadí: na konci zhasne plátno a pod srovnaným
            screenshotem je rovnou skutečná stránka */}
        <div ref={filmRef} className="absolute inset-0 overflow-hidden" aria-hidden>
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full origin-top-left" />
          {/* jak kamera vjíždí do displeje, místnost kolem (i modrá záře
              rámečku) potemní — zůstane jen web na obrazovce */}
          <div ref={dimRef} className="absolute inset-0 bg-[#04060b] opacity-0" />
          {/* skutečný web na displeji notebooku (perspektivně, podle snímku) */}
          <div
            ref={shotRef}
            className="invisible absolute left-0 top-0 origin-top-left"
            style={{ width: SITE_SHOT.w, height: SITE_SHOT.h, opacity: 0 }}
          >
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={tr({ delay: 0.15 })}>
              <Fly x={220} y={-90} r={8}>
                <motion.p
                  className="eyebrow flex items-center gap-3"
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={tr({ delay: 0.3, duration: 0.6 })}
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
                  transition={tr({ delay: 1.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] })}
                />
              </Fly>

              <Fly x={240} y={80} r={6}>
                <motion.p
                  className="mt-5 max-w-sm text-base leading-relaxed text-muted"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={tr({ delay: 0.85, duration: 0.7 })}
                >
                  {t('subtitle')}
                </motion.p>
              </Fly>

              <motion.div
                className="mt-8 flex flex-col items-start gap-5"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={tr({ delay: 1.1, duration: 0.7 })}
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
              <span className="hint-dot absolute left-1/2 top-2 h-2 w-1 rounded-full bg-[var(--blue-bright)] shadow-glow" />
            </span>
            <span className="font-display text-[10px] uppercase tracking-[0.3em] text-muted">{t('scrollHint')}</span>
          </Fly>
        </div>
      </div>
    </section>
    </IntroQuick.Provider>
  );
}

/**
 * Mobilní hero — vlastní svislá kompozice bez filmu (video pro mobil přijde
 * později). Fotka scény s neonovou šipkou, titulek a výzva dole u palce.
 * Scroll: kamera se pomalu přiblíží k šipce, neon zesílí, text odjede
 * nahoru a scéna se rozplyne do tmy, ze které vyjede stůl služeb.
 */
function MobileHero({ headingParts, headingClass }: { headingParts: { text: string; accent?: boolean }[]; headingClass: string }) {
  const t = useTranslations('hero');
  const tr = useIntroTransition();
  const reduced = useReducedMotion();
  const root = useRef<HTMLElement>(null);
  const bg = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLDivElement>(null);
  const shade = useRef<HTMLDivElement>(null);

  useScrollFrame(() => {
    const el = root.current;
    if (!el || !el.offsetHeight || reduced) return;
    const vh = window.innerHeight;
    const rect = el.getBoundingClientRect();
    // mimo obrazovku: vypnout nekonečné animace (drží vlastní GPU vrstvy) a nic nepočítat
    const away = rect.bottom < -vh * 0.25;
    if (away !== el.hasAttribute('data-away')) el.toggleAttribute('data-away', away);
    if (away) return;
    const p = clamp01(-rect.top / Math.max(1, el.offsetHeight - vh));
    const z = smooth(p);
    if (bg.current) bg.current.style.transform = `translate3d(0, ${(-4 * z).toFixed(2)}%, 0) scale(${(1 + 0.3 * z).toFixed(4)})`;
    if (glow.current) glow.current.style.opacity = (0.45 + 0.55 * seg(p, [0, 0.7])).toFixed(3);
    const out = seg(p, [0.08, 0.62]);
    if (text.current) {
      // 2D posun a v klidu žádný transform — iOS pak pro text nedrží zvláštní vrstvu
      text.current.style.transform = out > 0 ? `translateY(${(-90 * smooth(out)).toFixed(1)}px)` : '';
      text.current.style.opacity = (1 - smooth(out)).toFixed(3);
      text.current.style.pointerEvents = out > 0.5 ? 'none' : '';
    }
    if (hint.current) hint.current.style.opacity = (1 - seg(p, [0, 0.12])).toFixed(3);
    // scéna jen potemní (ne do černa) — stůl služeb pod ní už vyjíždí
    if (shade.current) shade.current.style.opacity = (0.65 * smooth(seg(p, [0.5, 1]))).toFixed(3);
  });

  let wordIndex = 0;
  return (
    <section id="hero-m" ref={root} className="relative md:hidden" style={{ height: reduced ? '100svh' : '145svh' }} aria-label={t('eyebrow')}>
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div ref={bg} className="absolute inset-0 origin-[62%_24%] will-change-transform" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hero/mobile-still.webp" alt="" fetchPriority="high" className="h-full w-full object-cover object-[72%_0%]" />
        </div>
        {/* „bzučení" neonu — světlo šipky dýchá a se scrollem zesílí */}
        <div ref={glow} aria-hidden className="pointer-events-none absolute inset-0 mix-blend-screen" style={{ opacity: 0.45 }}>
          <span className="absolute inset-0 animate-neon-hum" style={{ background: 'radial-gradient(40% 24% at 62% 22%, rgba(61,123,255,0.55), transparent 70%)' }} />
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(4,6,11,0.55)_0%,rgba(4,6,11,0)_22%,rgba(4,6,11,0.15)_42%,rgba(4,6,11,0.88)_68%,#04060b_100%)]" />

        <div ref={text} className="absolute inset-x-0 bottom-0 px-5 pb-[max(36px,7svh)]">
          <p className="eyebrow flex items-center gap-3">
            <span className="inline-block h-px w-8 bg-[var(--text-muted)]" />
            {t('eyebrow')}
          </p>
          <h1 className={`${headingClass} !text-[clamp(1.9rem,9vw,2.6rem)]`}>
            {headingParts.flatMap((part, partIndex) =>
              part.text
                .split(' ')
                .filter(Boolean)
                .map((word) => {
                  const i = wordIndex++;
                  return (
                    // nástup v CSS: běží od prvního vykreslení (nadpis je největší prvek
                    // stránky — nečeká na skripty), při první návštěvě až po úvodní cloně
                    <span
                      key={`${partIndex}-${i}`}
                      className={`hero-word inline-block whitespace-nowrap ${part.accent ? 'text-[var(--blue-bright)]' : ''}`}
                      style={{ '--i': i } as React.CSSProperties}
                    >
                      {word}&nbsp;
                    </span>
                  );
                }),
            )}
          </h1>
          <motion.span
            aria-hidden
            className="mt-4 block h-[3px] w-24 origin-left rounded-full bg-[#9fc0ff]"
            style={{ boxShadow: '0 0 12px 2px rgba(61,123,255,0.9), 0 0 28px 6px rgba(31,91,255,0.5)' }}
            initial={reduced ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={tr({ delay: 0.9, duration: 0.8, ease: [0.16, 1, 0.3, 1] })}
          />
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={tr({ delay: 0.7, duration: 0.7 })}
          >
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted">{t('subtitle')}</p>
            <div className="mt-6 flex flex-col items-start gap-4">
              <HeroBook href="#kontakt" label={t('ctaBook')} note={t('ctaBookNote')} />
              <HeroLink href="#reference" label={t('ctaWork')} />
            </div>
          </motion.div>
        </div>

        {/* pozvánka ke skrolování — tah prstem */}
        <div ref={hint} aria-hidden className="pointer-events-none absolute right-5 top-1/2 flex -translate-y-1/2 flex-col items-center gap-2">
          <span className="relative block h-12 w-px overflow-hidden bg-[rgba(160,185,255,0.25)]">
            <span className="animate-scroll-drip absolute left-0 top-0 h-4 w-px bg-[var(--blue-bright)] shadow-glow" />
          </span>
        </div>
        <div ref={shade} aria-hidden className="pointer-events-none absolute inset-0 bg-[#04060b] opacity-0" />
      </div>
    </section>
  );
}
