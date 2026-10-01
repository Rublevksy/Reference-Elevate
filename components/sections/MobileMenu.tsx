'use client';

import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { ArrowRight, ArrowUpRight, ChevronDown, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/ui/Logo';
import { SectionLink } from '@/components/ui/SectionLink';
import { useLocaleChange } from '@/components/ui/LocaleSwitcher';
import { locales, localeNames } from '@/i18n/routing';
import { useContactEmail } from '@/components/ContentProvider';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useMenuLinks, type MenuKind } from './NavMenu';

/**
 * Mobilní menu: jeden čistý sloupec stejných řádků (číslo, název, šipka),
 * u Služeb / Procesu / Ceníku rozbalitelné podmenu, pod tím výběr jazyka
 * jako segmenty a hlavní tlačítko. Animace jen opacity + transform (žádný
 * clip-path přes celou obrazovku — ten na telefonech cukal), scroll stránky
 * pod menu je zastavený.
 */

type Item = { id: string; key: string };
const EASE = [0.16, 1, 0.3, 1] as const;

const panel: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.28, ease: 'easeOut', when: 'beforeChildren', staggerChildren: 0.035 } },
  exit: { opacity: 0, transition: { duration: 0.22, ease: 'easeIn' } },
};
const row: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

function SubList({ kind, onNavigate }: { kind: MenuKind; onNavigate: () => void }) {
  const links = useMenuLinks(kind);
  return (
    <ul className="pb-3 pl-[52px] pr-1">
      {links.map((link) => (
        <li key={link.to}>
          <SectionLink
            to={link.to}
            onNavigate={onNavigate}
            className="flex h-11 items-center gap-3 rounded-xl px-3 text-[14px] text-[rgba(205,214,236,0.86)] transition-colors active:bg-[rgba(31,91,255,0.16)]"
          >
            <span className="h-1 w-1 shrink-0 rounded-full bg-[var(--blue-bright)] shadow-[0_0_6px_rgba(61,123,255,0.9)]" />
            <span className="min-w-0 flex-1 truncate">{link.label}</span>
            {link.aside ? <span className="shrink-0 font-display text-[10px] tracking-[0.06em] text-muted">{link.aside}</span> : null}
          </SectionLink>
        </li>
      ))}
    </ul>
  );
}

export function MobileMenu({
  open,
  onClose,
  items,
  menus,
  active,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  items: readonly Item[];
  menus: readonly string[];
  active: string | null;
  onNavigate: (id: string) => () => void;
}) {
  const t = useTranslations('nav');
  const tA11y = useTranslations('a11y');
  const email = useContactEmail();
  const reduced = useReducedMotion();
  const { locale, change } = useLocaleChange();
  const [expanded, setExpanded] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // zastavit stránku pod menu (Lenis i nativní scroll), Esc zavře, fokus na zavírací tlačítko
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    window.__lenis?.stop();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const id = window.setTimeout(() => closeRef.current?.focus({ preventScroll: true }), 50);
    return () => {
      html.style.overflow = prev;
      window.__lenis?.start();
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(id);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setExpanded(null);
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label={tA11y('mobileNav')}
          className="fixed inset-0 z-[110] overflow-y-auto overscroll-contain lg:hidden"
          data-lenis-prevent
          variants={panel}
          initial={reduced ? false : 'hidden'}
          animate="show"
          exit="exit"
          style={{
            background:
              'radial-gradient(90% 45% at 85% -5%, rgba(31,91,255,0.28), transparent 70%), radial-gradient(70% 40% at 0% 105%, rgba(0,160,255,0.12), transparent 70%), var(--bg)',
          }}
        >
          <div className="mx-auto flex min-h-full max-w-md flex-col px-5 pb-[max(28px,env(safe-area-inset-bottom))]">
            {/* hlavička — logo a zavření na stejném místě jako v liště */}
            <motion.div variants={row} className="flex h-[76px] items-center justify-between pt-1">
              <Logo height={18} />
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label={t('closeMenu')}
                className="grid h-11 w-11 place-items-center rounded-full border border-[rgba(110,150,255,0.3)] bg-white/[0.04] text-ink transition-colors active:bg-white/[0.1]"
              >
                <X className="h-[18px] w-[18px]" aria-hidden />
              </button>
            </motion.div>

            {/* tečkovaná neonová linka — motiv webu */}
            <motion.span
              variants={row}
              aria-hidden
              className="mb-2 block h-[3px]"
              style={{ background: 'radial-gradient(circle, #cfe0ff 0 1px, rgba(97,150,255,0.8) 1.3px, transparent 1.9px) 0 50% / 9px 3px repeat-x', opacity: 0.6 }}
            />

            <nav aria-label={tA11y('mobileNav')}>
              <ul>
                {items.map((item, index) => {
                  const hasSub = menus.includes(item.id);
                  const isOpen = expanded === item.id;
                  const isActive = active === item.id;
                  return (
                    <motion.li key={item.id} variants={row} className="border-b border-[rgba(110,150,255,0.14)]">
                      <div className="flex h-[60px] items-center">
                        <SectionLink
                          to={item.id}
                          instant={item.id === 'kontakt'}
                          onNavigate={onNavigate(item.id)}
                          className="group flex h-full min-w-0 flex-1 items-center gap-4"
                        >
                          <span className={`w-9 shrink-0 font-display text-[10px] tracking-[0.18em] ${isActive ? 'text-[var(--blue-bright)]' : 'text-[rgba(140,160,205,0.7)]'}`}>
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <span className={`truncate font-display text-[17px] uppercase tracking-[0.06em] ${isActive ? 'text-ink' : 'text-[rgba(225,231,245,0.92)]'}`}>
                            {t(item.key)}
                          </span>
                          {isActive ? <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--blue-bright)] shadow-[0_0_8px_2px_rgba(61,123,255,0.85)]" /> : null}
                          {!hasSub ? <ArrowUpRight aria-hidden className="ml-auto h-[18px] w-[18px] shrink-0 text-muted" /> : null}
                        </SectionLink>
                        {hasSub ? (
                          <button
                            type="button"
                            onClick={() => setExpanded(isOpen ? null : item.id)}
                            aria-expanded={isOpen}
                            aria-label={t(item.key)}
                            className={`ml-2 grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors ${
                              isOpen ? 'border-[rgba(97,150,255,0.6)] bg-[rgba(31,91,255,0.16)] text-ink' : 'border-[rgba(110,150,255,0.22)] text-muted'
                            }`}
                          >
                            <ChevronDown aria-hidden className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                          </button>
                        ) : null}
                      </div>
                      <AnimatePresence initial={false}>
                        {hasSub && isOpen ? (
                          <motion.div
                            key="sub"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: reduced ? 0 : 0.3, ease: EASE }}
                            className="overflow-hidden"
                          >
                            <SubList kind={item.id as MenuKind} onNavigate={onNavigate(item.id)} />
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </motion.li>
                  );
                })}
              </ul>
            </nav>

            {/* jazyk — segmenty ve stejném stylu */}
            <motion.div variants={row} className="mt-8">
              <p className="font-display text-[10px] uppercase tracking-[0.2em] text-muted">{t('language')}</p>
              <div className="mt-3 grid grid-cols-4 gap-2" role="group" aria-label={t('language')}>
                {locales.map((item) => {
                  const on = item === locale;
                  return (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={on}
                      lang={item}
                      onClick={() => {
                        change(item);
                        onClose();
                      }}
                      className={`flex h-12 flex-col items-center justify-center rounded-xl border transition-colors ${
                        on
                          ? 'border-[rgba(143,178,255,0.8)] bg-[linear-gradient(165deg,#1b3577,#0c1638)] text-white shadow-[0_0_18px_-4px_rgba(31,91,255,0.8)]'
                          : 'border-[rgba(110,150,255,0.2)] bg-white/[0.03] text-[rgba(205,214,236,0.85)] active:bg-white/[0.08]'
                      }`}
                    >
                      <span className="font-display text-[12px] tracking-[0.12em]">{localeNames[item].code}</span>
                      <span className="mt-0.5 text-[9.5px] text-muted">{localeNames[item].name}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* hlavní akce */}
            <motion.div variants={row} className="mt-auto pt-8">
              <SectionLink
                to="kontakt"
                instant
                onNavigate={onNavigate('kontakt')}
                className="group relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-btn bg-[linear-gradient(120deg,var(--blue),var(--blue-bright))] font-display text-[12px] uppercase tracking-[0.12em] text-white shadow-[0_0_28px_var(--blue-glow)]"
              >
                {t('cta')}
                <ArrowRight className="h-4 w-4" aria-hidden />
                {!reduced ? <span aria-hidden className="beam" /> : null}
              </SectionLink>
              <a href={`mailto:${email}`} className="mt-4 block text-center text-xs text-muted">
                {email}
              </a>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
