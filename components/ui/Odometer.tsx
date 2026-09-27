'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { useReducedMotion } from '@/lib/useReducedMotion';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** Cena, jejíž číslice se protočí jako na bubnovém počítadle. */
export function Odometer({ value, className = '' }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10%' });
  const reduced = useReducedMotion();

  return (
    <span ref={ref} role="text" className={`inline-flex items-baseline tabular-nums ${className}`} aria-label={value}>
      {value.split('').map((char, index) => {
        const digit = DIGITS.indexOf(char);
        if (digit < 0) {
          // stejná metrika jako číslice, jinak by písmena „skákala" o pár pixelů
          return (
            <span
              key={index}
              aria-hidden
              className={`inline-block ${char === ' ' ? 'w-[0.26em]' : ''}`}
              style={{ height: '1em', lineHeight: '1em' }}
            >
              {char === ' ' ? '' : char}
            </span>
          );
        }
        return (
          <span key={index} aria-hidden className="relative inline-block overflow-hidden" style={{ height: '1em' }}>
            <motion.span
              className="flex flex-col"
              initial={{ y: reduced ? `-${digit}em` : '0em' }}
              animate={inView ? { y: `-${digit}em` } : undefined}
              transition={{
                duration: reduced ? 0 : 1.1,
                delay: reduced ? 0 : 0.06 * index,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {DIGITS.map((d) => (
                <span key={d} style={{ height: '1em', lineHeight: '1em' }}>
                  {d}
                </span>
              ))}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
}
