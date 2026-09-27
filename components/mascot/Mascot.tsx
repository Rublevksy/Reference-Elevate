'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';
import { motion, type Variants } from 'framer-motion';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useEffect, useRef, useState } from 'react';
import { poseSprite, type Pose } from '@/content/mascot';
import { site } from '@/content/site';

const Mascot3D = dynamic(() => import('@/components/three/MascotModel').then((m) => m.MascotModel), {
  ssr: false,
  loading: () => null,
});

/**
 * Jedna komponenta pro 2D i 3D maskota.
 * 2D sprite je výchozí (a zároveň fallback pro slabá zařízení a reduced-motion);
 * jakmile v /public/models/mascot.glb přistane zariggovaný model a site.mascot3d
 * se přepne na true, stejné `pose` rozjede odpovídající klip.
 */
export type MascotProps = {
  pose?: Pose;
  className?: string;
  /** Výška sprite v px; šířka se dopočítá */
  height?: number;
  /** Otočit doleva (maskot se dívá do stránky) */
  flip?: boolean;
  /** Náklon hlavy/těla za kurzorem */
  followCursor?: boolean;
  /** Jen hlava a ramena — pro malého průvodce v rohu */
  bust?: boolean;
  priority?: boolean;
};

const poseVariants: Variants = {
  idle: { y: [0, -10, 0], rotate: 0, scale: 1, transition: { duration: 5.5, repeat: Infinity, ease: 'easeInOut' } },
  walk: {
    y: [0, -6, 0, -6, 0],
    rotate: [0, 1.6, 0, -1.6, 0],
    transition: { duration: 1.1, repeat: Infinity, ease: 'easeInOut' },
  },
  wave: {
    y: [0, -6, 0],
    rotate: [0, 2.5, -1.5, 2.5, 0],
    transition: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
  },
  point: { y: [0, -7, 0], rotate: -1.5, scale: 1.02, transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' } },
  think: { y: [0, -5, 0], rotate: 0, transition: { duration: 6.5, repeat: Infinity, ease: 'easeInOut' } },
  thumbsUp: { y: [0, -12, 0], rotate: [0, -2, 0], transition: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } },
  celebrate: {
    y: [0, -22, 0],
    rotate: [0, 4, -4, 0],
    transition: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' },
  },
  bored: { y: [0, -3, 0], rotate: [0, 1.2, 0], transition: { duration: 7, repeat: Infinity, ease: 'easeInOut' } },
  still: { y: 0, rotate: 0 },
};

export function Mascot({
  pose = 'idle',
  className = '',
  height = 420,
  flip = false,
  followCursor = true,
  bust = false,
  priority = false,
}: MascotProps) {
  const reduced = useReducedMotion();
  const wrapper = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [use3d, setUse3d] = useState(false);

  useEffect(() => {
    if (!site.mascot3d || reduced) return;
    // 3D jen tam, kde je WebGL a dost jader
    const cores = navigator.hardwareConcurrency ?? 4;
    setUse3d(cores > 4 && window.innerWidth >= 1024);
  }, [reduced]);

  useEffect(() => {
    if (!followCursor || reduced) return;

    const onMove = (event: PointerEvent) => {
      const node = wrapper.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (event.clientX - cx) / window.innerWidth;
      const dy = (event.clientY - cy) / window.innerHeight;
      setTilt({ x: Math.max(-1, Math.min(1, dx)), y: Math.max(-1, Math.min(1, dy)) });
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [followCursor, reduced]);

  const src = poseSprite[pose];
  const width = Math.round(height * 0.78);

  return (
    <div
      ref={wrapper}
      className={`pointer-events-none relative select-none ${bust ? 'overflow-hidden' : ''} ${className}`}
      style={{ height, width: bust ? height : width }}
    >
      {use3d ? (
        <Mascot3D pose={pose} />
      ) : (
        <motion.div
          className="relative h-full w-full"
          style={{
            transform: `perspective(800px) rotateY(${tilt.x * 7}deg) rotateX(${-tilt.y * 4}deg)`,
            transformOrigin: 'center bottom',
          }}
          variants={poseVariants}
          animate={reduced ? 'still' : pose}
        >
          <div
            className="relative h-full w-full"
            style={
              // Bust = přiblížení na hlavu a ramena; jediný sprite tak poslouží
              // i malému průvodci v rohu.
              bust
                ? { transform: 'translateY(29%) scale(2.4)', transformOrigin: '50% 0%' }
                : undefined
            }
          >
            <Image
              src={src}
              alt=""
              aria-hidden
              fill
              priority={priority}
              sizes={`${bust ? height : width}px`}
              className={`object-contain object-top drop-shadow-[0_30px_50px_rgba(0,0,0,0.65)] ${
                flip ? '-scale-x-100' : ''
              }`}
            />
          </div>

          {/* modrý odlesk pod maskotem */}
          <div
            aria-hidden
            className="absolute inset-x-[12%] bottom-[-4%] h-8 rounded-[50%] blur-xl"
            style={{ background: 'radial-gradient(ellipse, rgba(31,91,255,0.55), transparent 70%)' }}
          />
        </motion.div>
      )}
    </div>
  );
}
