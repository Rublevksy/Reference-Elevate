'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useEffect, useRef, type ReactNode, type MouseEvent } from 'react';
import { useReducedMotion } from '@/lib/useReducedMotion';

type Variant = 'primary' | 'ghost' | 'outline';

type CommonProps = {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  icon?: ReactNode;
  withArrow?: boolean;
  full?: boolean;
};

const styles: Record<Variant, string> = {
  primary:
    'bg-[linear-gradient(120deg,var(--blue),var(--blue-bright))] text-white shadow-[0_0_28px_var(--blue-glow)] hover:shadow-[0_0_48px_var(--blue-glow)]',
  ghost:
    'bg-white/[0.04] text-ink border border-[var(--line)] hover:bg-white/[0.08] hover:border-[rgba(80,120,255,0.4)]',
  outline:
    'bg-transparent text-ink border border-[rgba(80,120,255,0.5)] shadow-[0_0_20px_rgba(31,91,255,0.18)] hover:shadow-[0_0_34px_var(--blue-glow)]',
};

/**
 * Magnetický efekt — tlačítko se lehce přitáhne ke kurzoru.
 * Posun jde přes vlastnost `translate` (ne `transform`, na které visí CSS
 * transition) a dojíždí v rAF smyčce: žádné cukání na začátku ani na konci
 * hoveru. Střed se počítá bez vlastního posunu — jinak by posun měnil
 * střed a tlačítko by se pod kurzorem třáslo.
 */
export function useMagnetic() {
  const ref = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();
  const state = useRef({ x: 0, y: 0, tx: 0, ty: 0, raf: 0 });

  const tick = () => {
    const s = state.current;
    const node = ref.current;
    if (!node) {
      s.raf = 0;
      return;
    }
    s.x += (s.tx - s.x) * 0.18;
    s.y += (s.ty - s.y) * 0.18;
    const settled = Math.abs(s.tx - s.x) < 0.05 && Math.abs(s.ty - s.y) < 0.05;
    if (settled) {
      s.x = s.tx;
      s.y = s.ty;
    }
    node.style.translate = s.x || s.y ? `${s.x.toFixed(2)}px ${s.y.toFixed(2)}px` : '';
    s.raf = settled ? 0 : requestAnimationFrame(tick);
  };
  const kick = () => {
    if (!state.current.raf) state.current.raf = requestAnimationFrame(tick);
  };

  useEffect(() => () => cancelAnimationFrame(state.current.raf), []);

  const onMove = (event: MouseEvent) => {
    const node = ref.current;
    if (!node || reduced) return;
    const s = state.current;
    const rect = node.getBoundingClientRect();
    const cx = rect.left - s.x + rect.width / 2;
    const cy = rect.top - s.y + rect.height / 2;
    s.tx = (event.clientX - cx) * 0.18;
    s.ty = (event.clientY - cy) * 0.24;
    kick();
  };

  const onLeave = () => {
    const s = state.current;
    s.tx = 0;
    s.ty = 0;
    kick();
  };

  return { ref, onMove, onLeave };
}

const baseClass =
  'group relative inline-flex items-center justify-center gap-3 rounded-btn px-7 py-4 font-display text-[13px] font-semibold uppercase tracking-[0.12em] transition-[box-shadow,background-color,border-color] duration-300';

export function Button({
  children,
  href,
  variant = 'primary',
  className = '',
  icon,
  withArrow = true,
  full = false,
  onClick,
  type = 'button',
  disabled,
}: CommonProps & {
  href?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  const magnetic = useMagnetic();
  const classes = `${baseClass} ${styles[variant]} ${full ? 'w-full' : ''} ${
    disabled ? 'pointer-events-none opacity-60' : ''
  } ${className}`;

  const inner = (
    <>
      {icon ? (
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white/15 text-white">{icon}</span>
      ) : null}
      <span>{children}</span>
      {withArrow ? (
        <ArrowRight
          className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5"
          aria-hidden
        />
      ) : null}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-btn opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.22)' }}
      />
    </>
  );

  if (href) {
    const isHash = href.startsWith('/#') || href.startsWith('#');
    if (isHash) {
      return (
        <a
          href={href}
          onClick={onClick}
          className={classes}
          ref={magnetic.ref as React.RefObject<HTMLAnchorElement>}
          onMouseMove={magnetic.onMove}
          onMouseLeave={magnetic.onLeave}
          data-cursor="link"
        >
          {inner}
        </a>
      );
    }
    return (
      <Link
        href={href}
        onClick={onClick}
        className={classes}
        ref={magnetic.ref as React.RefObject<HTMLAnchorElement>}
        onMouseMove={magnetic.onMove}
        onMouseLeave={magnetic.onLeave}
        data-cursor="link"
      >
        {inner}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
      ref={magnetic.ref as React.RefObject<HTMLButtonElement>}
      onMouseMove={magnetic.onMove}
      onMouseLeave={magnetic.onLeave}
      data-cursor="link"
    >
      {inner}
    </button>
  );
}
