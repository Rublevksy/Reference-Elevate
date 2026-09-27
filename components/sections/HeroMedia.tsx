'use client';

import dynamic from 'next/dynamic';
import { useRef } from 'react';
import type { HeroPointer } from '@/components/three/MacbookScene';

const MacbookScene = dynamic(() => import('@/components/three/MacbookScene'), {
  ssr: false,
  loading: () => <SceneLoader />,
});

function SceneLoader() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="relative h-24 w-24">
        <div className="absolute inset-0 animate-spin-slow rounded-full border border-[var(--line)]" />
        <div className="absolute inset-3 rounded-full border border-[rgba(61,123,255,0.4)] animate-pulse-glow" />
        <div className="absolute inset-0 grid place-items-center font-display text-[10px] tracking-[0.3em] text-muted">
          3D
        </div>
      </div>
    </div>
  );
}

/**
 * Vizuál hera za dvěma vizuálně zaměnitelnými vrstvami:
 *   mode="3d"    — aktuální idle 3D scéna (zavřený notebook, jemná rotace)
 *   mode="video" — do budoucna: `public/hero/intro.mp4`, jehož
 *                  `video.currentTime` bude řízený scroll progressem
 *                  (ScrollTrigger) stejně, jako to dřív dělala 3D scéna.
 *                  Zapojení je připravené (`scrubTo`), ale nepoužité —
 *                  video se zatím nikde nenačítá.
 */
export function HeroMedia({
  mode = '3d',
  pointer,
  className = '',
}: {
  mode?: '3d' | 'video';
  pointer: HeroPointer;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  if (mode === 'video') {
    return (
      <video
        ref={videoRef}
        className={`h-full w-full object-contain object-right ${className}`}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden
      >
        <source src="/hero/intro.mp4" type="video/mp4" />
      </video>
    );
  }

  return (
    <div className={`relative h-full w-full ${className}`}>
      <MacbookScene pointer={pointer} />
    </div>
  );
}
