'use client';

import Lenis from 'lenis';
// pathname bez prefixu jazyka — při přepnutí jazyka se scroll nemá resetovat
import { usePathname } from '@/i18n/navigation';
import { useEffect, useRef } from 'react';
import { useReducedMotion } from './useReducedMotion';
import { arriveAtHash, jumpTo, navigateTo, resolveTarget } from './scrollTo';

/**
 * Lenis — plynulý scroll kolečkem myši / touchpadem na počítači.
 *
 * Na dotykových zařízeních (telefon, tablet) Lenis vůbec nespouštíme: prst
 * má scrollovat nativně (iOS Safari má vlastní setrvačnost a vykreslování
 * mimo hlavní vlákno) a Lenis by jen držel stálou smyčku requestAnimationFrame
 * a posluchače scrollu, které Safari při rychlém švihnutí nestíhá — obsah pak
 * na okamžik zmizí. Navigace (lib/scrollTo) má pro tenhle případ nativní cestu.
 */
const isTouchDevice = () => window.matchMedia('(hover: none), (pointer: coarse)').matches;

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || isTouchDevice()) return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      autoRaf: true,
    });
    lenisRef.current = lenis;
    window.__lenis = lenis;

    return () => {
      lenis.destroy();
      lenisRef.current = null;
      window.__lenis = undefined;
    };
  }, [reduced]);

  // Všechny kotvy na stránce (#sekce) = rychlý přesun bez přehrávání přechodů (lib/scrollTo)
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!link) return;
      const href = link.getAttribute('href') ?? '';
      const hash = href.startsWith('#') ? href : href.startsWith('/#') ? href.slice(1) : '';
      if (!hash || hash.length < 2 || !resolveTarget(hash)) return;
      event.preventDefault();
      navigateTo(hash.slice(1));
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  // Nová stránka = scroll nahoru. Po přepnutí jazyka
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
    // příjezd s #kotvou (menu z jiné stránky, přesměrování ze starých adres
    // služeb, sdílený odkaz): skok přímo na sekci pod clonou; kotva se pak
    // z adresy smaže, ať obnovení stránky nevrací návštěvníka zpátky
    const hash = window.location.hash;
    let raf = 0;
    if (hash.length > 1) {
      raf = requestAnimationFrame(() => {
        if (arriveAtHash(hash)) {
          window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
        } else jumpTo(0);
      });
    } else jumpTo(0);
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return <>{children}</>;
}

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}
