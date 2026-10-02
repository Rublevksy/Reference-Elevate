'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from '@/lib/useReducedMotion';

/**
 * Mobilní karusel (ceník, služby): vodorovná řada karet se snapem, nad ní
 * záložky, pod ní stránkování. Posouvá se nativně prstem — žádné scroll
 * animace navíc, ať iOS Safari při rychlém švihnutí nemá co dohánět.
 *
 * `railRef` patří na posuvný kontejner, `tabsRef` na řadu záložek; karty
 * jsou přímé děti railu označené `data-slide`. Když navigace (menu, odkaz)
 * dojede na kartu (lib/scrollTo nastaví `data-arrived`), karusel na ni
 * dojede i do strany.
 */
export function useCarousel(count: number) {
  const reduced = useReducedMotion();
  const railRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const slides = () => Array.from(railRef.current?.querySelectorAll<HTMLElement>(':scope > [data-slide]') ?? []);

  const goTo = useCallback(
    (index: number) => {
      const rail = railRef.current;
      const slide = slides()[Math.max(0, Math.min(count - 1, index))];
      if (!rail || !slide || rail.scrollWidth <= rail.clientWidth + 1) return;
      rail.scrollTo({ left: slide.offsetLeft - (rail.clientWidth - slide.offsetWidth) / 2, behavior: reduced ? 'auto' : 'smooth' });
    },
    [count, reduced],
  );

  // aktivní = karta nejblíž středu
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const mid = rail.scrollLeft + rail.clientWidth / 2;
        let best = 0;
        let bestD = Infinity;
        slides().forEach((slide, i) => {
          const d = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - mid);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        });
        setActive(best);
      });
    };
    rail.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      rail.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // záložky drží aktivní ve výhledu
  useEffect(() => {
    const row = tabsRef.current;
    const tab = row?.children[active] as HTMLElement | undefined;
    if (row && tab && row.scrollWidth > row.clientWidth) {
      row.scrollTo({ left: tab.offsetLeft - (row.clientWidth - tab.offsetWidth) / 2, behavior: reduced ? 'auto' : 'smooth' });
    }
  }, [active, reduced]);

  // příjezd z navigace na konkrétní kartu
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        const slide = record.target as HTMLElement;
        if (slide.hasAttribute('data-arrived')) goTo(slides().indexOf(slide));
      }
    });
    slides().forEach((slide) => observer.observe(slide, { attributes: true, attributeFilter: ['data-arrived'] }));
    return () => observer.disconnect();
  }, [goTo]);

  return { railRef, tabsRef, active, goTo };
}

/** Řada záložek nad karuselem (jen mobil). */
export function CarouselTabs({
  tabsRef,
  items,
  active,
  onPick,
  label,
  className = '',
}: {
  tabsRef: React.RefObject<HTMLDivElement | null>;
  items: { key: string; label: string; icon?: ReactNode; controls?: string }[];
  active: number;
  onPick: (index: number) => void;
  label: string;
  className?: string;
}) {
  return (
    <div ref={tabsRef} role="tablist" aria-label={label} className={`no-scrollbar flex gap-2 overflow-x-auto px-5 md:hidden ${className}`}>
      {items.map((item, i) => {
        const on = i === active;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls={item.controls}
            onClick={() => onPick(i)}
            className={`flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 font-display text-[11px] uppercase tracking-[0.1em] transition-[color,background-color,border-color,box-shadow] duration-300 ${
              on
                ? 'border-[rgba(143,178,255,0.85)] bg-[linear-gradient(165deg,#1b3577,#0c1638)] text-white shadow-[0_0_18px_-4px_rgba(31,91,255,0.85)]'
                : 'border-[rgba(110,150,255,0.22)] bg-white/[0.03] text-[rgba(205,214,236,0.8)]'
            }`}
          >
            {item.icon ? <span className={on ? 'text-[#9fc0ff]' : 'text-muted'}>{item.icon}</span> : null}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

/** Stránkování pod karuselem: šipky, tečky a „01 / 05" (jen mobil). */
export function CarouselPager({
  count,
  active,
  onGo,
  prevLabel,
  nextLabel,
  className = '',
}: {
  count: number;
  active: number;
  onGo: (index: number) => void;
  prevLabel: string;
  nextLabel: string;
  className?: string;
}) {
  const arrow =
    'grid h-11 w-11 place-items-center rounded-full border border-[rgba(110,150,255,0.3)] bg-white/[0.03] text-ink transition-opacity active:bg-white/[0.1] disabled:opacity-30';
  return (
    <div className={`flex items-center justify-between gap-4 px-5 md:hidden ${className}`}>
      <button type="button" onClick={() => onGo(active - 1)} disabled={active === 0} aria-label={prevLabel} className={arrow}>
        <ArrowLeft className="h-4 w-4" aria-hidden />
      </button>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5" aria-hidden>
          {Array.from({ length: count }, (_, i) => (
            <span
              key={i}
              className={`h-[3px] rounded-full transition-all duration-500 ${i === active ? 'w-6 bg-[var(--blue-bright)] shadow-[0_0_8px_rgba(61,123,255,0.9)]' : 'w-2.5 bg-[rgba(140,170,235,0.3)]'}`}
            />
          ))}
        </div>
        <span className="font-mono text-[11px] tracking-[0.14em] text-muted" aria-live="polite">
          <span className="text-ink">{String(active + 1).padStart(2, '0')}</span> / {String(count).padStart(2, '0')}
        </span>
      </div>
      <button type="button" onClick={() => onGo(active + 1)} disabled={active === count - 1} aria-label={nextLabel} className={arrow}>
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
