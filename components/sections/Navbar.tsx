'use client';

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { ArrowRight, Menu, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { Logo } from '@/components/ui/Logo';
import { LocaleSwitcher } from '@/components/ui/LocaleSwitcher';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { scrollToId } from '@/lib/scrollTo';
import { site } from '@/content/site';

const ITEMS = [
  { id: 'sluzby', key: 'services' },
  { id: 'proces', key: 'process' },
  { id: 'reference', key: 'references' },
  { id: 'cenik', key: 'pricing' },
  { id: 'kontakt', key: 'contact' },
] as const;

/** Text se při najetí odroluje nahoru a zespodu přijede jeho kopie. */
function RollLabel({ label, active }: { label: string; active: boolean }) {
  return (
    <span className="relative block overflow-hidden" style={{ height: '1.1em' }}>
      <span
        className={`block transition-transform duration-[450ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover/item:-translate-y-full ${
          active ? 'text-ink' : ''
        }`}
      >
        {label}
      </span>
      <span
        aria-hidden
        className="absolute inset-x-0 top-full block text-ink transition-transform duration-[450ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover/item:-translate-y-full"
      >
        {label}
      </span>
    </span>
  );
}

export function Navbar() {
  const t = useTranslations('nav');
  const tA11y = useTranslations('a11y');
  const reduced = useReducedMotion();
  const [hidden, setHidden] = useState(false);
  const [shrunk, setShrunk] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const lastY = useRef(0);
  const { scrollY } = useScroll();
  // Po kliknutí přebírá aktivní stav klik sám — pozorovatel scrollu se na
  // chvíli odmlčí, ať necuká zpátky na starou sekci, dokud Lenis nedojede.
  const clickSuppress = useRef(false);
  const clickSuppressTimer = useRef<number | null>(null);

  const handleNavClick = useCallback((id: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setOpen(false);
    setActive(id);
    clickSuppress.current = true;
    if (clickSuppressTimer.current) window.clearTimeout(clickSuppressTimer.current);
    scrollToId(id);
    clickSuppressTimer.current = window.setTimeout(() => {
      clickSuppress.current = false;
    }, 1500);
  }, []);

  useEffect(() => () => {
    if (clickSuppressTimer.current) window.clearTimeout(clickSuppressTimer.current);
  }, []);

  useMotionValueEvent(scrollY, 'change', (y) => {
    const delta = y - lastY.current;
    setShrunk(y > 40);
    // schovat jen při rychlém skrolu dolů, nahoru vždy ukázat
    if (y > 180 && delta > 8) setHidden(true);
    else if (delta < -4) setHidden(false);
    lastY.current = y;
  });

  useEffect(() => {
    const nodes = ITEMS.map((i) => document.getElementById(i.id)).filter(
      (n): n is HTMLElement => Boolean(n),
    );
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (clickSuppress.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
        else if (window.scrollY < 300) setActive(null);
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: [0, 0.15, 0.5] },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <motion.header
        className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex justify-center px-4 pt-4"
        animate={{ y: hidden && !open ? -110 : 0 }}
        transition={{ duration: reduced ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.nav
          aria-label={tA11y('mainNav')}
          className="pointer-events-auto flex items-center gap-2 rounded-full border border-[var(--line)] bg-[rgba(8,12,22,0.72)] shadow-[0_18px_50px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl"
          animate={{
            paddingLeft: shrunk ? 10 : 14,
            paddingRight: shrunk ? 8 : 10,
            paddingTop: shrunk ? 8 : 11,
            paddingBottom: shrunk ? 8 : 11,
          }}
          transition={{ duration: reduced ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link
            href="/"
            className="flex shrink-0 items-center rounded-full px-2 py-1 transition-opacity hover:opacity-80"
            aria-label={t('home')}
          >
            <motion.span animate={{ scale: shrunk ? 0.88 : 1 }} transition={{ duration: 0.4 }}>
              <Logo height={25} priority glow />
            </motion.span>
          </Link>

          <ul className="mx-1 hidden items-center lg:flex">
            {ITEMS.map((item) => {
              const isActive = active === item.id;
              return (
                <li key={item.id} className="relative">
                  <a
                    href={`#${item.id}`}
                    onClick={handleNavClick(item.id)}
                    className={`group/item relative block rounded-full px-3.5 py-2 font-display text-[11px] uppercase tracking-[0.14em] transition-colors ${
                      isActive ? 'text-ink' : 'text-muted hover:text-ink'
                    }`}
                  >
                    {isActive ? (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 -z-10 rounded-full bg-white/[0.08] ring-1 ring-[rgba(80,120,255,0.3)]"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    ) : null}
                    <RollLabel label={t(item.key)} active={isActive} />
                  </a>
                </li>
              );
            })}
          </ul>

          <div className="hidden lg:block">
            <LocaleSwitcher />
          </div>

          {/* CTA s paprskem po rámečku */}
          <a
            href="#kontakt"
            onClick={handleNavClick('kontakt')}
            className="group/cta relative ml-1 hidden shrink-0 items-center gap-2 overflow-hidden rounded-full bg-[linear-gradient(120deg,var(--blue),var(--blue-bright))] px-4 py-2.5 font-display text-[11px] uppercase tracking-[0.1em] text-white shadow-[0_0_22px_var(--blue-glow)] transition-shadow hover:shadow-[0_0_34px_var(--blue-glow)] sm:flex"
          >
            <span className="relative z-10">{t('cta')}</span>
            <span className="relative z-10 block h-4 w-4 overflow-hidden">
              <ArrowRight
                className="absolute inset-0 h-4 w-4 transition-transform duration-[450ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover/cta:translate-x-5"
                aria-hidden
              />
              <ArrowRight
                className="absolute inset-0 h-4 w-4 -translate-x-5 transition-transform duration-[450ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover/cta:translate-x-0"
                aria-hidden
              />
            </span>
            {!reduced ? <span aria-hidden className="beam" /> : null}
          </a>

          <div className="flex items-center gap-1.5 lg:hidden">
            <LocaleSwitcher compact />
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-full border border-[var(--line)] text-ink"
              aria-label={t('openMenu')}
              aria-expanded={open}
            >
              <Menu className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </motion.nav>
      </motion.header>

      {/* mobilní fullscreen menu */}
      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-[110] bg-[var(--bg)] lg:hidden"
            initial={{ clipPath: 'circle(0% at 92% 5%)' }}
            animate={{ clipPath: 'circle(145% at 92% 5%)' }}
            exit={{ clipPath: 'circle(0% at 92% 5%)' }}
            transition={{ duration: 0.55, ease: [0.76, 0, 0.24, 1] }}
          >
            <div className="flex h-[72px] items-center justify-between px-5">
              <Logo height={18} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line)] text-ink"
                aria-label={t('closeMenu')}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <nav className="mt-6 flex flex-col px-5" aria-label={tA11y('mobileNav')}>
              {ITEMS.map((item, index) => (
                <motion.a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={handleNavClick(item.id)}
                  initial={{ opacity: 0, y: 26 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.14 + index * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="border-b border-[var(--line)] py-4 font-display text-[28px] uppercase leading-none tracking-tight text-ink"
                >
                  {t(item.key)}
                </motion.a>
              ))}
            </nav>

            <motion.div
              className="mt-9 px-5"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <a
                href="#kontakt"
                onClick={handleNavClick('kontakt')}
                className="flex w-full items-center justify-center gap-2 rounded-btn bg-[linear-gradient(120deg,var(--blue),var(--blue-bright))] px-6 py-4 font-display text-[12px] uppercase tracking-[0.12em] text-white shadow-glow"
              >
                {t('cta')}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </a>

              <div className="mt-8 flex items-center justify-between">
                <LocaleSwitcher compact />
                <div className="text-right text-xs text-muted">
                  <a href={`mailto:${site.email}`} className="block hover:text-ink">{site.email}</a>
                  <a href={`tel:${site.phoneHref}`} className="block hover:text-ink">{site.phone}</a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
