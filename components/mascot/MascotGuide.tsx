'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Mascot } from './Mascot';
import { SpeechBubble } from './SpeechBubble';
import { useTranslations } from 'next-intl';
import { mascotCues, type Pose } from '@/content/mascot';

const IDLE_MS = 20_000;

/**
 * Průvodce v pravém dolním rohu. Sleduje, nad kterou sekcí uživatel je,
 * a podle content/mascot.ts mění pózu i repliku. Ve velkých scénách
 * (hero, stůl karet, proces) se schová — tam maskot vystupuje přímo ve scéně.
 */
export function MascotGuide() {
  const t = useTranslations('mascot');
  const [cueId, setCueId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [override, setOverride] = useState<{ text: string; pose: Pose } | null>(null);
  const idleTimer = useRef<number | null>(null);

  const cue = mascotCues.find((item) => item.sectionId === cueId) ?? null;

  useEffect(() => {
    const sections = mascotCues
      .map((item) => document.getElementById(item.sectionId))
      .filter((node): node is HTMLElement => Boolean(node));

    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          setCueId(visible.target.id);
          setDismissed(false);
          setOverride(null);
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.2, 0.6] },
    );

    sections.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  // Nečinnost na kontaktu → jemné pošťouchnutí
  const resetIdle = useCallback(() => {
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    if (cueId !== 'kontakt') return;
    idleTimer.current = window.setTimeout(() => {
      setOverride({ text: t('idleNudge'), pose: 'point' });
      setDismissed(false);
    }, IDLE_MS);
  }, [cueId, t]);

  useEffect(() => {
    resetIdle();
    const events: (keyof WindowEventMap)[] = ['pointermove', 'keydown', 'scroll', 'pointerdown'];
    events.forEach((event) => window.addEventListener(event, resetIdle, { passive: true }));
    return () => {
      events.forEach((event) => window.removeEventListener(event, resetIdle));
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, [resetIdle]);

  const onPoke = () => {
    if (minimized) {
      setMinimized(false);
      setDismissed(false);
      return;
    }
    const lines = t.raw('random') as string[];
    const line = lines[Math.floor(Math.random() * lines.length)];
    setOverride({ text: line, pose: 'wave' });
    setDismissed(false);
  };

  const hidden = !cue || (cue.hidden && !override);
  const pose = override?.pose ?? cue?.pose ?? 'idle';
  const text = override?.text ?? (cue ? t(`cues.${cue.cue}`) : '');

  return (
    <div className="pointer-events-none fixed bottom-5 right-4 z-[95] hidden items-end gap-3 md:flex">
      <AnimatePresence mode="wait">
        {!hidden && !dismissed && !minimized && text ? (
          <SpeechBubble
            key={text}
            text={text}
            compact
            side="right"
            className="pointer-events-auto mb-3"
            onClose={() => setDismissed(true)}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {!hidden ? (
          <motion.div
            key="guide"
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto relative"
          >
            <button
              type="button"
              onClick={onPoke}
              onDoubleClick={() => setMinimized(true)}
              aria-label={minimized ? t('expand') : t('guideLabel')}
              className={`glass group relative grid place-items-center overflow-hidden rounded-full transition-all duration-500 ${
                minimized ? 'h-14 w-14' : 'h-24 w-24'
              }`}
            >
              <span
                aria-hidden
                className="absolute inset-0 rounded-full opacity-70"
                style={{ background: 'radial-gradient(circle at 50% 120%, rgba(31,91,255,0.4), transparent 60%)' }}
              />
              <Mascot pose={pose} height={minimized ? 56 : 96} bust followCursor={!minimized} />
            </button>

            {!minimized ? (
              <button
                type="button"
                onClick={() => setMinimized(true)}
                className="absolute -left-1 -top-1 grid h-6 w-6 place-items-center rounded-full border border-[var(--line)] bg-[var(--bg-elevated)] text-[10px] text-muted transition-colors hover:text-ink"
                aria-label={t('collapse')}
              >
                –
              </button>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
