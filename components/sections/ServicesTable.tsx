'use client';

import { motion, useInView } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/FeatureIcon';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { services } from '@/content/services';
import { createPortal } from 'react-dom';
import { subscribeHeroFrame, type Pt } from '@/lib/heroScreen';
import { ease, seg } from '@/lib/fx';
import { scrollToId } from '@/lib/scrollTo';
import { useScrollFrame, viewProgress } from '@/lib/useScrollFrame';
import { ServiceCardBack, ServiceCardFront } from './ServiceCard';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { PlatformScene } from './PlatformScene';

const COUNT = services.length;
const CARD_W = 150;
const CARD_H = 240;
const SPRING = { type: 'spring' as const, stiffness: 220, damping: 28, mass: 0.9 };
/**
 * Let karet v progressu HERA (viz časová osa v Hero.tsx):
 *  OUT   — karty vylétnou přímo z webu na displeji notebooku a každá svým
 *          směrem (vlevo, nahoru vlevo, dolů, nahoru vpravo, vpravo) se
 *          rozestoupí KOLEM notebooku, s otočkou; pak „visí" před kamerou;
 *  DRIFT — jak kamera projíždí displejem, karty se před ní jemně rozestupují;
 *  LAND  — když se web srovná se skutečnou sekcí, dosednou do vějíře.
 * Létají klony ve vlastní fixní vrstvě NAD filmem (připnutá sekce je sticky,
 * tedy vlastní stacking context — skutečné karty by byly pod filmem).
 */
const OUT: [number, number] = [0.44, 0.64];
const DRIFT: [number, number] = [0.64, 0.86];
/** bod webu na displeji, odkud karty vylétají (souřadnice screenshotu 1440 × 900 — střed stolu) */
const SHOT_SOURCE = { x: 720, y: 640 };
/** kam která karta vyletí — v poměru k oknu, kolem notebooku; bend = prohnutí oblouku */
const HOVER = [
  { x: 0.11, y: 0.5, r: -12, spin: -30, bend: { x: 0, y: -0.14 } }, // doleva
  { x: 0.25, y: 0.2, r: -7, spin: 24, bend: { x: -0.06, y: 0.02 } }, // nahoru vlevo
  { x: 0.5, y: 0.86, r: 3, spin: -18, bend: { x: 0.1, y: 0 } }, // dolů
  { x: 0.75, y: 0.2, r: 7, spin: -24, bend: { x: 0.06, y: 0.02 } }, // nahoru vpravo
  { x: 0.89, y: 0.5, r: 12, spin: 30, bend: { x: 0, y: -0.14 } }, // doprava
];
const LAND: [number, number] = [0.86, 0.98];
/** posun startu mezi sousedními kartami; délka letu jedné karty tak, aby poslední doletěla přesně na konci úseku */
const FLIGHT_STAGGER = 0.08;
const FLIGHT_SPAN = 1 - FLIGHT_STAGGER * (COUNT - 1);

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Rozložení vějíře je čistě 2D (translate + rotate + scale).
 * Žádný sdílený `preserve-3d` kontext, takže se karty nemůžou protnout —
 * pořadí řídí výhradně z-index. Vlastní 3D překlopení má každá karta
 * ve své vlastní `perspective`, tedy izolovaně od sousedů.
 */
function layout(index: number, active: number) {
  const offset = index - (COUNT - 1) / 2;
  const isActive = index === active;

  return {
    x: offset * 158,
    y: isActive ? -118 : Math.abs(offset) * 14,
    rotate: isActive ? 0 : offset * 7,
    scaleY: isActive ? 1 : 0.82,
    scale: isActive ? 1.06 : 1,
    opacity: 1,
  };
}

const quadBezier = (a: Pt, c: Pt, b: Pt, t: number): Pt => ({
  x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
  y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y,
});

export function ServicesTable() {
  const t = useTranslations('services');
  const tItems = useTranslations('services.items');
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);
  const [vw, setVw] = useState(1440);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => setVw(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Nadpis a taby naskočí, jakmile je sekce v okně (ještě pod filmem) —
  // při rozplynutí filmu už stojí na místě jako na screenshotu v notebooku.
  // Karty vylétají z obrazovky notebooku v hero filmu: startují přesně tam,
  // kde by byly na screenshotu webu v displeji, obloukem se rozletí do stran
  // a dosednou do vějíře. Vše je funkce progressu hera — oba směry scrollu.
  const headingRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const flightRefs = useRef<(HTMLDivElement | null)[]>([]);
  const activeRef = useRef(active);
  activeRef.current = active;
  const headingInView = useInView(headingRef, { once: true, margin: '-10% 0px' });
  const [flash, setFlash] = useState(false);
  const flashRef = useRef(false);
  const [showHeading, setShowHeading] = useState(false);

  const choose = useCallback((index: number) => setActive(index), []);

  /*
   * Hover vybírá kartu jen při skutečném pohybu myši. Při skrolování
   * „podjíždějí" karty pod stojícím kurzorem a prohlížeč posílá umělé
   * mouseenter — dřív se tak aktivní karta sama přepínala (a s ní klony
   * v přechodové scéně), což vypadalo jako cukání karet.
   */
  const lastRealMove = useRef(0);
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && (event.movementX !== 0 || event.movementY !== 0)) lastRealMove.current = performance.now();
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);
  const hoverChoose = useCallback((index: number) => {
    if (performance.now() - lastRealMove.current < 120) setActive(index);
  }, []);

  useEffect(() => {
    if (!reduced) return;
    setFlash(true);
    setShowHeading(true);
  }, [reduced]);

  useEffect(() => {
    if (reduced || !headingInView) return;
    const id = window.setTimeout(() => setShowHeading(true), 150);
    return () => window.clearTimeout(id);
  }, [reduced, headingInView]);

  const cloneRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mapRef = useRef<((x: number, y: number) => Pt) | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const applyFlight = useCallback(() => {
    const container = cardsRef.current;
    const anchor = container?.closest<HTMLElement>('[data-shot-anchor]');
    const hero = document.getElementById('hero');
    if (!container || !anchor) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const desktop = vw >= 768;
    const heroP = hero ? window.scrollY / Math.max(1, hero.offsetHeight - vh) : 1;
    // tolerance: plovoucí čárka jinak nechá poslední kartu „v letu" (0.99999…) a bez hoveru
    const phase = ([a, b]: [number, number], index: number) => {
      if (reduced || !desktop) return 1;
      const v = clamp01((clamp01((heroP - a) / (b - a)) - index * FLIGHT_STAGGER) / FLIGHT_SPAN);
      return v > 0.999 ? 1 : v;
    };
    const map = mapRef.current;
    // měřítko kotvy (hero ji při dojezdu kamery krátce zvětšuje) — karty dosedají do něj
    const aScale = anchor.offsetWidth ? anchor.getBoundingClientRect().width / anchor.offsetWidth : 1;
    const hoverScale = Math.min(1.05, Math.max(0.62, Math.min(vw / 1440, vh / 900) * 0.84));
    const drift = ease(seg(heroP, DRIFT[0], DRIFT[1]));
    let landed = true;

    flightRefs.current.forEach((wrap, index) => {
      const clone = cloneRefs.current[index];
      const button = wrap?.querySelector<HTMLElement>('[data-src-card]') ?? null;
      const hit = wrap?.querySelector<HTMLElement>('button') ?? null;
      if (!wrap || !button || !hit) return;
      const t1 = phase(OUT, index);
      const t2 = phase(LAND, index);
      const done = t2 >= 1;
      // skutečná karta převezme klon přesně v místě dosednutí
      wrap.style.opacity = done ? '1' : '0';
      hit.style.pointerEvents = done ? '' : 'none';
      if (done) {
        if (clone) clone.style.visibility = 'hidden';
        return;
      }
      landed = false;
      if (!clone) return;
      if (t1 <= 0) {
        clone.style.visibility = 'hidden';
        return;
      }

      const hover = HOVER[index % HOVER.length];
      // start: místo stolu na webu v displeji (sleduje notebook ve filmu)
      const src: Pt = map ? map(SHOT_SOURCE.x, SHOT_SOURCE.y) : { x: vw / 2, y: vh / 2 };
      const srcScale = map ? Math.max(0.05, Math.hypot(map(SHOT_SOURCE.x + 1, SHOT_SOURCE.y).x - src.x, map(SHOT_SOURCE.x + 1, SHOT_SOURCE.y).y - src.y)) : 0.3;
      // visící poloha kolem notebooku; s průjezdem kamery se karty rozestoupí ke krajům
      const spread = 1 + 0.16 * drift;
      const bob = Math.sin(heroP * 140 + index * 1.3) * 9 * t1 * (1 - t2);
      const hov: Pt = { x: vw * (0.5 + (hover.x - 0.5) * spread), y: vh * (0.5 + (hover.y - 0.5) * spread) + bob };

      let P: Pt;
      let S: number;
      let sxT = 1;
      let syT = 1;
      let rot: number;
      let ry: number;
      let glow: number;
      if (t2 <= 0) {
        // výlet z displeje — každá karta svým směrem, obloukem
        const e = easeOut(t1);
        const ctrl = { x: lerp(src.x, hov.x, 0.5) + hover.bend.x * vw, y: lerp(src.y, hov.y, 0.5) + hover.bend.y * vh };
        P = quadBezier(src, ctrl, hov, e);
        const pop = Math.sin(Math.PI * t1);
        S = lerp(srcScale * 0.9, hoverScale, e) * (1 + 0.1 * pop) * (1 + 0.08 * drift);
        rot = hover.r * e + hover.spin * pop;
        ry = 360 * e;
        glow = 0.35 + 0.65 * pop;
      } else {
        // cíl: skutečná karta ve vějíři (poloha, natočení, měřítko)
        const rect = button.getBoundingClientRect();
        const tr = getComputedStyle(button).transform;
        const mx = tr && tr !== 'none' ? new DOMMatrixReadOnly(tr) : new DOMMatrixReadOnly();
        const target = { r: (Math.atan2(mx.b, mx.a) * 180) / Math.PI, sx: Math.hypot(mx.a, mx.b), sy: Math.hypot(mx.c, mx.d) };
        const home = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        const faceUp = button.dataset.active === 'true';
        const e = easeOut(t2);
        const ctrl = { x: lerp(hov.x, home.x, 0.6), y: Math.min(hov.y, home.y) - 60 };
        P = quadBezier(hov, ctrl, home, e);
        S = lerp(hoverScale * 1.08, aScale, e);
        sxT = lerp(1, target.sx, e);
        syT = lerp(1, target.sy, e);
        rot = lerp(hover.r, target.r, e);
        ry = faceUp ? 180 * ease(seg(t2, 0.3, 1)) : 0;
        glow = 0.35 * (1 - e);
      }

      clone.style.visibility = '';
      clone.style.transform = `translate3d(${(P.x - CARD_W / 2).toFixed(1)}px, ${(P.y - CARD_H / 2).toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${(S * sxT).toFixed(4)}, ${(S * syT).toFixed(4)})`;
      clone.style.opacity = clamp01(t1 / 0.05).toFixed(3);
      clone.style.filter = glow > 0.02 ? `drop-shadow(0 0 ${(20 * glow * S).toFixed(1)}px rgba(61,123,255,${(0.8 * glow).toFixed(2)}))` : '';
      const flipper = clone.firstElementChild as HTMLElement | null;
      if (flipper) flipper.style.transform = `rotateY(${ry.toFixed(1)}deg)`;
    });

    if (landed !== flashRef.current) {
      flashRef.current = landed;
      setFlash(landed);
    }
  }, [reduced]);

  // hero kreslí po snímcích (lerp) — let karet se přepočítá s každým snímkem
  useEffect(
    () =>
      subscribeHeroFrame((state) => {
        mapRef.current = state.map;
        applyFlight();
      }),
    [applyFlight],
  );
  useEffect(() => {
    let raf = 0;
    const run = () => {
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          applyFlight();
        });
    };
    applyFlight();
    window.addEventListener('scroll', run, { passive: true });
    window.addEventListener('resize', run);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', run);
      window.removeEventListener('resize', run);
    };
  }, [applyFlight, mounted]);

  // Mobil: karta vyjede zespodu rubem nahoru a jak projíždí oknem, otočí se
  // lícem (sloupce se zpožděním — „rozdávání" po dvojicích). Oběma směry.
  const mobileGrid = useRef<HTMLDivElement>(null);
  useScrollFrame(() => {
    const grid = mobileGrid.current;
    if (!grid || !grid.offsetHeight || reduced) return;
    grid.querySelectorAll<HTMLElement>('[data-mcard]').forEach((card, index) => {
      const col = index % 2;
      const v = viewProgress(card, 1.02, 0.5);
      const rise = easeOut(seg(v, 0, 0.45));
      const flip = ease(seg(v, 0.25 + col * 0.1, 0.85 + col * 0.1));
      card.style.opacity = rise.toFixed(3);
      card.style.transform = `translate3d(0, ${((1 - rise) * 60).toFixed(1)}px, 0) rotateX(${((1 - rise) * 24).toFixed(2)}deg) rotateZ(${((1 - flip) * (col ? 4 : -4)).toFixed(2)}deg)`;
      const flipper = card.firstElementChild as HTMLElement | null;
      if (flipper) flipper.style.transform = `rotateY(${(180 * flip).toFixed(1)}deg)`;
      card.style.filter = flip > 0.05 && flip < 0.95 ? `drop-shadow(0 0 ${(18 * Math.sin(Math.PI * flip)).toFixed(1)}px rgba(61,123,255,0.8))` : '';
    });
  });

  // ambientní pohyb (rotace platformy, dýchání sloupů) běží jen na obrazovce —
  // a jen dokud je stůl připnutý; jakmile sekce odjíždí do přechodové scény,
  // zastaví se, ať každý snímek přechodu nepřekresluje i velké SVG platformy
  const [settled, setSettled] = useState(true);
  useEffect(() => {
    const node = stage.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: '120px' },
    );
    observer.observe(node);
    let raf = 0;
    const check = () => {
      raf = 0;
      const section = node.closest('section');
      if (!section) return;
      setSettled(section.getBoundingClientRect().bottom >= window.innerHeight - 2);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <section
      id="sluzby"
      data-nav-offset={reduced ? undefined : 90}
      className={`relative overflow-x-clip pb-6 pt-10 md:py-24 ${reduced ? 'md:py-28' : 'md:h-[233vh] md:py-0'}`}
      aria-labelledby="sluzby-title"
    >
      <div data-shot-anchor className={reduced ? '' : 'md:sticky md:top-0 md:h-dvh md:overflow-hidden md:pt-28'}>
      <div ref={headingRef} className="shell text-center">
        <motion.div
          initial={reduced ? undefined : { opacity: 0, y: 16 }}
          animate={showHeading ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <SplitHeading
            as="h2"
            id="sluzby-title"
            className="mx-auto max-w-3xl font-display text-[clamp(1.8rem,4.2vw,3.2rem)] font-bold uppercase leading-[1.08]"
            parts={[{ text: t('title') + ' ' }, { text: t('titleAccent'), accent: true }]}
          />
          <p className="mx-auto mt-4 max-w-md text-muted">{t('subtitle')}</p>
        </motion.div>
      </div>

      {/* kulaté taby */}
      <motion.div
        className="shell mt-10 hidden md:block"
        initial={reduced ? undefined : { opacity: 0, y: 12 }}
        animate={showHeading ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <ul className="mx-auto flex max-w-3xl flex-wrap items-start justify-center gap-5 md:gap-9">
          {services.map((item, index) => (
            <li key={item.slug}>
              <button
                type="button"
                onClick={() => choose(index)}
                aria-pressed={active === index}
                className="group flex w-20 flex-col items-center gap-2.5 text-center"
              >
                <span
                  className={`grid h-14 w-14 place-items-center rounded-full border transition-[color,border-color,background-color,box-shadow] duration-500 ${
                    active === index
                      ? 'border-[var(--blue-bright)] bg-[rgba(31,91,255,0.16)] text-[var(--blue-bright)] shadow-glow'
                      : 'border-[var(--line)] text-muted group-hover:border-[rgba(80,120,255,0.45)] group-hover:text-ink'
                  }`}
                >
                  <Icon name={item.icon} className="h-5 w-5" />
                </span>
                <span
                  className={`font-display text-[10px] uppercase tracking-[0.14em] transition-colors ${
                    active === index ? 'text-ink' : 'text-muted'
                  }`}
                >
                  {tItems(`${item.slug}.tab`)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </motion.div>

      {/* ===== STŮL (desktop) ===== */}
      <div ref={stage} className="relative mt-2 hidden h-[clamp(380px,calc(100dvh-392px),520px)] md:block">
        <div className="pointer-events-none absolute inset-0 mx-auto h-full w-full max-w-5xl">
          <PlatformScene active={visible && settled && !reduced} flash={flash} />
        </div>

        {/* karty */}
        <div ref={cardsRef} className="absolute inset-x-0 bottom-[86px] z-20 mx-auto h-[250px] max-w-5xl">
          {services.map((item, index) => {
            const isActive = index === active;
            return (
              <div
                key={item.slug}
                ref={(el) => {
                  flightRefs.current[index] = el;
                }}
                className="group pointer-events-none absolute left-1/2 top-0 -ml-[75px] h-[240px] w-[150px]"
                style={{
                  zIndex: isActive ? 40 : 10 + (COUNT - Math.abs(index - active)),
                  opacity: reduced ? 1 : 0,
                }}
              >
              {/* Stojící zásahová plocha: sloupec vějíře, který se s hoverem
                  nehýbe — karta pod kurzorem neuteče, sousedé se nepřepínají
                  tam a zpět (dřív hover zvedl kartu a kurzor „spadl" na vedlejší). */}
              <button
                type="button"
                aria-pressed={isActive}
                aria-label={tItems(`${item.slug}.card`)}
                onClick={() => choose(index)}
                onMouseEnter={() => hoverChoose(index)}
                onFocus={() => choose(index)}
                className="peer pointer-events-auto absolute bottom-0 outline-none"
                style={{ left: (index - (COUNT - 1) / 2) * 158 - 4, width: 158, top: isActive ? -128 : 0 }}
              />
              {/* vizuál karty — pohybuje se, ale na myš nereaguje */}
              <motion.div
                data-src-card
                data-active={isActive ? 'true' : 'false'}
                className="pointer-events-none absolute inset-0 rounded-2xl will-change-transform peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--blue-bright)]"
                style={{ perspective: 900 }}
                initial={layout(index, active)}
                animate={layout(index, active)}
                transition={reduced ? { duration: 0 } : SPRING}
              >
                <motion.div
                  className="preserve-3d relative h-full w-full"
                  initial={false}
                  animate={{ rotateY: isActive ? 180 : 0 }}
                  transition={reduced ? { duration: 0 } : { ...SPRING, damping: 26 }}
                >
                  <ServiceCardBack item={item} label={tItems(`${item.slug}.tab`)} className="backface-hidden" />
                  <span className="backface-hidden absolute inset-0 rounded-2xl" style={{ transform: 'rotateY(180deg)', boxShadow: '0 0 46px rgba(31,91,255,0.45)' }}>
                    <ServiceCardFront item={item} title={tItems(`${item.slug}.card`)} />
                  </span>
                </motion.div>
              </motion.div>
              </div>
            );
          })}
        </div>
      </div>

      </div>

      {/* ===== MOBIL: karty pod sebou (2 sloupce), při scrollu se otáčejí lícem ===== */}
      <div ref={mobileGrid} className="shell mt-9 grid grid-cols-2 gap-3.5 md:hidden" style={{ perspective: 1100 }}>
        {services.map((item, index) => (
          <button
            key={item.slug}
            type="button"
            data-mcard
            onClick={() => scrollToId(`panel-${item.slug}`)}
            aria-label={tItems(`${item.slug}.card`)}
            className={`relative aspect-[150/240] rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-bright)] ${
              index === COUNT - 1 && COUNT % 2 === 1 ? 'col-span-2 mx-auto w-[calc(50%-7px)]' : 'w-full'
            }`}
            style={reduced ? undefined : { opacity: 0 }}
          >
            <span data-mflip className="preserve-3d absolute inset-0" style={{ transform: reduced ? 'rotateY(180deg)' : undefined }}>
              <ServiceCardBack item={item} label={tItems(`${item.slug}.tab`)} className="backface-hidden" />
              <span className="backface-hidden absolute inset-0 rounded-2xl" style={{ transform: 'rotateY(180deg)', boxShadow: '0 0 34px rgba(31,91,255,0.4)' }}>
                <ServiceCardFront item={item} title={tItems(`${item.slug}.card`)} />
              </span>
            </span>
          </button>
        ))}
      </div>
      {/* letící klony karet — fixní vrstva nad hero filmem */}
      {mounted && !reduced
        ? createPortal(
            <div aria-hidden className="pointer-events-none fixed inset-0 z-30 hidden overflow-hidden md:block">
              {services.map((item, index) => (
                <div
                  key={item.slug}
                  ref={(el) => {
                    cloneRefs.current[index] = el;
                  }}
                  className="absolute left-0 top-0 will-change-transform"
                  style={{ width: CARD_W, height: CARD_H, visibility: 'hidden', perspective: 900, zIndex: index === 0 ? 20 : 10 - index }}
                >
                  <div className="preserve-3d relative h-full w-full">
                    <ServiceCardBack item={item} label={tItems(`${item.slug}.tab`)} className="backface-hidden" />
                    <span className="backface-hidden absolute inset-0 rounded-2xl" style={{ transform: 'rotateY(180deg)', boxShadow: '0 0 46px rgba(31,91,255,0.45)' }}>
                      <ServiceCardFront item={item} title={tItems(`${item.slug}.card`)} />
                    </span>
                  </div>
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
