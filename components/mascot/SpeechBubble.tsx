'use client';

import { motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

/** Bublina s efektem psacího stroje. */
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
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.97 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`glass relative rounded-2xl px-4 py-3 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.9)] ${
        compact ? 'max-w-[210px]' : 'max-w-[280px]'
      } ${className}`}
      role="status"
      aria-live="polite"
    >
      <p className={`pr-4 leading-snug text-ink ${compact ? 'text-[12.5px]' : 'text-sm'}`}>
        {typed}
        {!reduced && typed.length < text.length ? (
          <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-caret bg-[var(--blue-bright)] align-middle" />
        ) : null}
      </p>

      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full text-muted transition-colors hover:text-ink"
          aria-label={t('closeBubble')}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : null}

      {/* ocásek bubliny */}
      <span
        aria-hidden
        className={`absolute -bottom-1.5 h-3 w-3 rotate-45 border-b border-r border-[var(--line)] bg-[rgba(12,18,32,0.9)] ${
          side === 'left' ? 'left-6' : 'right-6'
        }`}
      />
    </motion.div>
  );
}
