'use client';

/**
 * Atmosféra pozadí: jemná mřížka, plovoucí světelné stuhy, hvězdný prach a zrno.
 * Čistě dekorativní vrstva pod obsahem — proto aria-hidden a pointer-events-none.
 */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden grain">
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
      <svg className="absolute inset-0 h-full w-full opacity-50" preserveAspectRatio="none" viewBox="0 0 1440 900">
        <defs>
          <linearGradient id="ribbon" x1="0" x2="1">
            <stop offset="0%" stopColor="rgba(31,91,255,0)" />
            <stop offset="45%" stopColor="rgba(120,160,255,0.55)" />
            <stop offset="100%" stopColor="rgba(31,91,255,0)" />
          </linearGradient>
        </defs>
        <g className="animate-drift" style={{ transformOrigin: 'center' }}>
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
