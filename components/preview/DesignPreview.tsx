'use client';

import { Instrument_Serif } from 'next/font/google';
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Heart, Link2, RefreshCw, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { COLOR_SWATCHES } from '@/lib/contactSchema';
import type { PublicGalleryItem } from '@/lib/content/gallery';
import './design-preview.css';

/**
 * /design-preview — tři vizuální směry kroku „Vzhled" poptávkového formuláře.
 * Jen náhled k výběru stylu: ostrý formulář (ContactForm) se tím nemění.
 * Obsah je skutečný (texty formuláře, ukázky z galerie Web · Gastro),
 * volby fungují (srdíčko, styl, barvy, další varianty), nic se neodesílá.
 */

const serif = Instrument_Serif({ weight: '400', style: ['normal', 'italic'], subsets: ['latin', 'latin-ext'], variable: '--dp-serif', display: 'swap' });

const STEP = 2; // krok Vzhled
const PAGE = 5;
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
/** záře kolem vybrané barvy (černá by nesvítila) */
const GLOW = ['#4c82ff', '#8aa0ff', '#ffffff', '#3fd08a', '#ff5a60', '#ffa24a', '#9a6bff', '#e0bc62'];

/** Malé abstraktní náhledy šesti stylů webu (stejné pořadí jako contact.styles). */
const SWATCHES: ReactNode[] = [
  <span key="0" className="dp-swatch" style={{ background: '#f4f6fb' }}>
    <span style={{ position: 'absolute', left: '16%', top: '26%', width: '46%', height: 3, borderRadius: 9, background: '#1b2133' }} />
    <span style={{ position: 'absolute', left: '16%', top: '46%', width: '66%', height: 2, borderRadius: 9, background: '#c9cfdc' }} />
    <span style={{ position: 'absolute', left: '16%', top: '62%', width: '52%', height: 2, borderRadius: 9, background: '#c9cfdc' }} />
  </span>,
  <span key="1" className="dp-swatch" style={{ background: '#0b0d12' }}>
    <span style={{ position: 'absolute', right: 0, bottom: 0, width: '56%', height: '44%', background: '#ff3d57' }} />
    <span style={{ position: 'absolute', left: '14%', top: '26%', width: '50%', height: 5, background: '#ffd23d' }} />
  </span>,
  <span key="2" className="dp-swatch" style={{ background: 'linear-gradient(160deg,#1c160d,#0b0906)' }}>
    <span style={{ position: 'absolute', left: '50%', top: '30%', width: '44%', height: 1, marginLeft: '-22%', background: '#c9a24a' }} />
    <span style={{ position: 'absolute', left: '50%', top: '46%', width: '24%', height: '24%', marginLeft: '-12%', borderRadius: '50%', border: '1px solid #e3c78a' }} />
  </span>,
  <span key="3" className="dp-swatch" style={{ background: '#fff4e8' }}>
    <span style={{ position: 'absolute', left: '14%', top: '16%', width: '34%', height: '34%', borderRadius: '50%', background: '#ff7a59' }} />
    <span style={{ position: 'absolute', right: '14%', top: '22%', width: '26%', height: '26%', borderRadius: 4, transform: 'rotate(14deg)', background: '#7c4dff' }} />
    <span style={{ position: 'absolute', left: '36%', bottom: '14%', width: '32%', height: '32%', borderRadius: '50%', background: '#1fae6b' }} />
  </span>,
  <span
    key="4"
    className="dp-swatch"
    style={{ background: '#050811', backgroundImage: 'linear-gradient(rgba(61,123,255,0.28) 1px, transparent 1px), linear-gradient(90deg, rgba(61,123,255,0.28) 1px, transparent 1px)', backgroundSize: '7px 7px' }}
  >
    <span style={{ position: 'absolute', left: '18%', top: '30%', width: '50%', height: 3, borderRadius: 9, background: '#3d7bff', boxShadow: '0 0 6px #3d7bff' }} />
  </span>,
  <span key="5" className="dp-swatch" style={{ display: 'grid', placeItems: 'center', background: 'rgba(98,104,255,0.18)', color: '#b9c8ff' }}>
    <Sparkles size={15} />
  </span>,
];

type Choices = ReturnType<typeof useChoices>;

function useChoices(all: PublicGalleryItem[]) {
  const [page, setPage] = useState(0);
  const [likes, setLikes] = useState<string[]>([]);
  const [style, setStyle] = useState(2);
  const [colors, setColors] = useState<number[]>([0, 7]);
  const pages = Math.max(1, Math.ceil(all.length / PAGE));
  const visible = all.slice(page * PAGE, page * PAGE + PAGE);
  // ať je hned vidět i vybraný stav
  const seeded = useRef(false);
  useEffect(() => {
    if (!seeded.current && all.length > 2) {
      seeded.current = true;
      setLikes([all[2].id]);
    }
  }, [all]);
  return {
    visible,
    total: all.length,
    from: page * PAGE + 1,
    to: Math.min(all.length, (page + 1) * PAGE),
    more: () => setPage((p) => (p + 1) % pages),
    likes,
    toggleLike: (id: string) => setLikes((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id])),
    style,
    setStyle,
    colors,
    toggleColor: (i: number) => setColors((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i])),
  };
}

function useTexts() {
  const t = useTranslations('contact');
  return {
    steps: t.raw('steps') as string[],
    question: (t.raw('questions') as string[])[STEP],
    hint: (t.raw('hints') as string[])[STEP],
    styles: t.raw('styles') as string[],
    colors: t.raw('colors') as string[],
    gallery: t('gallery.title', { what: `${t('gallery.types.web')} · Gastro a ubytování` }),
    galleryHint: t('gallery.hint'),
    more: t('gallery.more'),
    like: t('gallery.like'),
    counter: (from: number, to: number, total: number) => t('gallery.counter', { from, to, total }),
    liked: (count: number) => t('gallery.liked', { count }),
    refs: t('refsLabel'),
    refsPlaceholder: t('refsPlaceholder'),
    style: t('styleLabel'),
    color: t('colorsLabel'),
    optional: t('optional'),
    back: t('back'),
    next: t('next'),
    step: t('stepLabel'),
  };
}
type Texts = ReturnType<typeof useTexts>;
const stateOf = (i: number) => (i < STEP ? 'done' : i === STEP ? 'current' : 'todo');

/* ------------------------------------------------------------------ */
/*  A — sklo a záře                                                    */
/* ------------------------------------------------------------------ */

function Coverflow({ c, x }: { c: Choices; x: Texts }) {
  const [focus, setFocus] = useState(2);
  const drag = useRef<number | null>(null);
  const n = c.visible.length;
  useEffect(() => setFocus(Math.min(2, Math.max(0, n - 1))), [c.from, n]);
  const go = (i: number) => setFocus(Math.max(0, Math.min(n - 1, i)));
  return (
    <div
      className="dpA-flow"
      onPointerDown={(e) => (drag.current = e.clientX)}
      onPointerUp={(e) => {
        if (drag.current === null) return;
        const dx = e.clientX - drag.current;
        drag.current = null;
        if (Math.abs(dx) > 36) go(focus + (dx < 0 ? 1 : -1));
      }}
    >
      {c.visible.map((item, i) => {
        const d = i - focus;
        const liked = c.likes.includes(item.id);
        return (
          <div
            key={item.id}
            className="dpA-card"
            data-center={d === 0}
            data-liked={liked}
            style={{ '--d': d, '--ad': Math.abs(d) } as CSSProperties}
            onClick={() => d !== 0 && go(i)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.thumb} alt={item.label} draggable={false} />
            <button
              type="button"
              className="dpA-like"
              aria-pressed={liked}
              aria-label={x.like}
              tabIndex={d === 0 ? 0 : -1}
              onClick={(e) => {
                e.stopPropagation();
                c.toggleLike(item.id);
              }}
            >
              <Heart size={20} fill={liked ? '#fff' : 'none'} />
            </button>
          </div>
        );
      })}
      <button type="button" className="dpA-nav" data-side="prev" aria-label="‹" disabled={focus === 0} onClick={() => go(focus - 1)}>
        <ChevronLeft size={20} />
      </button>
      <button type="button" className="dpA-nav" data-side="next" aria-label="›" disabled={focus === n - 1} onClick={() => go(focus + 1)}>
        <ChevronRight size={20} />
      </button>
      <span hidden data-focus={focus} />
    </div>
  );
}

function VariantA({ items, x }: { items: PublicGalleryItem[]; x: Texts }) {
  const c = useChoices(items);
  return (
    <div className="dp-canvas dpA">
      <div className="dpA-aurora" aria-hidden>
        <i />
        <i />
        <i />
      </div>
      <div className="dpA-glass">
        <ol className="dpA-steps">
          {x.steps.map((label, i) => (
            <li key={label} data-state={stateOf(i)}>
              <span className="dpA-step-n">{i < STEP ? <Check size={12} strokeWidth={3.2} /> : i + 1}</span>
              <span className="dpA-step-l">{label}</span>
            </li>
          ))}
        </ol>

        <h3 className="dpA-title">{x.question}</h3>
        <p className="dpA-hint">
          <Sparkles size={15} />
          {x.hint}
        </p>

        <p className="dpA-label">
          {x.gallery}
          {c.likes.length ? <small>♥ {x.liked(c.likes.length)}</small> : null}
        </p>
        <Coverflow c={c} x={x} />
        <div className="dpA-galfoot">
          <div className="dpA-dots">
            {Array.from({ length: Math.ceil(c.total / PAGE) || 1 }, (_, i) => (
              <span key={i} data-on={i === Math.floor((c.from - 1) / PAGE)} />
            ))}
            <em>{x.counter(c.from, c.to, c.total)}</em>
          </div>
          <button type="button" className="dpA-more" onClick={c.more}>
            <RefreshCw size={15} />
            {x.more}
          </button>
        </div>

        <p className="dpA-label">
          {x.refs} <small>{x.optional}</small>
        </p>
        <label className="dpA-field">
          <Link2 size={18} />
          <input type="text" placeholder={x.refsPlaceholder} aria-label={x.refs} />
        </label>

        <p className="dpA-label">
          {x.style} <small>{x.optional}</small>
        </p>
        <div className="dpA-caps">
          {x.styles.map((label, i) => (
            <button key={label} type="button" className="dpA-cap" aria-pressed={c.style === i} onClick={() => c.setStyle(i)}>
              <i>{SWATCHES[i]}</i>
              {label}
            </button>
          ))}
        </div>

        <p className="dpA-label">
          {x.color} <small>{c.colors.map((i) => x.colors[i]).join(', ') || x.optional}</small>
        </p>
        <div className="dpA-orbs">
          {COLOR_SWATCHES.map((color, i) => (
            <button key={color} type="button" className="dpA-orb" aria-pressed={c.colors.includes(i)} aria-label={x.colors[i]} style={{ '--c': color, '--g': GLOW[i] } as CSSProperties} onClick={() => c.toggleColor(i)} />
          ))}
        </div>

        <div className="dpA-actions">
          <button type="button" className="dpA-back" aria-label={x.back}>
            <ArrowLeft size={20} />
          </button>
          <button type="button" className="dpA-cta">
            {x.next}
            <i>
              <ArrowRight size={20} />
            </i>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  B — minimal prémiové agentury                                      */
/* ------------------------------------------------------------------ */

/** poměry stran „kontaktního archu" — záměrně různé výšky */
const RATIOS = ['3 / 4', '4 / 3.3', '4 / 4.4', '4 / 4.4', '4 / 3.3'];

function VariantB({ items, x }: { items: PublicGalleryItem[]; x: Texts }) {
  const c = useChoices(items);
  return (
    <div className="dp-canvas dpB">
      <div className="dpB-top">
        <span>
          {x.step} <b>{String(STEP + 1).padStart(2, '0')}</b> / {String(x.steps.length).padStart(2, '0')}
        </span>
        <span>{x.steps[STEP]}</span>
      </div>
      <ol className="dpB-steps">
        {x.steps.map((label, i) => (
          <li key={label} data-state={stateOf(i)}>
            <i />
            <span>{label}</span>
          </li>
        ))}
        <span className="dpB-progress" style={{ width: `${((STEP + 0.62) / x.steps.length) * 100}%` }} />
      </ol>

      <h3 className="dpB-title">{x.question}</h3>
      <p className="dpB-hint">{x.hint}</p>

      <section className="dpB-row">
        <header>
          <b>{x.gallery}</b>
          {x.galleryHint}
        </header>
        <div>
          <div className="dpB-sheet">
            {c.visible.map((item, i) => (
              <button key={item.id} type="button" className="dpB-fig" aria-pressed={c.likes.includes(item.id)} onClick={() => c.toggleLike(item.id)}>
                <span className="img" style={{ aspectRatio: RATIOS[i % RATIOS.length] }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt={item.label} />
                </span>
                <span className="dpB-bar" />
                <span className="dpB-cap">
                  <span>
                    <b>{String(c.from + i).padStart(2, '0')}</b>
                    {item.label.split(' · ')[0]}
                  </span>
                  <span className="dpB-pick">
                    <Check size={11} strokeWidth={3.4} />
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div className="dpB-links">
            <span>
              {x.counter(c.from, c.to, c.total)}
              {c.likes.length ? ` — ${x.liked(c.likes.length)}` : ''}
            </span>
            <button type="button" className="dpB-link" onClick={c.more}>
              {x.more}
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>

      <section className="dpB-row">
        <header>
          <b>{x.refs}</b>
          {x.optional}
        </header>
        <input className="dpB-input" type="text" placeholder={x.refsPlaceholder} aria-label={x.refs} />
      </section>

      <section className="dpB-row">
        <header>
          <b>{x.style}</b>
          {x.optional}
        </header>
        <div className="dpB-opts">
          {x.styles.map((label, i) => (
            <button key={label} type="button" className="dpB-opt" aria-pressed={c.style === i} onClick={() => c.setStyle(i)}>
              <i />
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="dpB-row">
        <header>
          <b>{x.color}</b>
          {x.optional}
        </header>
        <div className="dpB-colors">
          {COLOR_SWATCHES.map((color, i) => (
            <button key={color} type="button" className="dpB-color" aria-pressed={c.colors.includes(i)} aria-label={x.colors[i]} style={{ '--c': color } as CSSProperties} onClick={() => c.toggleColor(i)} />
          ))}
          {c.colors.length ? <em>{c.colors.map((i) => x.colors[i]).join(', ')}</em> : null}
        </div>
      </section>

      <div className="dpB-actions">
        <button type="button" className="dpB-back">
          <ArrowLeft size={15} />
          {x.back}
        </button>
        <div className="dpB-right">
          <span className="dpB-kbd">
            Enter <kbd>↵</kbd>
          </span>
          <button type="button" className="dpB-cta">
            {x.next}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  C — ateliér                                                        */
/* ------------------------------------------------------------------ */

function VariantC({ items, x }: { items: PublicGalleryItem[]; x: Texts }) {
  const c = useChoices(items);
  return (
    <div className={`dp-canvas dpC ${serif.variable}`}>
      <span className="dpC-num dpC-serif" aria-hidden>
        {String(STEP + 1).padStart(2, '0')}
      </span>

      <ol className="dpC-steps dpC-serif">
        {x.steps.map((label, i) => (
          <li key={label} data-state={stateOf(i)} title={label}>
            {ROMAN[i]}
            {i === STEP ? <em>{label}</em> : null}
          </li>
        ))}
      </ol>

      <h3 className="dpC-title dpC-serif">{x.question}</h3>
      <p className="dpC-hint">{x.hint}</p>

      <p className="dpC-label dpC-serif">
        {x.gallery}
        <small>
          {x.counter(c.from, c.to, c.total)}
          {c.likes.length ? ` · ${x.liked(c.likes.length)}` : ''}
        </small>
      </p>
      <div className="dpC-arches">
        {c.visible.map((item, i) => {
          const liked = c.likes.includes(item.id);
          return (
            <button key={item.id} type="button" className="dpC-arch" aria-pressed={liked} onClick={() => c.toggleLike(item.id)}>
              <span className="dpC-ring" />
              <span className="dpC-frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.thumb} alt={item.label} />
              </span>
              <span className="dpC-seal">{liked ? <Check size={17} strokeWidth={2.6} /> : <Heart size={16} />}</span>
              <span className="dpC-no dpC-serif">№ {c.from + i}</span>
            </button>
          );
        })}
      </div>
      <button type="button" className="dpC-more" onClick={c.more}>
        <RefreshCw size={15} />
        {x.more}
      </button>

      <p className="dpC-label dpC-serif">
        {x.refs}
        <small>{x.optional}</small>
      </p>
      <input className="dpC-input dpC-serif" type="text" placeholder={x.refsPlaceholder} aria-label={x.refs} />

      <p className="dpC-label dpC-serif">
        {x.style}
        <small>{x.optional}</small>
      </p>
      <div className="dpC-medals">
        {x.styles.map((label, i) => (
          <button key={label} type="button" className="dpC-medal" aria-pressed={c.style === i} onClick={() => c.setStyle(i)}>
            <i>{SWATCHES[i]}</i>
            <span>
              {label}
              <b />
            </span>
          </button>
        ))}
      </div>

      <p className="dpC-label dpC-serif">
        {x.color}
        <small>{x.optional}</small>
      </p>
      <div className="dpC-strip">
        {COLOR_SWATCHES.map((color, i) => (
          <button key={color} type="button" className="dpC-chip" aria-pressed={c.colors.includes(i)} aria-label={x.colors[i]} style={{ '--c': color } as CSSProperties} onClick={() => c.toggleColor(i)}>
            <Check size={16} strokeWidth={2.6} color={i === 2 || i === 7 ? '#0b0b0d' : '#fff'} />
          </button>
        ))}
      </div>
      {c.colors.length ? <p className="dpC-picked dpC-serif">{c.colors.map((i) => x.colors[i]).join(', ')}</p> : null}

      <div className="dpC-actions">
        <button type="button" className="dpC-back dpC-serif" aria-label={x.back}>
          <ArrowLeft size={18} strokeWidth={1.4} />
          <span>{x.back}</span>
        </button>
        <button type="button" className="dpC-cta dpC-serif">
          {x.next}
          <i>
            <ArrowRight size={20} strokeWidth={1.6} />
          </i>
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function DesignPreview() {
  const x = useTexts();
  const [items, setItems] = useState<PublicGalleryItem[]>([]);
  useEffect(() => {
    fetch('/api/gallery?industry=gastro-ubytovani&types=web')
      .then((res) => res.json())
      .then((data: { items?: PublicGalleryItem[] }) => setItems(Array.isArray(data.items) ? data.items : []))
      .catch(() => setItems([]));
  }, []);

  const variants: { id: string; name: string; note: string; node: ReactNode }[] = [
    { id: 'a', name: 'A — Sklo a záře', note: 'Matné sklo nad aurorou, svítící obrysy, ukázky jako 3D karusel s velkou střední kartou.', node: <VariantA items={items} x={x} /> },
    { id: 'b', name: 'B — Minimal', note: 'Žádné rámečky: velké písmo, tenké linky, ukázky jako kontaktní arch, barva jen bodově.', node: <VariantB items={items} x={x} /> },
    { id: 'c', name: 'C — Ateliér', note: 'Patkové písmo, římské číslice, ukázky v obloukových oknech, medailony a vzorník barev.', node: <VariantC items={items} x={x} /> },
  ];

  return (
    <div className="dp-page">
      <div className="dp-intro">
        <h1>Tři směry formuláře</h1>
        <p>Jeden a tentýž krok „Vzhled“ ve třech stylech. Je to jen náhled k výběru — ostrý formulář na webu se zatím nemění. Všechno jde zkoušet: srdíčka, styl, barvy i další varianty.</p>
        <nav className="dp-jump" aria-label="Varianty">
          {variants.map((v) => (
            <a key={v.id} href={`#varianta-${v.id}`}>
              {v.name}
            </a>
          ))}
        </nav>
      </div>
      {variants.map((v) => (
        <section key={v.id} id={`varianta-${v.id}`} className="dp-variant">
          <div className="dp-head">
            <b>{v.name}</b>
            <span>{v.note}</span>
          </div>
          {v.node}
        </section>
      ))}
    </div>
  );
}
