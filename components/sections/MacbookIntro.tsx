'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { MacbookFrame, macbookScreen, screenHeightPct, screenWidthPct } from '@/components/mockups/MacbookFrame';
import { PlatformScene } from './PlatformScene';
import { useReducedMotion } from '@/lib/useReducedMotion';

const ZOOM = 2.5;
const centerX = macbookScreen.inset.left + screenWidthPct / 2;
/**
 * Scéna uvnitř obrazovky je vykreslená s `preserveAspectRatio="xMidYMax"`
 * (kotví se ke dnu) a poměr stran výřezu obrazovky je užší než viewBox
 * scény, takže vzniká „letterbox" nahoře — světelný prstenec tak leží
 * hlouběji než přesný střed výřezu. Zoom proto míří tam, ne na 50 %.
 */
const centerY = macbookScreen.inset.top + screenHeightPct * 0.75;

/**
 * Přechod „vlétneme do obrazovky notebooku" mezi Hero a stolem služeb.
 * Notebook (PNG mockup) se vynoří ze tmy, obrazovka ukazuje miniaturu
 * téže scény jako <ServicesTable /> (<PlatformScene compact />) — a beze
 * švu do ní přejde: animuje se jen `transform`/`opacity` celého bloku
 * s `transform-origin` přesně ve středu výřezu obrazovky, rámeček nad
 * koncem zoomu zprůhlední a zbude jen scéna, která na dalším scrollu
 * plynule naváže na plnou verzi v sekci Služby.
 */
export function MacbookIntro() {
  const reduced = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });

  const rise = useTransform(scrollYProgress, [0, 0.15], [42, 0]);
  const riseOpacity = useTransform(scrollYProgress, [0, 0.12], [0, 1]);
  const riseRotate = useTransform(scrollYProgress, [0, 0.15], [7, 0]);
  const scale = useTransform(scrollYProgress, [0.14, 0.86], [1, ZOOM]);
  const frameOpacity = useTransform(scrollYProgress, [0.4, 0.68], [1, 0]);
  const floorOpacity = useTransform(scrollYProgress, [0, 0.1, 0.5, 0.72], [0, 1, 1, 0]);

  if (reduced) {
    return (
      <section id="macbook" className="relative py-16 md:py-24" aria-hidden>
        <div className="shell">
          <motion.div
            className="mx-auto w-full max-w-[640px]"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 0.7 }}
          >
            <MacbookFrame priority>
              <div className="absolute inset-0 bg-[#04060b]">
                <PlatformScene compact active={false} />
              </div>
            </MacbookFrame>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <>
    <section
      id="macbook"
      ref={section}
      className="relative hidden md:block"
      style={{ height: '240vh' }}
      aria-hidden
    >
      <div className="sticky top-0 flex h-dvh items-center justify-center overflow-hidden">
        {/* měkká podlahová záře — žádný tvrdý postament, jen světlo */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-[18%] mx-auto h-[220px] w-[70%] max-w-2xl rounded-[50%] blur-[70px]"
          style={{
            opacity: floorOpacity,
            background: 'radial-gradient(ellipse, rgba(31,91,255,0.4), transparent 72%)',
          }}
        />

        <motion.div
          className="relative w-[min(58vw,820px)]"
          style={{
            scale,
            y: rise,
            opacity: riseOpacity,
            rotateX: riseRotate,
            transformOrigin: `${centerX}% ${centerY}%`,
            transformPerspective: 1400,
          }}
        >
          <MacbookFrame frameOpacity={frameOpacity} priority>
            <div className="absolute inset-0 bg-[#04060b]">
              <PlatformScene compact active />
            </div>
          </MacbookFrame>
        </motion.div>
      </div>
    </section>

    {/* mobil — bez pinningu a zoomu, jen krátké odhalení a fade */}
    <section className="relative py-14 md:hidden" aria-hidden>
      <div className="shell">
        <motion.div
          className="mx-auto w-full max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.6 }}
        >
          <MacbookFrame>
            <div className="absolute inset-0 bg-[#04060b]">
              <PlatformScene compact active={false} />
            </div>
          </MacbookFrame>
        </motion.div>
      </div>
    </section>
    </>
  );
}
