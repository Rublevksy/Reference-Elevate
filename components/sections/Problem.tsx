'use client';

import Image from 'next/image';
import { motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { useReducedMotion } from '@/lib/useReducedMotion';

/** Kde kolem maskota visí otázky z bloku (v % scény) */
const SPOTS = [
  { top: '12%', left: '4%', rotate: -7, curve: 'M 120 300 C 90 230, 70 170, 62 120' },
  { top: '6%', right: '6%', rotate: 5, curve: 'M 240 300 C 300 220, 330 160, 342 108' },
  { top: '34%', left: '1%', rotate: -3, curve: 'M 130 320 C 95 320, 70 315, 52 310' },
  { top: '46%', right: '2%', rotate: 6, curve: 'M 250 330 C 300 330, 330 325, 352 322' },
];

export function Problem() {
  const t = useTranslations('problem');
  const reduced = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const [solved, setSolved] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const pairs = t.raw('pairs') as { q: string; a: string }[];

  const { scrollYProgress } = useScroll({
    target: section,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const value = Math.max(0, Math.min(1, (p - 0.12) / 0.56));
    setSolved(Math.round(value * pairs.length));
  });

  // hloubka: pozadí, postava a text se hýbou jinou rychlostí
  const bgY = useTransform(scrollYProgress, [0, 1], ['-5%', '6%']);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1.12, 1.02]);
  const charY = useTransform(scrollYProgress, [0, 1], ['8%', '-7%']);
  const coolOpacity = useTransform(scrollYProgress, [0.12, 0.72], [0, 1]);
  const warmOpacity = useTransform(scrollYProgress, [0.12, 0.6], [1, 0]);
  // kavárna na konci ustoupí do pozadí, scéna patří značce
  const cafeFade = useTransform(scrollYProgress, [0.15, 0.72], [1, 0.28]);
  const cafeOpacity = useTransform(scrollYProgress, [0.62, 0.82], [1, 0]);
  const heroOpacity = useTransform(scrollYProgress, [0.66, 0.86], [0, 1]);

  useEffect(() => {
    if (reduced) return;
    const onMove = (event: PointerEvent) => {
      const node = scene.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      setTilt({
        x: (event.clientX - (rect.left + rect.width / 2)) / rect.width,
        y: (event.clientY - (rect.top + rect.height / 2)) / rect.height,
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduced]);

  const allSolved = solved >= pairs.length;

  return (
    <section
      id="problem"
      ref={section}
      className="relative h-auto md:h-[240vh]"
      aria-labelledby="problem-title"
    >
      <div className="relative flex min-h-[86vh] items-center overflow-hidden md:sticky md:top-0 md:h-dvh">
        {/* --- pozadí kavárny, roztažené přes celou sekci --- */}
        <motion.div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{ y: reduced ? 0 : bgY, scale: reduced ? 1.05 : bgScale, opacity: reduced ? 0.4 : cafeFade }}
        >
          <Image
            src="/assets/cafe-bg.webp"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-center"
            style={{ filter: 'blur(2px)' }}
          />
        </motion.div>

        {/* teplý „před" a studený „po" grading — animujeme jen opacity vrstev */}
        <motion.div
          aria-hidden
          className="absolute inset-0 -z-10 mix-blend-color"
          style={{ opacity: reduced ? 0.3 : warmOpacity, background: 'linear-gradient(180deg, #a9601f, #7a3d12)' }}
        />
        <motion.div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            opacity: reduced ? 0.85 : coolOpacity,
            background:
              'linear-gradient(180deg, rgba(4,6,11,0.9), rgba(8,18,52,0.94) 45%, rgba(4,6,11,0.97)), radial-gradient(60% 50% at 50% 55%, rgba(31,91,255,0.4), transparent 70%)',
          }}
        />
        {/* vinětace + splynutí s pozadím stránky nahoře i dole */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(120% 80% at 50% 50%, transparent 35%, rgba(4,6,11,0.85) 100%), linear-gradient(180deg, var(--bg) 0%, transparent 18%, transparent 80%, var(--bg) 100%)',
          }}
        />

        <div className="shell grid w-full items-center gap-10 py-16 md:grid-cols-[1.05fr_0.95fr] md:py-0">
          {/* --- scéna --- */}
          <div ref={scene} className="relative mx-auto w-full max-w-[420px] md:max-w-none">
            <div className="relative mx-auto aspect-[3/4] w-full max-w-[420px]">
              {/* spojnice z bloku k otázkám */}
              <svg
                viewBox="0 0 400 420"
                className="pointer-events-none absolute inset-0 h-full w-full"
                aria-hidden
              >
                {SPOTS.map((spot, index) => (
                  <motion.path
                    key={index}
                    d={spot.curve}
                    fill="none"
                    stroke={solved > index ? 'rgba(61,123,255,0.5)' : 'rgba(255,240,214,0.35)'}
                    strokeWidth="1.2"
                    strokeDasharray="3 5"
                    initial={{ pathLength: reduced ? 1 : 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.1, delay: 0.2 + index * 0.12 }}
                  />
                ))}
              </svg>

              {/* postava — dvě vrstvy, které se prolnou */}
              <motion.div
                className="absolute inset-0"
                style={{
                  y: reduced ? 0 : charY,
                  x: reduced ? 0 : tilt.x * -14,
                  rotate: reduced ? 0 : tilt.x * 1.6,
                }}
              >
                <motion.div className="absolute inset-0" style={{ opacity: reduced ? 1 : cafeOpacity }}>
                  <Image
                    src="/assets/mascot-cafe-cutout.png"
                    alt=""
                    aria-hidden
                    fill
                    sizes="(max-width: 768px) 90vw, 420px"
                    className="object-contain object-bottom drop-shadow-[0_40px_60px_rgba(0,0,0,0.75)]"
                  />
                </motion.div>
                <motion.div className="absolute inset-0" style={{ opacity: reduced ? 0 : heroOpacity }}>
                  <Image
                    src="/assets/mascot-fullbody.png"
                    alt=""
                    aria-hidden
                    fill
                    sizes="(max-width: 768px) 90vw, 420px"
                    className="object-contain object-bottom drop-shadow-[0_40px_60px_rgba(0,0,0,0.75)]"
                  />
                </motion.div>
              </motion.div>

              {/* otázky → odpovědi */}
              {pairs.map((pair, index) => {
                const done = solved > index;
                const spot = SPOTS[index];
                return (
                  <motion.div
                    key={pair.q}
                    className="absolute z-10"
                    style={{ top: spot.top, left: spot.left, right: spot.right }}
                    initial={{ opacity: 0, y: 14, rotate: spot.rotate }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.25 + index * 0.14, duration: 0.6 }}
                  >
                    <motion.div animate={{ rotate: done ? 0 : spot.rotate }} transition={{ duration: 0.5 }}>
                      {/* rukopisná otázka */}
                      <motion.div
                        className="relative"
                        animate={{ opacity: done ? 0 : 1, scale: done ? 0.9 : 1 }}
                        transition={{ duration: 0.35 }}
                      >
                        <span className="handwritten whitespace-nowrap text-[26px] leading-none text-[#fff0d6] drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)] md:text-[30px]">
                          {pair.q}
                        </span>
                        <svg
                          viewBox="0 0 120 20"
                          preserveAspectRatio="none"
                          className="absolute left-0 top-1/2 h-4 w-full -translate-y-1/2"
                          aria-hidden
                        >
                          <motion.path
                            d="M4 12 C 30 6, 70 16, 116 8"
                            fill="none"
                            stroke="#ff6b4a"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: done ? 1 : 0 }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                          />
                        </svg>
                      </motion.div>

                      {/* odpověď v ELEVATE stylu */}
                      <motion.div
                        className="absolute left-0 top-0 flex items-center gap-2 whitespace-nowrap rounded-xl border border-[rgba(61,123,255,0.55)] bg-[rgba(10,18,40,0.88)] px-3 py-2 text-sm text-ink shadow-[0_0_26px_rgba(31,91,255,0.35)] backdrop-blur-sm"
                        initial={false}
                        animate={{
                          opacity: done ? 1 : 0,
                          scale: done ? 1 : 0.7,
                          y: done ? 0 : 10,
                        }}
                        transition={{ duration: 0.45, delay: done ? 0.2 : 0, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <Check className="h-4 w-4 shrink-0 text-[var(--blue-bright)]" aria-hidden />
                        {pair.a}
                      </motion.div>
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* --- text --- */}
          <div className="relative z-10">
            <motion.p
              className="eyebrow"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              {allSolved ? t('after') : t('before')}
            </motion.p>

            <SplitHeading
              as="h2"
              className="mt-4 font-display text-[clamp(1.8rem,4vw,3rem)] font-bold uppercase leading-[1.08]"
              parts={[{ text: t('title') + ' ' }, { text: t('titleAccent'), accent: true }]}
            />

            <motion.p
              className="mt-6 max-w-md text-base leading-relaxed text-muted"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              {t('lead')}
            </motion.p>

            <ul className="mt-8 space-y-3">
              {pairs.map((pair, index) => {
                const done = solved > index;
                return (
                  <li key={pair.a} className="flex items-center gap-3 text-sm">
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors duration-500 ${
                        done
                          ? 'border-[var(--blue-bright)] bg-[rgba(31,91,255,0.18)] text-[var(--blue-bright)]'
                          : 'border-[var(--line)] text-muted'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <span className={done ? 'text-ink' : 'text-muted'}>
                      <span className={done ? 'line-through decoration-[var(--blue)]/60' : ''}>{pair.q}</span>{' '}
                      <span aria-hidden>→</span> {pair.a}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-9">
              <Button href="#sluzby" variant="outline">
                {t('cta')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
