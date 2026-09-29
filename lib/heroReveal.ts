'use client';

import { useEffect, useState } from 'react';

/**
 * Signál „hero film se rozplynul a pod ním je vidět stůl služeb".
 * Stůl služeb leží v posledním viewportu hera POD jeho plátnem, takže
 * IntersectionObserver ho hlásí jako viditelný dřív, než ho uživatel
 * doopravdy vidí — vstupní animace karet proto čeká na tenhle signál.
 */
let revealed = false;
const listeners = new Set<() => void>();

export function markHeroRevealed() {
  if (revealed) return;
  revealed = true;
  listeners.forEach((listener) => listener());
  listeners.clear();
}

export function useHeroRevealed() {
  const [value, setValue] = useState(revealed);

  useEffect(() => {
    if (revealed) {
      setValue(true);
      return;
    }
    const listener = () => setValue(true);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return value;
}
