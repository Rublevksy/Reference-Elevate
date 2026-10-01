'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { LOCALE_COOKIE, locales, localeNames, type Locale } from '@/i18n/routing';

/** Výslovná volba jazyka — pamatuje se rok (úvodní adresa „/" ji pak použije). */
export function rememberLocale(next: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Pilulka s kódem jazyka, která se po kliknutí rozbalí do panelu.
 * Není to select ani klasický dropdown — je to jeden prvek, který
 * mění tvar (Framer layout), takže přechod působí jako jedna věc.
 */
/** Změna jazyka bez skoku stránky — sdílí přepínač v liště i mobilní menu. */
export function useLocaleChange() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const change = (next: Locale) => {
    if (next === locale) return;
    rememberLocale(next);
    // bez efektů: jen výměna textů; pozici scrollu si nová stránka vezme ze sessionStorage
    // (layout jazyka se přemontuje a SmoothScroll by jinak skočil nahoru)
    try {
      sessionStorage.setItem('elevate:keep-scroll', String(Math.round(window.scrollY)));
    } catch {
      /* soukromé okno — nevadí */
    }
    startTransition(() => {
      router.replace(pathname, { locale: next, scroll: false });
    });
  };
  return { locale, change };
}

export function LocaleSwitcher({ compact = false }: { compact?: boolean }) {
  const t = useTranslations('nav');
  const { locale, change: changeLocale } = useLocaleChange();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const change = (next: Locale) => {
    setOpen(false);
    changeLocale(next);
  };

  return (
    <div ref={wrapper} className="relative">
      <motion.button
        layout
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`${t('language')}: ${localeNames[locale].code} — ${localeNames[locale].name}`}
        className={`flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-white/[0.05] text-ink transition-colors hover:border-[rgba(80,120,255,0.45)] ${
          compact ? 'h-9 px-3' : 'h-8 px-2.5'
        }`}
        style={{ borderRadius: 999 }}
      >
        <Globe className="h-3.5 w-3.5 text-muted" aria-hidden />
        <span className="font-display text-[11px] tracking-[0.1em]">{localeNames[locale].code}</span>
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, scale: 0.9, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -4 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="glass absolute right-0 top-[calc(100%+10px)] z-50 w-[188px] origin-top-right overflow-hidden rounded-2xl p-1.5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.95)]"
          >
            {locales.map((item, index) => {
              const active = item === locale;
              return (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.03 * index, duration: 0.25 }}
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => change(item)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      active ? 'bg-white/[0.07] text-ink' : 'text-muted hover:bg-white/[0.04] hover:text-ink'
                    }`}
                  >
                    <span className="font-display text-[11px] tracking-[0.1em]">
                      {localeNames[item].code}
                    </span>
                    <span className="text-sm">{localeNames[item].name}</span>
                    {active ? (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--blue-bright)] shadow-glow" />
                    ) : null}
                  </button>
                </motion.li>
              );
            })}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
