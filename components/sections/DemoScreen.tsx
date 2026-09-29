'use client';

import { useEffect, useRef } from 'react';
import manifest from '@/content/demo-manifest.json';

type Kind = 'desktop' | 'mobile';

const SOURCES: Record<Kind, { frame: (i: number) => string; still: string }> = {
  desktop: { frame: (i) => `/demo/anim/d/${String(i).padStart(3, '0')}.webp`, still: '/demo/static-d.webp' },
  mobile: { frame: (i) => `/demo/anim/m/${String(i).padStart(3, '0')}.webp`, still: '/demo/static-m.webp' },
};

/** Barva pozadí ukázkového webu — pod snímky, dokud se nenačtou. */
const PAGE_BG = '#fbf6f0';

/** První snímek animované verze (přechodové scény z něj navazují). */
export const DEMO_FIRST_FRAME = SOURCES.desktop.frame(0);

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new window.Image();
    img.decoding = 'async';
    img.onload = () => {
      // dekódovat předem — první vykreslení snímku pak nečeká na dekodér
      const done = () => resolve(img);
      if (img.decode) img.decode().then(done, done);
      else done();
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Obrazovka ukázky „Weby, které žijí". Obě verze webu se kreslí do jednoho
 * <canvas>:
 *  - animovaná = hotové snímky záznamu webu; index podle skrolu a mezi dvěma
 *    sousedními snímky se prolíná, takže pohyb nemá schody;
 *  - statická  = dlouhá stránka posouvaná o zlomky pixelu (obyčejný skrol).
 * Skrol se k cíli dotahuje s tlumením (jako Lenis), přepnutí verzí je prolnutí.
 * Kreslí se jen při změně; mimo obrazovku smyčka stojí. Dřív to byl scrubbing
 * přes <video>.currentTime — každý posun znamenal dekódování, proto to sekalo.
 */
export function DemoScreen({
  kind,
  animated,
  progress,
  load,
  active,
  className = '',
}: {
  kind: Kind;
  animated: boolean;
  /** cílová poloha skrolu ukázky 0…1 (čte se každý snímek) */
  progress: () => number;
  /** začít stahovat snímky (sekce se blíží) */
  load: boolean;
  /** sekce je na obrazovce — běží vykreslovací smyčka */
  active: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frames = useRef<(HTMLImageElement | null)[]>([]);
  const still = useRef<HTMLImageElement | null>(null);
  const dirty = useRef(true);
  const animatedRef = useRef(animated);
  animatedRef.current = animated;
  const progressRef = useRef(progress);
  progressRef.current = progress;

  // stahování: nejdřív statická stránka a řídké pokrytí snímků (každý 8.),
  // pak zbytek — scrubbing funguje hned a postupně zjemňuje
  useEffect(() => {
    if (!load) return;
    let cancelled = false;
    const total = manifest[kind].frames;
    frames.current = new Array(total).fill(null);
    const order: number[] = [];
    const seen = new Set<number>();
    for (const step of [8, 4, 2, 1]) {
      for (let i = 0; i < total; i += step) {
        if (!seen.has(i)) {
          seen.add(i);
          order.push(i);
        }
      }
    }
    if (!seen.has(total - 1)) order.push(total - 1);

    (async () => {
      const img = await loadImage(SOURCES[kind].still);
      if (cancelled) return;
      still.current = img;
      dirty.current = true;
      let next = 0;
      const worker = async () => {
        while (!cancelled && next < order.length) {
          const i = order[next++];
          const frame = await loadImage(SOURCES[kind].frame(i));
          if (cancelled) return;
          frames.current[i] = frame;
          dirty.current = true;
        }
      };
      await Promise.all([worker(), worker(), worker(), worker()]);
    })();

    return () => {
      cancelled = true;
    };
  }, [load, kind]);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        dirty.current = true;
      }
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    /** snímek i nakreslit „cover", zarovnaný nahoru (jako object-position: top) */
    const drawFrame = (img: HTMLImageElement, W: number, H: number) => {
      const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const w = img.naturalWidth * s;
      ctx.drawImage(img, (W - w) / 2, 0, w, img.naturalHeight * s);
    };

    const draw = (t: number, mix: number) => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.globalAlpha = 1;
      ctx.fillStyle = PAGE_BG;
      ctx.fillRect(0, 0, W, H);

      // statická verze: dlouhá stránka, posun o zlomky pixelu
      const page = still.current;
      if (mix < 1 && page) {
        const s = W / page.naturalWidth;
        const visible = H / s;
        const y = t * Math.max(0, page.naturalHeight - visible);
        ctx.drawImage(page, 0, y, page.naturalWidth, visible, 0, 0, W, H);
      }

      // animovaná verze: dva sousední (načtené) snímky prolnuté podle zlomku
      if (mix > 0) {
        const list = frames.current;
        const f = t * (list.length - 1);
        let lo = Math.floor(f);
        let hi = Math.min(list.length - 1, lo + 1);
        while (lo > 0 && !list[lo]) lo--;
        while (hi < list.length - 1 && !list[hi]) hi++;
        const a = list[lo];
        const b = list[hi];
        if (a || b) {
          const base = a ?? b!;
          ctx.globalAlpha = mix;
          drawFrame(base, W, H);
          if (a && b && hi > lo) {
            // prolnout jen uprostřed intervalu — pohyb zůstane plynulý, ale dvojí
            // obraz (text posunutý mezi snímky) je vidět jen krátce
            const raw = Math.min(1, Math.max(0, (f - lo) / (hi - lo)));
            const k = Math.min(1, Math.max(0, (raw - 0.3) / 0.4));
            const fr = k * k * (3 - 2 * k);
            if (fr > 0.002) {
              ctx.globalAlpha = mix * fr;
              drawFrame(b, W, H);
            }
          }
        }
      }
      ctx.globalAlpha = 1;
      canvas.dataset.v = String((Number(canvas.dataset.v || 0) + 1) % 1e6);
    };

    let raf = 0;
    let last = performance.now();
    let cur = progressRef.current();
    let mix = animatedRef.current ? 1 : 0;
    let drawnT = -1;
    let drawnMix = -1;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const target = progressRef.current();
      cur += (target - cur) * (1 - Math.exp(-dt * 11));
      if (Math.abs(target - cur) < 1e-4) cur = target;
      const mixTarget = animatedRef.current ? 1 : 0;
      mix += (mixTarget - mix) * (1 - Math.exp(-dt * 10));
      if (Math.abs(mixTarget - mix) < 2e-3) mix = mixTarget;
      if (!dirty.current && Math.abs(cur - drawnT) < 2e-5 && Math.abs(mix - drawnMix) < 1e-3) return;
      dirty.current = false;
      drawnT = cur;
      drawnMix = mix;
      draw(cur, mix);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [active, kind]);

  return <canvas ref={canvasRef} aria-hidden className={`absolute inset-0 h-full w-full ${className}`} style={{ background: PAGE_BG }} />;
}
