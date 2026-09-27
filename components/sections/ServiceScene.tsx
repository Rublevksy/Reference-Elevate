'use client';

import Image from 'next/image';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, type ComponentType } from 'react';
import { CountUp } from '@/components/ui/CountUp';
import { useTranslations } from 'next-intl';
import { AppMockup, DesignMockup, SeoDashboard, ShopMockup, WebMockup } from '@/components/mockups';
import type { MockupKind, ServiceMeta } from '@/content/services';
import { useReducedMotion } from '@/lib/useReducedMotion';

const MOCKUPS: Record<MockupKind, ComponentType<{ active: boolean }>> = {
  web: WebMockup,
  seo: SeoDashboard,
  shop: ShopMockup,
  design: DesignMockup,
  app: AppMockup,
};

/**
 * Atmosférická scéna panelu — živá verze původní reklamní karty:
 * silně rozmazané pozadí místnosti (public/services/<slug>/bg.webp),
 * vyříznutý maskot v póze té karty (mascot.webp) a malý „oživlý" UI
 * prvek (existující mockup zmenšený, nebo pro aplikace stat-pilulka).
 * Vrstvy jedou s mírně odlišnou rychlostí (parallax) podle kurzoru
 * i skrolu — ±10px, žádné tvrdé hrany, okraje pozadí se ztrácí do --bg.
 */
export function ServiceScene({
  slug,
  meta,
  active,
  scrollShift = 0,
}: {
  slug: string;
  meta: ServiceMeta;
  active: boolean;
  /** jemný posun podle pozice panelu ve skrolu (px) */
  scrollShift?: number;
}) {
  const reduced = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const bgX = useSpring(useTransform(mx, [-1, 1], [-6, 6]), { stiffness: 60, damping: 18 });
  const bgY = useSpring(useTransform(my, [-1, 1], [-6, 6]), { stiffness: 60, damping: 18 });
  const mascotX = useSpring(useTransform(mx, [-1, 1], [6, -6]), { stiffness: 70, damping: 16 });
  const mascotY = useSpring(useTransform(my, [-1, 1], [4, -4]), { stiffness: 70, damping: 16 });
  const widgetX = useSpring(useTransform(mx, [-1, 1], [-10, 10]), { stiffness: 80, damping: 14 });

  useEffect(() => {
    if (reduced) return;
    const onMove = (event: PointerEvent) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      mx.set((event.clientX / w) * 2 - 1);
      my.set((event.clientY / h) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduced, mx, my]);

  const Widget = MOCKUPS[meta.mockup];
  const { mascot, widget } = meta;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[28px]">
      {/* rozmazané pozadí místnosti — bez ostrých hran, mizí do --bg */}
      <motion.div
        aria-hidden
        className="absolute -inset-8"
        style={reduced ? undefined : { x: bgX, y: bgY }}
      >
        <Image src={`/services/${slug}/bg.webp`} alt="" fill sizes="700px" className="object-cover" />
      </motion.div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 100% at 68% 30%, transparent 40%, rgba(4,6,11,0.55) 78%, rgba(4,6,11,0.92) 100%)',
          boxShadow: 'inset 0 0 90px 40px rgba(4,6,11,0.85)',
        }}
      />

      {/* maskot */}
      <motion.div
        className="absolute"
        style={{
          width: `${mascot.width}%`,
          bottom: `${mascot.bottom}%`,
          left: mascot.left !== undefined ? `${mascot.left}%` : undefined,
          right: mascot.right !== undefined ? `${mascot.right}%` : undefined,
          x: reduced ? 0 : mascotX,
          y: reduced ? scrollShift * 0.4 : mascotY,
        }}
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={active ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0.001, scale: 0.94 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="relative w-full" style={{ aspectRatio: '3 / 4' }}>
          <Image src={`/services/${slug}/mascot.webp`} alt="" fill sizes="360px" className="object-contain object-bottom" />
        </div>
      </motion.div>

      {/* oživlé UI — zmenšený mockup té služby */}
      <motion.div
        className="absolute hidden sm:block"
        style={{
          width: `${widget.width}%`,
          maxWidth: 260,
          top: widget.top !== undefined ? `${widget.top}%` : undefined,
          bottom: widget.bottom !== undefined ? `${widget.bottom}%` : undefined,
          left: widget.left !== undefined ? `${widget.left}%` : undefined,
          right: widget.right !== undefined ? `${widget.right}%` : undefined,
          rotate: widget.rotate ?? 0,
          x: reduced ? 0 : widgetX,
        }}
        initial={{ opacity: 0, y: 18 }}
        animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
        transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      >
        {slug === 'aplikace' ? <AppStatPill active={active} /> : <Widget active={active} />}
      </motion.div>

      {slug === 'e-shopy' ? (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute right-[6%] top-[8%] h-20 w-20 opacity-70 blur-[1px]"
          animate={active ? { opacity: [0.4, 0.8, 0.4] } : { opacity: 0 }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Image src="/services/e-shopy/cart-icon.webp" alt="" fill sizes="80px" className="object-contain" />
        </motion.div>
      ) : null}
    </div>
  );
}

/** Malá plovoucí statistika pro aplikaci — bez duplicitního telefonu (ten už drží maskot). */
function AppStatPill({ active }: { active: boolean }) {
  const t = useTranslations('mockups.app');
  return (
    <div className="glass rounded-2xl p-3.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)]">
      <p className="text-[8px] uppercase tracking-widest text-muted">{t('users')}</p>
      <p className="font-display text-lg font-bold text-[var(--blue-bright)]">
        {active ? <CountUp to={2482} prefix="+" /> : '—'}
      </p>
      <p className="mt-1.5 text-[8px] uppercase tracking-widest text-muted">{t('revenueShort')}</p>
      <p className="font-display text-base font-bold text-ink">
        {active ? <CountUp to={18.6} decimals={1} prefix="+" suffix=" %" /> : '—'}
      </p>
    </div>
  );
}
