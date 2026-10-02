'use client';

import { useEffect, useRef } from 'react';

/**
 * „Světlo scény": jeden velký měkký zdroj světla, který se se scrollem
 * plynule přesouvá a mění odstín přes celou stránku. Je fixní, takže
 * prochází hranicemi sekcí — sousední sekce na jednom obrazovce mají
 * vždy stejné světlo (žádný šev v odstínu).
 */
const LIGHT_KEYS: { at: number; x: number; y: number; hue: number; a: number }[] = [
  { at: 0.0, x: 50, y: 20, hue: 222, a: 0.34 },
  { at: 0.14, x: 50, y: 78, hue: 222, a: 0.42 },
  { at: 0.3, x: 66, y: 48, hue: 214, a: 0.36 },
  { at: 0.44, x: 38, y: 36, hue: 196, a: 0.32 },
  { at: 0.58, x: 24, y: 58, hue: 228, a: 0.36 },
  { at: 0.72, x: 40, y: 50, hue: 238, a: 0.34 },
  { at: 0.86, x: 56, y: 26, hue: 218, a: 0.4 },
  { at: 1.0, x: 50, y: 64, hue: 222, a: 0.38 },
];

function SceneLight() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // jen počítač — na telefonu je světlo statické (žádný posluchač scrollu)
    if (!window.matchMedia('(min-width: 768px)').matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const t = Math.min(1, Math.max(0, window.scrollY / max));
      let k = 0;
      while (k < LIGHT_KEYS.length - 2 && LIGHT_KEYS[k + 1].at < t) k += 1;
      const A = LIGHT_KEYS[k];
      const B = LIGHT_KEYS[k + 1];
      const f = Math.min(1, Math.max(0, (t - A.at) / (B.at - A.at)));
      const s = f * f * (3 - 2 * f);
      const mix = (a: number, b: number) => a + (b - a) * s;
      // jen transform + opacity (kompozitor) — žádné překreslování gradientu ani blur
      el.style.transform = `translate3d(${(mix(A.x, B.x) - 50).toFixed(2)}vw, ${(mix(A.y, B.y) - 50).toFixed(2)}vh, 0)`;
      el.style.opacity = (mix(A.a, B.a) / 0.42).toFixed(3);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div
      ref={ref}
      className="absolute left-[-50vw] top-[-50vh] h-[200vh] w-[200vw] will-change-transform"
      style={{ background: 'radial-gradient(21vw 19vh at 50% 50%, rgba(31,91,255,0.42), rgba(31,91,255,0.12) 55%, transparent 100%)' }}
    />
  );
}

/**
 * Atmosféra pozadí: jemná mřížka, plovoucí světelné stuhy, hvězdný prach a zrno.
 * Čistě dekorativní vrstva pod obsahem — proto aria-hidden a pointer-events-none.
 */
export function Backdrop() {
  return (
    <>
      <MobileBackdrop />
      <DesktopBackdrop />
    </>
  );
}

/**
 * Telefon: atmosféra NENÍ fixní vrstva. Pevné pozadí pod obsahem nutí
 * prohlížeč kreslit celou stránku do dalších velkých GPU vrstev nad ním —
 * iOS Safari je pak při rychlém švihnutí nestíhá vykreslit a obsah na
 * okamžik zmizí. Tady je to jeden statický prvek přes celou výšku stránky
 * (kreslí se s obsahem): záře nahoře, mřížka, rozptýlené tůně světla a hvězdný prach.
 */
function MobileBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full overflow-hidden md:hidden"
      style={{
        backgroundImage: [
          'radial-gradient(95% 520px at 50% -40px, rgba(31,91,255,0.26), transparent 72%)',
          'radial-gradient(1.4px 1.4px at 12% 22%, rgba(255,255,255,0.5), transparent), radial-gradient(1.2px 1.2px at 68% 14%, rgba(160,190,255,0.45), transparent), radial-gradient(1.6px 1.6px at 82% 46%, rgba(255,255,255,0.32), transparent), radial-gradient(1.2px 1.2px at 32% 68%, rgba(160,190,255,0.36), transparent), radial-gradient(1.1px 1.1px at 54% 88%, rgba(255,255,255,0.28), transparent)',
          'radial-gradient(70% 520px at 72% 50%, rgba(31,91,255,0.1), transparent 72%)',
          'radial-gradient(70% 480px at 24% 50%, rgba(0,140,255,0.07), transparent 72%)',
        ].join(', '),
        backgroundSize: '100% 1200px, 390px 844px, 100% 1700px, 100% 2300px',
        backgroundRepeat: 'no-repeat, repeat, repeat-y, repeat-y',
        backgroundPosition: '0 0, 0 0, 0 600px, 0 1500px',
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-[900px] opacity-[0.22]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(80,120,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(80,120,255,0.08) 1px, transparent 1px)',
          backgroundSize: '84px 84px',
          maskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, #000 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, #000 30%, transparent 75%)',
        }}
      />
    </div>
  );
}

function DesktopBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 hidden overflow-hidden grain md:block">
      <div className="absolute inset-0 bg-[var(--bg)]" />

      {/* mřížka */}
      <div
        className="absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(80,120,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(80,120,255,0.08) 1px, transparent 1px)',
          backgroundSize: '84px 84px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000 30%, transparent 75%)',
        }}
      />

      {/* světelné stuhy */}
      <svg className="absolute inset-y-0 -left-[12%] h-full w-[124%] animate-drift opacity-50 will-change-transform" preserveAspectRatio="none" viewBox="0 0 1440 900">
        <defs>
          <linearGradient id="ribbon" x1="0" x2="1">
            <stop offset="0%" stopColor="rgba(31,91,255,0)" />
            <stop offset="45%" stopColor="rgba(120,160,255,0.55)" />
            <stop offset="100%" stopColor="rgba(31,91,255,0)" />
          </linearGradient>
        </defs>
        <g>
          <path d="M-100 620 C 300 520, 520 760, 900 600 S 1400 430, 1600 520" stroke="url(#ribbon)" strokeWidth="1.4" fill="none" />
          <path d="M-100 700 C 260 600, 600 840, 980 680 S 1420 520, 1600 600" stroke="url(#ribbon)" strokeWidth="1" fill="none" opacity="0.7" />
          <path d="M-100 540 C 340 470, 620 660, 1040 520 S 1380 380, 1600 440" stroke="url(#ribbon)" strokeWidth="0.8" fill="none" opacity="0.5" />
        </g>
      </svg>

      {/* modrá záře nahoře */}
      <div
        className="absolute left-1/2 top-[-22vh] h-[60vh] w-[90vw] -translate-x-1/2 rounded-full opacity-45 blur-[120px]"
        style={{ background: 'radial-gradient(circle, rgba(31,91,255,0.5), transparent 65%)' }}
      />

      {/* světlo scény — plynule putuje přes hranice sekcí */}
      <SceneLight />

      {/* hvězdný prach */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(1.4px 1.4px at 12% 22%, rgba(255,255,255,0.7), transparent), radial-gradient(1.2px 1.2px at 68% 14%, rgba(160,190,255,0.6), transparent), radial-gradient(1.6px 1.6px at 82% 46%, rgba(255,255,255,0.45), transparent), radial-gradient(1.2px 1.2px at 32% 68%, rgba(160,190,255,0.5), transparent), radial-gradient(1.1px 1.1px at 54% 88%, rgba(255,255,255,0.4), transparent)',
        }}
      />
    </div>
  );
}
