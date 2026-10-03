'use client';

import { useMotionValueEvent, useScroll } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { Mascot } from '@/components/mascot/Mascot';
import { processSteps } from '@/content/process';
import { SYMBOL_POINTS, SYMBOL_VIEWBOX, ease, easeOut, hash, lerp, neonFlicker, seg } from '@/lib/fx';
import type { Pose } from '@/content/mascot';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useScrollFrame } from '@/lib/useScrollFrame';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Každý krok se skládá vlastním efektem podle toho, co znamená:
 * 01 konzultace = chat, 02 návrh = blueprint, 03 vývoj = dekódovaný kód,
 * 04 spuštění = start rakety, 05 růst = graf. Všechno je funkce polohy
 * kroku ve viewportu — funguje oběma směry scrollu.
 */
const KINDS = ['chat', 'blueprint', 'decode', 'launch', 'growth'] as const;
type Kind = (typeof KINDS)[number];

const GLYPHS = '01<>/{}=+*#$;[]';
const INK = '242,245,255';
const BLUE = '61,123,255';

const q = <T extends Element = HTMLElement>(root: Element, sel: string) => root.querySelector<T & HTMLElement>(sel);
const qa = (root: Element, sel: string) => Array.from(root.querySelectorAll<HTMLElement>(sel));

/**
 * Průhlednost + posun. translate3d → 2D translate: na telefonu by každý
 * prvek s 3D transformem dostal vlastní GPU vrstvu (a iOS Safari je pak
 * při rychlém scrollu nestíhá vykreslit); v cíli (o = 1) transform zmizí.
 */
function show(el: HTMLElement | null, o: number, transform = '') {
  if (!el) return;
  el.style.opacity = o.toFixed(3);
  el.style.transform = o >= 0.999 ? '' : transform.replace(/translate3d\(([^,]+),\s*([^,]+),\s*0\)/g, 'translate($1, $2)');
}

/** Nadpis rozdělený na znaky (efekty psaní / dekódování); čtečky dostanou celý text. */
function Chars({ text }: { text: string }) {
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {[...text].map((c, i) => (
          // mezera na telefonu dovolí zalomení (dlouhé nadpisy by roztáhly stránku do šířky)
          <span key={i} data-ch={c} className={c === ' ' ? 'md:whitespace-pre' : 'whitespace-pre'}>
            {c}
          </span>
        ))}
      </span>
    </>
  );
}

function applyStep(kind: Kind, li: HTMLElement, t: number) {
  const chars = qa(li, '[data-ch]');
  const text = q(li, '[data-text]');
  const n = chars.length;

  if (kind === 'chat') {
    // nadpis se „píše", pak tři tečky a bublina se zprávou
    const vis = Math.floor(seg(t, 0, 0.5) * n + 1e-4);
    chars.forEach((c, k) => (c.style.display = k < vis ? '' : 'none'));
    show(q(li, '[data-caret]'), t > 0 && t < 0.64 ? 1 : 0);
    show(q(li, '[data-dots]'), seg(t, 0.46, 0.52) * (1 - seg(t, 0.6, 0.64)));
    const e = easeOut(seg(t, 0.6, 0.86));
    show(text, e, `translate3d(0, ${((1 - e) * 10).toFixed(1)}px, 0) scale(${(0.6 + 0.4 * e).toFixed(3)})`);
    return;
  }

  if (kind === 'blueprint') {
    // obrys se narýsuje, nadpis se z obrysu vyplní
    show(q(li, '[data-marks]'), seg(t, 0, 0.15) * (1 - 0.6 * seg(t, 0.8, 1)));
    const rect = q<SVGRectElement>(li, '[data-frame]');
    if (rect) rect.style.strokeDashoffset = (1 - ease(seg(t, 0.02, 0.45))).toFixed(4);
    const title = q(li, '[data-title]');
    if (title) {
      const a = seg(t, 0.42, 0.78);
      title.style.opacity = seg(t, 0.12, 0.28).toFixed(3);
      title.style.color = `rgba(${INK},${a.toFixed(3)})`;
      title.style.setProperty('-webkit-text-stroke', `1px rgba(${BLUE},${(0.95 * (1 - a) + 0.05).toFixed(3)})`);
    }
    const e = easeOut(seg(t, 0.64, 0.9));
    show(text, e, `translate3d(0, ${((1 - e) * 10).toFixed(1)}px, 0)`);
    return;
  }

  if (kind === 'decode') {
    // znaky probliknou kódem a zleva doprava se „rozšifrují"
    const tick = Math.floor(t * 60);
    chars.forEach((c, k) => {
      const real = c.dataset.ch ?? '';
      const r = 0.08 + (0.55 * k) / Math.max(1, n - 1);
      let out = real;
      let color = '';
      let vis = 'visible';
      if (real.trim() && t < r) {
        if (t < r - 0.2) vis = 'hidden';
        out = GLYPHS[Math.floor(hash(k, tick) * GLYPHS.length)];
        color = `rgb(${BLUE})`;
      }
      if (c.textContent !== out) c.textContent = out;
      c.style.color = color;
      c.style.visibility = vis;
    });
    const e = easeOut(seg(t, 0.62, 0.88));
    show(text, e, `translate3d(${((1 - e) * -14).toFixed(1)}px, 0, 0)`);
    return;
  }

  if (kind === 'launch') {
    // nadpis vystartuje zespodu se světelnou stopou, šipka ELEVATE vzlétne
    const e = easeOut(seg(t, 0, 0.55));
    show(q(li, '[data-lift]'), seg(t, 0.04, 0.3), `translate3d(0, ${((1 - e) * 70).toFixed(1)}px, 0)`);
    const streak = q(li, '[data-streak]');
    if (streak) {
      streak.style.opacity = (Math.sin(Math.PI * seg(t, 0, 0.62)) * 0.9).toFixed(3);
      streak.style.transform = `scaleY(${(0.15 + (1 - e) * 0.85).toFixed(3)})`;
    }
    const r = easeOut(seg(t, 0.18, 0.62));
    show(q(li, '[data-rocket]'), seg(t, 0.18, 0.34), `translate3d(${((1 - r) * -26).toFixed(1)}px, ${((1 - r) * 60).toFixed(1)}px, 0) scale(${(0.6 + 0.4 * r).toFixed(3)})`);
    const f = easeOut(seg(t, 0.56, 0.86));
    show(text, f, `translate3d(0, ${((1 - f) * 10).toFixed(1)}px, 0)`);
    return;
  }

  // growth — sloupce grafu vyrostou, přes ně se protáhne šipka růstu
  qa(li, '[data-bar]').forEach((bar, k) => {
    bar.style.transform = `scaleY(${easeOut(seg(t, 0.04 + k * 0.07, 0.34 + k * 0.07)).toFixed(3)})`;
  });
  const line = q<SVGPolylineElement>(li, '[data-growline]');
  if (line) line.style.strokeDashoffset = (1 - ease(seg(t, 0.34, 0.7))).toFixed(4);
  show(q(li, '[data-growhead]'), seg(t, 0.66, 0.72));
  const g = easeOut(seg(t, 0.14, 0.48));
  show(q(li, '[data-title]'), g, `scale(${(0.88 + 0.12 * g).toFixed(3)})`);
  const e = easeOut(seg(t, 0.58, 0.86));
  show(text, e, `translate3d(0, ${((1 - e) * 10).toFixed(1)}px, 0)`);
}

function StepBody({ kind, title, text }: { kind: Kind; title: string; text: string }) {
  const h3 = 'font-display text-lg font-bold uppercase text-ink md:text-xl';

  if (kind === 'chat') {
    return (
      <div>
        <h3 data-land="process-title" className={h3}>
          <Chars text={title} />
          <span data-caret aria-hidden className="ml-1 inline-block h-[0.9em] w-[3px] translate-y-[0.1em] animate-pulse bg-[var(--blue-bright)] opacity-0" />
        </h3>
        <div className="relative mt-3">
          <span data-dots aria-hidden className="absolute left-0 top-1 flex gap-1 rounded-full border border-[rgba(61,123,255,0.35)] bg-[rgba(31,91,255,0.12)] px-3 py-2 opacity-0">
            {[0, 1, 2].map((d) => (
              <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--blue-bright)]" style={{ animationDelay: `${d * 0.12}s` }} />
            ))}
          </span>
          <p data-text className="inline-block origin-top-left rounded-2xl rounded-tl-sm border border-[rgba(61,123,255,0.35)] bg-[rgba(31,91,255,0.12)] px-4 py-2 text-ink/90">
            {text}
          </p>
        </div>
      </div>
    );
  }

  if (kind === 'blueprint') {
    return (
      <div className="relative inline-block pr-6">
        <svg aria-hidden className="pointer-events-none absolute -inset-x-3 -inset-y-2 h-[calc(100%+1rem)] w-[calc(100%+1.5rem)] overflow-visible">
          <rect data-frame x="0" y="0" width="100%" height="100%" rx="6" pathLength={1} fill="none" stroke={`rgba(${BLUE},0.6)`} strokeWidth={1} strokeDasharray="1 1" strokeDashoffset={1} />
        </svg>
        <span data-marks aria-hidden className="pointer-events-none absolute -inset-x-3 -inset-y-2 opacity-0">
          {['-left-1.5 -top-1.5', '-right-1.5 -top-1.5', '-bottom-1.5 -left-1.5', '-bottom-1.5 -right-1.5'].map((pos) => (
            <span key={pos} className={`absolute ${pos} h-3 w-3`}>
              <span className="absolute left-1/2 top-0 h-full w-px bg-[var(--blue-bright)]" />
              <span className="absolute left-0 top-1/2 h-px w-full bg-[var(--blue-bright)]" />
            </span>
          ))}
        </span>
        <h3 data-land="process-title" data-title className={h3}>
          {title}
        </h3>
        <p data-text className="mt-2 max-w-md text-muted">
          {text}
        </p>
      </div>
    );
  }

  if (kind === 'decode') {
    return (
      <div>
        <h3 data-land="process-title" className={h3}>
          <Chars text={title} />
        </h3>
        <p data-text className="mt-2 max-w-md text-muted">
          <span aria-hidden className="mr-2 font-mono text-sm text-[var(--blue-bright)]">{'</>'}</span>
          {text}
        </p>
      </div>
    );
  }

  if (kind === 'launch') {
    return (
      <div className="relative">
        <div data-lift className="relative flex items-center gap-3">
          <span
            data-streak
            aria-hidden
            className="pointer-events-none absolute left-6 top-full h-24 w-[3px] origin-top rounded-full opacity-0"
            style={{ background: `linear-gradient(180deg, rgba(${BLUE},0.9), transparent)`, boxShadow: `0 0 14px rgba(${BLUE},0.8)` }}
          />
          <h3 data-land="process-title" className={h3}>
            {title}
          </h3>
          <svg data-rocket aria-hidden viewBox={SYMBOL_VIEWBOX} className="h-6 w-5 opacity-0" style={{ filter: `drop-shadow(0 0 6px rgba(${BLUE},0.95))` }}>
            <polygon points={SYMBOL_POINTS} fill="#3d7bff" />
          </svg>
        </div>
        <p data-text className="mt-2 max-w-md text-muted">
          {text}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-5">
      <div>
        <h3 data-land="process-title" data-title className={`${h3} origin-left`}>
          {title}
        </h3>
        <p data-text className="mt-2 max-w-md text-muted">
          {text}
        </p>
      </div>
      <div aria-hidden className="relative mb-1 hidden h-14 w-24 shrink-0 sm:block">
        <div className="absolute inset-0 flex items-end gap-1.5">
          {[0.3, 0.45, 0.55, 0.75, 1].map((h, k) => (
            <span key={k} data-bar className="w-full origin-bottom rounded-t-sm bg-gradient-to-t from-[rgba(31,91,255,0.25)] to-[rgba(61,123,255,0.8)]" style={{ height: `${h * 100}%`, transform: 'scaleY(0)' }} />
          ))}
        </div>
        <svg viewBox="0 0 96 56" className="absolute inset-0 h-full w-full overflow-visible" style={{ filter: `drop-shadow(0 0 5px rgba(${BLUE},0.9))` }}>
          <polyline data-growline points="4,48 26,38 46,34 68,20 90,4" pathLength={1} fill="none" stroke="#cfe0ff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 1" strokeDashoffset={1} />
          <polygon data-growhead points="90,4 80,5 88,13" fill="#cfe0ff" opacity={0} />
        </svg>
      </div>
    </div>
  );
}

const MASCOT_POSES: Pose[] = ['wave', 'think', 'point', 'thumbsUp', 'celebrate'];

/**
 * Proces jako vodorovná „linka" s pěti zastávkami. Sekce se připne a scroll
 * posouvá neonovou kolejnici; kometa na ní rozsvěcí uzly (s bliknutím
 * neonu a světelným kruhem) a karty kroků se střídavě nad a pod kolejnicí
 * skládají vlastními efekty. Za kartami plují obrysová čísla (paralaxa),
 * vlevo stojí maskot a pózou komentuje právě aktivní krok.
 */
export function Process() {
  const t = useTranslations('process');
  const ref = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  const steps = t.raw('steps') as { title: string; text: string }[];
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  const apply = useCallback(
    (p: number) => {
      const track = trackRef.current;
      const stage = stageRef.current;
      if (!track || !stage) return;
      const cols = qa(track, '[data-col]');
      if (!cols.length) return;
      const vw = window.innerWidth;
      const nodeX = cols.map((c) => c.offsetLeft + c.offsetWidth / 2);
      const stepW = cols.length > 1 ? nodeX[1] - nodeX[0] : 320;
      // hlava komety: na startu jede po obrazovce, pak stojí a posouvá se kolejnice
      // start těsně za prvním uzlem: krok 01 je při otevření sekce složený (tak ho předává přechod)
      const headTrack = reduced ? nodeX[nodeX.length - 1] + 40 : lerp(nodeX[0] + 14, nodeX[nodeX.length - 1] + 60, p);
      const HX = vw * (vw < 768 ? 0.5 : 0.46);
      const maxShift = Math.max(0, track.scrollWidth - vw);
      const trackX = reduced ? 0 : -Math.min(maxShift, Math.max(0, headTrack - HX));
      track.style.transform = `translate3d(${trackX.toFixed(1)}px, 0, 0)`;
      if (fillRef.current) fillRef.current.style.width = `${Math.max(0, headTrack).toFixed(1)}px`;
      if (headRef.current) {
        headRef.current.style.transform = `translate3d(${headTrack.toFixed(1)}px, 0, 0)`;
        headRef.current.style.opacity = reduced || p <= 0.002 || p >= 0.998 ? '0' : '1';
      }

      let current = 0;
      cols.forEach((col, i) => {
        const d = headTrack - nodeX[i];
        if (d >= -20) current = i;
        const tStep = reduced ? 1 : seg(d, -stepW * 0.6, 10);
        // skleněná karta se skládá spolu s obsahem — žádná prázdná skořápka předem
        const card = q(col, '[data-card]');
        if (card) {
          const c = easeOut(seg(tStep, 0, 0.22));
          card.style.opacity = c.toFixed(3);
          card.style.transform = `scale(${(0.92 + 0.08 * c).toFixed(3)})`;
        }
        applyStep(KINDS[i % KINDS.length], col, tStep);
        // obrysové číslo za kartou pluje pomaleji než kolejnice
        const ghost = q(col, '[data-ghost]');
        if (ghost) ghost.style.transform = `translate3d(${(-trackX * 0.18 - i * 6).toFixed(1)}px, 0, 0)`;
        const node = q(col, '[data-node]');
        if (node) {
          const lit = reduced ? 1 : neonFlicker(seg(d, -10, 70));
          node.style.borderColor = `rgba(${BLUE},${(0.22 + 0.78 * lit).toFixed(3)})`;
          node.style.color = lit > 0.3 ? 'var(--blue-bright)' : 'var(--text-muted)';
          node.style.background = `rgba(31,91,255,${(0.2 * lit).toFixed(3)})`;
          node.style.boxShadow = `0 0 ${(28 * lit).toFixed(1)}px rgba(31,91,255,${(0.8 * lit).toFixed(3)})`;
          const r = reduced ? 1 : seg(d, 0, 170);
          show(q(col, '[data-ring]'), r > 0 && r < 1 ? 0.8 * (1 - r) : 0, `scale(${(1 + 1.9 * easeOut(r)).toFixed(3)})`);
          const stem = q(col, '[data-stem]');
          if (stem) stem.style.transform = `scaleY(${ease(seg(d, -stepW * 0.5, 0)).toFixed(3)})`;
        }
      });
      if (current !== activeRef.current) {
        activeRef.current = current;
        setActive(current);
      }
    },
    [reduced],
  );

  useMotionValueEvent(scrollYProgress, 'change', apply);

  /*
   * Kotvy kroků pro navigaci (podmenu „Proces"): místo scrollu, kde je
   * daný krok právě složený. Kometa jede po kolejnici lineárně s progressem,
   * takže stačí přepočítat polohu uzlu na progress → px v rámci pinu.
   */
  const anchorRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const placeAnchors = useCallback(() => {
    const track = trackRef.current;
    const section = ref.current;
    if (!track || !section || reduced) return;
    const cols = qa(track, '[data-col]');
    if (!cols.length) return;
    const nodeX = cols.map((c) => c.offsetLeft + c.offsetWidth / 2);
    const start = nodeX[0] + 14;
    const end = nodeX[nodeX.length - 1] + 60;
    const range = section.offsetHeight - window.innerHeight;
    nodeX.forEach((x, i) => {
      const el = anchorRefs.current[i];
      if (!el) return;
      const head = Math.min(end - 4, x + 44);
      el.style.top = `${Math.round(clamp01((head - start) / (end - start)) * range)}px`;
    });
  }, [reduced]);

  useEffect(() => {
    const run = () => {
      apply(scrollYProgress.get());
      placeAnchors();
    };
    run();
    const id = window.setTimeout(run, 80);
    window.addEventListener('resize', run);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('resize', run);
    };
  }, [apply, scrollYProgress, placeAnchors]);

  return (
    <section
      id="proces"
      ref={ref}
      className={reduced ? 'relative' : 'relative md:h-[var(--pin-h)]'}
      style={reduced ? undefined : ({ '--pin-h': `${steps.length * 78 + 100}vh` } as React.CSSProperties)}
      aria-labelledby="proces-title"
    >
      {!reduced ? <MobileProcess steps={steps} /> : null}
      {!reduced
        ? steps.map((item, i) => (
            <span
              key={`kotva-${item.title}`}
              id={`krok-${i + 1}`}
              ref={(el) => {
                anchorRefs.current[i] = el;
              }}
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 hidden h-px w-px md:block"
            />
          ))
        : null}
      <div className={reduced ? 'py-24' : 'sticky top-0 hidden h-dvh flex-col overflow-hidden md:flex'}>
        <div className="shell pt-24 md:pt-28">
          <p className="eyebrow">{t('eyebrow')}</p>
          <SplitHeading
            as="h2"
            id="proces-title"
            className="mt-3 font-display text-[clamp(1.8rem,4.2vw,3rem)] font-bold uppercase leading-[1.08]"
            parts={[{ text: t('title') + ' ' }, { text: t('titleAccent'), accent: true }]}
          />
          <p className="mt-3 text-muted">{t('lead')}</p>
        </div>

        <div ref={stageRef} className={`relative ${reduced ? 'mt-10 overflow-x-auto pb-6' : 'min-h-0 flex-1'}`} data-lenis-prevent={reduced ? true : undefined}>
          {/* levý okraj kolejnice se rozplývá do zóny, kde stojí maskot */}
          {/* maskot vlevo dole — póza podle aktivního kroku */}
          {!reduced ? (
            <div className="pointer-events-none absolute bottom-0 left-2 z-20 hidden md:block lg:left-8">
              <Mascot pose={MASCOT_POSES[active] ?? 'idle'} height={250} followCursor={false} />
            </div>
          ) : null}

          <div
            className="h-full"
            style={reduced ? undefined : { maskImage: 'linear-gradient(90deg, transparent 0, #000 min(22vw, 300px))', WebkitMaskImage: 'linear-gradient(90deg, transparent 0, #000 min(22vw, 300px))' }}
          >
          <div
            ref={trackRef}
            className="relative flex h-full min-h-[520px] w-max items-stretch pl-[max(20px,calc((100vw-var(--shell))/2+40px))] pr-[30vw] md:pl-[max(200px,calc((100vw-var(--shell))/2+200px))]"
          >
            {/* kolejnice + náplň + kometa (souřadnice uvnitř dráhy) */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2">
              <div className="absolute inset-0 bg-[var(--line)]" />
              <div ref={fillRef} className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--blue)] to-[var(--blue-bright)] shadow-glow" style={{ width: 0 }} />
              <div ref={headRef} className="absolute left-0 top-0 opacity-0">
                <span className="absolute right-0 top-1/2 h-[3px] w-24 -translate-y-1/2 rounded-full" style={{ background: `linear-gradient(90deg, transparent, rgba(${BLUE},0.9))` }} />
                <span className="absolute left-0 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#dbe8ff] shadow-[0_0_16px_5px_rgba(61,123,255,0.9)]" />
              </div>
            </div>

            <ol className="relative flex">
              {steps.map((item, index) => {
                const above = index % 2 === 1;
                return (
                  <li key={item.title} data-col data-nav-id={reduced ? `krok-${index + 1}` : undefined} className="relative w-[78vw] shrink-0 sm:w-[clamp(300px,26vw,380px)]">
                    {/* obrysové číslo v pozadí */}
                    <span
                      data-ghost
                      aria-hidden
                      className={`pointer-events-none absolute left-2 font-display text-[clamp(5rem,11vw,9rem)] font-bold leading-none text-transparent [-webkit-text-stroke:1px_rgba(80,120,255,0.32)] ${
                        above ? 'bottom-[54%]' : 'top-[54%]'
                      }`}
                    >
                      {processSteps[index]}
                    </span>
                    {/* uzel na kolejnici */}
                    <span
                      data-node
                      data-land="process-node"
                      className="absolute left-1/2 top-1/2 z-10 -ml-6 -mt-6 grid h-12 w-12 place-items-center rounded-full border border-[var(--line)] bg-[var(--bg)] font-display text-xs text-muted"
                    >
                      <span data-ring aria-hidden className="absolute inset-0 rounded-full border border-[var(--blue-bright)] opacity-0" />
                      {processSteps[index]}
                    </span>
                    {/* neonový „stonek" od uzlu ke kartě */}
                    <span
                      data-stem
                      aria-hidden
                      className={`absolute left-1/2 h-10 w-px -translate-x-1/2 bg-[var(--blue-bright)] shadow-glow ${
                        above ? 'bottom-[calc(50%+24px)] origin-bottom' : 'top-[calc(50%+24px)] origin-top'
                      }`}
                      style={{ transform: 'scaleY(0)' }}
                    />
                    <div
                      className={`absolute inset-x-5 ${above ? 'bottom-[calc(50%+64px)]' : 'top-[calc(50%+64px)]'}`}
                    >
                      <div data-card className={`glass rounded-2xl border border-[rgba(80,120,255,0.18)] p-5 ${above ? 'origin-bottom' : 'origin-top'}`} style={{ opacity: reduced ? 1 : 0 }}>
                        <StepBody kind={KINDS[index % KINDS.length]} title={item.title} text={item.text} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Mobil: stejný příběh svisle — neonová kolejnice vlevo, kometa jede dolů
 * s prstem (drží se ve 62 % výšky okna), rozsvěcí uzly a karty kroků se
 * vpravo skládají svými efekty (chat, blueprint, kód, start, růst).
 */
function MobileProcess({ steps }: { steps: { title: string; text: string }[] }) {
  const t = useTranslations('process');
  const listRef = useRef<HTMLOListElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const headRef = useRef<HTMLSpanElement>(null);

  // polohy uzlů se mění jen se změnou rozvržení — měřit jednou, ne každý snímek
  // (čtení offsetTop po zápisech stylů by vynutilo přepočet rozvržení na každém kroku)
  const nodeYs = useRef<number[]>([]);
  const stepState = useRef<string[]>([]);
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      nodeYs.current = qa(list, '[data-mstep]').map((li) => {
        const node = q(li, '[data-node]');
        return li.offsetTop + (node ? node.offsetTop + node.offsetHeight / 2 : 0);
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, []);

  useScrollFrame(() => {
    const list = listRef.current;
    if (!list || !list.offsetHeight) return;
    const vh = window.innerHeight;
    const rect = list.getBoundingClientRect();
    // daleko mimo obrazovku nic nepočítat
    if (rect.bottom < -vh || rect.top > vh * 2) return;
    const H = rect.height;
    const headY = vh * 0.62 - rect.top;
    const fill = Math.max(0, Math.min(H, headY));
    if (fillRef.current) fillRef.current.style.transform = `scaleY(${(fill / H).toFixed(4)})`;
    if (headRef.current) {
      headRef.current.style.transform = `translate3d(0, ${fill.toFixed(1)}px, 0)`; // jede každý snímek → vlastní vrstva
      headRef.current.style.opacity = headY > 0 && headY < H ? '1' : '0';
    }
    qa(list, '[data-mstep]').forEach((li, i) => {
      const node = q(li, '[data-node]');
      const nodeY = nodeYs.current[i] ?? 0;
      const d = headY - nodeY;
      const tStep = seg(d, -vh * 0.32, 24);
      // krok v klidu (ještě nezačal / dávno hotový) a beze změny od minula → nic nepřekreslovat
      const key = `${tStep === 0 ? 0 : tStep === 1 ? 1 : 'x'}|${d < -10 ? 'pre' : d > 150 ? 'post' : 'x'}`;
      if (key !== 'x|x' && !key.includes('x') && stepState.current[i] === key) {
        const ghost = q(li, '[data-ghost]');
        if (ghost && Math.abs(d) < vh * 1.5) ghost.style.transform = `translate3d(0, ${(-d * 0.12).toFixed(1)}px, 0)`;
        return;
      }
      stepState.current[i] = key;
      const card = q(li, '[data-card]');
      if (card) {
        const c = easeOut(seg(tStep, 0, 0.25));
        card.style.opacity = c.toFixed(3);
        card.style.transform = c >= 0.999 ? '' : `translate(${((1 - c) * 18).toFixed(1)}px, 0) scale(${(0.94 + 0.06 * c).toFixed(3)})`;
      }
      applyStep(KINDS[i % KINDS.length], li, tStep);
      if (node) {
        const lit = neonFlicker(seg(d, -10, 60));
        node.style.borderColor = `rgba(${BLUE},${(0.22 + 0.78 * lit).toFixed(3)})`;
        node.style.color = lit > 0.3 ? 'var(--blue-bright)' : 'var(--text-muted)';
        node.style.background = `rgba(31,91,255,${(0.2 * lit).toFixed(3)})`;
        node.style.boxShadow = `0 0 ${(24 * lit).toFixed(1)}px rgba(31,91,255,${(0.8 * lit).toFixed(3)})`;
        const r = seg(d, 0, 150);
        show(q(li, '[data-ring]'), r > 0 && r < 1 ? 0.8 * (1 - r) : 0, `scale(${(1 + 1.9 * easeOut(r)).toFixed(3)})`);
      }
      const ghost = q(li, '[data-ghost]');
      // paralaxa jede každý snímek → 3D (kompozitor), ne překreslování obrysového písma
      if (ghost) ghost.style.transform = `translate3d(0, ${(-d * 0.12).toFixed(1)}px, 0)`;
    });
  });

  return (
    <div className="pb-10 pt-16 md:hidden">
      <div className="shell">
        <p className="eyebrow">{t('eyebrow')}</p>
        <SplitHeading
          as="h2"
          className="mt-3 font-display text-[clamp(1.8rem,8vw,2.4rem)] font-bold uppercase leading-[1.08]"
          parts={[{ text: t('title') + ' ' }, { text: t('titleAccent'), accent: true }]}
        />
        <p className="mt-3 text-muted">{t('lead')}</p>
      </div>

      <ol ref={listRef} className="shell relative mt-10">
        {/* kolejnice + náplň + kometa */}
        {/* osa kolejnice = střed uzlů (odsazení .shell 20 px + polovina uzlu 24 px) */}
        <span aria-hidden className="pointer-events-none absolute bottom-0 left-[43.5px] top-0 w-px bg-[var(--line)]" />
        <span
          ref={fillRef}
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-[43.5px] top-0 w-px origin-top bg-gradient-to-b from-[var(--blue)] to-[var(--blue-bright)] shadow-glow"
          style={{ transform: 'scaleY(0)' }}
        />
        <span ref={headRef} aria-hidden className="pointer-events-none absolute left-[44px] top-0 z-10 opacity-0">
          <span className="absolute bottom-0 left-1/2 h-20 w-[3px] -translate-x-1/2 rounded-full" style={{ background: `linear-gradient(180deg, transparent, rgba(${BLUE},0.9))` }} />
          <span className="absolute left-1/2 top-0 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#dbe8ff] shadow-[0_0_16px_5px_rgba(61,123,255,0.9)]" />
        </span>

        {steps.map((item, index) => (
          <li key={item.title} data-mstep data-nav-id={`krok-${index + 1}`} data-nav-offset={-30} className="relative grid grid-cols-[48px_1fr] gap-4 pb-12 last:pb-2">
            <span
              data-node
              className="relative z-10 grid h-12 w-12 place-items-center rounded-full border border-[var(--line)] bg-[var(--bg)] font-display text-xs text-muted"
            >
              <span data-ring aria-hidden className="absolute inset-0 rounded-full border border-[var(--blue-bright)] opacity-0" />
              {processSteps[index]}
            </span>
            <div className="relative min-w-0 pt-1">
              <span
                data-ghost
                aria-hidden
                className="pointer-events-none absolute -top-6 right-0 font-display text-[5.5rem] font-bold leading-none text-transparent [-webkit-text-stroke:1px_rgba(80,120,255,0.28)]"
              >
                {processSteps[index]}
              </span>
              <div data-card className="glass relative origin-left rounded-2xl border border-[rgba(80,120,255,0.18)] p-5" style={{ opacity: 0 }}>
                <StepBody kind={KINDS[index % KINDS.length]} title={item.title} text={item.text} />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
