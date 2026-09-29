'use client';

import { motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

/**
 * Replika maskota jako titulek, ne chatová bublina: skleněný štítek
 * s neonovou čárou vlevo, text se dopisuje jako živý titulek.
 */
export function SpeechBubble({
  text,
  onClose,
  className = '',
  side = 'left',
  compact = false,
}: {
  text: string;
  onClose?: () => void;
  className?: string;
  side?: 'left' | 'right';
  compact?: boolean;
}) {
  const t = useTranslations('mascot');
  const reduced = useReducedMotion();
  const [typed, setTyped] = useState(reduced ? text : '');

  useEffect(() => {
    if (reduced) {
      setTyped(text);
      return;
    }
    setTyped('');
    let index = 0;
    const id = window.setInterval(() => {
      index += 1;
      setTyped(text.slice(0, index));
      if (index >= text.length) window.clearInterval(id);
    }, 22);
    return () => window.clearInterval(id);
  }, [text, reduced]);

  return (
    <motion.div
      initial={{ opacity: 0, x: side === 'left' ? -12 : 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: side === 'left' ? -8 : 8 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`relative rounded-xl border border-[rgba(80,120,255,0.18)] bg-[rgba(8,14,34,0.74)] py-2.5 pl-4 pr-3 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.9)] backdrop-blur-md ${
        compact ? 'max-w-[220px]' : 'max-w-[280px]'
      } ${className}`}
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden
        className="absolute bottom-2 left-0 top-2 w-[2px] rounded-full bg-[#9fc0ff]"
        style={{ boxShadow: '0 0 8px 1px rgba(61,123,255,0.9)' }}
      />
      <p className={`${onClose ? 'pr-5' : ''} leading-snug text-ink ${compact ? 'text-[12.5px]' : 'text-sm'}`}>
        {typed}
        {!reduced && typed.length < text.length ? (
          <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-caret bg-[var(--blue-bright)] align-middle" />
        ) : null}
      </p>

      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full text-muted transition-colors hover:text-ink"
          aria-label={t('closeBubble')}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : null}
    </motion.div>
  );
}
