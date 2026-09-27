'use client';

import Lenis from 'lenis';
// pathname bez prefixu jazyka — při přepnutí jazyka se scroll nemá resetovat
import { usePathname } from '@/i18n/navigation';
import { useEffect, useRef } from 'react';
import { ScrollTrigger, gsap } from './gsap';
import { useReducedMotion } from './useReducedMotion';

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

  // Nová stránka = scroll nahoru a přepočet triggerů
  useEffect(() => {
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
