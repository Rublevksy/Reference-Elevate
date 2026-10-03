'use client';

import { useEffect } from 'react';
import { DEMO_FIRST_FRAME } from '@/components/sections/DemoScreen';

/**
 * Obrázky scén pod úvodní obrazovkou se v HTML načítají líně, ať při startu
 * nesoutěží se skripty a písmy. Tady si je prohlížeč stáhne předem — až po
 * načtení stránky a ve chvíli klidu —, takže jsou hotové dřív, než k nim
 * návštěvník doskroluje (líné načítání má v každém prohlížeči jiný předstih).
 */
const EVERYWHERE = ['/norda/sneaker.webp'];
const DESKTOP_ONLY = [DEMO_FIRST_FRAME, '/brand/elevate-symbol.svg'];

export function WarmAssets() {
  useEffect(() => {
    let idle = 0;
    let timer = 0;
    const run = () => {
      const desktop = window.matchMedia('(min-width: 768px)').matches;
      for (const src of desktop ? [...EVERYWHERE, ...DESKTOP_ONLY] : EVERYWHERE) {
        const img = new window.Image();
        img.decoding = 'async';
        img.src = src;
      }
    };
    const schedule = () => {
      if (typeof window.requestIdleCallback === 'function') idle = window.requestIdleCallback(run, { timeout: 4000 });
      else timer = window.setTimeout(run, 1500);
    };
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });
    return () => {
      window.removeEventListener('load', schedule);
      if (idle) window.cancelIdleCallback?.(idle);
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}
