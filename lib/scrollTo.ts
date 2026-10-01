'use client';

/**
 * Navigace po webu (menu, patička, tlačítka, odkazy #sekce).
 *
 * Scroll-řízené scény se při běžném skrolování přehrávají celé — to je
 * „první prohlídka". Navigace ale choreografii znovu nepřehrává: u vzdáleného
 * cíle stránku na okamžik zakryje tmavá clona, pod ní se skočí přímo na
 * klidové místo cílové sekce a clona se rozplyne. Blízký cíl jen krátce
 * dojede plynulým scrollem.
 *
 * Cíl je element s daným id, nebo [data-nav-id] — to kvůli kotvám, které
 * mají na desktopu a na mobilu jiné místo (bere se ten, který je vidět).
 * Přes `data-nav-offset` (ve vh) může cíl posunout místo příjezdu,
 * `data-nav-highlight` ho po příjezdu krátce rozsvítí.
 */

const INTRO_KEY = 'elevate:intro-seen';
const VEIL_IN_MS = 140;
const VEIL_OUT_MS = 400;
/** okamžitý přechod (Kontakt): bez zatmívání, jen krátké rozsvícení na místě */
const VEIL_FAST_OUT_MS = 240;

/** Stav navigace — Navbar podle něj po skoku neschovává lištu. */
export const navState = { until: 0 };

let veil: HTMLDivElement | null = null;
let token = 0;

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Návštěvník už v této session viděl úvod (hero film) nebo navigoval menu. */
export function introSeen() {
  try {
    return sessionStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

export function markIntroSeen() {
  try {
    sessionStorage.setItem(INTRO_KEY, '1');
  } catch {
    /* soukromé okno */
  }
}

const rendered = (el: Element) => el.getClientRects().length > 0;

export function resolveTarget(id: string): HTMLElement | null {
  const key = id.replace(/^#/, '');
  if (!key) return null;
  const byId = document.getElementById(key);
  if (byId && rendered(byId)) return byId;
  const alt = Array.from(document.querySelectorAll<HTMLElement>(`[data-nav-id="${CSS.escape(key)}"]`)).find(rendered);
  return alt ?? byId;
}

/** Místo, kam se má dojet (horní hrana cíle + případný posun ve vh). */
export function targetTop(el: HTMLElement) {
  const offsetVh = Number(el.dataset.navOffset ?? 0);
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const top = el.getBoundingClientRect().top + window.scrollY + (offsetVh / 100) * window.innerHeight;
  return Math.max(0, Math.min(max, Math.round(top)));
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** Okamžitý skok bez animace (přepnutí jazyka, obnova pozice). */
export function jumpTo(top: number) {
  const lenis = window.__lenis;
  if (lenis) lenis.scrollTo(top, { immediate: true, force: true });
  window.scrollTo({ top, behavior: 'instant' as ScrollBehavior });
}

function getVeil() {
  if (veil && veil.isConnected) return veil;
  veil = document.createElement('div');
  veil.className = 'nav-veil';
  veil.setAttribute('aria-hidden', 'true');
  document.body.appendChild(veil);
  return veil;
}

/**
 * Skákat na cíl, dokud pozice nedrží — sekce se po skoku ještě pár snímků
 * dopočítávají (sticky scény, obrázky), cíl se proto měří znovu každý snímek.
 */
function settle(measure: () => number, done: () => void, maxFrames = 40) {
  let frames = 0;
  let stable = 0;
  const step = () => {
    const top = measure();
    if (Math.abs(window.scrollY - top) > 1) {
      stable = 0;
      jumpTo(top);
    } else stable += 1;
    frames += 1;
    if (stable < 3 && frames < maxFrames) requestAnimationFrame(step);
    else done();
  };
  jumpTo(measure());
  requestAnimationFrame(step);
}

function arrive(el: HTMLElement | null) {
  if (!el || !el.hasAttribute('data-nav-highlight')) return;
  el.removeAttribute('data-arrived');
  void el.offsetWidth;
  el.setAttribute('data-arrived', '');
  window.setTimeout(() => el.removeAttribute('data-arrived'), 2200);
}

/** Zakrýt stránku clonou (i pro navigaci na jinou stránku webu). */
export function coverPage(instant = false) {
  const v = getVeil();
  v.removeAttribute('data-out');
  if (instant) {
    v.style.transition = 'none';
    v.setAttribute('data-on', '');
    void v.offsetWidth;
    v.style.transition = '';
  } else v.setAttribute('data-on', '');
  navState.until = performance.now() + 1600;
}

function uncover(fast = false) {
  const v = getVeil();
  if (fast) v.setAttribute('data-fast', '');
  else v.removeAttribute('data-fast');
  v.setAttribute('data-out', '');
  v.removeAttribute('data-on');
  window.setTimeout(() => {
    if (!v.hasAttribute('data-on')) {
      v.removeAttribute('data-out');
      v.removeAttribute('data-fast');
    }
  }, (fast ? VEIL_FAST_OUT_MS : VEIL_OUT_MS) + 40);
}

/** Pod clonou skočit na cíl a clonu rozpustit (`instant` = bez zatmívání, okamžitý střih). */
function veilJump(el: HTMLElement | null, measure: () => number, instant = false) {
  const my = ++token;
  window.__lenis?.stop();
  coverPage(instant);
  window.setTimeout(
    () => {
      if (my !== token) return;
      window.__lenis?.start();
      settle(measure, () => {
        if (my !== token) return;
        navState.until = performance.now() + 500;
        uncover(instant);
        arrive(el);
      });
    },
    instant ? 0 : VEIL_IN_MS + 30,
  );
}

/**
 * Přejít na sekci (id bez #). Vrací false, když cíl na stránce není —
 * pak má volající nechat proběhnout běžnou navigaci na úvodní stránku.
 */
export function navigateTo(id: string, { instant = false }: { instant?: boolean } = {}) {
  const el = resolveTarget(id);
  if (!el) return false;
  markIntroSeen();
  const top = targetTop(el);
  const distance = Math.abs(top - window.scrollY);
  navState.until = performance.now() + 1200;

  if (reducedMotion()) {
    jumpTo(top);
    arrive(el);
    return true;
  }
  if (instant) {
    if (distance > 2) veilJump(el, () => targetTop(el), true);
    else arrive(el);
    return true;
  }
  if (distance < window.innerHeight * 0.9) {
    token++;
    const lenis = window.__lenis;
    if (lenis) lenis.scrollTo(top, { duration: 0.6, easing: easeOutCubic, force: true, onComplete: () => arrive(el) });
    else {
      window.scrollTo({ top, behavior: 'smooth' });
      arrive(el);
    }
    return true;
  }
  veilJump(el, () => targetTop(el));
  return true;
}

/** Nahoru na začátek stránky — bez projíždění celého webu pozpátku. */
export function navigateToTop() {
  markIntroSeen();
  navState.until = performance.now() + 1200;
  if (reducedMotion() || window.scrollY < window.innerHeight * 0.9) {
    const lenis = window.__lenis;
    if (lenis && !reducedMotion()) lenis.scrollTo(0, { duration: 0.6, easing: easeOutCubic, force: true });
    else jumpTo(0);
    return;
  }
  veilJump(null, () => 0);
}

/**
 * Příjezd s #kotvou z jiné stránky (nebo přímý odkaz): clona je už nahoře
 * nebo se hned rozsvítí, pod ní se najde cíl (stránka se může ještě skládat).
 */
export function arriveAtHash(hash: string) {
  const id = hash.replace(/^#/, '');
  if (!id) return false;
  let el = resolveTarget(id);
  if (!el) return false;
  markIntroSeen();
  const covered = Boolean(veil?.hasAttribute('data-on'));
  if (!covered) coverPage(true);
  const my = ++token;
  window.__lenis?.start();
  settle(
    () => {
      el = resolveTarget(id) ?? el;
      return el ? targetTop(el) : 0;
    },
    () => {
      if (my !== token) return;
      navState.until = performance.now() + 500;
      uncover();
      arrive(el);
    },
    90,
  );
  return true;
}

/** Zpětná kompatibilita: dřívější volání na id sekce. */
export const scrollToId = (id: string) => navigateTo(id);
