'use client';

import { useMotionValueEvent, useScroll } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/FeatureIcon';
import { services } from '@/content/services';
import { plans } from '@/content/pricing';
import { SectionLink } from '@/components/ui/SectionLink';
import { NORDA_BOXES, NORDA_VISUALS, NordaStage, STAGE_W } from '@/components/norda/NordaVisuals';
import { clamp01, ease, easeIn, easeOut, lerp, seg } from '@/lib/fx';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useScrollFrame, viewProgress } from '@/lib/useScrollFrame';

const COUNT = services.length;

/**
 * Rozpočet scrollu (ve vh): každá služba má klidné „čtecí" okno a mezi
 * dvojicemi běží morf přes 102vh — při běžném touchpadu ~1,5 s, takže je
 * proměna opravdu vidět. Poslední služba má jen čtecí okno (pak ji
 * převezme přechodová scéna).
 */
const DWELL_VH = 47;
const MORPH_VH = 133;
const TOTAL_VH = COUNT * DWELL_VH + (COUNT - 1) * MORPH_VH;
/** progress 0…1 → (služba, morf 0…1 do další, progress v rámci služby 0…1) */
function deckState(p: number) {
  let pos = clamp01(p) * TOTAL_VH;
  for (let i = 0; i < COUNT; i++) {
    if (pos <= DWELL_VH || i === COUNT - 1) return { idx: i, m: 0, local: clamp01(pos / (DWELL_VH + MORPH_VH)) };
    pos -= DWELL_VH;
    if (pos < MORPH_VH) return { idx: i, m: pos / MORPH_VH, local: (DWELL_VH + pos) / (DWELL_VH + MORPH_VH) };
    pos -= MORPH_VH;
  }
  return { idx: COUNT - 1, m: 0, local: 1 };
}

type Role = 'current' | 'next' | 'hidden';

const GRID = 'grid h-full grid-rows-[auto_1fr] gap-5 p-6 md:grid-cols-[0.85fr_1.3fr] md:grid-rows-1 md:items-center md:gap-6 md:p-10 lg:p-12';

/** Levý sloupec panelu — text služby (skupiny `data-t` rozpohybuje ServiceDeck). */
function ServiceText({ index }: { index: number }) {
  const service = services[index];
  const t = useTranslations('services');
  const tItems = useTranslations(`services.items.${service.slug}`);
  const headline = tItems.raw('headline') as string[];
  const features = tItems.raw('features') as { title: string; sub: string }[];
  const plan = plans.find((p) => p.slug === service.slug)?.id ?? 'web';
  return (
    <div className="min-w-0">
      <p data-t="num" className="flex items-center gap-3 text-xs text-muted">
        <span className="font-display text-[var(--blue-bright)]">{service.num}</span>
      </p>
      <h3 data-t="head" className="mt-2 font-display text-[clamp(1.5rem,3.1vw,2.5rem)] font-bold uppercase leading-[1.06]">
        {headline[0]}
        <span className="text-[var(--blue-bright)]">{headline[1]}</span>
        {headline[2]}
      </h3>
      <svg data-t="wave" aria-hidden viewBox="0 0 260 28" className="mt-6 h-6 w-full max-w-[260px] text-[rgba(120,160,255,0.55)]">
        <path d="M0 20 C 30 20, 34 6, 60 6 S 92 22, 120 22 S 150 4, 180 4 S 216 18, 260 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        {[60, 180].map((cx, i) => (
          <circle key={i} cx={cx} cy={i === 0 ? 6 : 4} r="2.6" fill="var(--blue-bright)" />
        ))}
      </svg>
      <ul data-t="feat" className="mt-5 flex flex-wrap items-start gap-x-6 gap-y-4">
        {service.featureIcons.map((icon, i) => (
          <li key={icon + i} className="flex items-center gap-3">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[rgba(61,123,255,0.45)] bg-[rgba(10,20,50,0.6)] text-[var(--blue-bright)]">
              <Icon name={icon} className="h-7 w-7" />
            </span>
            <span className="text-xs leading-tight">
              <span className="block font-semibold text-ink">{features[i]?.title}</span>
              <span className="text-muted">{features[i]?.sub}</span>
            </span>
          </li>
        ))}
      </ul>
      <div data-t="cta" className="mt-7 flex items-center gap-4">
        {/* poptávka s předvybranou službou ve formuláři */}
        <Button
          href="#kontakt"
          className="!px-5 !py-3 !text-[11px]"
          onClick={() => window.dispatchEvent(new CustomEvent('elevate:preselect', { detail: { needIndex: service.needIndex, plan: '' } }))}
        >
          {tItems('cta')}
        </Button>
        {/* karta služby v Ceníku: cena a co přesně je v balíčku */}
        <SectionLink
          to={`cena-${plan}`}
          aria-label={t('learnMore')}
          title={t('learnMore')}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--line)] text-ink transition-colors hover:border-[rgba(80,120,255,0.5)] hover:text-[var(--blue-bright)]"
        >
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </SectionLink>
      </div>
    </div>
  );
}

/** Jeden panel služby (text + vizuál NORDA) — pro mobil a pro klony v přechodových scénách. */
export function CardBody({ index }: { index: number; role?: Role }) {
  const Visual = NORDA_VISUALS[services[index].slug];
  return (
    <div className={GRID}>
      <div className="order-2 md:order-1">
        <ServiceText index={index} />
      </div>
      <div className="relative order-1 min-w-0 md:order-2">
        <NordaStage>
          <Visual />
        </NordaStage>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Morfy mezi dvojicemi služeb (návrhové jednotky scény 560 × 420)     */
/* ------------------------------------------------------------------ */

type Box = { x: number; y: number; w: number; h: number };
const u = (n: number) => `${((n / STAGE_W) * 100).toFixed(3)}cqw`;
const q = (root: Element, sel: string) => root.querySelector<HTMLElement>(`[data-m="${sel}"]`);
const qa = (root: Element, sel: string) => Array.from(root.querySelectorAll<HTMLElement>(`[data-m="${sel}"]`));

/** Původní inline hodnoty z markupu (morf k nim přidává své a v klidu je vrací). */
const KEEP = ['opacity', 'transform', 'maxWidth', 'background', 'boxShadow', 'strokeDashoffset', 'transformOrigin'] as const;
type Keep = (typeof KEEP)[number];
function remember(el: HTMLElement) {
  if (el.dataset.kept) return;
  el.dataset.kept = '1';
  KEEP.forEach((k) => (el.dataset[`o_${k}`] = el.style[k] ?? ''));
}
function orig(el: HTMLElement, k: Keep) {
  remember(el);
  return el.dataset[`o_${k}`] ?? '';
}
function put(el: HTMLElement | null, s: Partial<Record<Keep, string>> & { o?: number; t?: string }) {
  if (!el) return;
  remember(el);
  if (s.o !== undefined) {
    el.style.opacity = s.o.toFixed(3);
    el.style.visibility = s.o <= 0.002 ? 'hidden' : '';
  }
  if (s.t !== undefined) el.style.transform = `${s.t} ${orig(el, 'transform')}`.trim();
  (['maxWidth', 'background', 'boxShadow', 'strokeDashoffset', 'transformOrigin'] as const).forEach((k) => {
    if (s[k] !== undefined) el.style[k] = s[k] as string;
  });
}
/** Vizuál v klidu — všechny morfované prvky zpět na hodnoty z markupu. */
function rest(root: Element) {
  root.querySelectorAll<HTMLElement>('[data-m]').forEach((el) => {
    if (!el.dataset.kept) return;
    KEEP.forEach((k) => (el.style[k] = el.dataset[`o_${k}`] ?? ''));
    el.style.visibility = '';
  });
}
/** Prvek leží v boxu A; posune a zvětší ho tak, aby zaplnil box B (t = 0…1). */
function boxTf(A: Box, B: Box, t: number, uniform = false) {
  const dx = (B.x + B.w / 2 - (A.x + A.w / 2)) * t;
  const dy = (B.y + B.h / 2 - (A.y + A.h / 2)) * t;
  const sx = lerp(1, B.w / A.w, t);
  const sy = uniform ? sx : lerp(1, B.h / A.h, t);
  return `translate(${u(dx)}, ${u(dy)}) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
}
const centerOf = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
const easeOutBack = (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);

type Morph = (m: number, out: Element, inn: Element) => void;
const B = NORDA_BOXES;

/** 01 → 02: web se složí do adresního řádku, „www." doplní adresu a ta odjede do Search Console. */
const webToSeo: Morph = (m, out, inn) => {
  const a = ease(seg(m, 0, 0.42));
  const urlC = centerOf(B.url);
  put(q(out, 'page'), { transformOrigin: `${u(urlC.x - B.page.x)} ${u(urlC.y - B.page.y)}`, t: `scale(${(1 - 0.94 * a).toFixed(4)})`, o: 1 - seg(m, 0.3, 0.44) });
  put(q(out, 'www'), { maxWidth: u(26 * ease(seg(m, 0.28, 0.44))) });
  const b = ease(seg(m, 0.44, 0.7));
  put(q(out, 'url'), { t: boxTf(B.url, B.prop, b, true), boxShadow: `0 0 ${(26 * Math.sin(Math.PI * b)).toFixed(1)}px rgba(61,123,255,${(0.9 * Math.sin(Math.PI * b)).toFixed(2)})`, o: 1 - seg(m, 0.7, 0.74) });
  put(q(out, 'browser'), { o: 1 - seg(m, 0.62, 0.66) });

  put(q(inn, 'browser'), { o: seg(m, 0.58, 0.62) });
  put(q(inn, 'url2'), { o: seg(m, 0.62, 0.72) });
  put(q(inn, 'page'), { o: seg(m, 0.6, 0.66) });
  put(q(inn, 'prop'), { o: seg(m, 0.69, 0.71) });
  qa(inn, 'tile').forEach((el, i) => {
    const t = easeOut(seg(m, 0.64 + i * 0.04, 0.76 + i * 0.04));
    put(el, { o: t, t: `translateY(${u(12 * (1 - t))}) scale(${(0.86 + 0.14 * t).toFixed(3)})` });
  });
  put(q(inn, 'impr'), { strokeDashoffset: (1 - ease(seg(m, 0.7, 0.95))).toFixed(4) });
  put(q(inn, 'clicks'), { strokeDashoffset: (1 - ease(seg(m, 0.72, 0.97))).toFixed(4) });
  put(q(inn, 'peak'), { o: seg(m, 0.95, 0.98) });
  qa(inn, 'row').forEach((el, i) => {
    const t = easeOut(seg(m, 0.8 + i * 0.04, 0.92 + i * 0.03));
    put(el, { o: t, t: `translateX(${u(-24 * (1 - t))})` });
  });
};

/** 02 → 03: vrchol křivky návštěvnosti přeletí a „vybuchne" v produkt, řádky dotazů se stanou poli platby. */
const seoToShop: Morph = (m, out, inn) => {
  const f = seg(m, 0, 0.3);
  put(q(out, 'page'), { o: 1 - f, t: `translateY(${u(16 * f)})` });
  put(q(out, 'url2'), { o: 1 - f });
  put(q(out, 'prop'), { o: 1 - f });
  put(q(out, 'browser'), { o: 1 - seg(m, 0.12, 0.34) });
  const c = ease(seg(m, 0.1, 0.5));
  const from = centerOf(B.peak);
  const to = centerOf(B.sneaker);
  put(q(out, 'peak'), {
    t: `translate(${u((to.x - from.x) * c)}, ${u((to.y - from.y) * c - 90 * Math.sin(Math.PI * c))}) scale(${(1 + 2.4 * Math.sin(Math.PI * c)).toFixed(3)})`,
    o: 1 - seg(m, 0.5, 0.54),
  });
  qa(out, 'row').forEach((el, i) => {
    const r = ease(seg(m, 0.16 + i * 0.04, 0.54 + i * 0.03));
    put(el, { t: boxTf(B.rows[i], B.fields[i], r), background: `rgba(255,255,255,${(0.04 + 0.96 * r).toFixed(3)})`, o: 1 - seg(m, 0.6, 0.66) });
    put(q(el, 'rowtext'), { o: 1 - seg(m, 0.1, 0.22) });
  });

  qa(inn, 'field').forEach((el) => put(el, { o: seg(m, 0.58, 0.66) }));
  const fieldsBox = { x: B.fields[0].x, y: B.fields[0].y, w: B.fields[0].w, h: B.fields[2].y + B.fields[2].h - B.fields[0].y };
  const e = ease(seg(m, 0.56, 0.8));
  put(q(inn, 'checkout'), { t: boxTf(B.checkout, fieldsBox, 1 - e), o: seg(m, 0.56, 0.6) });
  put(q(inn, 'cotop'), { o: seg(m, 0.74, 0.88) });
  put(q(inn, 'cobottom'), { o: seg(m, 0.76, 0.9) });
  const p = easeOut(seg(m, 0.4, 0.62));
  put(q(inn, 'product'), { o: seg(m, 0.4, 0.52), t: `translateY(${u(22 * (1 - p))})` });
  put(q(inn, 'pdetail'), { o: seg(m, 0.68, 0.86) });
  const s = easeOutBack(seg(m, 0.5, 0.7));
  put(q(inn, 'sneaker'), { o: seg(m, 0.5, 0.53), t: `scale(${(0.15 + 0.85 * s).toFixed(3)})` });
  const fl = seg(m, 0.5, 0.68);
  put(q(inn, 'flash'), { o: fl > 0 && fl < 1 ? 1 - fl : 0, t: `scale(${(0.4 + 2.2 * easeOut(fl)).toFixed(3)})` });
};

/** 03 → 04: bota odjede na místo značky, otočí se hranou (neon) a z druhé strany je logo NORDA. */
const shopToDesign: Morph = (m, out, inn) => {
  const f = easeIn(seg(m, 0, 0.3));
  put(q(out, 'checkout'), { o: 1 - f, t: `translateX(${u(70 * f)})` });
  qa(out, 'field').forEach((el) => put(el, { o: 1 - f, t: `translateX(${u(70 * f)})` }));
  put(q(out, 'pdetail'), { o: 1 - seg(m, 0, 0.16) });
  put(q(out, 'product'), { o: 1 - seg(m, 0.06, 0.3) });
  put(q(out, 'flash'), { o: 0 });
  const g = ease(seg(m, 0.08, 0.36));
  const from = centerOf(B.sneaker);
  const to = centerOf(B.mark);
  const flip = easeIn(seg(m, 0.34, 0.46));
  put(q(out, 'sneaker'), {
    t: `translate(${u((to.x - from.x) * g)}, ${u((to.y - from.y) * g)}) perspective(${u(600)}) rotateY(${(90 * flip).toFixed(2)}deg) scale(${lerp(1, 0.8, g).toFixed(3)})`,
    o: m >= 0.46 ? 0 : 1,
  });

  const edge = seg(m, 0.4, 0.54);
  put(q(inn, 'edge'), { o: Math.sin(Math.PI * edge), t: `scaleY(${(0.4 + 0.6 * Math.sin(Math.PI * edge)).toFixed(3)})` });
  put(q(inn, 'board'), { o: seg(m, 0.3, 0.5) });
  const back = easeOut(seg(m, 0.46, 0.6));
  put(q(inn, 'mark'), { o: m >= 0.46 ? 1 : 0, t: `perspective(${u(600)}) rotateY(${(-90 * (1 - back)).toFixed(2)}deg)` });
  qa(inn, 'gline').forEach((el, i) => put(el, { strokeDashoffset: (1 - ease(seg(m, 0.55 + i * 0.03, 0.8 + i * 0.02))).toFixed(4) }));
  const w = easeOut(seg(m, 0.62, 0.78));
  put(q(inn, 'wordmark'), { o: w, t: `translateX(${u(-18 * (1 - w))})` });
  qa(inn, 'swatch').forEach((el, i) => {
    const t = easeOutBack(seg(m, 0.7 + i * 0.04, 0.84 + i * 0.03));
    put(el, { o: seg(m, 0.7 + i * 0.04, 0.74 + i * 0.04), t: `scale(${(0.5 + 0.5 * t).toFixed(3)})` });
  });
  put(q(inn, 'type'), { o: seg(m, 0.8, 0.92) });
};

/** 04 → 05: logo se zmenší do ikony aplikace, pod ním vyroste ikona, přijede telefon a odznaky obchodů. */
const designToApp: Morph = (m, out, inn) => {
  qa(out, 'gline').forEach((el) => put(el, { strokeDashoffset: seg(m, 0, 0.24).toFixed(4) }));
  put(q(out, 'wordmark'), { o: 1 - seg(m, 0, 0.2), t: `translateX(${u(24 * seg(m, 0, 0.2))})` });
  qa(out, 'swatch').forEach((el, i) => {
    const f = easeIn(seg(m, 0.02 + i * 0.03, 0.24 + i * 0.03));
    put(el, { o: 1 - f, t: `translate(${u((40 + i * 24) * f)}, ${u(-36 * f)}) rotate(${(20 * f * (i % 2 ? 1 : -1)).toFixed(1)}deg)` });
  });
  put(q(out, 'type'), { o: 1 - seg(m, 0, 0.18) });
  put(q(out, 'board'), { o: 1 - seg(m, 0.16, 0.4) });
  put(q(out, 'edge'), { o: 0 });
  const iconMark = { x: B.icon.x + B.icon.w * 0.21, y: B.icon.y + B.icon.h * 0.21, w: B.icon.w * 0.58, h: B.icon.h * 0.58 };
  const h = ease(seg(m, 0.14, 0.48));
  put(q(out, 'mark'), { t: boxTf(B.mark, iconMark, h, true), o: 1 - seg(m, 0.56, 0.6) });

  const k = easeOutBack(seg(m, 0.36, 0.58));
  put(q(inn, 'icon'), { o: seg(m, 0.36, 0.42), t: `scale(${(0.25 + 0.75 * k).toFixed(3)})` });
  put(q(inn, 'iconmark'), { o: seg(m, 0.55, 0.6) });
  const a = easeOut(seg(m, 0.55, 0.72));
  put(q(inn, 'appinfo'), { o: a, t: `translateY(${u(14 * (1 - a))})` });
  qa(inn, 'badge').forEach((el, i) => {
    const t = easeOut(seg(m, 0.62 + i * 0.06, 0.8 + i * 0.06));
    put(el, { o: t, t: `translateY(${u(22 * (1 - t))})` });
  });
  const ph = easeOut(seg(m, 0.5, 0.86));
  put(q(inn, 'phone'), { o: seg(m, 0.5, 0.58), t: `translateX(${u(90 * (1 - ph))}) rotate(${(5 * (1 - ph)).toFixed(2)}deg)` });
};

const MORPHS: Morph[] = [webToSeo, seoToShop, shopToDesign, designToApp];

/* ------------------------------------------------------------------ */
/*  Deck                                                               */
/* ------------------------------------------------------------------ */

/**
 * Služby v jednom panelu: text se mění po skupinách (odjede nahoru / přijede
 * zespodu), vizuál se mezi každou dvojicí služeb promění vlastním morfem.
 * Vše je funkce scroll progressu a zapisuje se přímo do DOM — React se
 * překreslí jen při změně aktivní služby.
 */
export function ServiceDeck() {
  const reduced = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const texts = useRef<(HTMLDivElement | null)[]>([]);
  const visuals = useRef<(HTMLDivElement | null)[]>([]);
  const progressRef = useRef<HTMLSpanElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const steady = useRef('');

  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });

  const apply = useCallback((p: number) => {
    const { idx, m, local } = deckState(p);
    if (progressRef.current) progressRef.current.style.height = `${(((idx + local) / COUNT) * 100).toFixed(2)}%`;
    if (idx !== indexRef.current) {
      indexRef.current = idx;
      setIndex(idx);
    }

    visuals.current.forEach((el, i) => {
      if (!el) return;
      el.style.visibility = i === idx || (m > 0 && i === idx + 1) ? '' : 'hidden';
      // během morfu je odcházející vizuál nahoře — jeho letící prvek (adresa, bod grafu,
      // bota, logo) musí zůstat vidět nad přicházejícím; velké plochy odcházejícího mizí dřív
      el.style.zIndex = i === idx ? '2' : '1';
    });

    // „nádech" celé scény při morfu: lehký 3D náklon, odlesk přes scénu, neonový rám
    const pulse = Math.sin(Math.PI * m);
    const dir = idx % 2 === 0 ? 1 : -1;
    if (stageRef.current) stageRef.current.style.transform = m > 0 ? `perspective(1400px) rotateY(${(dir * -7 * pulse).toFixed(2)}deg) rotateX(${(3 * pulse).toFixed(2)}deg) scale(${(1 - 0.035 * pulse).toFixed(4)})` : '';
    const g = seg(m, 0.3, 0.75);
    if (glareRef.current) {
      glareRef.current.style.opacity = g > 0 && g < 1 ? Math.sin(Math.PI * g).toFixed(3) : '0';
      glareRef.current.style.transform = `translateX(${(-60 + 220 * g).toFixed(1)}%) skewX(-18deg)`;
    }
    if (frameRef.current) frameRef.current.style.opacity = (0.9 * pulse).toFixed(3);

    if (m <= 0) {
      // klid: vizuály v původním stavu (jen jednou, ne každý frame)
      const key = `rest-${idx}`;
      if (steady.current !== key) {
        steady.current = key;
        visuals.current.forEach((el) => el && rest(el));
      }
    } else {
      steady.current = '';
      const out = visuals.current[idx];
      const inn = visuals.current[idx + 1];
      if (out && inn) MORPHS[idx]?.(m, out, inn);
    }

    // text: odcházející skupiny vyjedou nahoru, přicházející zespodu (po skupinách)
    texts.current.forEach((el, i) => {
      if (!el) return;
      const shown = i === idx || (m > 0 && i === idx + 1);
      el.style.visibility = shown ? '' : 'hidden';
      el.style.pointerEvents = i === idx && m < 0.3 ? '' : 'none';
      el.querySelectorAll<HTMLElement>('[data-t]').forEach((g, k) => {
        let y = 0;
        let a = 1;
        if (i === idx && m > 0) {
          const t = easeIn(seg(m, k * 0.04, 0.34 + k * 0.04));
          y = -28 * t;
          a = 1 - t;
        } else if (i === idx + 1 && m > 0) {
          const t = easeOut(seg(m, 0.4 + k * 0.05, 0.72 + k * 0.04));
          y = 28 * (1 - t);
          a = t;
        }
        g.style.transform = y ? `translate3d(0, ${y.toFixed(1)}px, 0)` : '';
        g.style.opacity = a < 1 ? a.toFixed(3) : '';
      });
    });
  }, []);

  useMotionValueEvent(scrollYProgress, 'change', apply);
  useEffect(() => {
    if (reduced) return;
    const id = window.setTimeout(() => apply(scrollYProgress.get()), 60);
    return () => window.clearTimeout(id);
  }, [apply, reduced, scrollYProgress]);

  const goTo = (target: number) => {
    const node = section.current;
    if (!node) return;
    // střed čtecího okna cílové služby
    const range = node.offsetHeight - window.innerHeight;
    const top = node.offsetTop + (range * (target * (DWELL_VH + MORPH_VH) + DWELL_VH * 0.5)) / TOTAL_VH;
    window.__lenis ? window.__lenis.scrollTo(top, { duration: 1.1 }) : window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <section
      id="detaily"
      ref={section}
      // výška pinu jen na desktopu — mobil má panely pod sebou v běžném toku
      className={reduced ? 'relative' : 'relative md:h-[var(--pin-h)]'}
      style={reduced ? undefined : ({ '--pin-h': `${TOTAL_VH + 100}vh` } as React.CSSProperties)}
      aria-label="Detaily služeb"
    >
      {/* ---- reduced-motion: panely pod sebou; MOBIL: vlastní svislá scéna ---- */}
      {reduced ? (
        <div className="shell space-y-6 py-16">
          {services.map((service, i) => (
            <div key={service.slug} data-nav-id={`sluzba-${service.slug}`} className="glass overflow-hidden rounded-card">
              <CardBody index={i} />
            </div>
          ))}
        </div>
      ) : (
        <MobileDeck />
      )}

      {/* kotvy služeb pro navigaci (patička): střed čtecího okna dané služby ve scéně */}
      {!reduced
        ? services.map((service, i) => (
            <span
              key={service.slug}
              id={`sluzba-${service.slug}`}
              aria-hidden
              className="pointer-events-none absolute left-0 hidden h-px w-px md:block"
              style={{ top: `${i * (DWELL_VH + MORPH_VH) + DWELL_VH * 0.5}vh` }}
            />
          ))
        : null}

      {/* ---- DESKTOP: jeden panel, služby se v něm mění morfy ---- */}
      {!reduced ? (
        <div className="sticky top-0 hidden h-dvh items-center overflow-hidden md:flex">
          <div className="absolute left-5 top-1/2 z-30 hidden -translate-y-1/2 lg:block">
            <div className="relative flex flex-col items-center gap-5">
              <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[var(--line)]" />
              <span ref={progressRef} className="absolute left-1/2 top-0 w-px -translate-x-1/2 bg-gradient-to-b from-[var(--blue-bright)] to-[var(--blue)] shadow-glow" />
              {services.map((service, i) => (
                <button key={service.slug} type="button" onClick={() => goTo(i)} className="relative z-10 grid place-items-center" aria-label={service.num} aria-current={i === index}>
                  <span
                    className={`grid place-items-center rounded-full border font-display transition-all duration-300 ${
                      i === index ? 'h-11 w-11 border-[var(--blue-bright)] bg-[rgba(31,91,255,0.18)] text-xs text-[var(--blue-bright)]' : 'h-8 w-8 border-[var(--line)] bg-[var(--bg)] text-[10px] text-muted'
                    }`}
                  >
                    {service.num}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="relative mx-auto h-[min(76vh,620px)] w-full max-w-[1180px] px-6 lg:pl-28 lg:pr-8">
            <article data-deck-role="current" className="glass absolute inset-0 overflow-hidden rounded-[28px] border border-[rgba(80,120,255,0.28)]">
              <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[3px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(61,123,255,0.8), transparent)' }} />
              <div className={GRID}>
                <div className="order-2 grid md:order-1">
                  {services.map((service, i) => (
                    <div
                      key={service.slug}
                      ref={(el) => {
                        texts.current[i] = el;
                      }}
                      className="[grid-area:1/1]"
                      style={{ visibility: i === 0 ? undefined : 'hidden' }}
                      aria-hidden={i !== index}
                    >
                      <ServiceText index={i} />
                    </div>
                  ))}
                </div>
                <div ref={stageRef} className="relative order-1 min-w-0 will-change-transform md:order-2">
                  <div
                    ref={frameRef}
                    aria-hidden
                    className="pointer-events-none absolute -inset-2 rounded-[22px] border border-[var(--blue-bright)] opacity-0"
                    style={{ boxShadow: '0 0 28px rgba(61,123,255,0.7), inset 0 0 22px rgba(61,123,255,0.35)' }}
                  />
                  <NordaStage className="overflow-hidden rounded-[16px]">
                    <div
                      ref={glareRef}
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 left-0 z-10 w-1/3 opacity-0"
                      style={{ background: 'linear-gradient(90deg, transparent, rgba(190,215,255,0.22), transparent)' }}
                    />
                    {services.map((service, i) => {
                      const Visual = NORDA_VISUALS[service.slug];
                      return (
                        <div
                          key={service.slug}
                          ref={(el) => {
                            visuals.current[i] = el;
                          }}
                          className="absolute inset-0"
                          style={{ visibility: i === 0 ? undefined : 'hidden' }}
                        >
                          <Visual />
                        </div>
                      );
                    })}
                  </NordaStage>
                </div>
              </div>
            </article>
          </div>
        </div>
      ) : null}
    </section>
  );
}

/**
 * Mobil: pět panelů NORDA pod sebou — žádný sticky stoh (panely delší než
 * okno se dřív překrývaly). Vizuál při vjezdu do okna vyjede z náklonu a
 * odkryje se, přes displej přejede neonový odlesk, text naskočí po skupinách.
 * Vše je funkce polohy v okně, takže to funguje oběma směry.
 */
function MobileDeck() {
  const root = useRef<HTMLDivElement>(null);

  useScrollFrame(() => {
    const el = root.current;
    if (!el || !el.offsetHeight) return;
    el.querySelectorAll<HTMLElement>('[data-mpanel]').forEach((panel) => {
      const vis = panel.querySelector<HTMLElement>('[data-mvis]');
      if (vis) {
        const v = viewProgress(vis, 1.02, 0.42);
        const e = easeOut(v);
        vis.style.opacity = seg(v, 0, 0.3).toFixed(3);
        vis.style.transform = `perspective(900px) rotateX(${((1 - e) * 16).toFixed(2)}deg) scale(${(0.9 + 0.1 * e).toFixed(4)})`;
        const inset = 1 - e;
        vis.style.clipPath = e >= 0.999 ? '' : `inset(${(inset * 12).toFixed(2)}% ${(inset * 7).toFixed(2)}% 0% ${(inset * 7).toFixed(2)}% round 22px)`;
        const glare = panel.querySelector<HTMLElement>('[data-mglare]');
        if (glare) {
          const g = seg(v, 0.5, 1);
          glare.style.opacity = g > 0 && g < 1 ? Math.sin(Math.PI * g).toFixed(3) : '0';
          glare.style.transform = `translateX(${(-60 + 260 * g).toFixed(1)}%) skewX(-18deg)`;
        }
      }
      panel.querySelectorAll<HTMLElement>('[data-t]').forEach((node) => {
        const t = easeOut(viewProgress(node, 0.98, 0.78));
        node.style.opacity = t.toFixed(3);
        node.style.transform = t >= 0.999 ? '' : `translate3d(0, ${((1 - t) * 22).toFixed(1)}px, 0)`;
      });
    });
  });

  return (
    <div ref={root} className="pb-4 pt-6 md:hidden">
      {services.map((service, i) => {
        const Visual = NORDA_VISUALS[service.slug];
        return (
          <article key={service.slug} id={`panel-${service.slug}`} data-nav-id={`sluzba-${service.slug}`} data-nav-offset={-10} data-mpanel className="shell relative pb-16">
            <div
              data-mvis
              className="relative overflow-hidden rounded-[22px] border border-[rgba(80,120,255,0.28)] bg-[rgba(8,12,26,0.92)] shadow-[0_30px_70px_-30px_rgba(31,91,255,0.55)]"
              style={{ opacity: 0 }}
            >
              <NordaStage>
                <Visual />
              </NordaStage>
              <span
                data-mglare
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-1/2 opacity-0"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(160,200,255,0.22), transparent)' }}
              />
              <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(61,123,255,0.9), transparent)' }} />
            </div>
            <div className="mt-7">
              <ServiceText index={i} />
            </div>
          </article>
        );
      })}
    </div>
  );
}
