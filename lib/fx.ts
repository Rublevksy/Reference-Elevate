/** Drobné pomocníky pro scroll-řízené animace (přímé zápisy do DOM). */

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Lokální progress úseku [a, b]. */
export const seg = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ease = (t: number) => t * t * (3 - 2 * t);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t: number) => t * t * t;

/** Deterministický šum 0…1 — stejný na serveru i v prohlížeči. */
export const hash = (i: number, salt: number) => {
  const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

/** Zapalování neonu: pár rychlých záblesků, pak plné světlo (0…1 → jas). */
export const neonFlicker = (t: number) => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const steps = [0.12, 0.2, 0.34, 0.42, 0.58];
  const on = steps.filter((x) => t > x).length % 2 === 1;
  return on ? 0.35 + 0.65 * t : 0.08 * t;
};

/** Tvar symbolu ELEVATE (šipka) — body polygonu ve viewBoxu 412.7 × 537.1. */
export const SYMBOL_VIEWBOX = '0 0 412.7 537.1';
export const SYMBOL_POINTS =
  '396.7,16.0 396.7,220.7 341.8,166.3 241.2,302.8 378.1,521.1 324.8,521.1 203.8,330.6 70.7,521.1 16.0,521.1 272.7,130.0 211.2,102.8';
