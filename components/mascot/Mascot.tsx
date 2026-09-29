'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { poseAspect, poseSprite, type Pose } from '@/content/mascot';
import { useReducedMotion } from '@/lib/useReducedMotion';

/**
 * 3D maskot ELEVATE (předrenderované pózy). Póza se mění prolnutím
 * zarovnaným na chodidla s malým poskokem; v klidu jen jemně „dýchá"
 * (nepatrné natažení od chodidel) — žádné plovoucí posouvání obrázku.
 */
export type MascotProps = {
  pose?: Pose;
  className?: string;
  /** Výška maskota v px; šířka boxu se dopočítá pro nejširší pózu */
  height?: number;
  /** Zrcadlově — např. aby ukazoval do stránky */
  flip?: boolean;
  /** Lehký náklon za kurzorem */
  followCursor?: boolean;
  /** Jen hlava a ramena */
  bust?: boolean;
  priority?: boolean;
};

const BOX_ASPECT = 0.62;

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
  const tiltRef = useRef<HTMLDivElement>(null);

  // náklon za kurzorem zapisuje přímo do DOM (dřív setState při každém pohybu myši)
  useEffect(() => {
    if (!followCursor || reduced) return;
    let raf = 0;
    let mx = 0;
    let my = 0;
    // poloha se měří až ve snímku, ne v události myši — getBoundingClientRect
    // v pointermove vynucoval přepočet layoutu při každém pohybu (sekal hover efekty)
    const apply = () => {
      raf = 0;
      const node = wrapper.current;
      if (!node || !tiltRef.current) return;
      const rect = node.getBoundingClientRect();
      const dx = Math.max(-1, Math.min(1, (mx - (rect.left + rect.width / 2)) / window.innerWidth));
      const dy = Math.max(-1, Math.min(1, (my - (rect.top + rect.height / 2)) / window.innerHeight));
      tiltRef.current.style.transform = `perspective(800px) rotateY(${(dx * 6).toFixed(2)}deg) rotateX(${(-dy * 3).toFixed(2)}deg)`;
    };
    const onMove = (event: PointerEvent) => {
      mx = event.clientX;
      my = event.clientY;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [followCursor, reduced]);

  const width = Math.round(height * (bust ? 1 : BOX_ASPECT));
  const celebrate = pose === 'celebrate';

  return (
    <div
      ref={wrapper}
      className={`pointer-events-none relative select-none ${bust ? 'overflow-hidden' : ''} ${className}`}
      style={{ height, width }}
    >
      {/* odlesk pod chodidly */}
      {!bust ? (
        <div
          aria-hidden
          className="absolute inset-x-[10%] bottom-[-3%] h-6 rounded-[50%] blur-lg"
          style={{ background: 'radial-gradient(ellipse, rgba(31,91,255,0.55), transparent 70%)' }}
        />
      ) : null}
      <div ref={tiltRef} className="absolute inset-0" style={{ transformOrigin: 'center bottom' }}>
        <motion.div
          className="absolute inset-0 origin-bottom"
          animate={reduced ? { scaleY: 1 } : { scaleY: [1, 1.012, 1] }}
          transition={{ duration: celebrate ? 1.6 : 4.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <AnimatePresence initial={false}>
            <motion.img
              key={pose}
              src={poseSprite[pose]}
              alt=""
              aria-hidden
              draggable={false}
              loading={priority ? 'eager' : 'lazy'}
              className="absolute bottom-0 left-1/2 max-w-none drop-shadow-[0_24px_40px_rgba(0,0,0,0.6)]"
              style={
                bust
                  ? { height: height * 2.3, width: height * 2.3 * poseAspect[pose], top: -height * 0.06, bottom: 'auto', x: '-50%', scaleX: flip ? -1 : 1 }
                  : { height, width: height * poseAspect[pose], x: '-50%', scaleX: flip ? -1 : 1 }
              }
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, y: [6, -8, 0] }}
              exit={{ opacity: 0, transition: { duration: 0.25 } }}
              transition={{ opacity: { duration: 0.3 }, y: { duration: 0.5, ease: 'easeOut' } }}
            />
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
