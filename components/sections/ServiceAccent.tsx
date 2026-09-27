'use client';

import { motion } from 'framer-motion';
import type { ServiceSlug } from '@/content/services';
import { useReducedMotion } from '@/lib/useReducedMotion';

/**
 * Tichý, ztlumený motiv na pozadí panelu — pro každou službu jiný, aby se
 * pět karet v <ServiceDeck /> nečetlo jako jedna šablona s vyměněným textem.
 * Čistě transform/opacity animace (bezpečné pro scroll-scrubbing), žádný
 * text, žádné cizí logo/ikona — jen generické tvary dané domény.
 */
export function ServiceAccent({ slug, active }: { slug: ServiceSlug; active: boolean }) {
  const reduced = useReducedMotion();
  const show = active || reduced;

  switch (slug) {
    case 'weby':
      return <WireframeAccent show={show} />;
    case 'seo':
      return <GraphAccent show={show} />;
    case 'e-shopy':
      return <CartAccent show={show} />;
    case 'design':
      return <PaletteAccent show={show} />;
    case 'aplikace':
      return <IconGridAccent show={show} />;
    default:
      return null;
  }
}

const FADE = { duration: 0.9, ease: [0.16, 1, 0.3, 1] as const };

/** 01 — drátěný náčrt webu: mřížka + pár obrysových bloků obsahu. */
function WireframeAccent({ show }: { show: boolean }) {
  return (
    <motion.svg
      aria-hidden
      viewBox="0 0 400 300"
      className="absolute inset-0 h-full w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: show ? 1 : 0 }}
      transition={FADE}
    >
      <defs>
        <linearGradient id="wf-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(61,123,255,0.22)" />
          <stop offset="100%" stopColor="rgba(61,123,255,0.03)" />
        </linearGradient>
      </defs>
      {Array.from({ length: 9 }).map((_, i) => (
        <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="300" stroke="url(#wf-fade)" strokeWidth="0.6" />
      ))}
      {Array.from({ length: 7 }).map((_, i) => (
        <line key={`h${i}`} x1="0" y1={i * 50} x2="400" y2={i * 50} stroke="url(#wf-fade)" strokeWidth="0.6" />
      ))}
      <rect x="24" y="24" width="220" height="26" rx="6" fill="none" stroke="rgba(140,175,255,0.32)" strokeDasharray="4 4" />
      <rect x="24" y="66" width="130" height="90" rx="8" fill="none" stroke="rgba(140,175,255,0.28)" strokeDasharray="4 4" />
      <rect x="164" y="66" width="90" height="42" rx="6" fill="none" stroke="rgba(140,175,255,0.22)" strokeDasharray="3 5" />
      <rect x="164" y="114" width="90" height="42" rx="6" fill="none" stroke="rgba(140,175,255,0.22)" strokeDasharray="3 5" />
    </motion.svg>
  );
}

/** 02 — stoupající graf přes celé pozadí. */
function GraphAccent({ show }: { show: boolean }) {
  return (
    <motion.svg
      aria-hidden
      viewBox="0 0 400 300"
      className="absolute inset-0 h-full w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: show ? 1 : 0 }}
      transition={FADE}
    >
      <defs>
        <linearGradient id="seo-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(61,160,255,0.28)" />
          <stop offset="100%" stopColor="rgba(61,160,255,0)" />
        </linearGradient>
      </defs>
      <path
        d="M0,260 C60,250 90,220 130,190 C170,160 190,205 230,170 C270,135 280,90 330,60 L400,30 L400,300 L0,300 Z"
        fill="url(#seo-area)"
      />
      <motion.path
        d="M0,260 C60,250 90,220 130,190 C170,160 190,205 230,170 C270,135 280,90 330,60 L400,30"
        fill="none"
        stroke="rgba(120,180,255,0.55)"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: show ? 1 : 0 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
      />
      {[[130, 190], [230, 170], [330, 60]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.5" fill="#e8f0ff" opacity={show ? 0.85 : 0} />
      ))}
    </motion.svg>
  );
}

/** 03 — velká neonová silueta košíku, generický obrys (žádná značka). */
function CartAccent({ show }: { show: boolean }) {
  return (
    <motion.svg
      aria-hidden
      viewBox="0 0 400 300"
      className="absolute inset-0 h-full w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: show ? 1 : 0 }}
      transition={FADE}
    >
      <g transform="translate(30,20) scale(9)" filter="url(#cart-glow)">
        <defs>
          <filter id="cart-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d="M2 3h2l1.6 9.2a2 2 0 0 0 2 1.8h7.2a2 2 0 0 0 2-1.6L18 7H6.2"
          fill="none"
          stroke="rgba(90,150,255,0.4)"
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="9" cy="19" r="1.1" fill="none" stroke="rgba(90,150,255,0.4)" strokeWidth="0.8" />
        <circle cx="16" cy="19" r="1.1" fill="none" stroke="rgba(90,150,255,0.4)" strokeWidth="0.8" />
      </g>
    </motion.svg>
  );
}

/** 04 — paleta barevných vzorníků. */
function PaletteAccent({ show }: { show: boolean }) {
  const swatches = [
    { x: '68%', y: '4%', size: 170, color: 'rgba(61,123,255,0.4)' },
    { x: '80%', y: '38%', size: 210, color: 'rgba(168,85,247,0.32)' },
    { x: '62%', y: '58%', size: 190, color: 'rgba(45,212,191,0.26)' },
    { x: '4%', y: '62%', size: 150, color: 'rgba(244,114,182,0.24)' },
    { x: '86%', y: '72%', size: 130, color: 'rgba(251,191,36,0.2)' },
  ];
  return (
    <motion.div
      aria-hidden
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: show ? 1 : 0 }}
      transition={FADE}
    >
      {swatches.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full blur-3xl"
          style={{ left: s.x, top: s.y, width: s.size, height: s.size, background: s.color }}
        />
      ))}
    </motion.div>
  );
}

/** 05 — mřížka generických app ikon (žádné reálné logo). */
function IconGridAccent({ show }: { show: boolean }) {
  const cells = Array.from({ length: 12 }).map((_, i) => ({
    x: 10 + (i % 4) * 24,
    y: 8 + Math.floor(i / 4) * 30,
    r: (i * 37) % 9,
  }));
  return (
    <motion.svg
      aria-hidden
      viewBox="0 0 400 300"
      className="absolute inset-0 h-full w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: show ? 1 : 0 }}
      transition={FADE}
    >
      {cells.map((c, i) => (
        <g key={i} transform={`translate(${c.x * 3.6} ${c.y * 3.2}) rotate(${c.r - 4})`}>
          <rect width="46" height="46" rx="12" fill="rgba(20,32,64,0.55)" stroke="rgba(120,160,255,0.3)" strokeWidth="1" />
          <rect x="14" y="14" width="18" height="18" rx="5" fill="rgba(140,175,255,0.35)" />
        </g>
      ))}
    </motion.svg>
  );
}
