'use client';

import { useRef, type MouseEvent, type ReactNode } from 'react';
import { useReducedMotion } from '@/lib/useReducedMotion';

/** Skleněná karta s náklonem ke kurzoru a reflexí pod prstem. */
export function GlassCard({
  children,
  className = '',
  tilt = true,
}: {
  children: ReactNode;
  className?: string;
  tilt?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const onMove = (event: MouseEvent<HTMLDivElement>) => {
    const node = ref.current;
    if (!node || reduced || !tilt) return;
    const rect = node.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    node.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 7}deg) rotateY(${(px - 0.5) * 9}deg) translateZ(0)`;
    node.style.setProperty('--mx', `${px * 100}%`);
    node.style.setProperty('--my', `${py * 100}%`);
  };

  const onLeave = () => {
    const node = ref.current;
    if (!node) return;
    node.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)';
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`glass relative overflow-hidden rounded-card transition-transform duration-300 will-change-transform ${className}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 hover:opacity-100"
        style={{
          background:
            'radial-gradient(420px circle at var(--mx,50%) var(--my,50%), rgba(61,123,255,0.16), transparent 60%)',
        }}
      />
      {children}
    </div>
  );
}
