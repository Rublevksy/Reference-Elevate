'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Heart, Play, RotateCcw, Sparkles, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GALLERY_PAGE, MAX_LIKES, type GalleryType, type PublicGalleryItem } from '@/lib/content/gallery';
import { useReducedMotion } from '@/lib/useReducedMotion';

/**
 * Ukázky stylu pro kombinaci „typ projektu + obor" z 1. kroku.
 * Pět náhodných, „Zobrazit jiné varianty" přidá dalších pět bez opakování,
 * dokud nejsou vidět všechny. Když je vybráno víc typů (web + e-shop…),
 * ukázky se střídají — každá pětice je mix všech vybraných typů; typy se
 * mezi sebou nikdy nepletou (web není v e-shopech), jen se řadí vedle sebe.
 * Srdíčko = líbí se (id se pošle s poptávkou), klepnutí = celý náhled.
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
  const visible = order.slice(page * GALLERY_PAGE, page * GALLERY_PAGE + GALLERY_PAGE);
  const seenAll = (page + 1) * GALLERY_PAGE >= total;
  const likedItems = useMemo(() => likes.map((id) => items?.find((item) => item.id === id)).filter((x): x is PublicGalleryItem => Boolean(x)), [likes, items]);
  const what = `${types.map((type) => t(`types.${type}`)).join(' + ')} · ${industryLabel}`;

  const toggle = (id: string) => {
    const on = !likes.includes(id);
    if (on && likes.length >= MAX_LIKES) return;
    onLikes(on ? [...likes, id] : likes.filter((x) => x !== id));
    if (on) onLike?.();
  };

  const header = (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <p className="text-[13.5px] font-semibold text-[#e6ecff]">{t('title', { what })}</p>
      {likes.length ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-white">
          <Heart className="h-3.5 w-3.5 fill-[#ff5c8a] text-[#ff5c8a]" aria-hidden />
          {t('liked', { count: likes.length })}
        </p>
      ) : null}
    </div>
  );

  // pro tuhle kombinaci nic není — přátelská zpráva místo prázdného bloku
  if (items && !items.length) {
    return (
      <div className="qf-note">
        {header}
        <div className="mt-3 flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[rgba(98,104,255,0.14)] text-[#a9bcff] shadow-[inset_0_0_0_1px_rgba(150,170,255,0.25)]">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <p className="text-sm leading-relaxed text-[rgba(220,228,246,0.9)]">{t('empty')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="qf-note !px-0">
      <div className="px-[1.1rem]">
        {header}
        <p className="mt-1 text-xs leading-snug text-[rgba(160,172,205,0.85)]">{t('hint')}</p>
      </div>

      {failed ? (
        <div className="mx-[1.1rem] mt-3 flex items-center justify-between gap-3 rounded-xl border border-[rgba(255,90,110,0.3)] px-3 py-2.5 text-xs text-[#ffc2cb]">
          {t('error')}
          <button type="button" onClick={load} className="shrink-0 underline-offset-4 hover:underline">
            {t('retry')}
          </button>
        </div>
      ) : (
        // telefon: řada na posun prstem; od sm pět dlaždic vedle sebe
        <ul className="no-scrollbar mt-3.5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-[1.1rem] pb-1 sm:grid sm:grid-cols-5 sm:overflow-visible" aria-busy={!items}>
          {(items ? visible : Array.from({ length: GALLERY_PAGE }, () => null)).map((item, i) => {
            const cell = 'relative aspect-[4/5] w-[42%] shrink-0 snap-start sm:w-auto';
            if (!item) return <li key={`s${i}`} className={`${cell} animate-pulse rounded-2xl bg-white/[0.05]`} />;
            const on = likes.includes(item.id);
            return (
              <motion.li
                key={`${page}-${item.id}`}
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: reduced ? 0 : i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className={`${cell} group`}
              >
                <button
                  type="button"
                  onClick={() => setZoom(i)}
                  aria-label={`${t('open')}${item.label ? ` — ${item.label}` : ''}`}
                  className={`relative block h-full w-full overflow-hidden rounded-2xl transition-shadow duration-300 ${
                    on ? 'shadow-[0_0_0_2px_#ff7aa2,0_0_26px_-6px_rgba(255,92,138,0.8)]' : 'shadow-[0_0_0_1px_rgba(160,186,255,0.22)] hover:shadow-[0_0_0_1px_rgba(180,204,255,0.75),0_14px_30px_-18px_rgba(98,104,255,0.9)]'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.thumb} alt={item.label} loading="lazy" decoding="async" className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]" />
                  <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-[linear-gradient(180deg,transparent,rgba(4,6,14,0.82))]" />
                  {item.video ? (
                    <span aria-hidden className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[rgba(4,6,14,0.6)] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.35)]">
                      <Play className="h-4 w-4 translate-x-px fill-white" />
                    </span>
                  ) : null}
                  {types.length > 1 ? <span className="absolute bottom-2 left-2 rounded-full bg-[rgba(4,6,14,0.6)] px-2 py-0.5 text-[10.5px] text-white/90">{t(`types.${item.type}`)}</span> : null}
                </button>
                <LikeButton on={on} onClick={() => toggle(item.id)} label={on ? t('unlike') : t('like')} />
              </motion.li>
            );
          })}
        </ul>
      )}

      {items && total ? (
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 px-[1.1rem]">
          <span className="text-xs tabular-nums text-[rgba(160,172,205,0.85)]">{t('counter', { from: page * GALLERY_PAGE + 1, to: Math.min(total, (page + 1) * GALLERY_PAGE), total })}</span>
          {total > GALLERY_PAGE ? (
            seenAll ? (
              <button type="button" onClick={remix} className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13px] text-white shadow-[inset_0_0_0_1px_rgba(160,186,255,0.4)] transition-shadow hover:shadow-[inset_0_0_0_1px_rgba(190,210,255,0.9)]">
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                {t('restart')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[linear-gradient(120deg,rgba(42,92,255,0.5),rgba(124,77,255,0.5))] px-4 text-[13px] font-medium text-white shadow-[inset_0_0_0_1px_rgba(190,210,255,0.55),0_10px_26px_-14px_rgba(98,104,255,0.95)] transition-transform hover:-translate-y-px active:scale-[0.98]"
              >
                {t('more')}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            )
          ) : null}
        </div>
      ) : null}
      {items && total && seenAll && total > GALLERY_PAGE ? <p className="mt-1.5 px-[1.1rem] text-xs text-[rgba(160,172,205,0.85)]">{t('allSeen')}</p> : null}

      {/* vybrané z předchozích pětic zůstávají vidět */}
      {likedItems.length ? (
        <div className="no-scrollbar mt-3.5 flex items-center gap-2.5 overflow-x-auto border-t border-white/[0.07] px-[1.1rem] pt-3.5">
          {likedItems.map((item) => (
            <span key={item.id} className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.thumb} alt={item.label} className="h-14 w-11 rounded-lg object-cover object-top shadow-[0_0_0_1.5px_#ff7aa2]" />
              <button type="button" onClick={() => toggle(item.id)} aria-label={`${t('unlike')}${item.label ? ` — ${item.label}` : ''}`} className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#141936] text-[#ffb3c9] shadow-[0_0_0_1px_rgba(255,120,160,0.7)]">
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      ) : items && total ? (
        <p className="mt-2.5 px-[1.1rem] text-xs text-[rgba(160,172,205,0.85)]">{t('noneLiked')}</p>
      ) : null}

      <Lightbox items={visible} index={zoom} onIndex={setZoom} likes={likes} onToggle={toggle} labels={{ close: t('close'), prev: t('prev'), next: t('next'), like: t('like') }} />
    </div>
  );
}

function LikeButton({ on, onClick, label, large = false }: { on: boolean; onClick: () => void; label: string; large?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
      className={`${large ? 'relative h-12 gap-2 px-5 text-sm font-medium' : 'absolute right-1.5 top-1.5 h-9 w-9 justify-center'} inline-flex items-center rounded-full transition-[background-color,box-shadow,transform] duration-200 active:scale-90 ${
        on ? 'bg-[#ff5c8a] text-white shadow-[0_0_18px_rgba(255,92,138,0.8)]' : 'bg-[rgba(4,6,14,0.62)] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3)] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)]'
      }`}
    >
      <Heart className={`h-4 w-4 ${on ? 'fill-white' : ''}`} aria-hidden />
      {large ? label : null}
    </button>
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
  labels: { close: string; prev: string; next: string; like: string };
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
  return createPortal(
    <AnimatePresence>
      {open && item ? (
        <motion.div
          key="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={item.label || labels.like}
          className="fixed inset-0 z-[130] flex flex-col bg-[rgba(4,5,12,0.95)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
            <p className="min-w-0 truncate text-[13px] text-[#cfe0ff]">
              {item.label}
              <span className="ml-2 tabular-nums text-[rgba(160,172,205,0.8)]">
                {(index ?? 0) + 1} / {items.length}
              </span>
            </p>
            <button type="button" onClick={() => onIndex(null)} aria-label={labels.close} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)]">
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div ref={scroller} data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3">
            {item.video ? (
              <video key={item.video} src={item.video} poster={item.url} autoPlay muted loop playsInline controls className="mx-auto max-h-full w-auto max-w-full rounded-2xl" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.url} alt={item.label} className="mx-auto w-full rounded-2xl shadow-[0_0_0_1px_rgba(160,186,255,0.25)]" style={{ maxWidth: Math.min(1000, item.width || 1000) }} />
            )}
          </div>
          <div className="flex items-center justify-between gap-3 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3">
            <button type="button" onClick={() => onIndex(Math.max(0, (index ?? 0) - 1))} disabled={index === 0} aria-label={labels.prev} className="grid h-12 w-12 place-items-center rounded-full text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)] disabled:opacity-30">
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </button>
            <LikeButton large on={likes.includes(item.id)} onClick={() => onToggle(item.id)} label={labels.like} />
            <button type="button" onClick={() => onIndex(Math.min(items.length - 1, (index ?? 0) + 1))} disabled={index === items.length - 1} aria-label={labels.next} className="grid h-12 w-12 place-items-center rounded-full text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)] disabled:opacity-30">
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
