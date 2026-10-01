'use client';

import type { ReactNode } from 'react';

/** Rám notebooku / okna prohlížeče pro mockupy. */
export function BrowserFrame({
  children,
  className = '',
  label = 'elevateit.cz',
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={`glass relative overflow-hidden rounded-2xl shadow-[0_40px_80px_-40px_rgba(0,0,0,0.95)] ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-[var(--line)] bg-black/30 px-4 py-2.5">
        <span className="h-2 w-2 rounded-full bg-white/20" />
        <span className="h-2 w-2 rounded-full bg-white/20" />
        <span className="h-2 w-2 rounded-full bg-white/20" />
        <span className="ml-3 truncate rounded-md bg-white/5 px-2.5 py-1 text-[10px] text-muted">{label}</span>
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

/** Rám telefonu. */
export function PhoneFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative mx-auto w-[236px] rounded-[14%/6.5%] border border-[rgba(80,120,255,0.3)] bg-[#05070d] p-[4%] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.95),0_0_40px_rgba(31,91,255,0.18)] ${className}`}
    >
      {/* rozměry v % šířky — rámeček drží proporce iPhonu v jakékoli velikosti */}
      <div className="absolute left-1/2 top-[2.4%] z-10 aspect-[4.8/1] w-[33%] -translate-x-1/2 rounded-full bg-black" />
      <div className="relative overflow-hidden rounded-[11%/5%] bg-[#04060b]">{children}</div>
    </div>
  );
}
