'use client';

import type { ReactNode } from 'react';
import { Logo } from '@/components/ui/Logo';

/**
 * Obezličený notebook (žádné cizí logo) — tmavý hliník, tenké rámečky,
 * na víku logo ELEVATE. Obsah se vkládá do výřezu obrazovky.
 */
export function LaptopShell({
  children,
  className = '',
  screenClassName = '',
  signature = true,
}: {
  children: ReactNode;
  className?: string;
  screenClassName?: string;
  /** decentní logo pod notebookem — v referencích ho nechceme */
  signature?: boolean;
}) {
  return (
    <div className={`relative ${className}`}>
      {/* víko */}
      <div
        className="relative rounded-[18px] border border-[rgba(150,175,220,0.22)] p-[10px] shadow-[0_50px_90px_-40px_rgba(0,0,0,0.95)]"
        style={{ background: 'linear-gradient(160deg,#20242e 0%,#101319 45%,#191d25 100%)' }}
      >
        <div
          className={`relative overflow-hidden rounded-[10px] bg-[#04060b] ring-1 ring-black/60 ${screenClassName}`}
        >
          {children}
          {/* odlesk skla */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(115deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0) 32%, rgba(255,255,255,0) 68%, rgba(255,255,255,0.05) 100%)',
            }}
          />
        </div>

        {/* kamerka */}
        <span aria-hidden className="absolute left-1/2 top-[4px] h-[3px] w-[3px] -translate-x-1/2 rounded-full bg-[#2c313c]" />
      </div>

      {/* spodní díl */}
      <div className="relative mx-auto h-[14px] w-[104%] -translate-x-[2%] rounded-b-[14px] border-x border-b border-[rgba(150,175,220,0.16)]"
        style={{ background: 'linear-gradient(180deg,#171b22,#0c0f14)' }}
      >
        <span
          aria-hidden
          className="absolute left-1/2 top-0 h-[3px] w-[16%] -translate-x-1/2 rounded-b-full bg-[rgba(0,0,0,0.6)]"
        />
      </div>

      {signature ? (
        <div className="pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2 opacity-45">
          <Logo height={13} />
        </div>
      ) : null}
    </div>
  );
}
