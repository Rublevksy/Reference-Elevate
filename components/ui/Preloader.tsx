'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/ui/Logo';
import { useReducedMotion } from '@/lib/useReducedMotion';

const SEEN_KEY = 'elevate:preloader';
const EASE = [0.76, 0, 0.24, 1] as const;

/** Načtení stránky (fonty + load), nejdéle však `cap` ms. */
function pageReady(cap: number) {
  const load = new Promise<void>((resolve) => {
    if (document.readyState === 'complete') resolve();
    else window.addEventListener('load', () => resolve(), { once: true });
  });
  const fonts = document.fonts?.ready.then(() => undefined) ?? Promise.resolve();
  return Promise.race([Promise.all([load, fonts]), new Promise<void>((resolve) => window.setTimeout(resolve, cap))]);
}

/**
 * Úvodní clona — jen při prvním načtení v rámci session. Na živém pozadí
 * (driftující neonové záře, jemná mřížka) se odkryje skutečné logo, pod ním
 * se natahuje tečkovaná neonová linka jako průběh načítání. Na konci logo
 * odletí přesně na místo loga v horní liště a clona se rozplyne — web
 * „vyroste" z úvodní obrazovky.
 *
 * Opakované načtení v téže session clonu vůbec nevykreslí (skript v <head>
 * nastaví třídu `pl-seen` ještě před prvním vykreslením).
 */
export function Preloader() {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<'show' | 'exit' | 'gone'>('show');
  const [flight, setFlight] = useState<{ x: number; y: number; s: number } | null>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === '1';
    } catch {
      /* soukromé okno */
    }
    if (seen || reduced) {
      setPhase('gone');
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow = 'hidden';
    window.__lenis?.stop();
    let cancelled = false;
    // úvod běží od prvního vykreslení (CSS) — minimum se počítá od začátku načítání
    const minimum = new Promise<void>((resolve) => window.setTimeout(resolve, Math.max(250, 1500 - performance.now())));

    Promise.all([minimum, pageReady(2600)]).then(() => {
      if (cancelled) return;
      // cíl letu: logo v horní liště (stejná velikost jako všude na webu)
      const target = document.querySelector('header [role="img"][aria-label="ELEVATE"]');
      const from = logoRef.current?.getBoundingClientRect();
      const to = target?.getBoundingClientRect();
      if (from && to && to.width > 0 && from.height > 0) {
        setFlight({
          x: to.left + to.width / 2 - (from.left + from.width / 2),
          y: to.top + to.height / 2 - (from.top + from.height / 2),
          s: to.height / from.height,
        });
      }
      try {
        sessionStorage.setItem(SEEN_KEY, '1');
      } catch {
        /* soukromé okno */
      }
      setPhase('exit');
      window.setTimeout(() => {
        if (cancelled) return;
        setPhase('gone');
        document.body.style.overflow = '';
        window.__lenis?.start();
      }, 950);
    });

    return () => {
      cancelled = true;
      document.body.style.overflow = '';
      window.__lenis?.start();
    };
  }, [reduced]);

  const exiting = phase === 'exit';

  return (
    <AnimatePresence>
      {phase !== 'gone' ? (
        <motion.div key="preloader" className="preloader fixed inset-0 z-[200]" aria-hidden exit={{ opacity: 0, transition: { duration: 0.2 } }}>
          {/* živé pozadí — při odchodu se rozplyne a pod ním je web */}
          <motion.div
            className="absolute inset-0 overflow-hidden bg-[var(--bg)]"
            initial={false}
            animate={{ opacity: exiting ? 0 : 1 }}
            transition={{ duration: 0.7, ease: EASE, delay: exiting ? 0.12 : 0 }}
          >
            <span className="splash-glow splash-glow-a" />
            <span className="splash-glow splash-glow-b" />
            <span className="splash-grid" />
            <span className="splash-scan" />
          </motion.div>

          <div className="absolute inset-0 grid place-items-center">
            <div className="relative flex flex-col items-center">
              {/* logo: odkrytí zleva, rozostření → ostré; na konci let do lišty */}
              <motion.div
                initial={false}
                animate={flight && exiting ? { x: flight.x, y: flight.y, scale: flight.s } : { x: 0, y: 0, scale: 1 }}
                transition={{ duration: 0.85, ease: EASE }}
              >
                <div ref={logoRef} className="max-sm:scale-[0.7]">
                  {/* odkrytí běží v CSS — začne hned s prvním vykreslením, ne až po hydrataci */}
                  <div className="splash-logo relative">
                    <Logo height={52} priority glow />
                    {/* po odkrytí přeběhne po logu světlo (stejně jako na obrazovce údržby) */}
                    <span aria-hidden className="logo-shimmer logo-shimmer-delayed pointer-events-none absolute inset-0" />
                  </div>
                </div>
              </motion.div>

              {/* tečkovaná neonová linka = průběh načítání, s jasnou „kometou" v čele */}
              <motion.div
                className="relative mt-7 h-[3px] w-[min(62vw,320px)]"
                initial={false}
                animate={{ opacity: exiting ? 0 : 1 }}
                transition={{ duration: 0.25 }}
              >
                <span className="absolute inset-0 opacity-25" style={{ background: 'radial-gradient(circle, #cfe0ff 0 1px, rgba(97,150,255,0.8) 1.3px, transparent 1.9px) 0 50% / 9px 3px repeat-x' }} />
                <span className="splash-progress absolute inset-y-0 left-0 overflow-hidden">
                  <span className="absolute inset-y-0 left-0 w-[min(62vw,320px)]" style={{ background: 'radial-gradient(circle, #cfe0ff 0 1px, rgba(97,150,255,0.95) 1.3px, transparent 1.9px) 0 50% / 9px 3px repeat-x' }} />
                  <span className="absolute -right-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_12px_4px_rgba(61,123,255,0.9)]" />
                </span>
              </motion.div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
