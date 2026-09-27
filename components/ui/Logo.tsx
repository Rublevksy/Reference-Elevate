'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
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
        sizes={`${width * 2}px`}
        className="h-full w-full select-none"
      />

      {/* záře šipky — samostatná vrstva nad logem, tvar zůstává netknutý */}
      {glow && !reduced ? (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-[14%] w-[22%]"
          style={{
            background:
              'radial-gradient(circle at 50% 35%, rgba(61,160,255,0.75), transparent 68%)',
            filter: 'blur(6px)',
          }}
          animate={{ opacity: [0.25, 0.8, 0.25] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      ) : null}
    </span>
  );
}
