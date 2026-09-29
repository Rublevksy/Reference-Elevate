'use client';

import { motion, useInView } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/FeatureIcon';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { services } from '@/content/services';
import { createPortal } from 'react-dom';
import { SITE_SHOT, subscribeHeroFrame, type Pt } from '@/lib/heroScreen';
import { ease, seg } from '@/lib/fx';
import { ServiceCardBack, ServiceCardFront } from './ServiceCard';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { PlatformScene } from './PlatformScene';

const COUNT = services.length;
const CARD_W = 150;
const CARD_H = 240;
const SPRING = { type: 'spring' as const, stiffness: 220, damping: 28, mass: 0.9 };
/**
 * Let karet v progressu HERA (viz časová osa v Hero.tsx):
 *  OUT  — karty vylétnou přímo ze screenshotu webu na displeji notebooku,
 *         obloukem se rozestoupí kolem něj (s otočkou) a „visí" před kamerou;
 *  LAND — když se web na displeji srovná se skutečnou sekcí, dosednou do vějíře.
 * Létají klony ve vlastní fixní vrstvě NAD filmem (připnutá sekce je sticky,
 * tedy vlastní stacking context — skutečné karty by byly pod filmem).
 */
const OUT: [number, number] = [0.46, 0.66];
/** Střed displeje ve screenshotu a kam která karta vyletí (souřadnice screenshotu 1440 × 900). */
const SHOT_CENTER = { x: 720, y: 450 };
const BURST = [
  { x: 215, y: 430, r: -14, spin: -30, bend: { x: 0, y: -90 } }, // doleva
  { x: 470, y: 715, r: -8, spin: 24, bend: { x: -60, y: 20 } }, // dolů vlevo
  { x: 720, y: 170, r: 4, spin: -18, bend: { x: 70, y: 0 } }, // nahoru
  { x: 970, y: 715, r: 8, spin: -24, bend: { x: 60, y: 20 } }, // dolů vpravo
  { x: 1225, y: 430, r: 14, spin: 30, bend: { x: 0, y: -90 } }, // doprava
];
const LAND: [number, number] = [0.8, 0.97];
/** posun startu mezi sousedními kartami; délka letu jedné karty tak, aby poslední doletěla přesně na konci úseku */
const FLIGHT_STAGGER = 0.08;
const FLIGHT_SPAN = 1 - FLIGHT_STAGGER * (COUNT - 1);

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
/** lehký přelet cíle a návrat — „dosednutí" karty na stůl */
const easeOutBack = (t: number) => {
  const c = 1.25;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

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
    const ar = anchor.getBoundingClientRect();
    let landed = true;

    flightRefs.current.forEach((wrap, index) => {
      const clone = cloneRefs.current[index];
      const button = wrap?.firstElementChild as HTMLElement | null;
      if (!wrap || !button) return;
      const t1 = phase(OUT, index);
      const t2 = phase(LAND, index);
      const done = t2 >= 1;
      // skutečná karta převezme klon přesně v místě dosednutí
      wrap.style.opacity = done ? '1' : '0';
      button.style.pointerEvents = done ? '' : 'none';
      if (done) {
        if (clone) clone.style.visibility = 'hidden';
        return;
      }
      landed = false;
      if (!clone) return;
      if (!map || t1 <= 0) {
        clone.style.visibility = 'hidden';
        return;
      }

      // cíl: skutečná karta ve vějíři (poloha, natočení, měřítko)
      const rect = button.getBoundingClientRect();
      const tr = getComputedStyle(button).transform;
      const mx = tr && tr !== 'none' ? new DOMMatrixReadOnly(tr) : new DOMMatrixReadOnly();
      const target = { r: (Math.atan2(mx.b, mx.a) * 180) / Math.PI, sx: Math.hypot(mx.a, mx.b), sy: Math.hypot(mx.c, mx.d) };
      const faceUp = button.dataset.active === 'true';

      // Celý let běží v souřadnicích screenshotu webu na displeji (1440 × 900)
      // a do viewportu se promítá stejnou homografií jako displej — karty tak
      // nikdy neopustí obrazovku notebooku a rostou s ní, jak kamera najíždí.
      const home = { x: rect.left + rect.width / 2 - ar.left - (vw - SITE_SHOT.w) / 2, y: rect.top + rect.height / 2 - ar.top };
      const burst = BURST[index % BURST.length];
      const bob = Math.sin(heroP * 110 + index * 1.3) * 10 * t1 * (1 - t2);

      let P: Pt;
      let S: number;
      let sxT = 1;
      let syT = 1;
      let rot: number;
      let ry: number;
      let glow: number;
      if (t2 <= 0) {
        // výbuch ze středu displeje — každá karta svým směrem
        const e = easeOut(t1);
        const ctrl = { x: lerp(SHOT_CENTER.x, burst.x, 0.5) + burst.bend.x, y: lerp(SHOT_CENTER.y, burst.y, 0.5) + burst.bend.y };
        P = quadBezier(SHOT_CENTER, ctrl, { x: burst.x, y: burst.y + bob }, e);
        const pop = Math.sin(Math.PI * t1);
        S = lerp(0.3, 1, e) * (1 + 0.12 * pop);
        rot = burst.r * e + burst.spin * pop;
        ry = 360 * e;
        glow = 0.35 + 0.65 * pop;
      } else {
        // návrat do vějíře na stole
        const e = easeOut(t2);
        const from = { x: burst.x, y: burst.y + bob };
        const ctrl = { x: lerp(from.x, home.x, 0.6), y: Math.min(from.y, home.y) - 40 };
        P = quadBezier(from, ctrl, home, e);
        S = 1;
        sxT = lerp(1, target.sx, e);
        syT = lerp(1, target.sy, e);
        rot = lerp(burst.r, target.r, e);
        ry = faceUp ? 180 * ease(seg(t2, 0.3, 1)) : 0;
        glow = 0.35 * (1 - e);
      }
      // hlídání okrajů displeje: karta (150 × 240 · S) celá uvnitř screenshotu
      const hw = (CARD_W / 2) * S * 1.1;
      const hh = (CARD_H / 2) * S * 1.1;
      P = { x: Math.min(SITE_SHOT.w - hw, Math.max(hw, P.x)), y: Math.min(SITE_SHOT.h - hh, Math.max(hh, P.y)) };

      const pos = map(P.x, P.y);
      const ex = map(P.x + 1, P.y);
      const ls = Math.max(0.02, Math.hypot(ex.x - pos.x, ex.y - pos.y));
      clone.style.visibility = '';
      clone.style.transform = `translate3d(${(pos.x - CARD_W / 2).toFixed(1)}px, ${(pos.y - CARD_H / 2).toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${(ls * S * sxT).toFixed(4)}, ${(ls * S * syT).toFixed(4)})`;
      clone.style.opacity = clamp01(t1 / 0.05).toFixed(3);
      clone.style.filter = glow > 0.02 ? `drop-shadow(0 0 ${(20 * glow * ls).toFixed(1)}px rgba(61,123,255,${(0.8 * glow).toFixed(2)}))` : '';
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
  }, [applyFlight, active, mounted]);

  // ambientní pohyb (rotace platformy, dýchání sloupů) běží jen na obrazovce
  useEffect(() => {
    const node = stage.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: '120px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="sluzby"
      data-nav-offset={reduced ? undefined : 70}
      className={`relative overflow-x-clip py-24 ${reduced ? 'md:py-28' : 'md:h-[202vh] md:py-0'}`}
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
        className="shell mt-10"
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
          <PlatformScene active={visible && !reduced} flash={flash} />
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
                className="pointer-events-none absolute left-1/2 top-0 -ml-[75px] h-[240px] w-[150px]"
                style={{
                  zIndex: isActive ? 40 : 10 + (COUNT - Math.abs(index - active)),
                  opacity: reduced ? 1 : 0,
                }}
              >
              <motion.button
                type="button"
                data-src-card
                data-active={isActive ? 'true' : 'false'}
                onClick={() => choose(index)}
                onMouseEnter={() => choose(index)}
                className="pointer-events-auto absolute inset-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-bright)]"
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
              </motion.button>
              </div>
            );
          })}
        </div>
      </div>

      </div>

      {/* ===== KARUSEL (mobil) — nativní scroll-snap, žádné JS přetahování ===== */}
      <div className="mt-8 md:hidden">
        <ul
          className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[calc(50vw-75px)] pb-6"
          onScroll={(event) => {
            const el = event.currentTarget;
            const index = Math.round(el.scrollLeft / 166);
            choose(Math.max(0, Math.min(COUNT - 1, index)));
          }}
        >
          {services.map((item, index) => (
            <motion.li
              key={item.slug}
              className="shrink-0 snap-center"
              initial={reduced ? undefined : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10%' }}
              transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <button
                type="button"
                onClick={() => choose(index)}
                className={`flex h-[230px] w-[150px] flex-col items-center justify-center gap-3 rounded-2xl border p-4 text-center transition-[opacity,transform,border-color] duration-300 ${
                  active === index
                    ? 'scale-100 border-[rgba(61,123,255,0.6)] bg-[rgba(18,30,70,0.95)] opacity-100'
                    : 'scale-95 border-[var(--line)] bg-[rgba(10,15,28,0.95)] opacity-80'
                }`}
              >
                <span className="font-display text-[11px] tracking-[0.2em] text-[#c3d5ff]">{item.num}</span>
                <Icon name={item.icon} className="h-7 w-7 text-ink" />
                <span className="font-display text-sm font-bold uppercase leading-tight text-ink">
                  {tItems(`${item.slug}.card`)}
                </span>
              </button>
            </motion.li>
          ))}
        </ul>
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
