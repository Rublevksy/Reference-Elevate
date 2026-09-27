'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useRef, type ReactNode, type MouseEvent } from 'react';
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

/** Magnetický efekt — tlačítko se lehce přitáhne ke kurzoru. */
function useMagnetic() {
  const ref = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();

  const onMove = (event: MouseEvent) => {
    const node = ref.current;
    if (!node || reduced) return;
    const rect = node.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    node.style.transform = `translate3d(${x * 0.18}px, ${y * 0.24}px, 0)`;
  };

  const onLeave = () => {
    const node = ref.current;
    if (!node) return;
    node.style.transform = 'translate3d(0,0,0)';
  };

  return { ref, onMove, onLeave };
}

const baseClass =
  'group relative inline-flex items-center justify-center gap-3 rounded-btn px-7 py-4 font-display text-[13px] font-semibold uppercase tracking-[0.12em] transition-[box-shadow,background-color,border-color,transform] duration-300 will-change-transform';

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
