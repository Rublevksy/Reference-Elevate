'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useEffect, useState } from 'react';

const LETTERS = ['E', 'L', 'E', 'V', 'A', 'T', 'E'];

/**
 * Úvodní clona: písmena ELEVATE naskáčou po jednom, z A vyletí modrá
 * šipka a odtáhne clonu nahoru. Jen při prvním načtení v rámci session.
 */
export function Preloader() {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const seen = sessionStorage.getItem('elevate:preloader');
    if (seen || reduced) {
      setVisible(false);
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow = 'hidden';
    const id = window.setTimeout(() => {
      sessionStorage.setItem('elevate:preloader', '1');
      setVisible(false);
      document.body.style.overflow = '';
    }, 1250);

    return () => {
      window.clearTimeout(id);
      document.body.style.overflow = '';
    };
  }, [reduced]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="preloader"
          className="fixed inset-0 z-[200] grid place-items-center bg-[var(--bg)]"
          exit={{ y: '-100%', transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1] } }}
          aria-hidden
        >
          <div className="relative">
            <div className="flex items-end font-display text-[13vw] font-bold leading-none tracking-[0.12em] sm:text-[72px]">
              {LETTERS.map((letter, index) => (
                <motion.span
                  key={`${letter}-${index}`}
                  initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ delay: 0.05 * index, duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                  className={letter === 'A' ? 'relative text-[var(--blue-bright)]' : ''}
                >
                  {letter}
                </motion.span>
              ))}
            </div>

            {/* šipka z A */}
            <motion.svg
              viewBox="0 0 120 120"
              className="absolute -right-10 -top-16 h-24 w-24 text-[var(--blue-bright)]"
              initial={{ opacity: 0, x: -30, y: 30, scale: 0.6 }}
              animate={{ opacity: [0, 1, 1, 0], x: [-30, 10, 40], y: [30, -10, -40], scale: 1 }}
              transition={{ delay: 0.6, duration: 0.7, ease: 'easeOut' }}
            >
              <path
                d="M20 100 L96 24"
                stroke="currentColor"
                strokeWidth="9"
                strokeLinecap="round"
              />
              <path
                d="M58 24 H96 V62"
                stroke="currentColor"
                strokeWidth="9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>

            <motion.div
              className="mt-6 h-px w-full origin-left bg-[var(--blue)]"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.1, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
