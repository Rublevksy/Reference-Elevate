'use client';

import { useTranslations } from 'next-intl';
import type { ComponentType, CSSProperties, ReactNode } from 'react';
import type { ServiceSlug } from '@/content/services';

/**
 * Vizuály pěti služeb jako jeden příběh fiktivní značky NORDA (běžecké boty):
 * web → Search Console → e-shop s pokladnou → logo → aplikace.
 *
 * Všechno leží na společné „scéně" 560 × 420 návrhových jednotek. Scéna je
 * CSS container, jednotky se převádějí na `cqw`, takže se celý vizuál
 * škáluje s panelem a morfy mezi službami (ServiceDeck) počítají v jedněch
 * souřadnicích bez měření DOM. Prvky, se kterými morfy hýbou, nesou `data-m`.
 */

export const STAGE_W = 560;
export const STAGE_H = 420;
/** návrhové jednotky → délka škálovaná se scénou */
export const d = (n: number) => `${((n / STAGE_W) * 100).toFixed(3)}cqw`;

type Box = { x: number; y: number; w: number; h: number };
const at = (b: Box, extra?: CSSProperties): CSSProperties => ({ position: 'absolute', left: d(b.x), top: d(b.y), width: d(b.w), height: d(b.h), ...extra });

const SNEAKER = '/norda/sneaker.webp';
const SNEAKER_RATIO = 602 / 1200;

/** Klíčové polohy, na které navazují morfy (návrhové jednotky scény). */
export const NORDA_BOXES = {
  browser: { x: 20, y: 18, w: 520, h: 384 },
  page: { x: 21, y: 48, w: 518, h: 353 },
  url: { x: 190, y: 25, w: 180, h: 18 },
  prop: { x: 151, y: 58, w: 200, h: 24 },
  rows: [
    { x: 41, y: 316, w: 478, h: 22 },
    { x: 41, y: 340, w: 478, h: 22 },
    { x: 41, y: 364, w: 478, h: 22 },
  ],
  peak: { x: 505, y: 180, w: 12, h: 12 },
  product: { x: 20, y: 18, w: 250, h: 384 },
  sneaker: { x: 30, y: 62, w: 232, h: 232 * SNEAKER_RATIO },
  checkout: { x: 282, y: 18, w: 258, h: 384 },
  fields: [
    { x: 296, y: 126, w: 230, h: 26 },
    { x: 296, y: 158, w: 230, h: 26 },
    { x: 296, y: 190, w: 230, h: 26 },
  ],
  board: { x: 20, y: 18, w: 520, h: 384 },
  mark: { x: 90, y: 110, w: 140, h: 140 },
  icon: { x: 56, y: 64, w: 116, h: 116 },
  phone: { x: 330, y: 16, w: 186, h: 388 },
} as const;

/** Značka NORDA: „N", jehož poslední tah vybíhá nahoru v šipku — běž dál. */
export function NordaMark({ className = '', color = '#F3F5FA', accent = '#3D7BFF', stroke = 13, style, dataM }: { className?: string; color?: string; accent?: string; stroke?: number; style?: CSSProperties; dataM?: string }) {
  return (
    <svg data-m={dataM} viewBox="0 0 100 100" className={className} style={style} aria-hidden fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 84 V24 L60 76 V40" stroke={color} strokeWidth={stroke} />
      <path d="M60 40 L82 16" stroke={accent} strokeWidth={stroke} />
      <path d="M68 14 H84 V30" stroke={accent} strokeWidth={stroke * 0.8} />
    </svg>
  );
}

function Lock({ size = 7 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" style={{ width: d(size), height: d(size) }} aria-hidden>
      <rect x="3" y="7" width="10" height="8" rx="2" fill="currentColor" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.8" fill="none" />
    </svg>
  );
}

/** Prohlížeč (rám + lišta) — stejná geometrie pro web i Search Console, aby na sebe morf navázal. */
function BrowserChrome({ m }: { m: string }) {
  return (
    <div data-m={m} style={at(NORDA_BOXES.browser, { borderRadius: d(14), background: '#0b1226', border: '1px solid rgba(120,150,255,0.22)', boxShadow: '0 30px 80px -30px rgba(0,0,0,0.9)' })}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: d(30), borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)', borderRadius: `${d(14)} ${d(14)} 0 0` }}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => (
          <span key={c} style={{ position: 'absolute', left: d(14 + i * 12), top: d(11), width: d(8), height: d(8), borderRadius: '50%', background: c, opacity: 0.85 }} />
        ))}
      </div>
    </div>
  );
}

function UrlPill({ m, children, box = NORDA_BOXES.url, style }: { m: string; children: ReactNode; box?: Box; style?: CSSProperties }) {
  return (
    <div
      data-m={m}
      style={at(box, {
        borderRadius: 999,
        background: 'rgba(255,255,255,0.07)',
        color: 'rgba(220,230,255,0.85)',
        fontSize: d(8.5),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: d(4),
        whiteSpace: 'nowrap',
        ...style,
      })}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  01 — Web                                                           */
/* ------------------------------------------------------------------ */

export function WebVisual() {
  const t = useTranslations('norda.web');
  const nav = t.raw('nav') as string[];
  const headline = t.raw('headline') as string[];
  const P = NORDA_BOXES.page;
  const products = [
    { name: 'Aero Run', price: '3 290 Kč', hue: 0 },
    { name: 'Trail X', price: '3 690 Kč', hue: 150 },
    { name: 'City Knit', price: '2 790 Kč', hue: 300 },
  ];
  return (
    <>
      <BrowserChrome m="browser" />
      <div data-m="page" style={at(P, { overflow: 'hidden', borderRadius: `0 0 ${d(13)} ${d(13)}`, background: 'linear-gradient(170deg,#0e1834,#070b18 70%)', color: '#eef2ff' })}>
        {/* navigace */}
        <div style={{ position: 'absolute', left: d(20), top: d(14), display: 'flex', alignItems: 'center', gap: d(6) }}>
          <NordaMark style={{ width: d(16), height: d(16) }} stroke={16} />
          <span style={{ fontSize: d(11), fontWeight: 800, letterSpacing: '0.2em' }}>NORDA</span>
        </div>
        <div style={{ position: 'absolute', left: d(176), top: d(18), display: 'flex', gap: d(16), fontSize: d(8.5), color: 'rgba(220,228,255,0.6)' }}>
          {nav.map((n) => <span key={n}>{n}</span>)}
        </div>
        <span style={{ position: 'absolute', left: d(408), top: d(13), width: d(90), height: d(20), borderRadius: 999, background: '#1f5bff', fontSize: d(8), fontWeight: 700, display: 'grid', placeItems: 'center' }}>{t('shop')}</span>
        {/* hero */}
        <div style={{ position: 'absolute', left: d(20), top: d(60), width: d(240) }}>
          <div style={{ fontSize: d(7.5), letterSpacing: '0.22em', textTransform: 'uppercase', color: '#6f9bff', fontWeight: 700 }}>{t('eyebrow')}</div>
          <div className="font-display" style={{ marginTop: d(6), fontSize: d(25), lineHeight: 1.02, fontWeight: 800, textTransform: 'uppercase' }}>
            {headline[0]}
            <br />
            <span style={{ color: '#5b8cff' }}>{headline[1]}</span>
          </div>
          <div style={{ marginTop: d(8), fontSize: d(9), color: 'rgba(220,228,255,0.6)' }}>{t('sub')}</div>
          <div style={{ marginTop: d(12), display: 'flex', gap: d(6) }}>
            <span style={{ padding: `${d(6)} ${d(12)}`, borderRadius: d(8), background: '#1f5bff', fontSize: d(8.5), fontWeight: 700 }}>{t('cta')}</span>
            <span style={{ padding: `${d(6)} ${d(12)}`, borderRadius: d(8), border: '1px solid rgba(160,185,255,0.35)', fontSize: d(8.5) }}>{t('cta2')}</span>
          </div>
        </div>
        <div style={{ position: 'absolute', left: d(262), top: d(44), width: d(240), height: d(170), borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(31,91,255,0.45), transparent)' }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SNEAKER} alt="" style={{ position: 'absolute', left: d(252), top: d(62), width: d(250), transform: 'rotate(-8deg)', filter: 'drop-shadow(0 18px 18px rgba(0,0,0,0.55))' }} />
        <span style={{ position: 'absolute', left: d(418), top: d(170), padding: `${d(4)} ${d(9)}`, borderRadius: 999, background: '#f3f5fa', color: '#0b1024', fontSize: d(9), fontWeight: 800 }}>{t('price')}</span>
        {/* produkty */}
        {products.map((p, i) => (
          <div key={p.name} style={{ position: 'absolute', left: d(20 + i * 166), top: d(232), width: d(154), height: d(106), borderRadius: d(10), background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={SNEAKER} alt="" style={{ position: 'absolute', left: d(22), top: d(8), width: d(110), filter: `hue-rotate(${p.hue}deg) saturate(${p.hue ? 0.8 : 1})` }} />
            <div style={{ position: 'absolute', left: d(10), bottom: d(8), fontSize: d(8.5), fontWeight: 700 }}>{p.name}</div>
            <div style={{ position: 'absolute', right: d(10), bottom: d(8), fontSize: d(8), color: 'rgba(220,228,255,0.6)' }}>{p.price}</div>
          </div>
        ))}
      </div>
      <UrlPill m="url">
        <Lock />
        <span data-m="www" style={{ display: 'inline-block', overflow: 'hidden', maxWidth: 0, color: '#8fb2ff', fontWeight: 700 }}>www.</span>
        <span>norda.cz</span>
      </UrlPill>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  02 — SEO (Search Console)                                          */
/* ------------------------------------------------------------------ */

const SC_COLORS = ['#4285f4', '#7e57c2', '#00897b', '#e8710a'];
const CLICKS = 'M0 104 C 40 100, 70 96, 100 92 S 160 84, 190 78 S 250 66, 280 60 S 340 46, 370 40 S 430 30, 470 22';
const IMPR = 'M0 110 C 40 108, 80 104, 120 100 S 180 90, 220 86 S 290 74, 320 70 S 390 58, 420 54 S 450 50, 470 46';

export function SeoVisual() {
  const t = useTranslations('norda.seo');
  const tiles = t.raw('tiles') as [string, string][];
  const months = t.raw('months') as string[];
  const head = t.raw('head') as string[];
  const rows = t.raw('rows') as [string, string, string][];
  const P = NORDA_BOXES.page;
  return (
    <>
      <BrowserChrome m="browser" />
      <UrlPill m="url2">
        <Lock />
        search.google.com/search-console
      </UrlPill>
      <div data-m="page" style={at(P, { overflow: 'hidden', borderRadius: `0 0 ${d(13)} ${d(13)}`, background: '#0c1428', color: '#e8eefc' })}>
        <div style={{ position: 'absolute', left: d(18), top: d(12), display: 'flex', alignItems: 'center', gap: d(6), fontSize: d(11), fontWeight: 600 }}>
          <svg viewBox="0 0 24 24" style={{ width: d(16), height: d(16) }} aria-hidden>
            <circle cx="10" cy="10" r="6.5" stroke="#8ab4f8" strokeWidth="2.4" fill="none" />
            <path d="M15 15l5 5" stroke="#8ab4f8" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M7 11.5l2-2.5 2 1.5 2.5-3.5" stroke="#81c995" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          </svg>
          Search Console
        </div>
        <div style={{ position: 'absolute', left: d(18), top: d(40), fontSize: d(8), color: 'rgba(200,210,240,0.6)' }}>{t('chart')}</div>
        {tiles.map(([label, value], i) => (
          <div key={label} data-m="tile" style={{ position: 'absolute', left: d(18 + i * 122), top: d(54), width: d(114), height: d(52), borderRadius: d(8), background: SC_COLORS[i], padding: `${d(7)} ${d(9)}`, color: '#fff' }}>
            <div style={{ fontSize: d(7), opacity: 0.9 }}>{label}</div>
            <div style={{ marginTop: d(4), fontSize: d(15), fontWeight: 700 }}>{value}</div>
          </div>
        ))}
        <svg data-m="chart" viewBox="0 0 478 128" preserveAspectRatio="none" style={{ position: 'absolute', left: d(20), top: d(116), width: d(478), height: d(128), overflow: 'visible' }} aria-hidden>
          {[0, 1, 2, 3].map((g) => (
            <line key={g} x1="0" x2="478" y1={16 + g * 30} y2={16 + g * 30} stroke="rgba(255,255,255,0.06)" />
          ))}
          <path data-m="impr" d={IMPR} pathLength={1} stroke="#7e57c2" strokeWidth="2.2" fill="none" strokeDasharray="1 1" />
          <path data-m="clicks" d={CLICKS} pathLength={1} stroke="#4285f4" strokeWidth="2.6" fill="none" strokeDasharray="1 1" />
          {months.map((m, i) => (
            <text key={m} x={10 + i * 90} y="127" fill="rgba(200,210,240,0.45)" fontSize="9">{m}</text>
          ))}
        </svg>
        <div style={{ position: 'absolute', left: d(20), top: d(252), right: d(20), display: 'flex', fontSize: d(7), textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(200,210,240,0.5)' }}>
          <span style={{ flex: 1 }}>{head[0]}</span>
          <span style={{ width: d(80), textAlign: 'right' }}>{head[1]}</span>
          <span style={{ width: d(60), textAlign: 'right' }}>{head[2]}</span>
        </div>
      </div>
      {/* řádky tabulky leží na scéně — při přechodu do e-shopu se z nich stanou pole pokladny */}
      {rows.map(([q, clicks, pos], i) => (
        <div key={q} data-m="row" style={at(NORDA_BOXES.rows[i], { borderRadius: d(5), background: 'rgba(255,255,255,0.04)', borderTop: '1px solid rgba(255,255,255,0.05)' })}>
          <div data-m="rowtext" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: `0 ${d(8)}`, fontSize: d(8.5), color: '#e8eefc' }}>
            <span style={{ flex: 1 }}>{q}</span>
            <span style={{ width: d(80), textAlign: 'right', color: '#8ab4f8' }}>{clicks}</span>
            <span style={{ width: d(60), textAlign: 'right' }}>{pos}</span>
          </div>
        </div>
      ))}
      <span data-m="peak" style={at(NORDA_BOXES.peak, { borderRadius: '50%', background: '#cfe0ff', boxShadow: '0 0 12px 4px rgba(66,133,244,0.9)' })} />
      <UrlPill m="prop" box={NORDA_BOXES.prop} style={{ background: 'rgba(138,180,248,0.14)', border: '1px solid rgba(138,180,248,0.4)', color: '#e8eefc', fontSize: d(9) }}>
        <svg viewBox="0 0 16 16" style={{ width: d(9), height: d(9) }} aria-hidden>
          <circle cx="8" cy="8" r="6.5" stroke="#8ab4f8" strokeWidth="1.4" fill="none" />
          <path d="M1.5 8h13M8 1.5c2.2 2 2.2 11 0 13M8 1.5c-2.2 2-2.2 11 0 13" stroke="#8ab4f8" strokeWidth="1.1" fill="none" />
        </svg>
        {t('property')}
      </UrlPill>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  03 — E-shop: produkt + pokladna                                    */
/* ------------------------------------------------------------------ */

export function ShopVisual() {
  const t = useTranslations('norda.shop');
  const crumbs = t.raw('crumbs') as string[];
  const F = NORDA_BOXES.fields;
  const input: CSSProperties = { borderRadius: d(6), background: '#fff', border: '1px solid #d5dbe7', color: '#1b2133', fontSize: d(8.5), display: 'flex', alignItems: 'center', padding: `0 ${d(9)}` };
  return (
    <>
      {/* produkt */}
      <div data-m="product" style={at(NORDA_BOXES.product, { borderRadius: d(16), background: 'linear-gradient(165deg,#eef2fa,#cdd6e8)', overflow: 'hidden', color: '#0b1024' })}>
        <div style={{ position: 'absolute', left: d(18), top: d(16), fontSize: d(7.5), letterSpacing: '0.2em', fontWeight: 800, color: '#1f5bff' }}>NORDA</div>
        <div style={{ position: 'absolute', left: '50%', top: d(170), width: d(170), height: d(16), marginLeft: d(-85), borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(11,16,36,0.35), transparent)' }} />
        <div data-m="pdetail" style={{ position: 'absolute', left: d(18), right: d(18), top: d(196) }}>
          <div className="font-display" style={{ fontSize: d(17), fontWeight: 800 }}>Aero Run</div>
          <div style={{ marginTop: d(3), fontSize: d(7.5), color: '#56607a' }}>
            <span style={{ color: '#f5a623' }}>★★★★★</span> {t('rating')}
          </div>
          <div style={{ marginTop: d(8), fontSize: d(16), fontWeight: 800 }}>3 290 Kč</div>
          <div style={{ marginTop: d(10), fontSize: d(7), textTransform: 'uppercase', letterSpacing: '0.12em', color: '#56607a' }}>{t('size')}</div>
          <div style={{ marginTop: d(5), display: 'flex', gap: d(5) }}>
            {['41', '42', '43', '44'].map((s) => (
              <span key={s} style={{ width: d(32), height: d(24), borderRadius: d(6), display: 'grid', placeItems: 'center', fontSize: d(8.5), fontWeight: 700, background: s === '42' ? '#0b1024' : '#fff', color: s === '42' ? '#fff' : '#0b1024', border: '1px solid #c3cbdc' }}>{s}</span>
            ))}
          </div>
          <div style={{ marginTop: d(10), display: 'flex', gap: d(6) }}>
            {['#f3f5fa', '#0b1024', '#3b8f6a'].map((c, i) => (
              <span key={c} style={{ width: d(14), height: d(14), borderRadius: '50%', background: c, border: '1px solid #aab4c8', boxShadow: i === 0 ? '0 0 0 2px #1f5bff' : undefined }} />
            ))}
          </div>
        </div>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img data-m="sneaker" src={SNEAKER} alt="" style={at(NORDA_BOXES.sneaker, { transform: 'rotate(-6deg)', filter: 'drop-shadow(0 16px 14px rgba(11,16,36,0.35))' })} />
      <span data-m="flash" style={at({ x: 106, y: 88, w: 80, h: 80 }, { borderRadius: '50%', border: '2px solid #5b8cff', opacity: 0 })} />
      {/* pokladna */}
      <div data-m="checkout" style={at(NORDA_BOXES.checkout, { borderRadius: d(16), background: '#fff', color: '#1b2133', overflow: 'hidden' })}>
        <div data-m="cotop" style={{ position: 'absolute', left: d(14), right: d(14), top: d(14) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: d(5) }}>
            <NordaMark style={{ width: d(13), height: d(13) }} color="#0b1024" accent="#1f5bff" stroke={16} />
            <span style={{ fontSize: d(12), fontWeight: 800 }}>{t('checkout')}</span>
          </div>
          <div style={{ marginTop: d(4), fontSize: d(7), color: '#6b7489' }}>
            {crumbs.map((c, i) => (
              <span key={c} style={{ fontWeight: i === 2 ? 700 : 400, color: i === 2 ? '#1b2133' : undefined }}>
                {c}
                {i < crumbs.length - 1 ? ' › ' : ''}
              </span>
            ))}
          </div>
          <div style={{ marginTop: d(9), height: d(26), borderRadius: d(6), background: '#5a31f4', color: '#fff', fontSize: d(9), fontWeight: 700, display: 'grid', placeItems: 'center' }}>{t('express')}</div>
          <div style={{ marginTop: d(6), textAlign: 'center', fontSize: d(7), color: '#8a93a8' }}>{t('or')}</div>
        </div>
        <div data-m="cobottom" style={{ position: 'absolute', left: d(14), right: d(14), top: d(210) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: d(8), fontSize: d(8.5) }}>
            <span style={{ width: d(34), height: d(26), borderRadius: d(6), background: '#e8edf6', position: 'relative', overflow: 'hidden' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SNEAKER} alt="" style={{ position: 'absolute', left: d(1), top: d(6), width: d(32) }} />
            </span>
            <span style={{ flex: 1 }}>Aero Run × 1</span>
            <span style={{ fontWeight: 700 }}>3 290 Kč</span>
          </div>
          <div style={{ marginTop: d(8), display: 'flex', fontSize: d(8), color: '#6b7489' }}>
            <span style={{ flex: 1 }}>{t('shipping')}</span>
            <span>{t('free')}</span>
          </div>
          <div style={{ marginTop: d(7), paddingTop: d(7), borderTop: '1px solid #e3e7ef', display: 'flex', fontSize: d(10), fontWeight: 800 }}>
            <span style={{ flex: 1 }}>{t('total')}</span>
            <span>3 290 Kč</span>
          </div>
          <div style={{ marginTop: d(12), height: d(32), borderRadius: d(7), background: '#1f5bff', color: '#fff', fontSize: d(9.5), fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: d(5) }}>
            <Lock size={8} />
            {t('pay')}
          </div>
        </div>
      </div>
      {/* pole platby leží na scéně — vznikají z řádků tabulky Search Console */}
      <div data-m="field" style={at(F[0], input)}>
        <span style={{ flex: 1, letterSpacing: '0.06em' }}>{t('card')}</span>
        <span style={{ display: 'flex', gap: d(3) }}>
          <span style={{ width: d(16), height: d(11), borderRadius: d(2), background: 'linear-gradient(135deg,#1a1f71,#2d3fbf)' }} />
          <span style={{ width: d(16), height: d(11), borderRadius: d(2), background: 'linear-gradient(90deg,#eb001b 50%,#f79e1b 50%)' }} />
        </span>
      </div>
      <div data-m="field" style={at(F[1], { ...input, padding: 0 })}>
        <span style={{ flex: 1, padding: `0 ${d(9)}`, color: '#8a93a8' }}>{t('exp')}</span>
        <span style={{ width: 1, alignSelf: 'stretch', background: '#d5dbe7' }} />
        <span style={{ flex: 1, padding: `0 ${d(9)}`, color: '#8a93a8' }}>{t('cvc')}</span>
      </div>
      <div data-m="field" style={at(F[2], { ...input, color: '#8a93a8' })}>{t('name')}</div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  04 — Design: koncept loga                                          */
/* ------------------------------------------------------------------ */

const SWATCHES = [
  { name: 'Cobalt', hex: '#1F5BFF' },
  { name: 'Midnight', hex: '#0B1024' },
  { name: 'Chalk', hex: '#F3F5FA' },
  { name: 'Ice', hex: '#00C2FF' },
];

export function DesignVisual() {
  const t = useTranslations('norda.design');
  const M = NORDA_BOXES.mark;
  const cx = M.x + M.w / 2;
  const cy = M.y + M.h / 2;
  return (
    <>
      <div data-m="board" style={at(NORDA_BOXES.board, { borderRadius: d(16), background: 'linear-gradient(165deg,#0d1430,#070b18)', border: '1px solid rgba(120,150,255,0.18)' })}>
        <div style={{ position: 'absolute', left: d(18), top: d(14), fontSize: d(7), letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(200,210,240,0.5)' }}>NORDA — brand identity 2026</div>
        <div style={{ position: 'absolute', left: d(18), bottom: d(14), fontSize: d(7), letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(200,210,240,0.4)' }}>
          {t('logo')} · {t('grid')}
        </div>
      </div>
      {/* konstrukční mřížka značky */}
      <svg data-m="grid" viewBox="0 0 560 420" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }} aria-hidden>
        {[96, 70, 40].map((r) => (
          <circle key={r} data-m="gline" cx={cx} cy={cy} r={r} pathLength={1} fill="none" stroke="rgba(120,160,255,0.28)" strokeWidth="1" strokeDasharray="1 1" />
        ))}
        {[
          [cx - 110, cy, cx + 110, cy],
          [cx, cy - 110, cx, cy + 110],
          [cx - 80, cy + 80, cx + 80, cy - 80],
          [M.x, M.y - 20, M.x, M.y + M.h + 20],
          [M.x + M.w, M.y - 20, M.x + M.w, M.y + M.h + 20],
        ].map(([x1, y1, x2, y2], i) => (
          <line key={i} data-m="gline" x1={x1} y1={y1} x2={x2} y2={y2} pathLength={1} stroke="rgba(120,160,255,0.22)" strokeWidth="1" strokeDasharray="1 1" />
        ))}
      </svg>
      <div data-m="mark" style={at(M)}>
        <NordaMark className="h-full w-full" style={{ filter: 'drop-shadow(0 0 18px rgba(31,91,255,0.55))' }} />
      </div>
      <span data-m="edge" style={at({ x: cx - 1.5, y: cy - 80, w: 3, h: 160 }, { borderRadius: 3, background: '#dbe8ff', boxShadow: '0 0 14px 4px rgba(61,123,255,0.95), 0 0 40px 10px rgba(31,91,255,0.55)', opacity: 0 })} />
      <div data-m="wordmark" style={{ position: 'absolute', left: d(296), top: d(128) }}>
        <div className="font-display" style={{ fontSize: d(42), fontWeight: 800, letterSpacing: '0.08em', color: '#f3f5fa', lineHeight: 1 }}>NORDA</div>
        <div style={{ marginTop: d(8), fontSize: d(8.5), letterSpacing: '0.55em', color: '#6f9bff' }}>RUN FURTHER</div>
      </div>
      {SWATCHES.map((s, i) => (
        <div key={s.name} data-m="swatch" style={{ position: 'absolute', left: d(296 + i * 56), top: d(236), width: d(48) }}>
          <div style={{ height: d(48), borderRadius: d(10), background: s.hex, border: '1px solid rgba(255,255,255,0.12)' }} />
          <div style={{ marginTop: d(5), fontSize: d(7), color: '#e8eefc', fontWeight: 700 }}>{s.name}</div>
          <div style={{ fontSize: d(6.5), color: 'rgba(200,210,240,0.55)' }}>{s.hex}</div>
        </div>
      ))}
      <div data-m="type" style={{ position: 'absolute', left: d(296), top: d(330), display: 'flex', alignItems: 'baseline', gap: d(10) }}>
        <span className="font-display" style={{ fontSize: d(26), fontWeight: 800, color: '#f3f5fa' }}>Aa</span>
        <span style={{ fontSize: d(7.5), color: 'rgba(200,210,240,0.6)', letterSpacing: '0.1em' }}>{t('type')} · Display / Text</span>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  05 — Aplikace                                                      */
/* ------------------------------------------------------------------ */

const APPLE =
  'M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701';
const PLAY =
  'M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z';

function StoreBadge({ kind, small, big, box }: { kind: 'apple' | 'play'; small: string; big: string; box: Box }) {
  return (
    <div
      data-m="badge"
      style={at(box, { borderRadius: d(9), background: '#000', border: '1px solid #a6a6a6', color: '#fff', display: 'flex', alignItems: 'center', gap: d(8), padding: `0 ${d(12)}` })}
    >
      <svg viewBox="0 0 24 24" style={{ width: d(22), height: d(22), flexShrink: 0 }} aria-hidden>
        {kind === 'apple' ? (
          <path d={APPLE} fill="#fff" />
        ) : (
          <>
            <defs>
              <linearGradient id="playg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#00d7fe" />
                <stop offset="0.4" stopColor="#00f076" />
                <stop offset="0.7" stopColor="#ffd400" />
                <stop offset="1" stopColor="#ff3a44" />
              </linearGradient>
            </defs>
            <path d={PLAY} fill="url(#playg)" />
          </>
        )}
      </svg>
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
        <span style={{ fontSize: d(kind === 'apple' ? 7 : 6.5), letterSpacing: kind === 'play' ? '0.06em' : undefined }}>{small}</span>
        <span style={{ fontSize: d(kind === 'apple' ? 15 : 14), fontWeight: 600, letterSpacing: '-0.01em' }}>{big}</span>
      </span>
    </div>
  );
}

export function AppIcon({ style, markM }: { style?: CSSProperties; markM?: string }) {
  return (
    <div style={{ borderRadius: '23%', background: 'linear-gradient(145deg,#3d7bff,#1f5bff 45%,#00a3ff)', display: 'grid', placeItems: 'center', boxShadow: '0 18px 40px -12px rgba(31,91,255,0.7), inset 0 1px 0 rgba(255,255,255,0.35)', ...style }}>
      <NordaMark dataM={markM} style={{ width: '58%', height: '58%' }} accent="#bfe3ff" />
    </div>
  );
}

export function AppVisual() {
  const t = useTranslations('norda.app');
  const I = NORDA_BOXES.icon;
  const Ph = NORDA_BOXES.phone;
  return (
    <>
      <div data-m="icon" style={at(I)}>
        <AppIcon style={{ width: '100%', height: '100%' }} markM="iconmark" />
      </div>
      <div data-m="appinfo" style={{ position: 'absolute', left: d(56), top: d(194), color: '#f3f5fa' }}>
        <div className="font-display" style={{ fontSize: d(18), fontWeight: 800, letterSpacing: '0.06em' }}>NORDA</div>
        <div style={{ marginTop: d(3), fontSize: d(8.5), color: 'rgba(200,210,240,0.6)' }}>{t('category')}</div>
        <div style={{ marginTop: d(3), fontSize: d(8.5), color: '#f5c451' }}>{t('rating')}</div>
      </div>
      <StoreBadge kind="apple" small={t('appSmall')} big="App Store" box={{ x: 56, y: 262, w: 156, h: 46 }} />
      <StoreBadge kind="play" small={t('playSmall')} big="Google Play" box={{ x: 56, y: 318, w: 156, h: 46 }} />
      {/* telefon s aplikací */}
      <div data-m="phone" style={at(Ph, { borderRadius: d(30), background: '#05070d', border: '1px solid rgba(255,255,255,0.14)', padding: d(7), boxShadow: '0 30px 60px -20px rgba(0,0,0,0.9)' })}>
        <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: d(24), overflow: 'hidden', background: 'linear-gradient(170deg,#101c42,#070b18 70%)', color: '#f3f5fa' }}>
          <span style={{ position: 'absolute', left: '50%', top: d(6), width: d(54), height: d(15), marginLeft: d(-27), borderRadius: 999, background: '#000' }} />
          <div style={{ position: 'absolute', left: d(14), top: d(34), fontSize: d(7.5), color: 'rgba(200,210,240,0.6)' }}>NORDA</div>
          <div className="font-display" style={{ position: 'absolute', left: d(14), top: d(46), fontSize: d(13), fontWeight: 800 }}>{t('hello')}</div>
          {/* kruh týdenního běhu */}
          <svg viewBox="0 0 100 100" style={{ position: 'absolute', left: d(38), top: d(76), width: d(96), height: d(96) }} aria-hidden>
            <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.08)" strokeWidth="9" fill="none" />
            <circle cx="50" cy="50" r="40" stroke="#3d7bff" strokeWidth="9" fill="none" strokeLinecap="round" strokeDasharray="251" strokeDashoffset="70" transform="rotate(-90 50 50)" />
          </svg>
          <div style={{ position: 'absolute', left: 0, right: 0, top: d(106), textAlign: 'center' }}>
            <div className="font-display" style={{ fontSize: d(17), fontWeight: 800 }}>32,4</div>
            <div style={{ fontSize: d(6.5), color: 'rgba(200,210,240,0.6)' }}>{t('week')}</div>
          </div>
          <div style={{ position: 'absolute', left: d(12), right: d(12), top: d(186), borderRadius: d(12), background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', padding: d(8), display: 'flex', alignItems: 'center', gap: d(7) }}>
            <span style={{ width: d(36), height: d(28), borderRadius: d(7), background: '#e8edf6', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SNEAKER} alt="" style={{ position: 'absolute', left: d(2), top: d(7), width: d(32) }} />
            </span>
            <span style={{ fontSize: d(7), lineHeight: 1.25 }}>{t('order')}</span>
          </div>
          <div style={{ position: 'absolute', left: d(12), right: d(12), top: d(236), height: d(24), borderRadius: d(8), background: '#1f5bff', fontSize: d(8), fontWeight: 700, display: 'grid', placeItems: 'center' }}>{t('track')}</div>
          <div style={{ position: 'absolute', left: d(12), right: d(12), top: d(272), display: 'flex', gap: d(6) }}>
            {[0, 150, 300].map((h) => (
              <span key={h} style={{ flex: 1, height: d(62), borderRadius: d(9), background: 'rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={SNEAKER} alt="" style={{ position: 'absolute', left: d(2), top: d(16), width: d(46), filter: `hue-rotate(${h}deg)` }} />
              </span>
            ))}
          </div>
          <div style={{ position: 'absolute', left: d(20), right: d(20), bottom: d(8), height: d(3), borderRadius: 3, background: 'rgba(255,255,255,0.35)' }} />
        </div>
      </div>
    </>
  );
}

export const NORDA_VISUALS: Record<ServiceSlug, ComponentType> = {
  weby: WebVisual,
  seo: SeoVisual,
  'e-shopy': ShopVisual,
  design: DesignVisual,
  aplikace: AppVisual,
};

/** Scéna vizuálu: poměr 4:3, CSS container (jednotky cqw). */
export function NordaStage({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative aspect-[4/3] w-full select-none [container-type:inline-size] ${className}`} aria-hidden>
      {children}
    </div>
  );
}
