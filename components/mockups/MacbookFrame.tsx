'use client';

import Image from 'next/image';
import { motion, type MotionValue } from 'framer-motion';
import type { ReactNode } from 'react';
import { macbookScreen } from '@/lib/devices';

const screenWidthPct = 100 - macbookScreen.inset.left - macbookScreen.inset.right;
const screenHeightPct = 100 - macbookScreen.inset.top - macbookScreen.inset.bottom;
/** poloměr zaoblení rohů, přepočtený jako % šířky SAMOTNÉ obrazovky (ne celého obrázku) */
const screenRadiusPct = (macbookScreen.cornerRadiusPct / screenWidthPct) * 100;

/**
 * MacBook mockup s obsahem přesně zapuštěným do výřezu obrazovky
 * (souřadnice z lib/devices.ts, vygenerované scripts/prepare-macbook.py).
 * Rámeček je vždy NAD obsahem — nic z content nesmí vizuálně přetéct.
 *
 * Používá ji <MacbookIntro />, <WhyAnimated /> i <Cases /> — je to jeden
 * a týž mockup a stejné souřadnice napříč celým webem.
 */
export function MacbookFrame({
  children,
  className = '',
  frameOpacity,
  priority = false,
}: {
  children: ReactNode;
  className?: string;
  /** pro křížové prolnutí rámečku při zoomu do obrazovky (MacbookIntro) */
  frameOpacity?: MotionValue<number> | number;
  priority?: boolean;
}) {
  return (
    <div className={`relative w-full ${className}`} style={{ aspectRatio: macbookScreen.imageAspect }}>
      <div
        className="absolute overflow-hidden bg-[#04060b]"
        style={{
          left: `${macbookScreen.inset.left}%`,
          top: `${macbookScreen.inset.top}%`,
          right: `${macbookScreen.inset.right}%`,
          bottom: `${macbookScreen.inset.bottom}%`,
          borderRadius: `${screenRadiusPct}%`,
        }}
      >
        {children}
      </div>

      <motion.div
        className="absolute inset-0 z-10"
        style={typeof frameOpacity === 'number' ? { opacity: frameOpacity } : frameOpacity ? { opacity: frameOpacity } : undefined}
      >
        <Image
          src="/assets/macbook-frame-cut.webp"
          alt=""
          aria-hidden
          fill
          priority={priority}
          sizes="(max-width: 768px) 90vw, 60vw"
          className="object-contain"
        />
      </motion.div>
    </div>
  );
}

export { macbookScreen, screenWidthPct, screenHeightPct, screenRadiusPct };
