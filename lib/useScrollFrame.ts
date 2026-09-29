'use client';

import { useEffect, useRef } from 'react';

/**
 * Zavolá `cb` jednou za snímek, když se stránka posune nebo změní velikost
 * (a hned po připojení). Pro scroll-řízené animace, které píšou přímo do
 * `style` — žádné React re-rendery během scrollu.
 */
export function useScrollFrame(cb: () => void) {
  const ref = useRef(cb);
  ref.current = cb;

  useEffect(() => {
    let raf = 0;
    const run = () => {
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          ref.current();
        });
    };
    run();
    // obrázky/fonty můžou po načtení posunout rozvržení
    const late = window.setTimeout(run, 400);
    window.addEventListener('scroll', run, { passive: true });
    window.addEventListener('resize', run);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(late);
      window.removeEventListener('scroll', run);
      window.removeEventListener('resize', run);
    };
  }, []);
}

/** Jak daleko element „projel" oknem: 0 = horní hrana na `from`·vh, 1 = na `to`·vh. */
export function viewProgress(el: Element, from = 0.95, to = 0.45) {
  const vh = window.innerHeight;
  const top = el.getBoundingClientRect().top;
  const v = (vh * from - top) / (vh * (from - to));
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
