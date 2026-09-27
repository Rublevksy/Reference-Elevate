'use client';

import { motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { createElement, type ElementType } from 'react';

type Props = {
  /** Text rozdělený na části; část s accent=true se vybarví modře */
  parts: { text: string; accent?: boolean }[];
  as?: ElementType;
  className?: string;
  delay?: number;
  /** pro aria-labelledby ze sekce, která nadpis obaluje */
  id?: string;
};

/**
 * Nadpis, který naskakuje po slovech zpod masky.
 * Slova zůstávají v textovém toku, takže screen reader i SEO
 * čtou souvislou větu.
 */
export function SplitHeading({ parts, as: Tag = 'h2', className = '', delay = 0, id }: Props) {
  const reduced = useReducedMotion();
  const words = parts.flatMap((part, partIndex) =>
    part.text
      .split(' ')
      .filter(Boolean)
      .map((word) => ({ word, accent: part.accent, key: `${partIndex}-${word}` })),
  );

  const content = (
    <>
      <motion.span
        className="inline"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-10% 0px' }}
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: reduced ? 0 : 0.045, delayChildren: delay } },
        }}
      >
        {words.map(({ word, accent, key }, index) => (
          <span key={`${key}-${index}`} className="inline-block overflow-hidden align-bottom">
            <motion.span
              className={`inline-block ${accent ? 'text-[var(--blue-bright)]' : ''}`}
              variants={
                reduced
                  ? { hidden: { opacity: 0, y: '0%' }, show: { opacity: 1, y: '0%' } }
                  : {
                      hidden: { y: '110%', opacity: 0 },
                      show: {
                        y: '0%',
                        opacity: 1,
                        transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] },
                      },
                    }
              }
            >
              {word}
              {' '}
            </motion.span>
          </span>
        ))}
      </motion.span>
    </>
  );

  return createElement(Tag, { className, id }, content);
}
