'use client';

import { AnimatePresence, motion, useScroll, useSpring, useTransform, useVelocity } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Mascot } from './Mascot';
import { mascotCues, type MascotShot, type Pose } from '@/content/mascot';
import { useReducedMotion } from '@/lib/useReducedMotion';

const FULL_H = 300;
const WAIST_H = 460;
const WAIST_VISIBLE = 0.56;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Co průvodce nesmí zakrýt (a klik na to nesmí „spolknout"). */
const AVOID = 'main a, main button, main input, main textarea, main select, main h2, main h3, main p, main [data-card], main [data-land="price-card"]';

/**
 * Průvodce — velká postava v rohu, pro každou sekci vlastní „záběr":
 * celá postava nebo do pasu (vykukuje zespodu), vlevo/vpravo, natočený
 * k obsahu nebo od něj. Při změně sekce odejde ze záběru a vrátí se
 * v novém. Setrvačnost scrollu ho jemně naklání, klik = zamávání.
 * Kde maskot hraje přímo ve scéně (hero, Proces, kontakt…), není vidět.
 */
/**
 * Průvodce je jen pro počítač (na telefonu se nevejde vedle obsahu) — na
 * mobilu se vůbec nepřipojí, takže neběží ani jeho posluchače scrollu.
 */
export function MascotGuide() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)');
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return desktop ? <Guide /> : null;
}

function Guide() {
  const t = useTranslations('mascot');
  const reduced = useReducedMotion();
  const [cueId, setCueId] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);
  const [wave, setWave] = useState(false);
  const waveTimer = useRef<number | null>(null);

  const cue = mascotCues.find((item) => item.sectionId === cueId) ?? null;

  useEffect(() => {
    const sections = mascotCues
      .map((item) => document.getElementById(item.sectionId))
      .filter((node): node is HTMLElement => Boolean(node));
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setCueId(visible.target.id);
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.2, 0.6] },
    );
    sections.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  // během hero filmu (stůl služeb leží pod ním) průvodce nevstupuje do záběru
  const [heroDone, setHeroDone] = useState(false);
  useEffect(() => {
    const hero = document.getElementById('hero');
    if (!hero) {
      setHeroDone(true);
      return;
    }
    // hranici měřit jen při změně velikosti — čtení offsetTop při každém
    // scrollu vynucuje přepočet rozvržení uprostřed animací
    let limit = 0;
    const measure = () => {
      limit = hero.offsetTop + hero.offsetHeight - window.innerHeight - 2;
      check();
    };
    const check = () => setHeroDone(window.scrollY >= limit);
    measure();
    const late = window.setTimeout(measure, 1200);
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      window.clearTimeout(late);
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', measure);
    };
  }, []);

  // velikost podle výšky okna — na nízkém notebooku menší postava
  const [vh, setVh] = useState(900);
  useEffect(() => {
    const update = () => setVh(window.innerHeight);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  /*
   * Uhnutí: když by postava zakryla tlačítko, odkaz nebo text sekce, schová
   * se za okraj obrazovky a vrátí se, až je místo volné. Kontrola po skrolu
   * (nejvýš ~8× za sekundu), návrat se zpožděním, ať průvodce nebliká.
   */
  const [dodge, setDodge] = useState(false);
  const dodgeRef = useRef(false);
  const boxRef = useRef({ left: 0, top: 0, right: 0, bottom: 0 });
  useEffect(() => {
    let raf = 0;
    let last = 0;
    let back: number | null = null;
    const test = () => {
      raf = 0;
      last = performance.now();
      const b = boxRef.current;
      if (b.right <= b.left) return;
      // drobná tolerance: dotyk okrajem nevadí
      const pad = 10;
      const hit = [...document.querySelectorAll<HTMLElement>(AVOID)].some((el) => {
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2 || r.bottom < b.top + pad || r.top > b.bottom - pad) return false;
        return r.right > b.left + pad && r.left < b.right - pad;
      });
      if (hit) {
        if (back) window.clearTimeout(back);
        back = null;
        if (!dodgeRef.current) {
          dodgeRef.current = true;
          setDodge(true);
        }
      } else if (dodgeRef.current && !back) {
        back = window.setTimeout(() => {
          back = null;
          dodgeRef.current = false;
          setDodge(false);
        }, 450);
      }
    };
    const schedule = () => {
      if (raf) return;
      const wait = Math.max(0, 120 - (performance.now() - last));
      raf = window.setTimeout(() => requestAnimationFrame(test), wait) as unknown as number;
    };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const id = window.setInterval(schedule, 700);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.clearInterval(id);
      if (back) window.clearTimeout(back);
    };
  }, []);

  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { stiffness: 120, damping: 22 });
  const lean = useTransform(velocity, [-3000, 0, 3000], [-6, 0, 6], { clamp: true });
  const sink = useTransform(velocity, [-3000, 0, 3000], [-12, 0, 12], { clamp: true });

  useEffect(() => () => {
    if (waveTimer.current) window.clearTimeout(waveTimer.current);
  }, []);

  const onPoke = () => {
    setWave(true);
    if (waveTimer.current) window.clearTimeout(waveTimer.current);
    waveTimer.current = window.setTimeout(() => setWave(false), 1800);
  };

  const shot: MascotShot | undefined = cue?.shot;
  // na velmi nízkém okně (pod 640 px) se průvodce nevejde vedle obsahu vůbec
  const visible = Boolean(cue && !cue.hidden && shot) && !closed && heroDone && !dodge && vh >= 640;
  const pose: Pose = wave ? 'wave' : (cue?.pose ?? 'idle');
  const waist = shot?.framing === 'waist';
  const fullH = Math.round(clamp(vh * 0.31, 200, FULL_H));
  const waistH = Math.round(clamp(vh * 0.5, 320, WAIST_H));
  const figureH = waist ? waistH : fullH;
  const boxH = waist ? Math.round(waistH * WAIST_VISIBLE) : fullH;
  const boxW = Math.round(figureH * 0.62);
  const side = shot?.side ?? 'right';
  // místo, které by postava zabrala (pro kontrolu uhnutí), i když je zrovna schovaná
  useEffect(() => {
    const vw = window.innerWidth;
    boxRef.current =
      cue && !cue.hidden && shot
        ? side === 'left'
          ? { left: 16, right: 16 + boxW, top: vh - boxH, bottom: vh }
          : { left: vw - 16 - boxW, right: vw - 16, top: vh - boxH, bottom: vh }
        : { left: 0, top: 0, right: 0, bottom: 0 };
  }, [cue, shot, side, boxW, boxH, vh]);

  return (
    <div className={`pointer-events-none fixed bottom-0 z-[95] hidden md:block ${side === 'left' ? 'left-4' : 'right-4'}`}>
      <AnimatePresence mode="wait">
        {visible && shot ? (
          <motion.div
            key={`${cueId}`}
            className="group pointer-events-auto relative"
            initial={reduced ? { opacity: 0 } : { y: '110%', rotate: side === 'left' ? -8 : 8, filter: 'brightness(0.25) saturate(0.4)' }}
            animate={reduced ? { opacity: 1 } : { y: '0%', rotate: 0, filter: 'brightness(1) saturate(1)' }}
            exit={reduced ? { opacity: 0 } : { y: '110%', rotate: side === 'left' ? 6 : -6, filter: 'brightness(0.25) saturate(0.4)', transition: { duration: 0.35, ease: 'easeIn' } }}
            transition={{ type: 'spring', stiffness: 130, damping: 18, mass: 0.9 }}
            style={{ transformOrigin: '50% 100%' }}
          >
            <motion.button
              type="button"
              onClick={onPoke}
              aria-label={t('guideLabel')}
              className="block origin-bottom outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-bright)]"
              style={reduced ? undefined : { rotate: lean, y: sink }}
            >
              {/* do pasu: vyšší postava, spodek schovaný za okrajem obrazovky */}
              <div className="relative overflow-hidden" style={{ height: boxH, width: boxW }}>
                <div className="absolute inset-x-0 top-0" style={{ height: figureH, transform: `perspective(900px) rotateY(${shot.turn}deg)`, transformOrigin: '50% 100%' }}>
                  <Mascot pose={pose} height={figureH} flip={Boolean(shot.flip)} followCursor />
                </div>
              </div>
            </motion.button>
            <button
              type="button"
              onClick={() => setClosed(true)}
              className={`absolute top-2 grid h-6 w-6 place-items-center rounded-full border border-[var(--line)] bg-[var(--bg-elevated)] text-[11px] text-muted opacity-0 transition-opacity hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 ${side === 'left' ? 'left-0' : 'right-0'}`}
              aria-label={t('collapse')}
            >
              ×
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
