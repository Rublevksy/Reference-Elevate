'use client';

import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { LaptopShell } from '@/components/mockups/LaptopShell';
import { PhoneFrame } from '@/components/mockups/Frame';
import { cases } from '@/content/cases';
import { useReducedMotion } from '@/lib/useReducedMotion';

const COUNT = cases.length;

function DevicePair({
  slug,
  desktopRatio,
  mobileRatio,
  progress,
  hovered,
  accent,
}: {
  slug: string;
  desktopRatio: number;
  mobileRatio: number;
  progress: number;
  hovered: boolean;
  accent: string;
}) {
  // screenshot uvnitř zařízení se posouvá podle toho, jak projekt prochází středem
  const shift = Math.max(0, Math.min(1, progress));

  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-10 -z-10 rounded-full opacity-50 blur-3xl"
        style={{ background: `radial-gradient(circle, ${accent}55, transparent 68%)` }}
      />

      <LaptopShell className="w-[min(46vw,520px)]" screenClassName="aspect-[16/10]" signature={false}>
        <div className="absolute inset-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <motion.img
            src={`/cases/${slug}/desktop.jpg`}
            alt=""
            aria-hidden
            loading="lazy"
            className="absolute inset-x-0 top-0 w-full max-w-none"
            animate={{
              // posun je v % vlastní výšky obrázku: viditelné okno = 62,5 % šířky
              y: `${-shift * Math.max(0, 100 - 62.5 / desktopRatio)}%`,
              opacity: hovered ? 0 : 1,
            }}
            transition={{ type: 'tween', duration: 0.25, ease: 'linear' }}
          />
          {hovered ? (
            <video
              className="absolute inset-0 h-full w-full object-cover object-top"
              src={`/cases/${slug}/desktop.mp4`}
              poster={`/cases/${slug}/desktop-poster.jpg`}
              preload="none"
              muted
              loop
              autoPlay
              playsInline
            />
          ) : null}
        </div>
      </LaptopShell>

      <div className="absolute -bottom-10 -right-4 w-[124px] md:-right-10 md:w-[150px]">
        <PhoneFrame className="!w-full">
          <div className="relative aspect-[390/844] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
          <motion.img
              src={`/cases/${slug}/mobile.jpg`}
              alt=""
              aria-hidden
              loading="lazy"
              className="absolute inset-x-0 top-0 w-full max-w-none"
              animate={{ y: `${-shift * Math.max(0, 100 - 216.4 / mobileRatio)}%` }}
              transition={{ type: 'tween', duration: 0.25, ease: 'linear' }}
            />
          </div>
        </PhoneFrame>
      </div>
    </div>
  );
}

export function Cases() {
  const t = useTranslations('cases');
  const tItems = useTranslations('cases.items');
  const reduced = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const [local, setLocal] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);

  const { scrollYProgress } = useScroll({
    target: section,
    offset: ['start start', 'end end'],
  });

  const x = useSpring(useTransform(scrollYProgress, [0, 1], ['0%', `-${((COUNT - 1) / COUNT) * 100}%`]), {
    stiffness: 90,
    damping: 26,
    restDelta: 0.001,
  });

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const raw = Math.max(0, Math.min(0.999, p)) * COUNT;
    setIndex(Math.floor(raw));
    setLocal(raw % 1);
  });

  const tags = t.raw('tags') as string[];
  const accent = cases[Math.min(index, COUNT - 1)].accent;

  return (
    <section
      id="reference"
      ref={section}
      className="relative"
      style={{ height: reduced ? 'auto' : `${COUNT * 110}vh` }}
      aria-labelledby="reference-title"
    >
      <div className={reduced ? 'py-16' : 'sticky top-0 flex h-dvh flex-col justify-center overflow-hidden py-10'}>
        {/* pozadí se přebarvuje podle aktivního projektu */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          animate={{ background: `radial-gradient(90% 60% at 50% 40%, ${accent}22, transparent 70%)` }}
          transition={{ duration: 0.8 }}
        />

        <div className="shell flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">{t('eyebrow')}</p>
            <SplitHeading
              as="h2"
              className="mt-3 font-display text-[clamp(1.6rem,3.6vw,2.6rem)] font-bold uppercase leading-[1.08]"
              parts={[{ text: t('title') + ' ' }, { text: t('titleAccent'), accent: true }]}
            />
          </div>
          <p className="max-w-sm text-sm text-muted">{t('lead')}</p>
        </div>

        {/* ---- vodorovná dráha (desktop) ---- */}
        {!reduced ? (
          <div className="relative mt-6 hidden overflow-hidden md:block">
            <motion.div className="flex w-[300%]" style={{ x }}>
              {cases.map((item, i) => {
                const localProgress = i === index ? local : i < index ? 1 : 0;
                const depth = i - index - local;
                return (
                  <article
                    key={item.slug}
                    className="flex w-1/3 shrink-0 items-center gap-10 px-[5vw]"
                  >
                    <motion.div
                      className="w-[38%] shrink-0"
                      animate={{ x: depth * -26, opacity: Math.abs(depth) > 1.05 ? 0.15 : 1 }}
                      transition={{ duration: 0.4 }}
                    >
                      <p className="font-display text-[11px] tracking-[0.3em] text-muted">
                        {String(i + 1).padStart(2, '0')} / {String(COUNT).padStart(2, '0')}
                      </p>
                      <h3 className="mt-3 font-display text-[clamp(1.6rem,3.2vw,2.6rem)] font-bold uppercase leading-none">
                        {tItems(`${item.slug}.name`)}
                      </h3>
                      <p className="mt-2 text-sm text-ink">{tItems(`${item.slug}.kind`)}</p>
                      <p className="mt-1 text-sm text-muted">{tItems(`${item.slug}.text`)}</p>
                      <p className="mt-4 max-w-xs text-xs leading-relaxed text-muted">{t('note')}</p>

                      <ul className="mt-4 flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <li
                            key={tag}
                            className="rounded-full border border-[var(--line)] px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted"
                          >
                            {tag}
                          </li>
                        ))}
                      </ul>

                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="group mt-6 inline-flex items-center gap-2 rounded-btn border px-5 py-3 font-display text-[11px] uppercase tracking-[0.12em] text-ink transition-colors"
                        style={{ borderColor: `${item.accent}88` }}
                      >
                        {t('visit')}
                        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                      </a>
                    </motion.div>

                    <motion.div
                      className="min-w-0 flex-1"
                      onMouseEnter={() => setHovered(item.slug)}
                      onMouseLeave={() => setHovered(null)}
                      animate={{ x: depth * 52, opacity: Math.abs(depth) > 1.05 ? 0.2 : 1 }}
                      transition={{ duration: 0.4 }}
                    >
                      <DevicePair
                        slug={item.slug}
                        desktopRatio={item.desktopHeight / 1440}
                        mobileRatio={item.mobileHeight / 390}
                        progress={localProgress}
                        hovered={hovered === item.slug}
                        accent={item.accent}
                      />
                    </motion.div>
                  </article>
                );
              })}
            </motion.div>

            {/* ukazatel postupu */}
            <div className="shell mt-8 flex items-center gap-3">
              {cases.map((item, i) => (
                <span
                  key={item.slug}
                  className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/[0.08]"
                >
                  <motion.span
                    className="block h-full rounded-full"
                    style={{ background: item.accent }}
                    animate={{ width: `${(i < index ? 1 : i === index ? local : 0) * 100}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* ---- svislý seznam (mobil / reduced-motion) ---- */}
        <div className={reduced ? 'shell mt-10 space-y-16' : 'shell mt-10 space-y-16 md:hidden'}>
          {cases.map((item, i) => (
            <motion.article
              key={item.slug}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-15%' }}
              transition={{ duration: 0.7 }}
            >
              <p className="font-display text-[11px] tracking-[0.3em] text-muted">
                {String(i + 1).padStart(2, '0')} / {String(COUNT).padStart(2, '0')}
              </p>
              <h3 className="mt-2 font-display text-2xl font-bold uppercase leading-none">
                {tItems(`${item.slug}.name`)}
              </h3>
              <p className="mt-2 text-sm text-ink">{tItems(`${item.slug}.kind`)}</p>
              <p className="mt-1 text-sm text-muted">{tItems(`${item.slug}.text`)}</p>

              <div className="relative mx-auto mt-6 w-[220px]">
                <div
                  aria-hidden
                  className="absolute -inset-8 -z-10 rounded-full opacity-45 blur-3xl"
                  style={{ background: `radial-gradient(circle, ${item.accent}55, transparent 70%)` }}
                />
                <PhoneFrame className="!w-full">
                  <div className="relative aspect-[390/844] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
          <motion.img
                      src={`/cases/${item.slug}/mobile.jpg`}
                      alt=""
                      aria-hidden
                      loading="lazy"
                      className="absolute inset-x-0 top-0 w-full max-w-none"
                      initial={{ y: '0%' }}
                      whileInView={{ y: `-${Math.max(0, 100 - 216.4 / (item.mobileHeight / 390))}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 14, ease: 'linear' }}
                    />
                  </div>
                </PhoneFrame>
              </div>

              <ul className="mt-6 flex flex-wrap justify-center gap-2">
                {tags.map((tag) => (
                  <li key={tag} className="rounded-full border border-[var(--line)] px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted">
                    {tag}
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex justify-center">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 rounded-btn border px-5 py-3 font-display text-[11px] uppercase tracking-[0.12em] text-ink"
                  style={{ borderColor: `${item.accent}88` }}
                >
                  {t('visit')}
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                </a>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
