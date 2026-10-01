'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/ui/Logo';
import { useReducedMotion } from '@/lib/useReducedMotion';

/**
 * Obrazovka „Technické práce" (administrace → přepínač údržby). Text se
 * střídá ve čtyřech jazycích webu, logo přelévá světlo jako úvodní clona,
 * pozadí je stejné živé jako na úvodní obrazovce.
 */
const MESSAGES = [
  { lang: 'cs', code: 'CZ', title: 'Probíhá údržba webu', text: 'Ladíme pár věcí a za chvíli jsme zpátky. Díky za trpělivost.', write: 'Napište nám' },
  { lang: 'en', code: 'EN', title: 'Under maintenance', text: "We're polishing a few things and will be back shortly. Thanks for your patience.", write: 'Write to us' },
  { lang: 'ru', code: 'RU', title: 'Ведутся технические работы', text: 'Немного настраиваем сайт и скоро вернёмся. Спасибо за терпение.', write: 'Напишите нам' },
  { lang: 'uk', code: 'UA', title: 'Тривають технічні роботи', text: 'Трохи налаштовуємо сайт і скоро повернемося. Дякуємо за терпіння.', write: 'Напишіть нам' },
] as const;

const CYCLE_MS = 3600;

export function MaintenanceScreen({ email, preview = false, onClose }: { email: string; preview?: boolean; onClose?: () => void }) {
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setI((n) => (n + 1) % MESSAGES.length), reduced ? CYCLE_MS * 1.5 : CYCLE_MS);
    return () => window.clearInterval(id);
  }, [reduced]);

  const m = MESSAGES[i];

  return (
    <div className="fixed inset-0 z-[400] grid place-items-center overflow-hidden bg-[var(--bg)] px-5" role="main">
      <span className="splash-glow splash-glow-a" aria-hidden />
      <span className="splash-glow splash-glow-b" aria-hidden />
      <span className="splash-grid" aria-hidden />

      <div className="relative flex w-full max-w-xl flex-col items-center text-center">
        {/* logo s přelivem světla: světelný pruh maskovaný tvarem loga */}
        <div className="relative max-sm:scale-[0.72]">
          <Logo height={52} priority glow />
          {!reduced ? <span aria-hidden className="logo-shimmer pointer-events-none absolute inset-0" /> : null}
        </div>

        <span
          aria-hidden
          className="mt-8 block h-[3px] w-[min(62vw,280px)] opacity-70"
          style={{ background: 'radial-gradient(circle, #cfe0ff 0 1px, rgba(97,150,255,0.85) 1.3px, transparent 1.9px) 0 50% / 9px 3px repeat-x' }}
        />

        <div className="relative mt-8 min-h-[150px] w-full sm:min-h-[132px]" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.div
              key={m.lang}
              lang={m.lang}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -10, filter: 'blur(6px)' }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="font-display text-[clamp(1.35rem,4.4vw,2.1rem)] font-bold uppercase leading-[1.1]">{m.title}</h1>
              <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted sm:text-base">{m.text}</p>
              <p className="mt-5 text-sm text-muted">
                {m.write}:{' '}
                <a href={`mailto:${email}`} className="text-[var(--blue-bright)] underline-offset-4 hover:underline">
                  {email}
                </a>
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* jazyky — aktivní svítí */}
        <ul className="mt-6 flex items-center gap-2" aria-hidden>
          {MESSAGES.map((x, k) => (
            <li
              key={x.code}
              className={`rounded-full border px-2.5 py-1 font-display text-[9px] tracking-[0.18em] transition-[color,border-color,box-shadow] duration-500 ${
                k === i ? 'border-[var(--blue-bright)] text-ink shadow-[0_0_14px_rgba(61,123,255,0.55)]' : 'border-[var(--line)] text-muted'
              }`}
            >
              {x.code}
            </li>
          ))}
        </ul>

        {preview ? (
          <button
            type="button"
            onClick={onClose}
            className="mt-10 rounded-full border border-[rgba(255,197,61,0.5)] bg-[rgba(255,197,61,0.08)] px-4 py-2 text-xs text-[#ffe2a0]"
          >
            Náhled údržby — zavřít
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Náhled obrazovky údržby na běžícím webu: /cs?udrzba=nahled (odkaz z administrace). */
export function MaintenancePreview({ email }: { email: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(new URLSearchParams(window.location.search).get('udrzba') === 'nahled');
  }, []);
  if (!on) return null;
  return <MaintenanceScreen email={email} preview onClose={() => setOn(false)} />;
}
