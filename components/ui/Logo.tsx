'use client';

import Image from 'next/image';
import logo from '@/public/brand/logo-elevate.png';
import { useReducedMotion } from '@/lib/useReducedMotion';

/**
 * Originální logotyp ELEVATE. Zdrojový soubor se NIKDY nepřekresluje ani
 * nedeformuje — zadává se jen výška, šířka dopočítá poměr stran.
 * Animujeme výhradně obálku a samostatnou vrstvu se září, ne tvar písmen.
 *
 * Až dorazí originální SVG, stačí vyměnit import výš — zbytek webu se nemění.
 */
export function Logo({
  height = 22,
  className = '',
  priority = false,
  glow = false,
}: {
  height?: number;
  className?: string;
  priority?: boolean;
  glow?: boolean;
}) {
  const reduced = useReducedMotion();
  const width = Math.round((logo.width / logo.height) * height);
  // malá loga (lišta, úvodní clona, patička) sdílejí jednu velikost souboru —
  // jinak prohlížeč přednačte dvě různé a jednu z nich zahodí
  const sizes = width <= 300 ? '300px' : `${width}px`;

  return (
    <span
      className={`relative inline-block shrink-0 align-middle ${className}`}
      style={{ height, width }}
      role="img"
      aria-label="ELEVATE"
    >
      <Image
        src={logo}
        alt=""
        aria-hidden
        height={height}
        width={width}
        priority={priority}
        sizes={sizes}
        className="h-full w-full select-none"
      />

      {/* záře šipky — samostatná vrstva nad logem, tvar zůstává netknutý */}
      {glow && !reduced ? (
        // pulz v CSS (kompozitor) — ne JS smyčka, která by běžela každý snímek
        <span
          aria-hidden
          className="glow-pulse pointer-events-none absolute inset-y-0 right-[14%] w-[22%]"
          style={{ background: 'radial-gradient(circle at 50% 35%, rgba(61,160,255,0.75), transparent 68%)', filter: 'blur(6px)' }}
        />
      ) : null}
    </span>
  );
}
