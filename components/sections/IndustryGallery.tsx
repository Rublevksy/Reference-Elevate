'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Heart, Play, RefreshCw, RotateCcw, Sparkles, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GALLERY_PAGE, MAX_LIKES, type GalleryType, type PublicGalleryItem } from '@/lib/content/gallery';
import { useReducedMotion } from '@/lib/useReducedMotion';

/**
 * Ukázky stylu pro kombinaci „typ projektu + obor" z 1. kroku — 3D karusel:
 * střední karta velká, sousední ustupují do hloubky. Listuje se tahem
 * (prst i myš — karty jedou s ukazatelem a doskočí se setrvačností),
 * dvěma prsty na touchpadu, šipkami i klávesami. „Zobrazit jiné varianty"
 * staré karty odlistuje doleva a nové přijedou zprava.
 *
 * Pět náhodných bez opakování, dokud nejsou vidět všechny; víc typů
 * (web + e-shop…) se střídá, typy se mezi sebou nepletou. Srdíčko = líbí se
 * (id se pošle s poptávkou), klepnutí na střední kartu = celý náhled.
 */

const cache = new Map<string, PublicGalleryItem[]>();

function shuffle<T>(list: T[]) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Zamíchá každý typ zvlášť a prostřídá je (web, e-shop, web, e-shop…). */
function mixByType(items: PublicGalleryItem[], types: GalleryType[]) {
  const piles = types.map((type) => shuffle(items.filter((item) => item.type === type))).filter((pile) => pile.length);
  const out: PublicGalleryItem[] = [];
  while (piles.some((pile) => pile.length)) for (const pile of piles) if (pile.length) out.push(pile.shift()!);
  return out;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
/** krok mezi kartami jako podíl šířky karty (shodně s --step v CSS) */
const STEP_RATIO = 0.68;

export function IndustryGallery({
  industryId,
  industryLabel,
  types,
  likes,
  onLikes,
  onLike,
}: {
  industryId: string;
  industryLabel: string;
  /** typy projektu vybrané v 1. kroku */
  types: GalleryType[];
  likes: string[];
  onLikes: (ids: string[]) => void;
  onLike?: () => void;
}) {
  const t = useTranslations('contact.gallery');
  const reduced = useReducedMotion();
  const typesKey = types.join(',');
  const key = `${industryId}|${typesKey}`;
  const [items, setItems] = useState<PublicGalleryItem[] | null>(cache.get(key) ?? null);
  const [failed, setFailed] = useState(false);
  const [order, setOrder] = useState<PublicGalleryItem[]>([]);
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const loadId = useRef(0);

  const load = useCallback(() => {
    const my = ++loadId.current;
    setFailed(false);
    const hit = cache.get(key);
    if (hit) {
      setItems(hit);
      return;
    }
    setItems(null);
    fetch(`/api/gallery?industry=${encodeURIComponent(industryId)}&types=${encodeURIComponent(typesKey)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { items?: PublicGalleryItem[] }) => {
        if (my !== loadId.current) return;
        const list = Array.isArray(data.items) ? data.items : [];
        cache.set(key, list);
        setItems(list);
      })
      .catch(() => my === loadId.current && setFailed(true));
  }, [industryId, typesKey, key]);

  useEffect(() => {
    if (industryId) load();
  }, [industryId, load]);

  const remix = useCallback(() => {
    if (!items) return;
    setOrder(mixByType(items, typesKey.split(',') as GalleryType[]));
    setPage(0);
  }, [items, typesKey]);
  useEffect(remix, [remix]);

  const total = order.length;
  const visible = useMemo(() => order.slice(page * GALLERY_PAGE, page * GALLERY_PAGE + GALLERY_PAGE), [order, page]);
  const pages = Math.max(1, Math.ceil(total / GALLERY_PAGE));
  const seenAll = (page + 1) * GALLERY_PAGE >= total;
  const likedItems = useMemo(() => likes.map((id) => items?.find((item) => item.id === id)).filter((x): x is PublicGalleryItem => Boolean(x)), [likes, items]);
  const what = `${types.map((type) => t(`types.${type}`)).join(' + ')} · ${industryLabel}`;

  // další pětice dopředu do paměti prohlížeče — listování pak nečeká na obrázky
  useEffect(() => {
    const next = order.slice((page + 1) * GALLERY_PAGE, (page + 2) * GALLERY_PAGE);
    const id = window.setTimeout(() => next.forEach((item) => (new Image().src = item.thumb)), 600);
    return () => window.clearTimeout(id);
  }, [order, page]);

  const toggle = (id: string) => {
    const on = !likes.includes(id);
    if (on && likes.length >= MAX_LIKES) return;
    onLikes(on ? [...likes, id] : likes.filter((x) => x !== id));
    if (on) onLike?.();
  };

  /* ---------------- karusel ---------------- */
  const flow = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const pos = useRef(2); // plynulá poloha (index karty uprostřed, i necelý)
  const [focus, setFocus] = useState(2);
  const n = visible.length;
  const center = Math.min(2, Math.max(0, n - 1));
  const frame = useRef(0);
  const swapping = useRef(false);

  /** Rozmístí karty podle polohy `p`; `animate` = plynulý dojezd přes CSS transition. */
  const place = useCallback((p: number, animate: boolean) => {
    pos.current = p;
    const mid = Math.round(p);
    cards.current.forEach((el, i) => {
      if (!el) return;
      const d = i - p;
      const ad = Math.min(3.2, Math.abs(d));
      el.style.transition = animate ? '' : 'none';
      el.style.transform = `translateX(calc(-50% + ${d.toFixed(3)} * var(--step))) translateZ(${(-120 * ad).toFixed(1)}px) rotateY(${(clamp(d, -2.4, 2.4) * -24).toFixed(2)}deg) scale(${(1 - ad * 0.07).toFixed(3)})`;
      el.style.opacity = `calc(1 - ${ad.toFixed(3)} * var(--fade))`;
      el.style.zIndex = String(100 - Math.round(ad * 10));
      el.dataset.center = String(i === mid);
    });
  }, []);

  const settle = useCallback(
    (target: number) => {
      const to = clamp(Math.round(target), 0, Math.max(0, n - 1));
      place(to, !reduced);
      setFocus(to);
    },
    [n, place, reduced],
  );

  // nová pětice (i první načtení): karty přijedou zprava
  useEffect(() => {
    if (!n) return;
    swapping.current = false;
    if (reduced) {
      place(center, false);
      setFocus(center);
      return;
    }
    place(-3.4, false);
    const a = requestAnimationFrame(() => {
      frame.current = requestAnimationFrame(() => {
        place(center, true);
        setFocus(center);
      });
    });
    return () => {
      cancelAnimationFrame(a);
      cancelAnimationFrame(frame.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  /** „Zobrazit jiné varianty": staré karty odlistovat doleva, pak vyměnit. */
  const flipTo = (next: () => void) => {
    if (swapping.current) return;
    if (reduced || !n) {
      next();
      return;
    }
    swapping.current = true;
    place(n + 2.4, true);
    window.setTimeout(next, 330);
  };

  // tah prstem / myší — karty jedou s ukazatelem, po puštění doskočí se setrvačností
  const drag = useRef<{ x: number; y: number; start: number; active: boolean; id: number; lastX: number; lastT: number; v: number } | null>(null);
  const moved = useRef(false);
  const stepPx = () => (cards.current.find(Boolean)?.offsetWidth ?? 232) * STEP_RATIO;

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;
    moved.current = false;
    drag.current = { x: e.clientX, y: e.clientY, start: pos.current, active: false, id: e.pointerId, lastX: e.clientX, lastT: e.timeStamp, v: 0 };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const g = drag.current;
    if (!g || swapping.current) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.active) {
      if (Math.abs(dx) < 7) return;
      // svislý pohyb = scroll stránky, ne listování
      if (Math.abs(dy) > Math.abs(dx)) {
        drag.current = null;
        return;
      }
      g.active = true;
      moved.current = true;
      flow.current?.setPointerCapture(g.id);
      flow.current?.setAttribute('data-dragging', '');
    }
    const dt = e.timeStamp - g.lastT;
    if (dt > 0) g.v = 0.7 * g.v + 0.3 * ((e.clientX - g.lastX) / dt);
    g.lastX = e.clientX;
    g.lastT = e.timeStamp;
    let p = g.start - dx / stepPx();
    // za krajem jde ztuha
    if (p < 0) p *= 0.35;
    if (p > n - 1) p = n - 1 + (p - (n - 1)) * 0.35;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => place(p, false));
  };
  const onPointerEnd = () => {
    const g = drag.current;
    drag.current = null;
    flow.current?.removeAttribute('data-dragging');
    if (!g?.active) return;
    cancelAnimationFrame(frame.current);
    // setrvačnost: kam by karty dojely za ~140 ms, nejvýš o dvě
    const projected = pos.current - (g.v * 140) / stepPx();
    settle(clamp(projected, Math.round(g.start) - 2, Math.round(g.start) + 2));
  };

  // touchpad: vodorovné posunutí dvěma prsty listuje (svislé nechává stránce)
  useEffect(() => {
    const el = flow.current;
    if (!el) return;
    let acc = 0;
    let lock = 0;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 3) return;
      e.preventDefault();
      if (performance.now() < lock) return;
      acc += e.deltaX;
      if (Math.abs(acc) > 46) {
        settle(Math.round(pos.current) + (acc > 0 ? 1 : -1));
        acc = 0;
        lock = performance.now() + 320;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [settle]);

  const header = (
    <p className="ga-label">
      <span>{t('title', { what })}</span>
      {likes.length ? (
        <small className="ga-liked-count">
          <Heart size={12} fill="currentColor" aria-hidden />
          {t('liked', { count: likes.length })}
        </small>
      ) : null}
    </p>
  );

  // pro tuhle kombinaci nic není — přátelská zpráva místo prázdného bloku
  if (items && !items.length) {
    return (
      <div>
        {header}
        <div className="ga-sub ga-empty">
          <i className="ga-cap-disc">
            <Sparkles size={16} aria-hidden />
          </i>
          <p>{t('empty')}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {header}
      <p className="ga-note">{t('hint')}</p>

      {failed ? (
        <div className="ga-sub ga-empty">
          <p className="flex-1 !text-[#ffc2cb]">{t('error')}</p>
          <button type="button" onClick={load} className="shrink-0 text-[13px] text-white underline underline-offset-4">
            {t('retry')}
          </button>
        </div>
      ) : (
        <div
          ref={flow}
          className="ga-flow"
          role="group"
          aria-roledescription="carousel"
          aria-label={t('title', { what })}
          tabIndex={0}
          aria-busy={!items}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              settle(focus + 1);
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              settle(focus - 1);
            }
          }}
        >
          {!items
            ? Array.from({ length: 3 }, (_, i) => <div key={i} className="ga-card ga-card-ghost" style={{ transform: `translateX(calc(-50% + ${i - 1} * var(--step))) scale(${i === 1 ? 1 : 0.86})`, opacity: i === 1 ? 0.5 : 0.22, zIndex: i === 1 ? 2 : 1 }} />)
            : visible.map((item, i) => {
                const on = likes.includes(item.id);
                return (
                  <div
                    key={item.id}
                    ref={(el) => {
                      cards.current[i] = el;
                    }}
                    className="ga-card"
                    data-liked={on}
                    onClick={() => {
                      if (moved.current) return;
                      if (i !== Math.round(pos.current)) settle(i);
                      else setZoom(i);
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.thumb} alt={t('alt', { label: item.label })} draggable={false} decoding="async" />
                    {item.video ? (
                      <span aria-hidden className="ga-card-play">
                        <Play size={16} fill="currentColor" />
                      </span>
                    ) : null}
                    {types.length > 1 ? <span className="ga-card-tag">{t(`types.${item.type}`)}</span> : null}
                    <button
                      type="button"
                      className="ga-like"
                      aria-pressed={on}
                      aria-label={on ? t('unlike') : t('like')}
                      tabIndex={i === focus ? 0 : -1}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(item.id);
                      }}
                    >
                      <Heart size={20} fill={on ? '#fff' : 'none'} aria-hidden />
                    </button>
                  </div>
                );
              })}
          {items && n > 1 ? (
            <>
              <button type="button" className="ga-nav" data-side="prev" aria-label={t('prev')} disabled={focus === 0} onClick={() => settle(focus - 1)}>
                <ChevronLeft size={20} aria-hidden />
              </button>
              <button type="button" className="ga-nav" data-side="next" aria-label={t('next')} disabled={focus === n - 1} onClick={() => settle(focus + 1)}>
                <ChevronRight size={20} aria-hidden />
              </button>
            </>
          ) : null}
        </div>
      )}

      {items && total ? (
        <div className="ga-galfoot">
          <div className="ga-dots">
            {pages > 1 && pages <= 12 ? Array.from({ length: pages }, (_, i) => <span key={i} data-on={i === page} />) : null}
            <em>{t('counter', { from: page * GALLERY_PAGE + 1, to: Math.min(total, (page + 1) * GALLERY_PAGE), total })}</em>
          </div>
          {total > GALLERY_PAGE ? (
            seenAll ? (
              <button type="button" className="ga-more" onClick={() => flipTo(remix)}>
                <RotateCcw size={15} aria-hidden />
                {t('restart')}
              </button>
            ) : (
              <button type="button" className="ga-more" onClick={() => flipTo(() => setPage((p) => p + 1))}>
                <RefreshCw size={15} aria-hidden />
                {t('more')}
              </button>
            )
          ) : null}
        </div>
      ) : null}
      {items && total && seenAll && total > GALLERY_PAGE ? <p className="ga-note">{t('allSeen')}</p> : null}

      {/* vybrané z předchozích pětic zůstávají vidět */}
      {likedItems.length ? (
        <div className="ga-liked no-scrollbar">
          {likedItems.map((item) => (
            <span key={item.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.thumb} alt={t('alt', { label: item.label })} />
              <button type="button" onClick={() => toggle(item.id)} aria-label={`${t('unlike')}${item.label ? ` — ${item.label}` : ''}`}>
                <X size={12} aria-hidden />
              </button>
            </span>
          ))}
        </div>
      ) : items && total ? (
        <p className="ga-note">{t('noneLiked')}</p>
      ) : null}

      <Lightbox items={visible} index={zoom} onIndex={setZoom} likes={likes} onToggle={toggle} labels={{ close: t('close'), prev: t('prev'), next: t('next'), like: t('like'), alt: (label) => t('alt', { label }) }} />
    </div>
  );
}

/** Celý náhled přes obrazovku (dlouhé stránky se posouvají), video se přehraje; srdíčko, šipky, Esc. */
function Lightbox({
  items,
  index,
  onIndex,
  likes,
  onToggle,
  labels,
}: {
  items: PublicGalleryItem[];
  index: number | null;
  onIndex: (i: number | null) => void;
  likes: string[];
  onToggle: (id: string) => void;
  labels: { close: string; prev: string; next: string; like: string; alt: (label: string) => string };
}) {
  const [mounted, setMounted] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => setMounted(true), []);
  const open = index !== null && Boolean(items[index]);
  const item = open ? items[index!] : null;

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    window.__lenis?.stop();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onIndex(null);
      if (e.key === 'ArrowRight') onIndex(Math.min(items.length - 1, (index ?? 0) + 1));
      if (e.key === 'ArrowLeft') onIndex(Math.max(0, (index ?? 0) - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => {
      html.style.overflow = prev;
      window.__lenis?.start();
      window.removeEventListener('keydown', onKey);
    };
  }, [open, index, items.length, onIndex]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [index]);

  if (!mounted) return null;
  const liked = item ? likes.includes(item.id) : false;
  return createPortal(
    <AnimatePresence>
      {open && item ? (
        <motion.div
          key="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={item.label || labels.like}
          className="ga-lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="ga-lightbox-bar">
            <p>
              {item.label}
              <span>
                {(index ?? 0) + 1} / {items.length}
              </span>
            </p>
            <button type="button" onClick={() => onIndex(null)} aria-label={labels.close} className="ga-orb-btn">
              <X size={20} aria-hidden />
            </button>
          </div>
          <div ref={scroller} data-lenis-prevent className="ga-lightbox-body">
            {item.video ? (
              <video key={item.video} src={item.video} poster={item.url} autoPlay muted loop playsInline controls />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.url} alt={labels.alt(item.label)} style={{ maxWidth: Math.min(1000, item.width || 1000) }} />
            )}
          </div>
          <div className="ga-lightbox-bar">
            <button type="button" onClick={() => onIndex(Math.max(0, (index ?? 0) - 1))} disabled={index === 0} aria-label={labels.prev} className="ga-orb-btn">
              <ArrowLeft size={18} aria-hidden />
            </button>
            <button type="button" className="ga-lightbox-like" aria-pressed={liked} onClick={() => onToggle(item.id)}>
              <Heart size={18} fill={liked ? '#fff' : 'none'} aria-hidden />
              {labels.like}
            </button>
            <button type="button" onClick={() => onIndex(Math.min(items.length - 1, (index ?? 0) + 1))} disabled={index === items.length - 1} aria-label={labels.next} className="ga-orb-btn">
              <ArrowRight size={18} aria-hidden />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
