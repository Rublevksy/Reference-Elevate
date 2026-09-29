'use client';

import { motion } from 'framer-motion';
import { memo, useMemo } from 'react';

/**
 * Sdílená ambientní grafika stolu služeb — kruhová platforma, paprsky a
 * světelné sloupy. Používá ji jak <MacbookIntro /> (miniatura na displeji,
 * co se při zoomu zvětší) tak <ServicesTable /> (plná scéna) — je to
 * DOSLOVA stejná značka, takže mezi sekcemi nevzniká viditelný šev.
 *
 * Souřadnice rádiusových čar se zaokrouhlují na 2 desetinná místa: čistý
 * Math.cos/sin výstup se serveru a klientovi v posledním bitu lišil
 * (různé zaokrouhlení transcendentních funkcí mezi Node a V8 v prohlížeči)
 * a způsobovalo to hydration mismatch — s zaokrouhlením je server↔klient
 * string identický.
 */
const round = (v: number) => Math.round(v * 100) / 100;

const RADIAL_LINES = Array.from({ length: 48 }).map((_, i) => {
  const a = (i / 48) * Math.PI * 2;
  const inner = i % 4 === 0 ? 352 : 372;
  return {
    key: i,
    x1: round(Math.cos(a) * inner),
    y1: round(Math.sin(a) * inner),
    x2: round(Math.cos(a) * 400),
    y2: round(Math.sin(a) * 400),
  };
});

const COLUMNS = [90, 190, 300, 420, 540, 660, 770];

export const PlatformScene = memo(function PlatformScene({
  active = true,
  flash = false,
  compact = false,
  className = '',
}: {
  /** ambientní animace (rotace, dýchání sloupů) běží jen když je scéna na obrazovce */
  active?: boolean;
  /** jednorázový záblesk kruhu — spouští se po přistání poslední karty */
  flash?: boolean;
  /** miniatura na displeji notebooku — bez jemných detailů, co by při zmenšení zanikly */
  compact?: boolean;
  className?: string;
}) {
  const columns = useMemo(() => (compact ? COLUMNS.filter((_, i) => i % 2 === 0) : COLUMNS), [compact]);

  return (
    <svg
      viewBox="0 0 900 520"
      className={`pointer-events-none h-full w-full ${className}`}
      aria-hidden
      preserveAspectRatio="xMidYMax meet"
    >
      <defs>
        <radialGradient id="table-glow" cx="50%" cy="72%" r="50%">
          <stop offset="0%" stopColor="rgba(31,91,255,0.38)" />
          <stop offset="100%" stopColor="rgba(31,91,255,0)" />
        </radialGradient>
        <linearGradient id="column" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="rgba(61,123,255,0)" />
          <stop offset="55%" stopColor="rgba(61,123,255,0.55)" />
          <stop offset="100%" stopColor="rgba(190,214,255,0.95)" />
        </linearGradient>
      </defs>

      <ellipse cx="450" cy="380" rx="430" ry="130" fill="url(#table-glow)" />

      {!compact ? (
        <motion.g
          animate={flash ? { opacity: [0.85, 1, 0.85] } : { opacity: 0.85 }}
          transition={flash ? { duration: 0.9, times: [0, 0.4, 1] } : undefined}
        >
          {columns.map((x, i) => (
            <rect
              key={x}
              x={x}
              y={120 + (i % 3) * 34}
              width="2"
              height={190 - (i % 3) * 30}
              rx="1"
              fill="url(#column)"
              className={active ? 'column-breathe' : ''}
              style={{ animationDelay: `${i * 0.45}s` }}
            />
          ))}
        </motion.g>
      ) : null}

      <motion.g
        transform="translate(450 380)"
        className={active ? 'platform-spin' : ''}
        style={{ transformOrigin: '450px 380px' }}
      >
        <g transform="scale(1 0.3)">
          <motion.circle
            r="400"
            fill="none"
            stroke="rgba(120,160,255,0.28)"
            strokeWidth="1.4"
            animate={flash ? { stroke: ['rgba(120,160,255,0.28)', 'rgba(200,220,255,0.9)', 'rgba(120,160,255,0.28)'] } : undefined}
            transition={flash ? { duration: 0.9 } : undefined}
          />
          <circle r="340" fill="none" stroke="rgba(120,160,255,0.16)" strokeWidth="1" strokeDasharray="4 14" />
          <circle r="240" fill="none" stroke="rgba(120,160,255,0.2)" strokeWidth="1" />
          {!compact ? (
            <circle r="150" fill="none" stroke="rgba(120,160,255,0.24)" strokeWidth="1.2" strokeDasharray="22 16" />
          ) : null}
          {!compact
            ? RADIAL_LINES.map((line) => (
                <line
                  key={line.key}
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke="rgba(120,160,255,0.3)"
                  strokeWidth="1.2"
                />
              ))
            : null}
        </g>
      </motion.g>
    </svg>
  );
});
