'use client';

import { motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { Fragment, createElement, type ElementType } from 'react';

type Props = {
  /**
   * Text rozdělený na části; část s accent=true se vybarví modře,
   * `newLine` ji na desktopu začne na novém řádku.
   */
  parts: { text: string; accent?: boolean; newLine?: boolean }[];
  as?: ElementType;
  className?: string;
  delay?: number;
  /** pro aria-labelledby ze sekce, která nadpis obaluje */
  id?: string;
};

/**
 * Česká typografie: jednopísmenná předložka nebo spojka (v, k, s, z, o, u,
 * a, i) nesmí zůstat na konci řádku — spojí se s dalším slovem pevnou mezerou.
 */
function joinPrepositions(tokens: string[]) {
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (/^[vkszouaiVKSZOUAI]$/.test(token) && i + 1 < tokens.length) {
      out.push(`${token}\u00a0${tokens[i + 1]}`);
      i += 1;
    } else out.push(token);
  }
  return out;
}

/**
 * Nadpis, který naskakuje po slovech zpod masky.
 * Slova zůstávají v textovém toku, takže screen reader i SEO
 * čtou souvislou větu.
 */
export function SplitHeading({ parts, as: Tag = 'h2', className = '', delay = 0, id }: Props) {
  const reduced = useReducedMotion();
  const words = parts.flatMap((part, partIndex) =>
    joinPrepositions(part.text.split(' ').filter(Boolean)).map((word, i) => ({
      word,
      accent: part.accent,
      key: `${partIndex}-${word}`,
      br: Boolean(part.newLine && i === 0 && partIndex > 0),
    })),
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
        {words.map(({ word, accent, key, br }, index) => (
          <Fragment key={`${key}-${index}`}>
          {br ? <br className="hidden md:inline" /> : null}
          <span className="inline-block overflow-hidden align-bottom">
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
          </Fragment>
        ))}
      </motion.span>
    </>
  );

  return createElement(Tag, { className, id }, content);
}
