'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, type ComponentType } from 'react';
import { AppMockup, DesignMockup, SeoDashboard, ShopMockup, WebMockup } from '@/components/mockups';
import { ServiceAccent } from './ServiceAccent';
import type { MockupKind, ServiceMeta, ServiceSlug } from '@/content/services';
import { useReducedMotion } from '@/lib/useReducedMotion';

const MOCKUPS: Record<MockupKind, ComponentType<{ active: boolean }>> = {
  web: WebMockup,
  seo: SeoDashboard,
  shop: ShopMockup,
  design: DesignMockup,
  app: AppMockup,
};

/**
 * Scéna panelu — tichý doménový motiv (<ServiceAccent />, pro každou
 * službu jiný) v pozadí a nad ním dominantní, živý UI mockup té služby.
 * Žádná postava tu už nestojí — průvodce žije jen jako jedna figura
 * vedle celé karty (viz <ServiceDeck />).
 */
export function ServiceScene({
  slug,
  meta,
  active,
}: {
  slug: ServiceSlug;
  meta: ServiceMeta;
  active: boolean;
}) {
  const reduced = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const widgetX = useSpring(useTransform(mx, [-1, 1], [-10, 10]), { stiffness: 80, damping: 14 });
  const widgetY = useSpring(useTransform(my, [-1, 1], [-6, 6]), { stiffness: 80, damping: 14 });

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
  const { widget } = meta;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[28px] bg-[linear-gradient(165deg,rgba(14,22,48,0.9),rgba(5,8,16,0.96))]">
      {/* tichý doménový motiv — jiný pro každou službu */}
      <ServiceAccent slug={slug} active={active} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 100% at 68% 30%, transparent 45%, rgba(4,6,11,0.5) 80%, rgba(4,6,11,0.88) 100%)',
        }}
      />

      {/* dominantní, živý mockup té služby */}
      <motion.div
        className="absolute"
        style={{
          width: `${widget.width}%`,
          maxWidth: 460,
          top: widget.top !== undefined ? `${widget.top}%` : undefined,
          bottom: widget.bottom !== undefined ? `${widget.bottom}%` : undefined,
          left: widget.left !== undefined ? `${widget.left}%` : undefined,
          right: widget.right !== undefined ? `${widget.right}%` : undefined,
          rotate: widget.rotate ?? 0,
          x: reduced ? 0 : widgetX,
          y: reduced ? 0 : widgetY,
        }}
        initial={{ opacity: 0, y: 18 }}
        animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
        transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      >
        <Widget active={active} />
      </motion.div>
    </div>
  );
}
