'use client';

import { motion } from 'framer-motion';
import { Circle, MousePointer2, PenTool, Square, Type } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { BrowserFrame } from './Frame';
import { useSteps } from './useSteps';

const TOOLS = [PenTool, Type, Square, Circle];
/** kam v rámci mockupu „odskočí" kurzor designéra v jednotlivých krocích */
const CURSOR = [
  { x: '8%', y: '28%' },
  { x: '8%', y: '46%' },
  { x: '46%', y: '38%' },
  { x: '70%', y: '62%' },
  { x: '52%', y: '88%' },
  { x: '52%', y: '88%' },
];

const WIDTHS = ['100%', '74%', '46%'];

function NightBuilding({ lit }: { lit: boolean }) {
  return (
    <svg viewBox="0 0 320 180" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1228" />
          <stop offset="100%" stopColor="#04060b" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="url(#sky)" />
      <rect x="40" y="58" width="150" height="86" fill="#0c111c" stroke="rgba(120,160,255,0.3)" />
      <rect x="190" y="82" width="92" height="62" fill="#0a0e18" stroke="rgba(120,160,255,0.25)" />
      <rect x="40" y="144" width="242" height="6" fill="#070a12" />
      {Array.from({ length: 12 }).map((_, index) => (
        <motion.rect
          key={index}
          x={52 + (index % 6) * 24}
          y={index < 6 ? 72 : 106}
          width="15"
          height="20"
          fill={lit ? '#f7c77a' : '#101725'}
          initial={false}
          animate={{ opacity: lit ? [0.45, 1, 0.75] : 0.25 }}
          transition={{ duration: 3 + index * 0.3, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      {Array.from({ length: 4 }).map((_, index) => (
        <rect key={index} x={202 + index * 20} y={96} width="12" height="16" fill={lit ? '#9fc2ff' : '#101725'} opacity="0.7" />
      ))}
      <ellipse cx="160" cy="160" rx="120" ry="12" fill="rgba(61,123,255,0.16)" />
    </svg>
  );
}

/**
 * 04 — kurzor designéra bere nástroje z lišty a maluje: rámečky → barvy
 * → fotka → layout se přeskládá pro tablet a mobil.
 */
export function DesignMockup({ active }: { active: boolean }) {
  const t = useTranslations('mockups.design');
  const step = useSteps(active, 6, 720);

  const devices = t.raw('devices') as string[];
  const colored = step >= 2;
  const photo = step >= 3;
  const deviceIndex = step >= 5 ? 2 : step >= 4 ? 1 : 0;
  const toolIndex = Math.min(3, Math.max(0, step - 1));
  const cursor = CURSOR[Math.min(CURSOR.length - 1, step)];

  return (
    <div className="relative">
      {/* lišta nástrojů */}
      <div className="absolute -left-3 top-1/2 z-10 hidden -translate-y-1/2 flex-col gap-1.5 rounded-xl border border-[var(--line)] bg-[rgba(8,12,22,0.92)] p-1.5 backdrop-blur md:flex">
        {TOOLS.map((Tool, index) => (
          <motion.span
            key={index}
            className="grid h-8 w-8 place-items-center rounded-lg"
            animate={{
              backgroundColor: index === toolIndex && step > 0 ? 'rgba(31,91,255,0.28)' : 'rgba(0,0,0,0)',
              color: index === toolIndex && step > 0 ? 'rgb(61,123,255)' : 'rgb(138,147,168)',
            }}
            transition={{ duration: 0.3 }}
          >
            <Tool className="h-4 w-4" aria-hidden />
          </motion.span>
        ))}
      </div>

      <motion.div
        animate={{ width: WIDTHS[deviceIndex] }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto"
      >
        <BrowserFrame label="studio-architektura.cz">
          <div className="relative aspect-[16/10] w-full overflow-hidden">
            <motion.div className="absolute inset-0" animate={{ opacity: photo ? 1 : 0 }} transition={{ duration: 0.8 }}>
              <NightBuilding lit={photo} />
            </motion.div>

            {/* drátěný model se prokresluje */}
            <motion.svg
              viewBox="0 0 320 180"
              className="absolute inset-0 h-full w-full text-[rgba(140,175,255,0.5)]"
              animate={{ opacity: photo ? 0.12 : 1 }}
            >
              {[
                { d: 'M18 16 H302 V34 H18 Z', delay: 0 },
                { d: 'M18 46 H168 V56 H18 Z', delay: 0.15 },
                { d: 'M18 64 H128 V72 H18 Z', delay: 0.3 },
                { d: 'M18 88 H90 V108 H18 Z', delay: 0.45 },
                { d: 'M18 124 H302 V164 H18 Z', delay: 0.6 },
              ].map((rect, index) => (
                <motion.path
                  key={index}
                  d={rect.d}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.9"
                  strokeDasharray={index === 4 ? '4 4' : undefined}
                  initial={false}
                  animate={{ pathLength: step >= 1 ? 1 : 0 }}
                  transition={{ duration: 0.7, delay: rect.delay }}
                />
              ))}
            </motion.svg>

            <div className="relative flex h-full flex-col justify-center p-5">
              <motion.span
                className="text-[9px] uppercase tracking-[0.25em]"
                animate={{ color: colored ? 'rgba(61,123,255,1)' : 'rgba(138,147,168,1)' }}
              >
                {t('nav')}
              </motion.span>
              <motion.p
                className="mt-4 font-display text-base font-bold uppercase leading-tight md:text-xl"
                animate={{ opacity: colored ? 1 : 0.32 }}
              >
                {t('headline1')}
                <br />
                {t('headline2')}
              </motion.p>
              <motion.span className="mt-1.5 text-[10px] text-muted" animate={{ opacity: colored ? 1 : 0.28 }}>
                {t('sub')}
              </motion.span>
              <motion.span
                className="mt-3 w-fit rounded-md px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-white"
                animate={{
                  backgroundColor: colored ? 'rgba(31,91,255,1)' : 'rgba(255,255,255,0.08)',
                  boxShadow: colored ? '0 0 22px rgba(31,91,255,0.5)' : '0 0 0 rgba(0,0,0,0)',
                }}
              >
                {t('cta')}
              </motion.span>
            </div>

            {/* kurzor designéra */}
            <motion.span
              className="pointer-events-none absolute z-20 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]"
              initial={false}
              animate={{ left: cursor.x, top: cursor.y, opacity: active && step < 6 ? 1 : 0 }}
              transition={{ type: 'spring', stiffness: 120, damping: 18 }}
            >
              <MousePointer2 className="h-4 w-4 fill-white" aria-hidden />
            </motion.span>
          </div>
        </BrowserFrame>
      </motion.div>

      <div className="mt-3 flex justify-center gap-2">
        {devices.map((label, index) => (
          <span
            key={label}
            className={`rounded-full border px-3 py-1 text-[9px] uppercase tracking-widest transition-colors ${
              deviceIndex === index ? 'border-[rgba(61,123,255,0.6)] text-ink' : 'border-[var(--line)] text-muted'
            }`}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
