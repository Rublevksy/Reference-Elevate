'use client';

import { useEffect, useRef } from 'react';

/*
 * Jeden společný plánovač pro všechny scroll-řízené animace: jeden posluchač
 * scrollu a jeden requestAnimationFrame za snímek, ve kterém proběhnou všechny
 * odběry. (Dřív měl každý odběr vlastní posluchač i rAF — při rychlém švihnutí
 * na iPhonu to bylo přes deset volání za snímek.)
 */
const subscribers = new Set<{ current: () => void }>();
let frame = 0;
let listening = false;

function flush() {
  frame = 0;
  subscribers.forEach((ref) => ref.current());
}
function schedule() {
  if (!frame) frame = requestAnimationFrame(flush);
}
function listen(on: boolean) {
  if (on === listening) return;
  listening = on;
  const method = on ? 'addEventListener' : 'removeEventListener';
  window[method]('scroll', schedule, { passive: true });
  window[method]('resize', schedule);
}

/**
 * Zavolá `cb` jednou za snímek, když se stránka posune nebo změní velikost
 * (a hned po připojení). Pro scroll-řízené animace, které píšou přímo do
 * `style` — žádné React re-rendery během scrollu.
 */
export function useScrollFrame(cb: () => void) {
  const ref = useRef(cb);
  ref.current = cb;

  useEffect(() => {
    const entry = ref;
    subscribers.add(entry);
    listen(true);
    schedule();
    // obrázky/fonty můžou po načtení posunout rozvržení
    const late = window.setTimeout(schedule, 400);
    return () => {
      subscribers.delete(entry);
      window.clearTimeout(late);
      if (!subscribers.size) {
        listen(false);
        cancelAnimationFrame(frame);
        frame = 0;
      }
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
