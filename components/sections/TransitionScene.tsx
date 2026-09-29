'use client';

import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, type CSSProperties, type MutableRefObject } from 'react';
import { MacbookFrame } from '@/components/mockups/MacbookFrame';
import { services } from '@/content/services';
import { processSteps } from '@/content/process';
import { cases } from '@/content/cases';
import { macbookScreen } from '@/lib/devices';
import { SYMBOL_POINTS, SYMBOL_VIEWBOX, ease, easeIn, easeOut, lerp, neonFlicker, seg } from '@/lib/fx';
import { useScrollFrame } from '@/lib/useScrollFrame';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { CardBody } from './ServiceDeck';
import { DEMO_FIRST_FRAME } from './DemoScreen';
import { PRICE_CARD_BG, PRICE_CARD_CLASS, PriceCardDecor, PriceCardFace } from './Pricing';
import { plans, type Plan } from '@/content/pricing';
import { ServiceCardBack, ServiceCardFront } from './ServiceCard';

export type TransitionVariant =
  | 'cardToPanel'
  | 'panelCollapseRise'
  | 'glitchTimeline'
  | 'timelineUnfurl'
  | 'devicesToCard'
  | 'fanRing';

/* ------------------------------------------------------------------ */
/*  Pomocníci                                                          */
/* ------------------------------------------------------------------ */

type Tf = { x?: number; y?: number; r?: number; rx?: number; ry?: number; s?: number; sx?: number; sy?: number; o?: number };

/**
 * Přímý zápis transformace do DOM. Scroll-řízené hodnoty přes
 * `style={{ x: motionValue }}` se v tomhle stromu (Lenis + GSAP ticker +
 * akcelerace scrollu ve Framer Motion) nepropisovaly spolehlivě.
 */
function tf(el: HTMLElement | null | undefined, t: Tf, center = true) {
  if (!el) return;
  const sx = t.sx ?? t.s ?? 1;
  const sy = t.sy ?? t.s ?? 1;
  el.style.transform =
    `${center ? 'translate(-50%, -50%) ' : ''}translate3d(${(t.x ?? 0).toFixed(1)}px, ${(t.y ?? 0).toFixed(1)}px, 0) ` +
    `rotateX(${(t.rx ?? 0).toFixed(2)}deg) rotateY(${(t.ry ?? 0).toFixed(2)}deg) rotate(${(t.r ?? 0).toFixed(2)}deg) ` +
    `scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
  if (t.o !== undefined) fade(el, t.o);
}

function fade(el: HTMLElement | null | undefined, o: number) {
  if (!el) return;
  el.style.opacity = o.toFixed(3);
  el.style.visibility = o <= 0.002 ? 'hidden' : 'visible';
}

function size(el: HTMLElement | null | undefined, w: number, h: number) {
  if (!el) return;
  el.style.width = `${w.toFixed(1)}px`;
  el.style.height = `${h.toFixed(1)}px`;
}

/** Box prvku: střed vůči středu viewportu + rozměry (+ natočení/měřítko u zdrojů). */
type Box = { x: number; y: number; w: number; h: number };
type SBox = Box & { r: number; sx: number; sy: number; el: HTMLElement };

/** Pozice prvku v dokumentu bez transformací (vstupní animace cíle ji nerozhodí). */
function docBox(el: HTMLElement) {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

/** Obrazovka MacBooku uvnitř boxu celého mockupu (souřadnice z lib/devices.ts). */
function macScreen(b: Box): Box {
  const i = macbookScreen.inset;
  const w = b.w * (1 - (i.left + i.right) / 100);
  const h = b.h * (1 - (i.top + i.bottom) / 100);
  const left = b.x - b.w / 2 + (b.w * i.left) / 100;
  const top = b.y - b.h / 2 + (b.h * i.top) / 100;
  return { x: left + w / 2, y: top + h / 2, w, h };
}

/** Obal notebooku ve „Weby, které žijí" obsahuje i popisky — mockup má výšku podle poměru stran. */
function laptopFromWrap(wrap: Box): Box {
  const h = wrap.w / macbookScreen.imageAspect;
  return { x: wrap.x, y: wrap.y - wrap.h / 2 + h / 2, w: wrap.w, h };
}

/** Jeden snímek přechodu. */
type Frame = {
  /** celkový progress pinu 0…1 */
  p: number;
  /** progress vlastní animace (0 = ještě „přilepená" na předchozí sekci) */
  q: number;
  vw: number;
  vh: number;
  /** cílové prvky DALŠÍ sekce v konečné poloze (p = 1) */
  land: (selector: string) => Box[];
  /** zdrojové prvky PŘEDCHOZÍ sekce — živě, dokud se scéna neodlepí, pak zmrazené */
  src: (selector: string) => SBox[];
  /** o kolik níž leží další sekce v okamžiku předání (land() ho už obsahuje) */
  ly: number;
};
type Render = (f: Frame) => void;
type SceneProps = { renderRef: MutableRefObject<Render | null> };

/** Absolutně vycentrovaný prvek — skutečnou polohu řídí `tf()`. */
const CENTER = 'absolute left-1/2 top-1/2';
const CARD_W = 150;
const CARD_H = 240;

/**
 * Délka každého přechodu (výška sekce; pin = výška − 100vh). Klíčové
 * okamžiky (otočení karty v panel, portál „05", výlet z telefonu, skládání
 * dopisu) mají dostat aspoň ~1 obrazovku scrollu, aby byly vidět při
 * běžném kolečku/touchpadu.
 */
const HEIGHT: Record<TransitionVariant, string> = {
  cardToPanel: '428vh',
  panelCollapseRise: '303vh',
  glitchTimeline: '381vh',
  timelineUnfurl: '412vh',
  devicesToCard: '428vh',
  fanRing: '428vh',
};

/** Do tohoto bodu scéna jede s předchozí sekcí (klony na místě originálů), pak se „odlepí". */
const DETACH = 0.08;
/** Konec vlastní animace (pak už jen předání další sekci). */
const ANIM_END = 0.93;
/**
 * Předání: posledních HANDOFF px pinu se scéna a další sekce prolnou.
 * Scéna dosedá rovnou tam, kde bude sekce na začátku prolnutí (o HANDOFF
 * níž než v konečné poloze), a pak s ní jede nahoru — žádné „propadnutí".
 */
const HANDOFF = 140;

/* ------------------------------------------------------------------ */
/*  Obal: pin, šev s předchozí i další sekcí                           */
/* ------------------------------------------------------------------ */

/**
 * Přechod mezi dvěma sekcemi jako JEDEN záběr přes hranici:
 *
 *  • sekce přechodu překrývá poslední viewport předchozí sekce i první
 *    viewport další (margin ±100dvh) a nemá vlastní pozadí — pod ní běží
 *    společné pozadí webu (Backdrop), takže nikde nevznikne šev v odstínu;
 *  • na začátku stojí klony prvků předchozí sekce přesně na originálech
 *    a jedou s nimi, zatímco zbytek sekce odjíždí a mizí; pak se klony
 *    „odlepí" a animace pokračuje;
 *  • na konci klony dosednou na prvky další sekce, scéna se k ní přilepí
 *    (sekce ještě vyjíždí zespodu) a obě vrstvy se prolnou.
 *
 * Viditelnost sousedních sekcí řídí CSS proměnné --seam-out/--seam-in
 * (viz globals.css), takže je sekce mezi sebou nepřepisují. Na mobilu
 * a při reduced-motion se přechod nevykresluje.
 */
export function TransitionScene({ variant }: { variant: TransitionVariant }) {
  const reduced = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const carrier = useRef<HTMLDivElement>(null);
  const renderRef = useRef<Render | null>(null);
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
  const landCache = useRef<{ at: number; boxes: Map<string, Box[]> }>({ at: 0, boxes: new Map() });

  const land = useCallback((selector: string) => {
    const cache = landCache.current;
    const now = performance.now();
    if (now - cache.at > 1000) {
      cache.at = now;
      cache.boxes.clear();
    }
    const hit = cache.boxes.get(selector);
    if (hit) return hit;
    const own = section.current;
    const next = own?.nextElementSibling as HTMLElement | null;
    if (!own || !next) return [];
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const viewTop = docBox(own).y + own.offsetHeight - vh;
    const boxes = [...next.querySelectorAll<HTMLElement>(selector)]
      .filter((el) => el.offsetWidth > 0)
      .map((el) => {
        const b = docBox(el);
        return { x: b.x + b.w / 2 - vw / 2, y: b.y - viewTop + b.h / 2 - vh / 2 + HANDOFF, w: b.w, h: b.h };
      });
    cache.boxes.set(selector, boxes);
    return boxes;
  }, []);

  const run = useCallback(() => {
    const own = section.current;
    if (!own) return;
    const prev = own.previousElementSibling as HTMLElement | null;
    const next = own.nextElementSibling as HTMLElement | null;
    // mobil: místo scény je jen neonová „nit" (MobileSeam) — sousedy nechat na pokoji
    if (window.innerWidth < 768) {
      prev?.style.removeProperty('--seam-out');
      next?.style.removeProperty('--seam-in');
      return;
    }
    const p = scrollYProgress.get();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const range = own.offsetHeight - vh;
    const top = docBox(own).y;
    const shift = Math.max(0, window.scrollY - (top + DETACH * range));

    /** Zdroje: živé obdélníky prvků předchozí sekce; po odlepení zmrazené v poloze v bodě DETACH. */
    const src = (selector: string): SBox[] => {
      if (!prev) return [];
      return [...prev.querySelectorAll<HTMLElement>(selector)]
        .filter((el) => el.offsetWidth > 0)
        .map((el) => {
          const rect = el.getBoundingClientRect();
          const tr = getComputedStyle(el).transform;
          const m = tr && tr !== 'none' ? new DOMMatrixReadOnly(tr) : new DOMMatrixReadOnly();
          const sx = Math.hypot(m.a, m.b);
          const sy = Math.hypot(m.c, m.d);
          return {
            x: rect.left + rect.width / 2 - vw / 2,
            y: rect.top + rect.height / 2 + shift - vh / 2,
            w: el.offsetWidth * sx,
            h: el.offsetHeight * sy,
            r: (Math.atan2(m.b, m.a) * 180) / Math.PI,
            sx,
            sy,
            el,
          };
        });
    };

    const remaining = (1 - p) * range;
    const q = seg(p, DETACH, Math.min(ANIM_END, 1 - (HANDOFF + 40) / range));
    renderRef.current?.({ p, q, vw, vh, land, src, ly: HANDOFF });

    // šev s předchozí sekcí: klony se objeví na originálech, sekce odjede a zhasne
    prev?.style.setProperty('--seam-out', (1 - ease(seg(p, 0.015, DETACH))).toFixed(3));
    // šev s další sekcí: posledních HANDOFF px jede scéna nahoru spolu se sekcí a prolnou se
    const hand = seg(HANDOFF - remaining, 0, HANDOFF);
    if (carrier.current) carrier.current.style.transform = `translate3d(0, ${(-HANDOFF * hand).toFixed(1)}px, 0)`;
    next?.style.setProperty('--seam-in', ease(hand).toFixed(3));
    fade(stage.current, seg(p, 0, 0.015) * (1 - ease(hand)));
  }, [scrollYProgress, land]);

  useMotionValueEvent(scrollYProgress, 'change', run);
  useEffect(() => {
    if (reduced) return;
    const id = requestAnimationFrame(run);
    const onResize = () => {
      landCache.current.at = 0;
      run();
    };
    window.addEventListener('resize', onResize);
    const own = section.current;
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', onResize);
      (own?.previousElementSibling as HTMLElement | null)?.style.removeProperty('--seam-out');
      (own?.nextElementSibling as HTMLElement | null)?.style.removeProperty('--seam-in');
    };
  }, [reduced, run]);

  if (reduced) {
    return (
      <section aria-hidden className="relative hidden h-28 md:block">
        <motion.div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-30% 0px' }}
          transition={{ duration: 0.8 }}
        >
          <span className="h-px w-1/3 bg-gradient-to-r from-transparent via-[rgba(120,160,255,0.5)] to-transparent" />
        </motion.div>
      </section>
    );
  }

  return (
    <section
      ref={section}
      aria-hidden
      data-transition
      className="pointer-events-none relative z-10 md:-my-[100dvh] md:h-[var(--th)]"
      style={{ '--th': HEIGHT[variant] } as CSSProperties}
    >
      <MobileSeam />
      <div ref={stage} className="sticky top-0 hidden h-dvh overflow-hidden opacity-0 md:block" style={{ perspective: 1400 }}>
        <div ref={carrier} className="absolute inset-0">
          {variant === 'cardToPanel' ? <DealToPanel renderRef={renderRef} /> : null}
          {variant === 'panelCollapseRise' ? <PanelToLaptop renderRef={renderRef} /> : null}
          {variant === 'glitchTimeline' ? <LaptopToTimeline renderRef={renderRef} /> : null}
          {variant === 'timelineUnfurl' ? <NodeBurstToCases renderRef={renderRef} /> : null}
          {variant === 'devicesToCard' ? <PhoneToPricing renderRef={renderRef} /> : null}
          {variant === 'fanRing' ? <PricingToEnvelope renderRef={renderRef} /> : null}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  1 — Stůl služeb → panely: karty ze stolu, 01 se otočí v panel      */
/* ------------------------------------------------------------------ */

/** Rozměry prvního panelu ServiceDeck — konec přechodu na něj přesně navazuje. */
function deckPanel(vw: number, vh: number) {
  const lg = vw >= 1024;
  return { w: Math.min(1180, vw) - (lg ? 144 : 48), h: Math.min(vh * 0.76, 620), x: lg ? 40 : 0 };
}

function DealToPanel({ renderRef }: SceneProps) {
  const tItems = useTranslations('services.items');
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const trails = useRef<(HTMLSpanElement | null)[]>([]);
  const edge = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const neon = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const sweep = useRef<HTMLDivElement>(null);
  const cardFace = useRef<HTMLDivElement>(null);

  /**
   * Karty se zvednou přímo ze stolu (klony stojí na originálech), otočí
   * se lícem a seřadí do vějíře; 01 dojede doprostřed a otočí se hranou
   * (po hraně přeběhne neon) — rotace plynule pokračuje a z druhé strany
   * je to skleněný panel, který se v neonovém rámu rozbalí na plný panel.
   */
  renderRef.current = ({ q, vw, vh, src, ly }) => {
    const P = deckPanel(vw, vh);
    const spread = Math.min(175, vw * 0.12);
    const CS = 1.25;
    const cw = CARD_W * CS;
    const ch = CARD_H * CS;
    const S = src('[data-src-card]');
    const fanT = ease(seg(q, 0, 0.18));
    const gather = ease(seg(q, 0.2, 0.34));
    const away = easeIn(seg(q, 0.2, 0.36));
    const turn1 = easeIn(seg(q, 0.36, 0.47));
    const turn2 = easeOut(seg(q, 0.47, 0.58));

    services.forEach((_, i) => {
      const off = i - 2;
      const s0 = S[i];
      const from = s0
        ? { x: s0.x, y: s0.y, r: s0.r, sx: s0.sx, sy: s0.sy, ry: s0.el.dataset.active === 'true' ? 180 : 0 }
        : { x: off * 160, y: vh * 0.2, r: off * 7, sx: 1, sy: 1, ry: 0 };
      const fan = { x: off * spread, y: Math.abs(off) * 22 - 20, r: off * 9 };
      let x = lerp(from.x, fan.x, fanT);
      let y = lerp(from.y, fan.y, fanT);
      let r = lerp(from.r, fan.r, fanT);
      let sx = lerp(from.sx, 1, fanT);
      let sy = lerp(from.sy, 1, fanT);
      let ry = lerp(from.ry, 180, ease(seg(q, 0.03 + i * 0.02, 0.18 + i * 0.02)));
      let o = 1;

      if (i === 0) {
        x = lerp(x, P.x, gather);
        y = lerp(y, ly, gather);
        r = lerp(r, 0, gather);
        sx = lerp(sx, CS, gather);
        sy = lerp(sy, CS, gather);
        ry += 90 * turn1;
        o = turn1 >= 1 ? 0 : 1;
      } else {
        const dir = off === 0 ? 0.25 : Math.sign(off);
        x += dir * vw * 0.75 * away;
        y += (i % 2 === 0 ? -1 : 1) * vh * 0.55 * away;
        r += off * 45 * away;
        o = 1 - seg(q, 0.28, 0.36);
      }
      tf(cards.current[i], { x, y, r, sx, sy, ry, o });
      const tr = trails.current[i];
      if (tr && i > 0) {
        tf(tr, { x: x * 0.82, y: y * 0.82, r: (Math.atan2(y, x) * 180) / Math.PI, sx: 1 + away * 6, o: away > 0 && away < 1 ? 0.8 * Math.sin(away * Math.PI) : 0 });
      }
    });

    const edgeT = seg(q, 0.4, 0.55);
    if (edge.current) edge.current.style.height = `${ch * 1.1}px`;
    tf(edge.current, { x: P.x, y: ly, sy: 0.4 + 0.6 * Math.sin(edgeT * Math.PI), o: Math.sin(edgeT * Math.PI) });

    const grow = ease(seg(q, 0.58, 0.84));
    const el = panel.current;
    const ix = ((P.w - cw) / 2) * (1 - grow);
    const iy = ((P.h - ch) / 2) * (1 - grow);
    const radius = lerp(18, 28, grow);
    if (el) {
      size(el, P.w, P.h);
      el.style.clipPath = `inset(${iy.toFixed(1)}px ${ix.toFixed(1)}px round ${radius.toFixed(1)}px)`;
    }
    tf(el, { x: P.x, y: ly, ry: -90 * (1 - turn2), o: turn2 > 0 ? 1 : 0 });
    if (neon.current) {
      size(neon.current, P.w - 2 * ix, P.h - 2 * iy);
      neon.current.style.borderRadius = `${radius}px`;
    }
    tf(neon.current, { x: P.x, y: ly, ry: -90 * (1 - turn2), o: turn2 > 0 ? 1 - seg(q, 0.86, 0.96) : 0 });
    const faceOut = seg(q, 0.6, 0.68);
    tf(cardFace.current, { y: -faceOut * 30, s: 1 + faceOut * 0.15, o: 1 - faceOut });
    const reveal = easeOut(seg(q, 0.64, 0.88));
    if (content.current) {
      content.current.style.opacity = reveal.toFixed(3);
      content.current.style.transform = `translate3d(0, ${((1 - reveal) * 18).toFixed(1)}px, 0) scale(${lerp(0.95, 1, reveal).toFixed(4)})`;
    }
    const sw = seg(q, 0.8, 0.98);
    tf(sweep.current, { x: lerp(-0.3 * P.w, 1.1 * P.w, sw), r: 16, o: sw > 0 && sw < 1 ? 1 : 0 }, false);
  };

  return (
    <>
      <div ref={panel} className={`${CENTER} glass overflow-hidden rounded-[28px] border border-[rgba(80,120,255,0.28)] opacity-0`} style={{ backfaceVisibility: 'hidden' }}>
        <span className="absolute inset-x-0 top-0 z-10 h-[3px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(61,123,255,0.8), transparent)' }} />
        <div ref={content} className="h-full">
          <CardBody index={0} role="current" />
        </div>
        <div ref={cardFace} className={`${CENTER} flex w-[160px] flex-col items-center gap-3 text-center`}>
          <span className="font-display text-xs tracking-[0.22em] text-[var(--blue-bright)]">{services[0].num}</span>
          <span className="font-display text-base font-bold uppercase leading-tight text-ink">{tItems(`${services[0].slug}.card`)}</span>
        </div>
        <div ref={sweep} className="pointer-events-none absolute -inset-y-1/4 left-0 w-40" style={{ background: 'linear-gradient(90deg, transparent, rgba(140,180,255,0.16), transparent)' }} />
      </div>
      <div ref={neon} className={`${CENTER} border-2 border-[var(--blue-bright)] opacity-0`} style={{ boxShadow: '0 0 24px rgba(61,123,255,0.85), inset 0 0 18px rgba(61,123,255,0.45)', backfaceVisibility: 'hidden' }} />
      <div ref={edge} className={`${CENTER} w-[3px] rounded-full bg-[#cfe0ff] opacity-0`} style={{ boxShadow: '0 0 18px 4px rgba(61,123,255,0.95), 0 0 60px 10px rgba(31,91,255,0.6)' }} />
      {services.map((item, i) => (
        <span
          key={`trail-${item.slug}`}
          ref={(node) => { trails.current[i] = node; }}
          className={`${CENTER} h-[3px] w-16 rounded-full opacity-0`}
          style={{ background: 'linear-gradient(90deg, transparent, rgba(61,123,255,0.9))', boxShadow: '0 0 12px rgba(61,123,255,0.8)' }}
        />
      ))}
      {services.map((item, i) => (
        <div
          key={item.slug}
          ref={(node) => { cards.current[i] = node; }}
          className={`${CENTER} preserve-3d`}
          style={{ width: CARD_W, height: CARD_H, zIndex: 10 - i }}
        >
          <ServiceCardBack item={item} label={tItems(`${item.slug}.tab`)} className="backface-hidden" />
          <span className="backface-hidden absolute inset-0 rounded-2xl" style={{ transform: 'rotateY(180deg)', boxShadow: '0 0 46px rgba(31,91,255,0.45)' }}>
            <ServiceCardFront item={item} title={tItems(`${item.slug}.card`)} />
          </span>
        </div>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  2 — Panely → „Weby, které žijí": panel se stane obrazovkou MacBooku */
/* ------------------------------------------------------------------ */

function PanelToLaptop({ renderRef }: SceneProps) {
  const panel = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const shot = useRef<HTMLImageElement>(null);
  const laptop = useRef<HTMLDivElement>(null);
  const underglow = useRef<HTMLDivElement>(null);
  const sweep = useRef<HTMLDivElement>(null);

  /**
   * Poslední panel ServiceDeck se zvedne, zmenší a zasune přesně do
   * obrazovky notebooku v další sekci; jeho obsah se mezitím prolne do
   * živého dema a kolem vyroste skutečný MacBook mockup. Pod notebookem
   * se rozsvítí neonová linka, přes displej přejede odlesk.
   */
  renderRef.current = ({ q, vw, vh, land, src }) => {
    const fallback = deckPanel(vw, vh);
    const P = src('[data-deck-role="current"]')[0] ?? { x: fallback.x, y: 0, w: fallback.w, h: fallback.h };
    const wrap = land('[data-land="why-laptop"]')[0];
    const lap = wrap ? laptopFromWrap(wrap) : { x: 0, y: vh * 0.1, w: Math.min(720, vw * 0.5), h: Math.min(720, vw * 0.5) / macbookScreen.imageAspect };
    const scr = macScreen(lap);

    const lift = Math.sin(Math.PI * seg(q, 0, 0.2));
    const move = ease(seg(q, 0.08, 0.56));
    if (panel.current) {
      size(panel.current, P.w, P.h);
      panel.current.style.borderRadius = `${lerp(28, 3 * (P.w / scr.w), move).toFixed(1)}px`;
      panel.current.style.boxShadow = `0 ${(30 + lift * 30).toFixed(0)}px ${(80 + lift * 40).toFixed(0)}px -30px rgba(31,91,255,${(0.25 + 0.35 * lift).toFixed(2)})`;
    }
    tf(panel.current, {
      x: lerp(P.x, scr.x, move),
      y: lerp(P.y, scr.y, move) - lift * 14,
      sx: lerp(1, scr.w / P.w, move),
      sy: lerp(1, scr.h / P.h, move),
      o: 1,
    });
    // obsah panelu → živé demo webu
    fade(shot.current, ease(seg(q, 0.36, 0.5)));
    fade(content.current, 1 - ease(seg(q, 0.4, 0.5)));

    const lt = easeOut(seg(q, 0.44, 0.7));
    size(laptop.current, lap.w, lap.h);
    tf(laptop.current, { x: lap.x, y: lap.y + (1 - lt) * 36, s: lerp(1.06, 1, lt), o: lt });
    const glowT = seg(q, 0.6, 0.8);
    if (underglow.current) underglow.current.style.width = `${lap.w * 0.9}px`;
    tf(underglow.current, { x: lap.x, y: lap.y + lap.h / 2 - 4, sx: 0.2 + 0.8 * easeOut(glowT), o: glowT * (1 - 0.5 * seg(q, 0.85, 1)) });
    const sw = seg(q, 0.62, 0.86);
    tf(sweep.current, { x: lerp(-0.4 * P.w, 1.2 * P.w, sw), r: 16, o: sw > 0 && sw < 1 ? 1 : 0 }, false);
  };

  return (
    <>
      <div ref={laptop} className={`${CENTER} opacity-0`}>
        <MacbookFrame>
          <div className="absolute inset-0 bg-[#04060b]" />
        </MacbookFrame>
      </div>
      <div
        ref={underglow}
        className={`${CENTER} h-[3px] rounded-full bg-[#cfe0ff] opacity-0`}
        style={{ boxShadow: '0 0 14px 3px rgba(61,123,255,0.95), 0 0 50px 12px rgba(31,91,255,0.5)' }}
      />
      <div ref={panel} className={`${CENTER} glass origin-center overflow-hidden border border-[rgba(80,120,255,0.28)]`}>
        <div ref={content} className="h-full">
          <CardBody index={services.length - 1} role="current" />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={shot} src={DEMO_FIRST_FRAME} alt="" className="absolute inset-0 h-full w-full object-cover object-top opacity-0" />
        <div ref={sweep} className="pointer-events-none absolute -inset-y-1/4 left-0 w-40" style={{ background: 'linear-gradient(90deg, transparent, rgba(170,200,255,0.18), transparent)' }} />
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  3 — „Weby, které žijí" → Proces: web z notebooku se rozloží na     */
/*      vrstvy a ty se srazí do uzlů vodorovné kolejnice               */
/* ------------------------------------------------------------------ */

const SLABS = 5;

function LaptopToTimeline({ renderRef }: SceneProps) {
  const t = useTranslations('process');
  const steps = t.raw('steps') as { title: string }[];
  const laptop = useRef<HTMLDivElement>(null);
  const slabs = useRef<(HTMLDivElement | null)[]>([]);
  const nodes = useRef<(HTMLDivElement | null)[]>([]);
  const glows = useRef<(HTMLSpanElement | null)[]>([]);
  const title = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLDivElement>(null);
  const shot = useRef<{ key: string; url: string }>({ key: '', url: DEMO_FIRST_FRAME });

  /**
   * Snímek přesně toho, co je teď na obrazovce notebooku v sekci „Weby, které
   * žijí" (canvas ukázky v aktuální poloze a verzi) — vrstvy se musí rozložit
   * z téhož obrazu, jinak by obsah „naskočil znovu".
   */
  const capture = (screenEl: HTMLElement | null, w: number, h: number) => {
    const source = screenEl?.querySelector('canvas');
    if (!source || source.width < 2 || w < 2 || h < 2) return shot.current.url;
    // ukázka kreslí do <canvas> — verze kresby v data-v, ať se nesnímá zbytečně
    const key = `${Math.round(w)}x${Math.round(h)}:${source.dataset.v ?? ''}`;
    if (key === shot.current.key) return shot.current.url;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w);
    canvas.height = Math.round(h);
    const ctx = canvas.getContext('2d');
    if (!ctx) return shot.current.url;
    try {
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      shot.current = { key, url: canvas.toDataURL('image/jpeg', 0.85) };
    } catch {
      /* necháme výchozí snímek */
    }
    return shot.current.url;
  };

  renderRef.current = ({ p, q, vw, vh, land, src }) => {
    const wrap = src('[data-land="why-laptop"]')[0];
    const lap = wrap ? laptopFromWrap(wrap) : { x: 0, y: 0, w: Math.min(720, vw * 0.5), h: Math.min(720, vw * 0.5) / macbookScreen.imageAspect };
    const scr = macScreen(lap);
    const slabH = scr.h / SLABS;
    const nodeBoxes = land('[data-land="process-node"]');
    const titleBox = land('[data-land="process-title"]')[0];
    const nodeAt = (i: number) => nodeBoxes[i] ?? { x: -vw * 0.25 + i * vw * 0.2, y: vh * 0.12, w: 48, h: 48 };

    // na začátku (dokud jsou klony na originálu) sejmout aktuální obraz displeje
    const url = p > 0 && q <= 0 ? capture(wrap?.el.querySelector<HTMLElement>('[data-why-screen]') ?? null, scr.w, scr.h) : shot.current.url;

    // notebook zmizí, obrazovka zůstane viset jako „vrstvy webu"
    size(laptop.current, lap.w, lap.h);
    tf(laptop.current, { x: lap.x, y: lap.y + seg(q, 0, 0.18) * 30, o: 1 - ease(seg(q, 0.02, 0.18)) });

    const explode = ease(seg(q, 0.1, 0.34));
    slabs.current.forEach((el, i) => {
      const off = i - (SLABS - 1) / 2;
      if (el) {
        size(el, scr.w, slabH);
        if (el.dataset.src !== url) {
          el.dataset.src = url;
          el.style.backgroundImage = `url(${url})`;
        }
        el.style.backgroundSize = `${scr.w.toFixed(1)}px ${scr.h.toFixed(1)}px`;
        el.style.backgroundPosition = `0 ${(-i * slabH).toFixed(1)}px`;
      }
      const c = ease(seg(q, 0.36 + i * 0.05, 0.58 + i * 0.05));
      const stacked = { x: scr.x, y: scr.y + off * slabH };
      const exploded = { x: scr.x + off * 30, y: scr.y + off * slabH * 2.3 };
      const node = nodeAt(i);
      tf(el, {
        x: lerp(lerp(stacked.x, exploded.x, explode), node.x, c),
        y: lerp(lerp(stacked.y, exploded.y, explode), node.y, c),
        rx: lerp(55 * explode, 0, c),
        sx: lerp(1, 48 / scr.w, c),
        sy: lerp(1, 48 / slabH, c),
        o: 1 - seg(q, 0.52 + i * 0.05, 0.6 + i * 0.05),
      });
      tf(nodes.current[i], { x: node.x, y: node.y, s: lerp(0.6, 1, seg(q, 0.54 + i * 0.05, 0.6 + i * 0.05)), o: seg(q, 0.52 + i * 0.05, 0.58 + i * 0.05) });
      // rozsvícený zůstane jen první uzel (tak sekce Proces začíná)
      fade(glows.current[i], seg(q, 0.62 + i * 0.03, 0.66 + i * 0.03) * (i === 0 ? 1 : 1 - seg(q, 0.82, 0.92)));
    });

    const first = nodeAt(0);
    const last = nodeAt(SLABS - 1);
    if (line.current) line.current.style.width = `${Math.max(0, last.x - first.x)}px`;
    tf(line.current, { x: (first.x + last.x) / 2, y: first.y, sx: ease(seg(q, 0.52, 0.72)), o: seg(q, 0.5, 0.54) * (1 - seg(q, 0.84, 0.92)) });
    const tt = easeOut(seg(q, 0.66, 0.82));
    if (titleBox) tf(title.current, { x: titleBox.x - titleBox.w / 2 + (1 - tt) * 24, y: titleBox.y - 14, o: tt }, false);
  };

  return (
    <>
      <div ref={laptop} className={CENTER}>
        <MacbookFrame>
          <div className="absolute inset-0 bg-[#04060b]" />
        </MacbookFrame>
      </div>
      <div ref={line} className={`${CENTER} h-px origin-left bg-gradient-to-r from-[var(--blue)] to-[var(--blue-bright)] opacity-0 shadow-glow`} />
      {Array.from({ length: SLABS }).map((_, i) => (
        <div
          key={i}
          ref={(node) => { slabs.current[i] = node; }}
          className={`${CENTER} border-y border-[rgba(80,120,255,0.35)]`}
          style={{ backgroundImage: `url(${DEMO_FIRST_FRAME})`, backgroundRepeat: 'no-repeat', boxShadow: '0 0 30px rgba(31,91,255,0.25)' }}
        />
      ))}
      {processSteps.map((num, i) => (
        <div
          key={`n-${num}`}
          ref={(node) => { nodes.current[i] = node; }}
          className={`${CENTER} grid h-12 w-12 place-items-center rounded-full border border-[var(--blue-bright)] bg-[var(--bg)] font-display text-xs text-[var(--blue-bright)] opacity-0`}
        >
          <span ref={(node) => { glows.current[i] = node; }} className="absolute inset-0 rounded-full bg-[rgba(31,91,255,0.2)] shadow-glow" />
          <span className="relative">{num}</span>
        </div>
      ))}
      <div ref={title} className="absolute left-1/2 top-1/2 whitespace-nowrap font-display text-lg font-bold uppercase text-ink opacity-0 md:text-xl">
        {steps[0]?.title}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  4 — Proces → Práce: uzel 05 vybuchne v projekty, první do notebooku */
/* ------------------------------------------------------------------ */

function NodeBurstToCases({ renderRef }: SceneProps) {
  const tCases = useTranslations('cases.items');
  const tProcess = useTranslations('process');
  const lastStep = (tProcess.raw('steps') as { title: string; text: string }[])[4];
  const node = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const portal = useRef<HTMLDivElement>(null);
  const sparks = useRef<(HTMLSpanElement | null)[]>([]);
  const cardEls = useRef<(HTMLDivElement | null)[]>([]);
  const labels = useRef<(HTMLDivElement | null)[]>([]);

  renderRef.current = ({ q, vw, vh, land, src }) => {
    const n0 = src('[data-land="process-node"]')[4] ?? { x: -vw * 0.1, y: vh * 0.12, w: 48, h: 48 };
    const c0 = src('[data-card]')[4];
    // karta kroku 05 odplyne, uzel dojede doprostřed a vybuchne
    if (c0) {
      size(card.current, c0.w, c0.h);
      tf(card.current, { x: c0.x, y: c0.y - seg(q, 0, 0.14) * 30, o: 1 - ease(seg(q, 0, 0.14)) });
    }
    const toCenter = ease(seg(q, 0.02, 0.16));
    // uzel „05" naroste a otevře se v portál
    const grow = ease(seg(q, 0.14, 0.3));
    tf(node.current, { x: lerp(n0.x, 0, toCenter), y: lerp(n0.y, 0, toCenter), s: lerp(1, 1.8, toCenter) * lerp(1, 2.6, grow), o: 1 - seg(q, 0.26, 0.32) });
    const open = ease(seg(q, 0.2, 0.36)) * (1 - ease(seg(q, 0.6, 0.72)));
    tf(portal.current, { s: lerp(0.1, 1, open), o: open });
    const r = seg(q, 0.2, 0.44);
    tf(ring.current, { s: lerp(0.8, 4.2, easeOut(r)), o: r > 0 ? 0.85 * (1 - r) : 0 });
    sparks.current.forEach((el, i) => {
      const t = easeOut(seg(q, 0.28, 0.5));
      const a = (i / 8) * Math.PI * 2;
      tf(el, { x: Math.cos(a) * 240 * t, y: Math.sin(a) * 160 * t, s: 1 - t * 0.6, o: t > 0 && t < 1 ? 1 - t : 0 });
    });

    const laptopBox = land('[data-land="cases-laptop"]')[0];
    const scr = laptopBox ? macScreen(laptopBox) : { x: vw * 0.18, y: vh * 0.05, w: vw * 0.3, h: vw * 0.19 };
    const W = Math.min(340, vw * 0.24);
    const H = W * 0.64;
    const dock = ease(seg(q, 0.74, 0.94));
    cardEls.current.forEach((el, i) => {
      const off = i - 1;
      // projekty vyjíždějí z portálu z hloubky (malé → plná velikost, náklon)
      const out = easeOut(seg(q, 0.32 + i * 0.07, 0.56 + i * 0.07));
      const row = ease(seg(q, 0.58, 0.72));
      const fan = { x: off * W * 0.6, y: Math.abs(off) * 26, r: off * 13, ry: -off * 20 };
      const rowPos = { x: off * (W + 36), y: 0 };
      let x = lerp(0, lerp(fan.x, rowPos.x, row), out);
      let y = lerp(0, lerp(fan.y, rowPos.y, row), out);
      let w = W;
      let h = H;
      let o = seg(q, 0.32 + i * 0.07, 0.36 + i * 0.07);
      if (i === 0) {
        x = lerp(x, scr.x, dock);
        y = lerp(y, scr.y, dock);
        w = lerp(W, scr.w, dock);
        h = lerp(H, scr.h, dock);
      } else {
        const hide = easeIn(seg(q, 0.74, 0.9));
        x = lerp(x, scr.x + off * 30, hide);
        y = lerp(y, scr.y - 20, hide);
        o *= 1 - hide;
      }
      if (el) {
        size(el, w, h);
        el.style.borderRadius = `${lerp(16, 3, i === 0 ? dock : 0).toFixed(1)}px`;
      }
      tf(el, {
        x,
        y,
        r: lerp(off * 40, lerp(fan.r, 0, row), out),
        rx: lerp(70, 0, out),
        ry: lerp(0, lerp(fan.ry, 0, row), out),
        s: lerp(0.05, 1, out) * (i === 0 ? 1 : lerp(1, 0.6, seg(q, 0.74, 0.9))),
        o,
      });
      fade(labels.current[i], 1 - seg(q, 0.74, 0.82));
    });
  };

  return (
    <>
      <div ref={card} className={`${CENTER} glass rounded-2xl border border-[rgba(80,120,255,0.18)] p-5 opacity-0`}>
        <div className="font-display text-lg font-bold uppercase text-ink md:text-xl">{lastStep?.title}</div>
        <p className="mt-2 text-muted">{lastStep?.text}</p>
      </div>
      {/* portál: svítící disk s neonovým okrajem, ze kterého vyjedou projekty */}
      <div
        ref={portal}
        className={`${CENTER} h-[min(520px,56vh)] w-[min(520px,56vh)] rounded-full opacity-0`}
        style={{
          background: 'radial-gradient(closest-side, rgba(4,6,11,0.95) 0%, rgba(10,24,70,0.9) 55%, rgba(31,91,255,0.55) 82%, rgba(120,170,255,0.9) 92%, transparent 100%)',
          boxShadow: '0 0 80px 18px rgba(31,91,255,0.45), inset 0 0 60px rgba(61,123,255,0.6)',
        }}
      />
      <div ref={ring} className={`${CENTER} h-24 w-24 rounded-full border-2 border-[var(--blue-bright)] opacity-0`} />
      {Array.from({ length: 8 }).map((_, i) => (
        <span key={i} ref={(el) => { sparks.current[i] = el; }} className={`${CENTER} h-2 w-2 rounded-full bg-[var(--blue-bright)] opacity-0 shadow-glow`} />
      ))}
      <div
        ref={node}
        className={`${CENTER} grid h-12 w-12 place-items-center rounded-full border border-[var(--blue-bright)] bg-[rgba(31,91,255,0.25)] font-display text-xs text-[var(--blue-bright)] shadow-glow`}
      >
        {processSteps[4]}
      </div>
      {cases.map((item, i) => (
        <div
          key={item.slug}
          ref={(el) => { cardEls.current[i] = el; }}
          className={`${CENTER} overflow-hidden border border-[rgba(80,120,255,0.35)] bg-[var(--bg)] opacity-0 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]`}
          style={{ zIndex: 3 - i }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/cases/${item.slug}/desktop.jpg`} alt="" className="absolute inset-x-0 top-0 w-full max-w-none" />
          <div ref={(el) => { labels.current[i] = el; }} className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-4 pb-3 pt-10">
            <span className="font-display text-sm font-bold uppercase text-ink">{tCases(`${item.slug}.name`)}</span>
          </div>
        </div>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  5 — Práce → Ceník: karty vyskočí z telefonu a otočí se na ceník    */
/* ------------------------------------------------------------------ */

/** Líc ceníkové karty — stejná komponenta jako v Ceníku, aby se při předání texty kryly. */
function PriceFace({ plan, className = '', style }: { plan: Plan; className?: string; style?: CSSProperties }) {
  return (
    <div className={`absolute inset-0 ${PRICE_CARD_CLASS} ${className}`} style={{ background: PRICE_CARD_BG, ...style }}>
      <PriceCardDecor />
      <PriceCardFace plan={plan} />
    </div>
  );
}

function PhoneToPricing({ renderRef }: SceneProps) {
  const tItems = useTranslations('services.items');
  const cardEls = useRef<(HTMLDivElement | null)[]>([]);

  /**
   * Z obrazovky telefonu (poslední projekt) vyletí po jedné pět karet služeb —
   * tytéž karty, které na začátku webu vylétly z notebooku. Rozestoupí se do
   * vějíře, otočí se a z rubu jsou ceníkové karty, které dosednou na skutečné.
   * Karty mají od začátku rozměr cílové karty a jen se škálují — text se
   * během letu nepřelamuje.
   */
  renderRef.current = ({ q, vw, vh, land, src }) => {
    const phone = src('[data-land="cases-phone"]')[0] ?? { x: -vw * 0.2, y: 0, w: 120, h: 260 };
    const targets = land('[data-land="price-card"]');
    const fit = ease(seg(q, 0.78, 0.96));
    const n = plans.length;
    cardEls.current.forEach((el, i) => {
      if (!el) return;
      const tgt = targets[i] ?? { x: (i - (n - 1) / 2) * 280, y: vh * 0.05, w: 264, h: 680 };
      size(el, tgt.w, tgt.h);
      const off = i - (n - 1) / 2;
      // z telefonu: začíná ve velikosti jeho displeje
      const s0 = Math.min(phone.w / tgt.w, phone.h / tgt.h) * 0.9;
      const sFan = Math.min(0.46, (vw * 0.16) / tgt.w);
      const pop = easeOut(seg(q, 0.02 + i * 0.07, 0.3 + i * 0.07));
      const f = ease(seg(q, 0.42 + i * 0.05, 0.62 + i * 0.05));
      const lift = Math.sin(f * Math.PI) * 40;
      const fanX = off * (tgt.w * sFan + 26);
      const fanY = -vh * 0.04 + Math.abs(off) * 14;
      const x0 = lerp(phone.x, fanX, pop);
      const y0 = lerp(phone.y, fanY, pop) - lift - Math.sin(Math.PI * pop) * 50;
      tf(el, {
        x: lerp(x0, tgt.x, fit),
        y: lerp(y0, tgt.y, fit),
        r: lerp(Math.sin(Math.PI * pop) * off * 9 + off * 4 * pop, 0, fit),
        ry: 180 * f,
        s: lerp(lerp(s0, sFan, pop), 1, fit) * (1 + Math.sin(f * Math.PI) * 0.05),
        o: seg(q, 0.01 + i * 0.07, 0.05 + i * 0.07),
      });
      el.style.zIndex = String(20 - Math.round(Math.abs(off)));
    });
  };

  return (
    <>
      {plans.map((plan, i) => {
        const item = services[i];
        return (
          <div key={plan.id} ref={(el) => { cardEls.current[i] = el; }} className={`${CENTER} preserve-3d opacity-0`}>
            <ServiceCardBack item={item} label={tItems(`${item.slug}.tab`)} className="backface-hidden" />
            <PriceFace plan={plan} className="backface-hidden" style={{ transform: 'rotateY(180deg)' }} />
          </div>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  6 — Ceník → Kontakt: karty ceníku se složí do dopisu, obálka odletí */
/* ------------------------------------------------------------------ */

function PricingToEnvelope({ renderRef }: SceneProps) {
  const cardEls = useRef<(HTMLDivElement | null)[]>([]);
  const letter = useRef<HTMLDivElement>(null);
  const group = useRef<HTMLDivElement>(null);
  const flap = useRef<HTMLDivElement>(null);
  const seal = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const trail = useRef<(HTMLSpanElement | null)[]>([]);

  renderRef.current = ({ q, vw, vh, src }) => {
    const S = src('[data-land="price-card"]');
    const EW = Math.min(440, vw * 0.34);
    const EH = EW * 0.62;
    const LW = EW * 0.84;
    const LH = EH * 0.9;

    // skutečné karty ceníku (klony na jejich místě) se slijí do listu dopisu
    const merge = ease(seg(q, 0.02, 0.3));
    cardEls.current.forEach((el, i) => {
      const off = i - (plans.length - 1) / 2;
      const s0 = S[i] ?? { x: off * 280, y: vh * 0.1, w: 264, h: 680 };
      // rozměr zůstává, karta se jen zmenšuje do listu (text se nepřelamuje)
      size(el, s0.w, s0.h);
      tf(el, {
        x: lerp(s0.x, 0, merge),
        y: lerp(s0.y, -EH * 0.35, merge),
        r: Math.sin(Math.PI * merge) * off * 7,
        s: lerp(1, Math.min(LW / s0.w, LH / s0.h), merge),
        o: 1 - seg(q, 0.26, 0.32),
      });
    });

    const arrive = easeOut(seg(q, 0.18, 0.36));
    const fly = ease(seg(q, 0.66, 0.92));
    size(group.current, EW, EH);
    tf(group.current, {
      x: lerp(0, vw * 0.42, fly),
      y: lerp(vh * 0.5, EH * 0.2, arrive) - vh * 0.55 * fly,
      r: lerp(0, -14, fly),
      s: lerp(1, 0.35, fly),
      o: seg(q, 0.16, 0.24),
    });
    const drop = ease(seg(q, 0.32, 0.5));
    size(letter.current, LW, LH);
    tf(letter.current, { y: lerp(-EH * 0.55, EH * 0.06, drop), o: seg(q, 0.26, 0.32) }, false);
    tf(flap.current, { rx: lerp(-178, 0, ease(seg(q, 0.5, 0.6))) }, false);
    const sealT = seg(q, 0.59, 0.65);
    tf(seal.current, { s: sealT < 1 ? lerp(0.2, 1.15, easeOut(sealT)) : 1, o: sealT });
    trail.current.forEach((el, k) => {
      const lag = seg(q, 0.66 - k * 0.025, 0.92 - k * 0.025);
      const f = easeIn(lag);
      tf(el, { x: lerp(0, vw * 0.42, f), y: lerp(EH * 0.2, EH * 0.2 - vh * 0.55, f), s: 1 - k * 0.14, o: lag > 0 && lag < 1 ? 0.8 - k * 0.12 : 0 });
    });
    const r = seg(q, 0.78, 1);
    tf(ring.current, { s: lerp(0.3, 7, easeOut(r)), o: r > 0 ? 0.7 * (1 - r) : 0 });
  };

  return (
    <>
      <div ref={ring} className={`${CENTER} h-40 w-40 rounded-full border-2 border-[var(--blue-bright)] opacity-0 shadow-glow`} />
      {Array.from({ length: 5 }).map((_, k) => (
        <span key={k} ref={(el) => { trail.current[k] = el; }} className={`${CENTER} h-3 w-3 rounded-full bg-[var(--blue-bright)] opacity-0 shadow-glow`} />
      ))}
      {plans.map((plan, i) => (
        <div key={plan.id} ref={(el) => { cardEls.current[i] = el; }} className={CENTER}>
          <PriceFace plan={plan} />
        </div>
      ))}
      <div ref={group} className={`${CENTER} opacity-0`} style={{ perspective: 900 }}>
        <div className="absolute inset-0 rounded-xl border border-[rgba(80,120,255,0.45)] bg-[#0b1433]" />
        <div ref={letter} className="absolute left-1/2 top-0 -ml-[42%] rounded-lg border border-white/20 bg-[linear-gradient(170deg,#f2f5ff,#cfd9f5)] p-4">
          <span className="block h-2 w-1/2 rounded-full bg-[var(--blue)]" />
          <span className="mt-3 block h-1.5 w-3/4 rounded-full bg-black/15" />
          <span className="mt-2 block h-1.5 w-2/3 rounded-full bg-black/10" />
        </div>
        <div
          className="absolute inset-0 rounded-xl border border-[rgba(80,120,255,0.45)]"
          style={{ background: 'linear-gradient(170deg,#13204a,#0a1230)', clipPath: 'polygon(0 22%, 50% 62%, 100% 22%, 100% 100%, 0 100%)' }}
        />
        <div
          ref={flap}
          className="absolute inset-x-0 top-0 h-[62%] origin-top"
          style={{ background: 'linear-gradient(180deg,#1a2c66,#0f1a40)', clipPath: 'polygon(0 0, 100% 0, 50% 100%)', transformStyle: 'preserve-3d' }}
        />
        <div ref={seal} className="absolute left-1/2 top-[62%] grid h-14 w-14 place-items-center rounded-full bg-[linear-gradient(135deg,var(--blue),var(--blue-bright))] shadow-glow">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/elevate-symbol.svg" alt="" className="h-7 w-7 brightness-0 invert" />
        </div>
      </div>
    </>
  );
}

/**
 * Mobilní šev mezi sekcemi — místo filmových scén (ty jsou na šířku) jedna
 * svislá neonová nit: s prstem se kreslí dolů, po ní sjede světelná jiskra
 * a uprostřed se s bliknutím neonu rozsvítí šipka ELEVATE. Stejný motiv
 * mezi všemi sekcemi, takže mobilní stránka drží jako jeden celek.
 */
function MobileSeam() {
  const ref = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const spark = useRef<HTMLSpanElement>(null);
  const arrow = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();

  useScrollFrame(() => {
    const el = ref.current;
    if (!el || !el.offsetHeight) return;
    const vh = window.innerHeight;
    const r = el.getBoundingClientRect();
    // 0 = nit vjíždí do okna zespodu, 1 = odjela nad jeho třetinu
    const t = reduced ? 1 : Math.min(1, Math.max(0, (vh * 0.9 - r.top) / (r.height + vh * 0.5)));
    const draw = ease(seg(t, 0, 0.6));
    if (fill.current) fill.current.style.transform = `scaleY(${draw.toFixed(4)})`;
    if (spark.current) {
      spark.current.style.transform = `translate3d(0, ${(draw * r.height).toFixed(1)}px, 0)`;
      spark.current.style.opacity = t > 0.01 && t < 0.62 ? '1' : '0';
    }
    if (arrow.current) {
      const lit = neonFlicker(seg(t, 0.28, 0.5));
      const up = easeOut(seg(t, 0.28, 0.7));
      arrow.current.style.opacity = (0.25 + 0.75 * lit).toFixed(3);
      arrow.current.style.transform = `translate3d(-50%, ${(-50 - 22 * up).toFixed(1)}%, 0) scale(${(0.85 + 0.15 * up).toFixed(3)})`;
      arrow.current.style.filter = lit > 0.2 ? `drop-shadow(0 0 ${(10 * lit).toFixed(1)}px rgba(61,123,255,0.95))` : '';
    }
  });

  return (
    <div ref={ref} aria-hidden className="relative h-[24svh] md:hidden">
      <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[linear-gradient(180deg,transparent,var(--line)_20%,var(--line)_80%,transparent)]" />
      <span
        ref={fill}
        className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 origin-top bg-[linear-gradient(180deg,transparent,var(--blue-bright)_25%,var(--blue)_85%,transparent)] shadow-glow"
        style={{ transform: 'scaleY(0)' }}
      />
      <span ref={spark} className="absolute left-1/2 top-0 -ml-[5px] -mt-[5px] h-2.5 w-2.5 rounded-full bg-[#dbe8ff] opacity-0 shadow-[0_0_14px_4px_rgba(61,123,255,0.9)]" />
      <svg ref={arrow} viewBox={SYMBOL_VIEWBOX} className="absolute left-1/2 top-1/2 h-11 w-9 opacity-25" style={{ transform: 'translate3d(-50%, -50%, 0)' }}>
        <polygon points={SYMBOL_POINTS} fill="rgba(8,14,32,0.9)" stroke="#8fb2ff" strokeWidth={9} strokeLinejoin="round" />
      </svg>
    </div>
  );
}
