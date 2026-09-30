'use client';

import { useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

/* Prvky administrace ve stylu webu: tlačítka se stejným gradientem a září,
   skleněné karty, jednotná pole. */

type Variant = 'primary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-[linear-gradient(120deg,var(--blue),var(--blue-bright))] text-white shadow-[0_0_24px_var(--blue-glow)] hover:shadow-[0_0_40px_var(--blue-glow)]',
  ghost: 'border border-[var(--line)] bg-white/[0.04] text-ink hover:border-[rgba(80,120,255,0.55)] hover:bg-white/[0.07]',
  danger: 'border border-[rgba(255,90,110,0.35)] bg-[rgba(255,90,110,0.06)] text-[#ffc2cb] hover:border-[rgba(255,90,110,0.7)] hover:bg-[rgba(255,90,110,0.12)]',
};

export function Btn({
  variant = 'ghost',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-btn font-display uppercase tracking-[0.12em] transition-[box-shadow,background-color,border-color,opacity] duration-300 disabled:pointer-events-none disabled:opacity-45 ${
        size === 'sm' ? 'h-9 px-3.5 text-[10px]' : 'h-11 px-5 text-[11px]'
      } ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export const inputClass =
  'w-full rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.035)] px-3.5 py-2.5 text-sm text-ink outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[rgba(138,147,168,0.6)] focus:border-[rgba(61,123,255,0.75)] focus:shadow-[0_0_0_3px_rgba(31,91,255,0.18)]';

/**
 * Pole formuláře. `visual` = obrazová nápověda (výřez webu), zobrazí se
 * vpravo vedle pole — místo slovního popisu, kde text na webu je.
 */
export function Field({ label, hint, children, className = '', visual }: { label: string; hint?: string; children: ReactNode; className?: string; visual?: ReactNode }) {
  const body = (
    <label className="block min-w-0 flex-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(170,185,220,0.85)]">{label}</span>
      <div className="mt-2">{children}</div>
      {hint ? <span className="mt-1.5 block text-xs leading-snug text-muted">{hint}</span> : null}
    </label>
  );
  if (!visual) return <div className={`block ${className}`}>{body}</div>;
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      {body}
      <div className="mt-6">{visual}</div>
    </div>
  );
}

/** Skleněná karta se stejnou tečkovanou neonovou linkou jako na webu. */
export function Card({ title, subtitle, actions, children, className = '' }: { title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`relative overflow-hidden rounded-card border border-[rgba(110,150,255,0.18)] bg-[linear-gradient(165deg,rgba(18,27,54,0.72),rgba(8,12,24,0.8))] p-5 md:p-6 ${className}`}>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-8 top-0 h-[3px]"
        style={{ background: 'radial-gradient(circle, #cfe0ff 0 1px, rgba(97,150,255,0.8) 1.3px, transparent 1.9px) 0 50% / 9px 3px repeat-x' }}
      />
      {title || actions ? (
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title ? <h3 className="font-display text-sm font-bold uppercase tracking-[0.08em] text-ink">{title}</h3> : null}
            {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
          </div>
          {actions}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Stav ukládání s viditelnou odezvou: „Ukládá se…" → „Uloženo ✓" (zmizí
 * po chvíli) nebo chyba s textem.
 */
export function useSave() {
  const [state, setState] = useState<SaveState>('idle');
  const [error, setError] = useState('');
  const timer = useRef<number | null>(null);
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);
  const run = useCallback(async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    if (timer.current) window.clearTimeout(timer.current);
    setState('saving');
    setError('');
    try {
      const res = await fn();
      if (!res.ok) {
        setState('error');
        setError(res.error ?? 'Uložení se nepovedlo.');
        return false;
      }
      setState('saved');
      timer.current = window.setTimeout(() => setState('idle'), 2600);
      return true;
    } catch (e) {
      setState('error');
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, []);
  return { state, error, run, busy: state === 'saving' };
}

export function SaveStatus({ state, error, savedText = 'Uloženo' }: { state: SaveState; error?: string; savedText?: string }) {
  if (state === 'idle') return null;
  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 text-sm ${state === 'error' ? 'text-[#ffb3be]' : state === 'saved' ? 'text-[#9fe7c0]' : 'text-muted'}`}
    >
      {state === 'saving' ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[rgba(160,190,255,0.3)] border-t-[var(--blue-bright)]" /> : null}
      {state === 'saving' ? 'Ukládá se…' : state === 'saved' ? `${savedText} ✓` : error}
    </span>
  );
}

/** Hledání v textech — lupa uvnitř pole, křížek pro smazání. */
export function SearchInput({ value, onChange, compact = false }: { value: string; onChange: (v: string) => void; compact?: boolean }) {
  return (
    <label className="relative block">
      <span className="sr-only">Hledat text</span>
      <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        className={`${inputClass} pl-9 ${value ? 'pr-9' : ''} [&::-webkit-search-cancel-button]:hidden`}
        placeholder={compact ? 'Hledat…' : 'Hledat v textech…'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value ? (
        <button type="button" onClick={() => onChange('')} aria-label="Smazat hledání" className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-white/10 hover:text-ink">
          ×
        </button>
      ) : null}
    </label>
  );
}

/**
 * Pevná lišta ukládání dole — vždy po ruce, i uprostřed dlouhého formuláře.
 * Na telefonu přes celou šířku, s ohledem na spodní okraj displeje.
 */
export function SaveBar({ dirtyText, state, error, children }: { dirtyText?: string; state: SaveState; error?: string; children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[rgba(6,9,18,0.94)] pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-end gap-3 px-4 py-3 sm:gap-4 sm:px-5">
        <div className="min-w-0 flex-1 text-right text-sm">
          {state === 'idle' && dirtyText ? <span className="text-muted">{dirtyText}</span> : null}
          <SaveStatus state={state} error={error} />
        </div>
        <div className="shrink-0">{children}</div>
      </div>
    </div>
  );
}
