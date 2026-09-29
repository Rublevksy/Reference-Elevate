'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Vlastní kurzor: tečka + modrý kroužek, který se zvětší nad klikatelným prvkem.
 * Na dotykových zařízeních a při reduced-motion se vůbec nevykreslí.
 */
export function Cursor() {
  const root = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduced) return;
    setEnabled(true);

    let ringX = window.innerWidth / 2;
    let ringY = window.innerHeight / 2;
    let mouseX = ringX;
    let mouseY = ringY;
    let raf = 0;

    const onMove = (event: PointerEvent) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
      // Kurzor ukážeme až po prvním pohybu — jinak na chvíli visí v rohu.
      root.current?.classList.remove('opacity-0');
      if (dot.current) {
        dot.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      }
      const interactive = (event.target as HTMLElement)?.closest(
        'a, button, [data-cursor="link"], input, textarea, select, [role="button"]',
      );
      const on = Boolean(interactive);
      if (ring.current && ring.current.classList.contains('is-active') !== on) ring.current.classList.toggle('is-active', on);
    };

    const loop = () => {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      if (ring.current) {
        ring.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      }
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      ref={root}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[120] hidden opacity-0 transition-opacity duration-300 lg:block"
    >
      <div
        ref={dot}
        className="absolute -left-[3px] -top-[3px] h-1.5 w-1.5 rounded-full bg-[var(--blue-bright)]"
      />
      {/* poloha na vnějším prvku, zvětšení na vnitřním — jen transform/opacity
          (dřív se animovala šířka/výška/okraje = přepočet layoutu přesně
          v okamžiku, kdy začínal hover efekt karty nebo tlačítka) */}
      <div ref={ring} className="cursor-ring absolute -left-4 -top-4 h-8 w-8">
        <span className="cursor-ring-shape absolute inset-0 rounded-full border border-[rgba(61,123,255,0.7)] transition-transform duration-200 ease-out" />
        <span className="cursor-ring-glow absolute inset-0 rounded-full bg-[rgba(31,91,255,0.12)] opacity-0 shadow-[0_0_24px_var(--blue-glow)] transition-[opacity,transform] duration-200 ease-out" />
      </div>
      <style jsx global>{`
        @media (pointer: fine) and (min-width: 1024px) {
          body { cursor: none; }
          a, button, input, textarea, select { cursor: none; }
        }
        .cursor-ring.is-active .cursor-ring-shape {
          transform: scale(1.5);
        }
        .cursor-ring.is-active .cursor-ring-glow {
          opacity: 1;
          transform: scale(1.5);
        }
      `}</style>
    </div>
  );
}
