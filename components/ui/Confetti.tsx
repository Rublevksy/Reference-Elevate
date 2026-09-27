'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';

const COLORS = ['#1f5bff', '#3d7bff', '#9db8ff', '#f2f5ff'];

/** Modré konfety po odeslání formuláře. */
export function Confetti({ count = 46 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }).map((_, index) => ({
        id: index,
        x: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 1.6 + Math.random() * 1.4,
        size: 5 + Math.random() * 7,
        rotate: Math.random() * 360,
        color: COLORS[index % COLORS.length],
      })),
    [count],
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((piece) => (
        <motion.span
          key={piece.id}
          className="absolute top-0 rounded-[2px]"
          style={{
            left: `${piece.x}%`,
            width: piece.size,
            height: piece.size * 1.6,
            backgroundColor: piece.color,
          }}
          initial={{ y: -30, opacity: 0, rotate: piece.rotate }}
          animate={{ y: '110%', opacity: [0, 1, 1, 0], rotate: piece.rotate + 240 }}
          transition={{ duration: piece.duration, delay: piece.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}
