'use client';

import { ArrowRight, CalendarDays } from 'lucide-react';
import { useMagnetic } from './Button';

/**
 * Hlavní výzva v heru: jedna jasná akce — domluvit konzultaci. Plná modrá
 * kapsle s ikonou kalendáře, pod názvem drobná jistota („zdarma a nezávazně").
 * Obíhající světlo po okraji ji odliší od běžného tlačítka.
 */
export function HeroBook({ href, label, note }: { href: string; label: string; note: string }) {
  const magnetic = useMagnetic();
  return (
    <a
      href={href}
      ref={magnetic.ref as React.RefObject<HTMLAnchorElement>}
      onMouseMove={magnetic.onMove}
      onMouseLeave={magnetic.onLeave}
      data-cursor="link"
      className="group relative inline-flex items-center gap-4 rounded-full bg-[linear-gradient(120deg,var(--blue),var(--blue-bright))] py-2 pl-2 pr-6 text-white shadow-[0_0_36px_rgba(31,91,255,0.55)] transition-[box-shadow,transform] duration-300 will-change-transform hover:shadow-[0_0_56px_rgba(31,91,255,0.75)]"
    >
      <span aria-hidden className="beam" />
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/15">
        <CalendarDays className="h-5 w-5" aria-hidden />
      </span>
      <span className="flex flex-col text-left">
        <span className="font-display text-[13px] font-bold uppercase leading-tight tracking-[0.1em]">{label}</span>
        <span className="mt-0.5 text-[11.5px] leading-tight text-white/75">{note}</span>
      </span>
      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
    </a>
  );
}

/** Vedlejší cesta — tichý odkaz na hotové projekty. */
export function HeroLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      data-cursor="link"
      className="group inline-flex items-center gap-2 font-display text-[12px] uppercase tracking-[0.16em] text-muted transition-colors hover:text-ink"
    >
      <span className="relative">
        {label}
        <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-[var(--blue-bright)] transition-transform duration-300 group-hover:scale-x-100" />
      </span>
      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
    </a>
  );
}
