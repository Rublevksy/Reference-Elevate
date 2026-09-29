'use client';

import { AnimatePresence, motion, useScroll, useSpring, useTransform, useVelocity } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Mascot } from './Mascot';
import { mascotCues, type MascotShot, type Pose } from '@/content/mascot';
import { useReducedMotion } from '@/lib/useReducedMotion';

const FULL_H = 300;
const WAIST_H = 460;
const WAIST_VISIBLE = 0.56;

/**
 * Průvodce — velká postava v rohu, pro každou sekci vlastní „záběr":
 * celá postava nebo do pasu (vykukuje zespodu), vlevo/vpravo, natočený
 * k obsahu nebo od něj. Při změně sekce odejde ze záběru a vrátí se
 * v novém. Setrvačnost scrollu ho jemně naklání, klik = zamávání.
 * Kde maskot hraje přímo ve scéně (hero, Proces, kontakt…), není vidět.
 */
export function MascotGuide() {
  const t = useTranslations('mascot');
  const reduced = useReducedMotion();
  const [cueId, setCueId] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);
  const [wave, setWave] = useState(false);
  const waveTimer = useRef<number | null>(null);

  const cue = mascotCues.find((item) => item.sectionId === cueId) ?? null;

  useEffect(() => {
    const sections = mascotCues
      .map((item) => document.getElementById(item.sectionId))
      .filter((node): node is HTMLElement => Boolean(node));
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setCueId(visible.target.id);
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.2, 0.6] },
    );
    sections.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { stiffness: 120, damping: 22 });
  const lean = useTransform(velocity, [-3000, 0, 3000], [-6, 0, 6], { clamp: true });
  const sink = useTransform(velocity, [-3000, 0, 3000], [-12, 0, 12], { clamp: true });

  useEffect(() => () => {
    if (waveTimer.current) window.clearTimeout(waveTimer.current);
  }, []);

  const onPoke = () => {
    setWave(true);
    if (waveTimer.current) window.clearTimeout(waveTimer.current);
    waveTimer.current = window.setTimeout(() => setWave(false), 1800);
  };

  const shot: MascotShot | undefined = cue?.shot;
  const visible = Boolean(cue && !cue.hidden && shot) && !closed;
  const pose: Pose = wave ? 'wave' : (cue?.pose ?? 'idle');
  const waist = shot?.framing === 'waist';
  const figureH = waist ? WAIST_H : FULL_H;
  const boxH = waist ? Math.round(WAIST_H * WAIST_VISIBLE) : FULL_H;
  const side = shot?.side ?? 'right';

  return (
    <div className={`pointer-events-none fixed bottom-0 z-[95] hidden md:block ${side === 'left' ? 'left-4' : 'right-4'}`}>
      <AnimatePresence mode="wait">
        {visible && shot ? (
          <motion.div
            key={`${cueId}`}
            className="group pointer-events-auto relative"
            initial={reduced ? { opacity: 0 } : { y: '110%', rotate: side === 'left' ? -8 : 8, filter: 'brightness(0.25) saturate(0.4)' }}
            animate={reduced ? { opacity: 1 } : { y: '0%', rotate: 0, filter: 'brightness(1) saturate(1)' }}
            exit={reduced ? { opacity: 0 } : { y: '110%', rotate: side === 'left' ? 6 : -6, filter: 'brightness(0.25) saturate(0.4)', transition: { duration: 0.35, ease: 'easeIn' } }}
            transition={{ type: 'spring', stiffness: 130, damping: 18, mass: 0.9 }}
            style={{ transformOrigin: '50% 100%' }}
          >
            <motion.button
              type="button"
              onClick={onPoke}
              aria-label={t('guideLabel')}
              className="block origin-bottom outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-bright)]"
              style={reduced ? undefined : { rotate: lean, y: sink }}
            >
              {/* do pasu: vyšší postava, spodek schovaný za okrajem obrazovky */}
              <div className="relative overflow-hidden" style={{ height: boxH, width: Math.round(figureH * 0.62) }}>
                <div className="absolute inset-x-0 top-0" style={{ height: figureH, transform: `perspective(900px) rotateY(${shot.turn}deg)`, transformOrigin: '50% 100%' }}>
                  <Mascot pose={pose} height={figureH} flip={Boolean(shot.flip)} followCursor />
                </div>
              </div>
            </motion.button>
            <button
              type="button"
              onClick={() => setClosed(true)}
              className={`absolute top-2 grid h-6 w-6 place-items-center rounded-full border border-[var(--line)] bg-[var(--bg-elevated)] text-[11px] text-muted opacity-0 transition-opacity hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 ${side === 'left' ? 'left-0' : 'right-0'}`}
              aria-label={t('collapse')}
            >
              ×
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
