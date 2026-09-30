'use client';

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Maximize2, X } from 'lucide-react';
import { useEffect, type CSSProperties } from 'react';
import data from '@/lib/content/editable-hints.json';

/*
 * Obrazové nápovědy: kde je text na webu. Snímky a obdélníky vyrábí
 * scripts/capture-admin-hints.mjs (lib/content/editable-hints.json).
 * Místo slovního popisu („text vpravo vedle šipky") je u pole výřez
 * skutečného webu se zvýrazněným místem a šipkou; kliknutím se zvětší.
 */

type Shot = { src: string; w: number; h: number };
type Box = [number, number, number, number];
type Raw = { shot: string; box: number[]; empty?: boolean };

const SHOTS = data.shots as Record<string, Shot>;
const FIELDS = data.fields as Record<string, Raw>;

export type Hint = { shot: Shot; box: Box };

/** Nápověda pro pole; u více cest (např. položky „V ceně") jejich společný obdélník. */
export function hintFor(paths: string | string[]): Hint | null {
  const list = (Array.isArray(paths) ? paths : [paths]).map((p) => FIELDS[p]).filter(Boolean);
  if (!list.length) return null;
  const shotId = list[0].shot;
  const same = list.filter((h) => h.shot === shotId);
  const x1 = Math.min(...same.map((h) => h.box[0]));
  const y1 = Math.min(...same.map((h) => h.box[1]));
  const x2 = Math.max(...same.map((h) => h.box[0] + h.box[2]));
  const y2 = Math.max(...same.map((h) => h.box[1] + h.box[3]));
  const shot = SHOTS[shotId];
  return shot ? { shot, box: [x1, y1, x2 - x1, y2 - y1] } : null;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Výřez snímku kolem zvýrazněného místa (v souřadnicích snímku). */
function region({ shot, box }: Hint, aspect: number, minWidth: number) {
  const [x, y, w, h] = box;
  let rw = Math.min(shot.w, Math.max(w * 1.9, h * 1.9 * aspect, Math.min(minWidth, shot.w)));
  let rh = rw / aspect;
  if (rh > shot.h) {
    rh = shot.h;
    rw = Math.min(shot.w, rh * aspect);
  }
  const rx = clamp(x + w / 2 - rw / 2, 0, Math.max(0, shot.w - rw));
  const ry = clamp(y + h / 2 - rh / 2, 0, Math.max(0, shot.h - rh));
  return { rx, ry, rw, rh };
}

const pct = (v: number) => `${(v * 100).toFixed(3)}%`;

/** Zvýraznění + šipka nad obrázkem; vše v procentech, takže sedí v jakékoli velikosti. */
function Overlay({ hint, r, big = false }: { hint: Hint; r: { rx: number; ry: number; rw: number; rh: number }; big?: boolean }) {
  const pad = big ? 6 : 5;
  const [x, y, w, h] = hint.box;
  const left = (x - pad - r.rx) / r.rw;
  const top = (y - pad - r.ry) / r.rh;
  const width = (w + pad * 2) / r.rw;
  const height = (h + pad * 2) / r.rh;
  const cx = left + width / 2;
  const cy = top + height / 2;

  // šipka z té strany, kde je víc místa, míří na zvýrazněné místo
  const size = big ? 34 : 22;
  let arrow: { style: CSSProperties; Icon: typeof ArrowRight; axis: 'x' | 'y'; dir: 1 | -1 };
  if (width < 0.62) {
    arrow =
      cx > 0.5
        ? { style: { left: `calc(${pct(left)} - ${size + 6}px)`, top: `calc(${pct(cy)} - ${size / 2}px)` }, Icon: ArrowRight, axis: 'x', dir: 1 }
        : { style: { left: `calc(${pct(left + width)} + 6px)`, top: `calc(${pct(cy)} - ${size / 2}px)` }, Icon: ArrowLeft, axis: 'x', dir: -1 };
  } else {
    arrow =
      cy > 0.5
        ? { style: { left: `calc(${pct(cx)} - ${size / 2}px)`, top: `calc(${pct(top)} - ${size + 6}px)` }, Icon: ArrowDown, axis: 'y', dir: 1 }
        : { style: { left: `calc(${pct(cx)} - ${size / 2}px)`, top: `calc(${pct(top + height)} + 6px)` }, Icon: ArrowUp, axis: 'y', dir: -1 };
  }
  const { Icon } = arrow;

  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute rounded-md border-2 border-[#ffc53d] shadow-[0_0_0_9999px_rgba(3,5,10,0.52),0_0_16px_rgba(255,197,61,0.75)]"
        style={{ left: pct(left), top: pct(top), width: pct(width), height: pct(height) }}
      />
      <span
        aria-hidden
        className="hint-arrow pointer-events-none absolute grid place-items-center rounded-full bg-[#ffc53d] text-[#1a1203] shadow-[0_0_14px_rgba(255,197,61,0.8)]"
        style={{ ...arrow.style, width: size, height: size, '--nx': arrow.axis === 'x' ? `${arrow.dir * 4}px` : '0px', '--ny': arrow.axis === 'y' ? `${arrow.dir * 4}px` : '0px' } as CSSProperties}
      >
        <Icon className={big ? 'h-5 w-5' : 'h-3.5 w-3.5'} strokeWidth={2.6} />
      </span>
    </>
  );
}

/**
 * Náhled místa na webu. `size` = šířka v px na desktopu (na mobilu
 * vždy přes celou šířku, nejvýš 420 px).
 */
export function HintThumb({ hint, label, onOpen, compact = false }: { hint: Hint; label: string; onOpen: () => void; compact?: boolean }) {
  const aspect = 16 / 10;
  const clip = hint.shot.w < 900; // výřez (bublina maskota) — ukázat celý
  const r = region(hint, aspect, clip ? hint.shot.w : compact ? 320 : 430);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Kde je na webu: ${label} (zvětšit)`}
      className="group relative block w-full overflow-hidden rounded-xl border border-[rgba(110,150,255,0.22)] bg-[#03050a] outline-none transition-[border-color,box-shadow] duration-300 hover:border-[rgba(255,197,61,0.6)] hover:shadow-[0_0_22px_rgba(255,197,61,0.18)] focus-visible:border-[#ffc53d]"
      style={{ aspectRatio: `${aspect}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={hint.shot.src}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className="absolute max-w-none select-none"
        style={{ width: pct(hint.shot.w / r.rw), left: pct(-r.rx / r.rw), top: pct(-r.ry / r.rh) }}
      />
      <Overlay hint={hint} r={r} />
      <span className="absolute bottom-1.5 right-1.5 grid h-6 w-6 place-items-center rounded-md bg-[rgba(4,6,11,0.75)] text-[#ffe2a0] opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
        <Maximize2 className="h-3.5 w-3.5" aria-hidden />
      </span>
    </button>
  );
}

/** Malá nápověda k popisku pole (Ceník, Kontakt a firma). */
export function HintMini({ hint, label, onOpen }: { hint: Hint; label: string; onOpen: () => void }) {
  return (
    <span className="block w-[112px] shrink-0">
      <HintThumb hint={hint} label={label} onOpen={onOpen} compact />
    </span>
  );
}

/** Celý snímek se zvýrazněním — přes celou obrazovku. */
export function HintLightbox({ hint, label, onClose }: { hint: Hint; label: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const full = { rx: 0, ry: 0, rw: hint.shot.w, rh: hint.shot.h };
  // telefon: celý snímek je na výšku displeje drobný — nahoře ještě přiblížený výřez
  const zoom = region(hint, 1, Math.min(hint.shot.w, 520));
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-[70] grid place-items-center bg-[rgba(2,4,9,0.88)] p-3 backdrop-blur-sm sm:p-8"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <figure className="w-full max-w-[1200px]">
        <div className="mb-3 flex items-center justify-between gap-4">
          <figcaption className="min-w-0 truncate font-display text-[11px] uppercase tracking-[0.14em] text-[#ffe2a0]">{label}</figcaption>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zavřít"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--line)] bg-white/[0.04] text-ink transition-colors hover:border-[rgba(80,120,255,0.55)]"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-2xl border border-[rgba(110,150,255,0.25)] bg-black sm:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hint.shot.src}
            alt=""
            draggable={false}
            className="absolute max-w-none select-none"
            style={{ width: pct(hint.shot.w / zoom.rw), left: pct(-zoom.rx / zoom.rw), top: pct(-zoom.ry / zoom.rh) }}
          />
          <Overlay hint={hint} r={zoom} big />
        </div>
        <div
          className="relative mx-auto w-full overflow-hidden rounded-2xl border border-[rgba(110,150,255,0.25)] bg-black"
          style={{ aspectRatio: `${hint.shot.w} / ${hint.shot.h}`, maxHeight: '80dvh', maxWidth: `calc(80dvh * ${hint.shot.w / hint.shot.h})` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hint.shot.src} alt="" className="absolute inset-0 h-full w-full select-none" draggable={false} />
          <Overlay hint={hint} r={full} big />
        </div>
      </figure>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SEO: živý náhled výsledku ve vyhledávání a sdílení odkazu           */
/* ------------------------------------------------------------------ */

const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export function SerpPreview({ title, description, ogTitle, url }: { title: string; description: string; ogTitle: string; url: string }) {
  const host = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const counter = (n: number, lo: number, hi: number) => (
    <span className={`tabular-nums ${n > hi ? 'text-[#ffb3be]' : n < lo ? 'text-[#ffe2a0]' : 'text-[#9fe7c0]'}`}>{n} znaků</span>
  );
  return (
    <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
      <div className="rounded-2xl border border-[var(--line)] bg-[#202124] p-5 text-left">
        <p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-[#9aa0a6]">Google</p>
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.png" alt="" className="h-4 w-4" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block text-[14px] text-[#dadce0]">ELEVATE</span>
            <span className="block truncate text-[12px] text-[#9aa0a6]">{host} › cs</span>
          </span>
        </div>
        <p className="mt-2 text-[19px] leading-snug text-[#8ab4f8]">{cut(title || '—', 62)}</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-[#bdc1c6]">{cut(description || '—', 160)}</p>
        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#9aa0a6]">
          <span>Titulek: {counter(title.length, 30, 60)}</span>
          <span>Popis: {counter(description.length, 120, 160)}</span>
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[#0f1115] text-left">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/cs/opengraph-image" alt="" className="aspect-[1200/630] w-full bg-[#04060b] object-cover" />
        <div className="border-t border-white/5 p-4">
          <p className="text-[11px] uppercase tracking-wide text-[#8a8d91]">{host}</p>
          <p className="mt-1 font-semibold leading-snug text-[#e4e6eb]">{cut(ogTitle || title, 88)}</p>
          <p className="mt-1 line-clamp-2 text-sm text-[#b0b3b8]">{description}</p>
        </div>
      </div>
    </div>
  );
}
