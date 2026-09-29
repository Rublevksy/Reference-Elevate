'use client';

import Lenis from 'lenis';
// pathname bez prefixu jazyka — při přepnutí jazyka se scroll nemá resetovat
import { usePathname } from '@/i18n/navigation';
import { useEffect, useRef } from 'react';
import { ScrollTrigger, gsap } from './gsap';
import { useReducedMotion } from './useReducedMotion';
import { jumpTo, scrollToId } from './scrollTo';

/**
 * Lenis + ScrollTrigger. Lenis řídí scroll, GSAP se na něj jen věší —
 * proto ScrollTrigger.update() voláme z Lenisu a ne z nativního scroll eventu.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
    });
    lenisRef.current = lenis;
    window.__lenis = lenis;

    lenis.on('scroll', ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      lenisRef.current = null;
      window.__lenis = undefined;
    };
  }, [reduced]);

  // Všechny kotvy na stránce (#sekce) = okamžitý skok, bez plynulého dojezdu
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!link) return;
      const href = link.getAttribute('href') ?? '';
      const hash = href.startsWith('#') ? href : href.startsWith('/#') ? href.slice(1) : '';
      if (!hash || hash.length < 2 || !document.getElementById(hash.slice(1))) return;
      event.preventDefault();
      scrollToId(hash);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  // Nová stránka = scroll nahoru a přepočet triggerů. Po přepnutí jazyka
  // (LocaleSwitcher) ale zůstat na stejném místě — okamžitě, bez efektu.
  useEffect(() => {
    let keep: number | null = null;
    try {
      // klíč se maže až po úspěšném obnovení (strict mode spouští efekt dvakrát)
      const raw = sessionStorage.getItem('elevate:keep-scroll');
      if (raw !== null) keep = Number(raw);
    } catch {
      /* soukromé okno */
    }
    if (keep !== null && Number.isFinite(keep)) {
      const y = keep;
      // stránka se po přemontování ještě pár snímků skládá — skákat, dokud pozice nedrží
      let frames = 0;
      let stable = 0;
      let raf = 0;
      const hold = () => {
        if (Math.abs(window.scrollY - y) > 1) {
          stable = 0;
          jumpTo(y);
        } else stable += 1;
        frames += 1;
        if (stable < 4 && frames < 90) raf = requestAnimationFrame(hold);
        else {
          try {
            sessionStorage.removeItem('elevate:keep-scroll');
          } catch {
            /* soukromé okno */
          }
        }
      };
      jumpTo(y);
      raf = requestAnimationFrame(hold);
      return () => cancelAnimationFrame(raf);
    }
    lenisRef.current?.scrollTo(0, { immediate: true });
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 120);
    return () => window.clearTimeout(id);
  }, [pathname]);

  return <>{children}</>;
}

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}
