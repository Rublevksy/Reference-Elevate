'use client';

import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { useRef } from 'react';
import { useReducedMotion } from '@/lib/useReducedMotion';

export type TransitionVariant =
  | 'cardToPanel'
  | 'panelCollapseRise'
  | 'glitchTimeline'
  | 'timelineUnfurl'
  | 'devicesToCard'
  | 'fanRing';

/**
 * Framer's scrollYProgress reaches 1 at scrollY = sectionTop + (sectionHeight
 * - viewportHeight), NE sectionTop+sectionHeight — proto je tu vždy +100vh
 * navrch, jinak by se celá scéna „odbyla" na jediném pixelu scrollu.
 */
const HEIGHT: Record<TransitionVariant, string> = {
  cardToPanel: '190vh',
  panelCollapseRise: '180vh',
  glitchTimeline: '190vh',
  timelineUnfurl: '170vh',
  devicesToCard: '180vh',
  fanRing: '180vh',
};

/**
 * Přechodová scéna mezi dvěma sekcemi — každá varianta jiný, výhradně
 * transform/opacity motiv (bezpečné pro scroll-scrubbing), aby na styku
 * sekcí nikdy nebyla prázdná tmavá plocha. Na mobilu se nevykresluje
 * (sekce tam na sebe navazují běžným tokem, bez pinningu, takže mezera
 * nevzniká) a při `prefers-reduced-motion` je nahrazená tichým prolnutím.
 */
export function TransitionScene({ variant }: { variant: TransitionVariant }) {
  const reduced = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });

  if (reduced) {
    return (
      <section aria-hidden className="relative hidden h-28 md:block">
        <motion.div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-30% 0px' }}
          transition={{ duration: 0.8 }}
        >
          <span className="h-px w-1/3 bg-gradient-to-r from-transparent via-[rgba(120,160,255,0.5)] to-transparent" />
        </motion.div>
      </section>
    );
  }

  return (
    <section ref={section} aria-hidden className="relative hidden md:block" style={{ height: HEIGHT[variant] }}>
      <div className="sticky top-0 flex h-dvh items-center justify-center overflow-hidden bg-[var(--bg)]">
        <Variant variant={variant} p={scrollYProgress} />
      </div>
    </section>
  );
}

function Variant({ variant, p }: { variant: TransitionVariant; p: MotionValue<number> }) {
  switch (variant) {
    case 'cardToPanel':
      return <CardToPanel p={p} />;
    case 'panelCollapseRise':
      return <PanelCollapseRise p={p} />;
    case 'glitchTimeline':
      return <GlitchTimeline p={p} />;
    case 'timelineUnfurl':
      return <TimelineUnfurl p={p} />;
    case 'devicesToCard':
      return <DevicesToCard p={p} />;
    case 'fanRing':
      return <FanRing p={p} />;
  }
}

/** 1 — aktivní karta se přiblíží, otočí a rozroste do prvního panelu služeb. */
function CardToPanel({ p }: { p: MotionValue<number> }) {
  const scale = useTransform(p, [0, 0.75], [1, 7]);
  const rotate = useTransform(p, [0, 0.5], [0, 14]);
  const rotateY = useTransform(p, [0, 0.6], [0, 180]);
  const radius = useTransform(p, [0, 0.75], [24, 0]);
  const opacity = useTransform(p, [0.72, 0.95], [1, 0]);
  const glow = useTransform(p, [0, 0.4, 0.75], [0.5, 1, 0]);

  return (
    <>
      <motion.div
        className="absolute h-[240px] w-[150px] border border-[rgba(61,123,255,0.55)]"
        style={{
          scale,
          rotate,
          rotateY,
          borderRadius: radius,
          opacity,
          background: 'linear-gradient(165deg,rgba(18,30,70,0.96),rgba(6,10,22,0.98))',
          boxShadow: '0 0 60px rgba(31,91,255,0.5)',
        }}
      />
      <motion.div
        className="absolute inset-0"
        style={{ opacity: glow, background: 'radial-gradient(60% 50% at 50% 50%, rgba(31,91,255,0.22), transparent 72%)' }}
      />
    </>
  );
}

/** 2 — poslední panel se sroluje a odplyne, z hloubky se vynoří obrys notebooku. */
function PanelCollapseRise({ p }: { p: MotionValue<number> }) {
  const panelScaleY = useTransform(p, [0, 0.45], [1, 0]);
  const panelOpacity = useTransform(p, [0.3, 0.48], [1, 0]);
  const macY = useTransform(p, [0.35, 0.85], [80, 0]);
  const macOpacity = useTransform(p, [0.35, 0.6, 0.9], [0, 0.9, 0.4]);
  const macScale = useTransform(p, [0.35, 0.85], [0.82, 1]);

  return (
    <>
      <motion.div
        className="absolute h-[70vh] w-[46vw] max-w-[560px] rounded-[28px] border border-[rgba(61,123,255,0.35)]"
        style={{
          scaleY: panelScaleY,
          opacity: panelOpacity,
          background: 'linear-gradient(165deg,rgba(14,22,48,0.9),rgba(5,8,16,0.96))',
        }}
      />
      <motion.svg
        viewBox="0 0 200 120"
        className="absolute w-[42vw] max-w-[460px] text-[rgba(120,160,255,0.55)]"
        style={{ y: macY, opacity: macOpacity, scale: macScale }}
      >
        <path
          d="M20 96 L180 96 L192 108 L8 108 Z"
          fill="rgba(10,16,34,0.9)"
          stroke="currentColor"
          strokeWidth="1"
        />
        <rect x="34" y="10" width="132" height="86" rx="6" fill="rgba(4,6,11,0.9)" stroke="currentColor" strokeWidth="1.4" />
        <rect x="42" y="18" width="116" height="70" rx="2" fill="none" stroke="rgba(80,120,255,0.35)" strokeWidth="0.8" />
      </motion.svg>
    </>
  );
}

/** 3 — obrazovka zablikne / rozjede se do stran, zpoza vyjede časová osa procesu. */
function GlitchTimeline({ p }: { p: MotionValue<number> }) {
  const barsOpacity = useTransform(p, [0, 0.22, 0.4], [0, 1, 0]);
  const bar1X = useTransform(p, [0.05, 0.15, 0.25], [0, -18, 0]);
  const bar2X = useTransform(p, [0.08, 0.18, 0.28], [0, 14, 0]);
  const flash = useTransform(p, [0.18, 0.24, 0.3], [0, 1, 0]);
  const pull = useTransform(p, [0.3, 0.55], [1, 0.9]);
  const pullOpacity = useTransform(p, [0.3, 0.42], [1, 0]);
  const lineScale = useTransform(p, [0.42, 0.9], [0, 1]);
  const lineOpacity = useTransform(p, [0.42, 0.55], [0, 1]);

  return (
    <>
      <motion.div className="absolute h-1 w-[60vw] max-w-[640px] bg-[rgba(120,180,255,0.5)]" style={{ opacity: barsOpacity, x: bar1X, top: '42%' }} />
      <motion.div className="absolute h-[2px] w-[50vw] max-w-[540px] bg-[rgba(255,120,180,0.35)]" style={{ opacity: barsOpacity, x: bar2X, top: '58%' }} />
      <motion.div className="absolute inset-0 bg-white" style={{ opacity: useTransform(flash, (v) => v * 0.06) }} />
      <motion.div
        className="absolute h-24 w-24 rounded-full border border-[rgba(120,160,255,0.4)]"
        style={{ scale: pull, opacity: pullOpacity }}
      />
      <motion.div className="absolute flex flex-col items-center gap-6" style={{ opacity: lineOpacity }}>
        <motion.span
          className="w-px bg-gradient-to-b from-transparent via-[var(--blue-bright)] to-transparent"
          style={{ height: 260, scaleY: lineScale, transformOrigin: 'top' }}
        />
      </motion.div>
    </>
  );
}

/** 4 — poslední úsečka časové osy vystřelí vpřed a rozvine se do dělítek referencí. */
function TimelineUnfurl({ p }: { p: MotionValue<number> }) {
  const shootScaleX = useTransform(p, [0, 0.4], [0, 1]);
  const shootOpacity = useTransform(p, [0.55, 0.75], [1, 0]);
  const dividerOpacity = useTransform(p, [0.45, 0.65], [0, 1]);
  const dividerWidth = useTransform(p, [0.45, 0.85], ['0%', '100%']);

  return (
    <div className="relative w-full max-w-3xl px-10">
      <motion.div
        className="h-px w-full origin-left bg-gradient-to-r from-[var(--blue-bright)] via-[rgba(120,160,255,0.7)] to-transparent"
        style={{ scaleX: shootScaleX, opacity: shootOpacity }}
      />
      <div className="mt-10 space-y-8">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-px bg-[var(--line)]"
            style={{ width: dividerWidth, opacity: dividerOpacity }}
            transition={{ delay: i * 0.05 }}
          />
        ))}
      </div>
    </div>
  );
}

/** 5 — notebook a telefon se zmenší a uletí, splynou v jednu zářící kartu ceníku. */
function DevicesToCard({ p }: { p: MotionValue<number> }) {
  const macX = useTransform(p, [0, 0.5], [-90, 0]);
  const macScale = useTransform(p, [0, 0.5], [1, 0.2]);
  const macOpacity = useTransform(p, [0, 0.45, 0.55], [1, 1, 0]);
  const phoneX = useTransform(p, [0, 0.5], [90, 0]);
  const phoneScale = useTransform(p, [0, 0.5], [1, 0.2]);
  const phoneOpacity = useTransform(p, [0, 0.45, 0.55], [1, 1, 0]);

  const cardScale = useTransform(p, [0.5, 0.85], [0.3, 1]);
  const cardRotateY = useTransform(p, [0.5, 0.85], [90, 0]);
  const cardOpacity = useTransform(p, [0.5, 0.65], [0, 1]);

  return (
    <>
      <motion.div
        className="absolute h-[30vh] w-[26vw] max-w-[280px] rounded-2xl border border-[rgba(80,120,255,0.35)]"
        style={{ x: macX, scale: macScale, opacity: macOpacity, background: 'linear-gradient(165deg,rgba(14,22,48,0.9),rgba(5,8,16,0.96))' }}
      />
      <motion.div
        className="absolute h-[26vh] w-[11vw] max-w-[120px] rounded-[1.4rem] border border-[rgba(80,120,255,0.35)]"
        style={{ x: phoneX, scale: phoneScale, opacity: phoneOpacity, background: 'linear-gradient(165deg,rgba(14,22,48,0.9),rgba(5,8,16,0.96))' }}
      />
      <motion.div
        className="absolute h-[38vh] w-[24vw] max-w-[260px] rounded-[28px] border border-[rgba(61,123,255,0.6)]"
        style={{
          scale: cardScale,
          rotateY: cardRotateY,
          opacity: cardOpacity,
          background: 'linear-gradient(165deg,rgba(18,30,70,0.96),rgba(6,10,22,0.98))',
          boxShadow: '0 0 60px rgba(31,91,255,0.4)',
        }}
      />
    </>
  );
}

function FanCard({ p, offset }: { p: MotionValue<number>; offset: number }) {
  const fold = useTransform(p, [0, 0.42], [0, 1]);
  const fanOpacity = useTransform(p, [0.32, 0.42], [1, 0]);
  const rotate = useTransform(fold, [0, 1], [offset * 0.12, offset]);
  const x = useTransform(fold, [0, 1], [offset * 1.6, 0]);
  const scale = useTransform(fold, [0, 1], [1, 0.15]);

  return (
    <motion.div
      className="absolute h-[36vh] w-[16vw] max-w-[170px] rounded-2xl border border-[rgba(80,120,255,0.4)]"
      style={{
        rotate,
        x,
        scale,
        opacity: fanOpacity,
        background: 'linear-gradient(165deg,rgba(14,22,48,0.9),rgba(5,8,16,0.96))',
      }}
    />
  );
}

/** 6 — karty ceníku se sklopí do středu, prstenec světla se rozšíří a odhalí kontakt. */
function FanRing({ p }: { p: MotionValue<number> }) {
  const ringScale = useTransform(p, [0.4, 0.85], [0.1, 5]);
  const ringOpacity = useTransform(p, [0.4, 0.55, 0.85], [0, 0.8, 0]);

  return (
    <>
      <FanCard p={p} offset={-90} />
      <FanCard p={p} offset={0} />
      <FanCard p={p} offset={90} />
      <motion.div
        className="absolute h-40 w-40 rounded-full border-2 border-[var(--blue-bright)]"
        style={{ scale: ringScale, opacity: ringOpacity }}
      />
    </>
  );
}
