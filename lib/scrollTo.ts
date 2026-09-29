'use client';

/**
 * Navigace na sekci: rychlá odezva, ale plynulý příjezd. U vzdáleného cíle
 * se stránka nejdřív okamžitě přesune kousek před něj (~0,6 obrazovky) a zbytek
 * dojede krátkým plynulým scrollem (~0,7 s) — nepřehrává se tak celý web cestou,
 * a přesto je vidět, kam jsme přijeli. Sekce může přes `data-nav-offset`
 * (ve vh) určit přesné místo, kam dojet.
 */
export function scrollToId(id: string) {
  const target = document.getElementById(id.replace(/^#/, ''));
  if (!target) return;
  const offsetVh = Number(target.dataset.navOffset ?? 0);
  const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY + (offsetVh / 100) * window.innerHeight);
  glideTo(top);
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function glideTo(top: number) {
  const vh = window.innerHeight;
  const from = window.scrollY;
  const lead = 0.6 * vh;
  if (Math.abs(top - from) > lead * 1.5) jumpTo(top - Math.sign(top - from) * lead);
  const lenis = window.__lenis;
  if (lenis) lenis.scrollTo(top, { duration: 0.7, easing: easeOutCubic, force: true });
  else window.scrollTo({ top, behavior: 'smooth' });
}

/** Okamžitý skok bez animace (přepnutí jazyka, obnova pozice). */
export function jumpTo(top: number) {
  const lenis = window.__lenis;
  if (lenis) lenis.scrollTo(top, { immediate: true, force: true });
  window.scrollTo({ top, behavior: 'instant' as ScrollBehavior });
}
