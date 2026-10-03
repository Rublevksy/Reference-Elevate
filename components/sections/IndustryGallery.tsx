'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Heart, Maximize2, RotateCcw, Sparkles, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GALLERY_PAGE, MAX_LIKES, type PublicGalleryItem } from '@/lib/content/gallery';
import { useReducedMotion } from '@/lib/useReducedMotion';

/**
 * Ukázky webů studia z oboru, který návštěvník vybral v 1. kroku.
 * Pět náhodných, „Zobrazit jiné varianty" přidá dalších pět bez opakování,
 * dokud nejsou vidět všechny. Srdíčkem se označí, co se líbí — výběr se
 * pošle s poptávkou (id snímků). Klepnutí na obrázek = celý snímek.
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

export function IndustryGallery({
  industryId,
  industryLabel,
  likes,
  onLikes,
  onLike,
}: {
  industryId: string;
  industryLabel: string;
  likes: string[];
  onLikes: (ids: string[]) => void;
  /** reakce maskota při označení */
  onLike?: () => void;
}) {
  const t = useTranslations('contact.gallery');
  const reduced = useReducedMotion();
  const [items, setItems] = useState<PublicGalleryItem[] | null>(cache.get(industryId) ?? null);
  const [failed, setFailed] = useState(false);
  const [order, setOrder] = useState<PublicGalleryItem[]>([]);
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const loadId = useRef(0);

  const load = useCallback(() => {
    const my = ++loadId.current;
    setFailed(false);
    const hit = cache.get(industryId);
    if (hit) {
      setItems(hit);
      return;
    }
    setItems(null);
    fetch(`/api/gallery?industry=${encodeURIComponent(industryId)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { items?: PublicGalleryItem[] }) => {
        if (my !== loadId.current) return;
        const list = Array.isArray(data.items) ? data.items : [];
        cache.set(industryId, list);
        setItems(list);
      })
      .catch(() => my === loadId.current && setFailed(true));
  }, [industryId]);

  useEffect(() => {
    if (industryId) load();
  }, [industryId, load]);

  // nové pořadí pro každý obor (a po „projít znovu")
  useEffect(() => {
    if (!items) return;
    setOrder(shuffle(items));
    setPage(0);
  }, [items]);

  const total = order.length;
  const visible = order.slice(page * GALLERY_PAGE, page * GALLERY_PAGE + GALLERY_PAGE);
  const seenAll = (page + 1) * GALLERY_PAGE >= total;
  const likedItems = useMemo(() => likes.map((id) => items?.find((item) => item.id === id)).filter((x): x is PublicGalleryItem => Boolean(x)), [likes, items]);

  const toggle = (id: string) => {
    const on = !likes.includes(id);
    if (on && likes.length >= MAX_LIKES) return;
    onLikes(on ? [...likes, id] : likes.filter((x) => x !== id));
    if (on) onLike?.();
  };

  const header = (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <p className="text-[13.5px] font-semibold text-[#e6ecff]">{t('title', { industry: industryLabel })}</p>
      {likes.length ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-ink">
          <Heart className="h-3.5 w-3.5 fill-[#ff5c8a] text-[#ff5c8a]" aria-hidden />
          {t('liked', { count: likes.length })}
        </p>
      ) : null}
    </div>
  );

  // prázdný obor (nebo „Jiný obor" bez ukázek) — přátelská zpráva
  if (items && !items.length) {
    return (
      <div className="qf-note">
        {header}
        <div className="mt-3 flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[rgba(61,123,255,0.45)] bg-[rgba(31,91,255,0.14)] text-[var(--blue-bright)] shadow-[0_0_16px_rgba(31,91,255,0.35)]">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <p className="text-sm leading-relaxed text-[rgba(220,228,246,0.9)]">{t('empty')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="qf-note">
      {header}
      <p className="mt-1 text-xs leading-snug text-[rgba(160,172,205,0.85)]">{t('hint')}</p>

      {failed ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[rgba(255,90,110,0.3)] px-3 py-2.5 text-xs text-[#ffc2cb]">
          {t('error')}
          <button type="button" onClick={load} className="shrink-0 underline-offset-4 hover:underline">
            {t('retry')}
          </button>
        </div>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5" aria-busy={!items}>
          {(items ? visible : Array.from({ length: GALLERY_PAGE }, () => null)).map((item, i) => {
            const big = i === 0;
            const span = big ? 'col-span-2 sm:row-span-2' : '';
            if (!item) {
              return <li key={`s${i}`} className={`${span} aspect-[16/10] animate-pulse rounded-xl bg-white/[0.05]`} />;
            }
            const on = likes.includes(item.id);
            return (
              <motion.li
                key={`${page}-${item.id}`}
                layout={false}
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: reduced ? 0 : i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className={`${span} group relative`}
              >
                <button
                  type="button"
                  onClick={() => setZoom(i)}
                  aria-label={`${t('open')}${item.label ? ` — ${item.label}` : ''}`}
                  className={`relative block w-full overflow-hidden rounded-xl border transition-[border-color,box-shadow] duration-300 ${
                    on ? 'border-[rgba(255,120,160,0.8)] shadow-[0_0_0_1px_rgba(255,120,160,0.5),0_0_24px_-6px_rgba(255,92,138,0.7)]' : 'border-[rgba(110,150,255,0.22)] hover:border-[rgba(143,178,255,0.7)]'
                  } ${big ? 'aspect-[16/10] sm:aspect-auto sm:h-full' : 'aspect-[16/10]'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.thumb} alt={item.label} loading="lazy" decoding="async" className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]" />
                  <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,transparent,rgba(4,6,11,0.7))]" />
                  <span aria-hidden className="absolute bottom-1.5 left-2 grid h-6 w-6 place-items-center rounded-full bg-[rgba(4,6,11,0.55)] text-white/80 opacity-0 transition-opacity group-hover:opacity-100">
                    <Maximize2 className="h-3 w-3" />
                  </span>
                </button>
                <LikeButton on={on} onClick={() => toggle(item.id)} label={on ? t('unlike') : t('like')} />
              </motion.li>
            );
          })}
        </ul>
      )}

      {items && total ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-muted">{t('counter', { from: page * GALLERY_PAGE + 1, to: Math.min(total, (page + 1) * GALLERY_PAGE), total })}</span>
          {total > GALLERY_PAGE ? (
            seenAll ? (
              <button type="button" onClick={() => (setOrder(shuffle(items)), setPage(0))} className="inline-flex h-9 items-center gap-2 rounded-full border border-[rgba(110,150,255,0.35)] px-3.5 text-xs text-ink transition-colors hover:border-[rgba(143,178,255,0.8)]">
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                {t('restart')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-[rgba(143,178,255,0.55)] bg-[linear-gradient(165deg,rgba(31,91,255,0.28),rgba(12,22,56,0.6))] px-4 text-xs text-white shadow-[0_0_18px_-6px_rgba(31,91,255,0.8)] transition-shadow hover:shadow-[0_0_24px_-4px_rgba(31,91,255,0.9)]"
              >
                {t('more')}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            )
          ) : null}
        </div>
      ) : null}
      {items && total && seenAll && total > GALLERY_PAGE ? <p className="mt-1.5 text-[11px] text-muted">{t('allSeen')}</p> : null}

      {/* vybrané z předchozích stránek zůstávají vidět */}
      {likedItems.length ? (
        <div className="mt-3 flex items-center gap-2 overflow-x-auto border-t border-[rgba(110,150,255,0.12)] pt-3 no-scrollbar">
          {likedItems.map((item) => (
            <span key={item.id} className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.thumb} alt={item.label} className="h-10 w-16 rounded-md border border-[rgba(255,120,160,0.6)] object-cover object-top" />
              <button
                type="button"
                onClick={() => toggle(item.id)}
                aria-label={`${t('unlike')}${item.label ? ` — ${item.label}` : ''}`}
                className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border border-[rgba(255,120,160,0.7)] bg-[#0b1024] text-[#ffb3c9]"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      ) : items && total ? (
        <p className="mt-2 text-[11px] text-muted">{t('noneLiked')}</p>
      ) : null}

      <Lightbox
        items={visible}
        index={zoom}
        onIndex={setZoom}
        likes={likes}
        onToggle={toggle}
        labels={{ close: t('close'), prev: t('prev'), next: t('next'), like: t('like'), unlike: t('unlike') }}
      />
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
      className={`${large ? 'relative h-11 gap-2 px-4 text-sm' : 'absolute right-1.5 top-1.5 h-8 w-8 justify-center'} inline-flex items-center rounded-full border transition-[background-color,border-color,transform] duration-200 active:scale-95 ${
        on ? 'border-[rgba(255,120,160,0.85)] bg-[rgba(255,92,138,0.9)] text-white' : 'border-white/25 bg-[rgba(4,6,11,0.62)] text-white hover:border-white/60'
      }`}
    >
      <Heart className={`${large ? 'h-4 w-4' : 'h-4 w-4'} ${on ? 'fill-white' : ''}`} aria-hidden />
      {large ? label : null}
    </button>
  );
}

/** Celý snímek přes celou obrazovku (posouvá se svisle), srdíčko, šipky, Esc. */
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
  labels: { close: string; prev: string; next: string; like: string; unlike: string };
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
          className="fixed inset-0 z-[130] flex flex-col bg-[rgba(3,5,10,0.94)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
            <p className="min-w-0 truncate font-display text-[11px] uppercase tracking-[0.14em] text-[#cfe0ff]">
              {item.label}
              <span className="ml-2 text-muted">
                {(index ?? 0) + 1} / {items.length}
              </span>
            </p>
            <button type="button" onClick={() => onIndex(null)} aria-label={labels.close} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/20 text-white hover:border-white/50">
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div ref={scroller} data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.url} alt={item.label} className="mx-auto w-full max-w-[1100px] rounded-xl border border-[rgba(110,150,255,0.25)]" />
          </div>
          <div className="flex items-center justify-between gap-3 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3">
            <button type="button" onClick={() => onIndex(Math.max(0, (index ?? 0) - 1))} disabled={index === 0} aria-label={labels.prev} className="grid h-11 w-11 place-items-center rounded-full border border-white/20 text-white disabled:opacity-30">
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </button>
            <LikeButton large on={likes.includes(item.id)} onClick={() => onToggle(item.id)} label={labels.like} />
            <button
              type="button"
              onClick={() => onIndex(Math.min(items.length - 1, (index ?? 0) + 1))}
              disabled={index === items.length - 1}
              aria-label={labels.next}
              className="grid h-11 w-11 place-items-center rounded-full border border-white/20 text-white disabled:opacity-30"
            >
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
