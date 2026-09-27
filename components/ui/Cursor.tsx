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
      ring.current?.classList.toggle('is-active', Boolean(interactive));
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
      <div
        ref={ring}
        className="cursor-ring absolute -left-4 -top-4 h-8 w-8 rounded-full border border-[rgba(61,123,255,0.7)] transition-[width,height,opacity,background-color] duration-200"
      />
      <style jsx global>{`
        @media (pointer: fine) and (min-width: 1024px) {
          body { cursor: none; }
          a, button, input, textarea, select { cursor: none; }
        }
        .cursor-ring.is-active {
          width: 3rem;
          height: 3rem;
          margin-left: -0.5rem;
          margin-top: -0.5rem;
          background: rgba(31, 91, 255, 0.12);
          box-shadow: 0 0 24px var(--blue-glow);
        }
      `}</style>
    </div>
  );
}
