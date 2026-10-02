'use client';

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { ArrowRight, Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { Logo } from '@/components/ui/Logo';
import { LocaleSwitcher } from '@/components/ui/LocaleSwitcher';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { navState, navigateToTop } from '@/lib/scrollTo';
import { SectionLink } from '@/components/ui/SectionLink';
import { NavMenuPanel, type MenuKind } from './NavMenu';
import { MobileMenu } from './MobileMenu';

/** Položky s podmenu (hover / focus) — ostatní vedou rovnou na sekci. */
const MENUS: readonly string[] = ['detaily', 'proces', 'cenik'];

const ITEMS = [
  // Služby vedou rovnou na rozvinuté panely služeb (NORDA), ne na stůl karet
  { id: 'detaily', key: 'services' },
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

  /** Klik v menu: aktivní položku převezme klik, pozorovatel scrollu se na chvíli odmlčí. */
  const onNavigate = useCallback((id: string) => () => {
    setOpen(false);
    setActive(id);
    setHidden(false);
    clickSuppress.current = true;
    if (clickSuppressTimer.current) window.clearTimeout(clickSuppressTimer.current);
    clickSuppressTimer.current = window.setTimeout(() => {
      clickSuppress.current = false;
    }, 1400);
  }, []);

  useEffect(() => () => {
    if (clickSuppressTimer.current) window.clearTimeout(clickSuppressTimer.current);
  }, []);

  // podmenu: otevřít s malou prodlevou (projetí myší přes lištu nic neotevře),
  // mezi položkami přepínat hned, zavřít s rezervou na přejezd do panelu
  const [menu, setMenu] = useState<MenuKind | null>(null);
  const menuRef = useRef<MenuKind | null>(null);
  menuRef.current = menu;
  const menuTimer = useRef<number | null>(null);
  const openMenu = useCallback((kind: MenuKind, delay = 70) => {
    if (menuTimer.current) window.clearTimeout(menuTimer.current);
    if (menuRef.current || delay === 0) setMenu(kind);
    else menuTimer.current = window.setTimeout(() => setMenu(kind), delay);
  }, []);
  const closeMenu = useCallback((delay = 170) => {
    if (menuTimer.current) window.clearTimeout(menuTimer.current);
    if (delay === 0) setMenu(null);
    else menuTimer.current = window.setTimeout(() => setMenu(null), delay);
  }, []);
  useEffect(() => () => {
    if (menuTimer.current) window.clearTimeout(menuTimer.current);
  }, []);

  useMotionValueEvent(scrollY, 'change', (y) => {
    const delta = y - lastY.current;
    setShrunk(y > 40);
    // skrolování zavře otevřené podmenu
    if (menuRef.current && Math.abs(delta) > 2) closeMenu(0);
    // skok navigace není skrolování dolů — lištu nechat vidět
    if (performance.now() < navState.until) {
      lastY.current = y;
      setHidden(false);
      return;
    }
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

  const closeMobile = useCallback(() => setOpen(false), []);

  return (
    <>
      <motion.header
        className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex justify-center px-4 pt-4"
        animate={{ y: hidden && !open ? -110 : 0 }}
        transition={{ duration: reduced ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.nav
          aria-label={tA11y('mainNav')}
          className="pointer-events-auto flex items-center gap-2 rounded-full border border-[var(--line)] bg-[rgba(8,12,22,0.92)] shadow-[0_18px_50px_-24px_rgba(0,0,0,0.9)] md:bg-[rgba(8,12,22,0.72)] md:backdrop-blur-xl"
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
            onClick={(event) => {
              // na hlavní stránce jen rychlý návrat nahoru (bez navigace a přehrávání scén)
              if (window.location.pathname.split('/').filter(Boolean).length <= 1) {
                event.preventDefault();
                setOpen(false);
                setActive(null);
                navigateToTop();
              }
            }}
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
              const kind = MENUS.includes(item.id) ? (item.id as MenuKind) : null;
              const isOpen = kind !== null && menu === kind;
              return (
                <li
                  key={item.id}
                  className="relative"
                  onPointerEnter={(e) => {
                    if (e.pointerType !== 'mouse') return;
                    if (kind) openMenu(kind);
                    else closeMenu(0);
                  }}
                  onPointerLeave={(e) => {
                    if (e.pointerType === 'mouse' && kind) closeMenu();
                  }}
                  onFocus={() => (kind ? openMenu(kind, 0) : closeMenu(0))}
                  onBlur={(e) => {
                    if (kind && !e.currentTarget.contains(e.relatedTarget as Node | null)) closeMenu(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') closeMenu(0);
                  }}
                >
                  <SectionLink
                    to={item.id}
                    instant={item.id === 'kontakt'}
                    onNavigate={() => {
                      closeMenu(0);
                      onNavigate(item.id)();
                    }}
                    aria-haspopup={kind ? 'true' : undefined}
                    aria-expanded={kind ? isOpen : undefined}
                    className={`group/item relative block rounded-full px-3.5 py-2 font-display text-[11px] uppercase tracking-[0.14em] transition-colors ${
                      isActive || isOpen ? 'text-ink' : 'text-muted hover:text-ink'
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
                  </SectionLink>
                  {kind ? (
                    // pt-4 = „můstek" mezi položkou a panelem, ať se podmenu při přejezdu myší nezavře
                    <div className={`absolute left-1/2 top-full z-10 -translate-x-1/2 pt-4 ${isOpen ? '' : 'pointer-events-none'}`}>
                      <AnimatePresence>
                        {isOpen ? (
                          <NavMenuPanel
                            key={kind}
                            kind={kind}
                            onNavigate={() => {
                              closeMenu(0);
                              onNavigate(item.id)();
                            }}
                          />
                        ) : null}
                      </AnimatePresence>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <div className="hidden lg:block">
            <LocaleSwitcher />
          </div>

          {/* CTA s paprskem po rámečku */}
          <SectionLink
            to="kontakt"
            instant
            onNavigate={onNavigate('kontakt')}
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
          </SectionLink>

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

      {/* mobilní menu (vlastní komponenta: sloupec řádků, jazyk, hlavní akce) */}
      <MobileMenu open={open} onClose={closeMobile} items={ITEMS} menus={MENUS} active={active} onNavigate={onNavigate} />
    </>
  );
}
