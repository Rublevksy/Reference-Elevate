'use client';

import { SCREEN_TRACK, SCREEN_TRACK_FROM } from './heroScreenTrack';

/** Bod ve viewportu (CSS px). */
export type Pt = { x: number; y: number };
/** Čtyřúhelník obrazovky: TL, TR, BR, BL. */
export type Quad = [Pt, Pt, Pt, Pt];

/** Rozměr screenshotu webu, který se promítá do obrazovky notebooku. */
export const SITE_SHOT = { w: 1440, h: 900 } as const;

/**
 * Stav hero filmu pro navazující sekci (let karet z obrazovky):
 * progress hera a aktuální poloha screenshotu webu ve viewportu.
 */
export type HeroFrameState = {
  p: number;
  /** homografie SITE_SHOT → viewport; null = web na obrazovce ještě není */
  map: ((x: number, y: number) => Pt) | null;
  /** jak moc je web na obrazovce „rozsvícený" (0…1) */
  shot: number;
};

let state: HeroFrameState = { p: 0, map: null, shot: 0 };
const listeners = new Set<(s: HeroFrameState) => void>();

export function publishHeroFrame(next: HeroFrameState) {
  state = next;
  listeners.forEach((listener) => listener(next));
}

export function subscribeHeroFrame(listener: (s: HeroFrameState) => void) {
  listeners.add(listener);
  listener(state);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Rohy obrazovky pro daný snímek filmu, přepočtené do viewportu stejně,
 * jak plátno kreslí snímek (object-fit: cover). Mobilní snímky jsou
 * středový výřez 675×900 desktopového snímku zvětšený na 720×960.
 */
export function screenQuad(frame: number, mobile: boolean, fw: number, fh: number, vw: number, vh: number): Quad | null {
  const desktopFrame = mobile ? frame * 2 : frame;
  // zlomkový snímek (film se mezi snímky prolíná) → rohy interpolovat
  const k = desktopFrame - SCREEN_TRACK_FROM;
  const r0 = SCREEN_TRACK[Math.floor(k)];
  if (!r0) return null;
  const r1 = SCREEN_TRACK[Math.floor(k) + 1] ?? r0;
  const fr = k - Math.floor(k);
  const row = r0.map((v, j) => v + (r1[j] - v) * fr);
  const s = Math.max(vw / fw, vh / fh);
  const ox = (vw - fw * s) / 2;
  const oy = (vh - fh * s) / 2;
  const toFrame = mobile
    ? (x: number, y: number) => ({ x: (x - 462.5) * (960 / 900), y: y * (960 / 900) })
    : (x: number, y: number) => ({ x, y });
  const pts: Pt[] = [];
  for (let k = 0; k < 4; k++) {
    const f = toFrame(row[k * 2], row[k * 2 + 1]);
    pts.push({ x: ox + f.x * s, y: oy + f.y * s });
  }
  return pts as Quad;
}

/**
 * Projektivní zobrazení obdélníku w×h na čtyřúhelník (klasická homografie
 * „čtverec → čtyřúhelník"). Vrací koeficienty a funkci pro body.
 */
export function homography(w: number, h: number, q: Quad) {
  const [p0, p1, p2, p3] = q;
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const sx = p0.x - p1.x + p2.x - p3.x;
  const sy = p0.y - p1.y + p2.y - p3.y;
  const den = dx1 * dy2 - dx2 * dy1 || 1e-9;
  const g = (sx * dy2 - dx2 * sy) / den;
  const hh = (dx1 * sy - sx * dy1) / den;
  const a = p1.x - p0.x + g * p1.x;
  const b = p3.x - p0.x + hh * p3.x;
  const c = p0.x;
  const d = p1.y - p0.y + g * p1.y;
  const e = p3.y - p0.y + hh * p3.y;
  const f = p0.y;
  // jednotkový čtverec → čtyřúhelník; vstup škálujeme z w×h
  const A = a / w;
  const B = b / h;
  const D = d / w;
  const E = e / h;
  const G = g / w;
  const H = hh / h;
  const map = (x: number, y: number): Pt => {
    const z = G * x + H * y + 1;
    return { x: (A * x + B * y + c) / z, y: (D * x + E * y + f) / z };
  };
  // CSS matrix3d je po sloupcích
  const css = `matrix3d(${[A, D, 0, G, B, E, 0, H, 0, 0, 1, 0, c, f, 0, 1].map((v) => v.toFixed(8)).join(',')})`;
  return { map, css };
}

export const lerpQuad = (a: Quad, b: Quad, t: number): Quad =>
  a.map((p, i) => ({ x: p.x + (b[i].x - p.x) * t, y: p.y + (b[i].y - p.y) * t })) as Quad;

export const quadCenter = (q: Quad): Pt => ({ x: (q[0].x + q[1].x + q[2].x + q[3].x) / 4, y: (q[0].y + q[1].y + q[2].y + q[3].y) / 4 });

export function quadBox(q: Quad) {
  const xs = q.map((p) => p.x);
  const ys = q.map((p) => p.y);
  const l = Math.min(...xs);
  const r = Math.max(...xs);
  const t = Math.min(...ys);
  const b = Math.max(...ys);
  return { l, t, w: r - l, h: b - t, cx: (l + r) / 2, cy: (t + b) / 2 };
}

const cross = (ax: number, ay: number, bx: number, by: number) => ax * by - ay * bx;

/** Vzdálenost od bodu `c` (uvnitř konvexního čtyřúhelníku) k jeho hraně ve směru `dir` (jednotkový). */
function rayToEdge(c: Pt, dx: number, dy: number, q: Quad) {
  let best = Infinity;
  for (let i = 0; i < 4; i++) {
    const a = q[i];
    const b = q[(i + 1) % 4];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const den = cross(dx, dy, ex, ey);
    if (Math.abs(den) < 1e-9) continue;
    const wx = a.x - c.x;
    const wy = a.y - c.y;
    const t = cross(wx, wy, ex, ey) / den;
    const u = cross(wx, wy, dx, dy) / den;
    if (t > 0 && u >= -1e-6 && u <= 1 + 1e-6) best = Math.min(best, t);
  }
  return best;
}

/**
 * Nejmenší zoom Z kolem středu `c` (posunutého do `c2`), při kterém čtyřúhelník
 * displeje celý zakryje okno vw × vh: x' = c2 + Z·(x − c).
 */
export function coverZoom(q: Quad, c: Pt, c2: Pt, vw: number, vh: number) {
  let need = 1;
  for (const v of [
    { x: 0, y: 0 },
    { x: vw, y: 0 },
    { x: vw, y: vh },
    { x: 0, y: vh },
  ]) {
    const dx = v.x - c2.x;
    const dy = v.y - c2.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) continue;
    const t = rayToEdge(c, dx / len, dy / len, q);
    if (Number.isFinite(t) && t > 0) need = Math.max(need, len / t);
  }
  return need;
}

/**
 * Poloha kotvy stolu služeb bez vlastního transformu (ten mění hero při
 * dojezdu) — kotva je sticky nahoře své sekce. Screenshot 1440 × 900 leží
 * vodorovně uprostřed okna, svisle od horní hrany kotvy.
 */
export function anchorBox(anchor: HTMLElement, vw: number) {
  const sec = (anchor.parentElement as HTMLElement).getBoundingClientRect();
  const top = Math.min(Math.max(sec.top, 0), sec.bottom - anchor.offsetHeight);
  return { left: (vw - SITE_SHOT.w) / 2, top };
}
