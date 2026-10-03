'use client';

import { useEffect, useState } from 'react';
import { markIntroSeen } from './scrollTo';

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
  // úvod (hero film) je za námi — při dalším načtení v téže session se nástup textů nepřehrává
  markIntroSeen();
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

/**
 * Signál „pozadí úvodní obrazovky je načtené" (první snímek filmu, na
 * telefonu fotka). Úvodní clona na něj počká, ať neodkryje prázdnou scénu —
 * na zbytek stránky už nečeká.
 */
let painted = false;
const paintWaiters = new Set<() => void>();

export function markHeroPainted() {
  if (painted) return;
  painted = true;
  paintWaiters.forEach((resolve) => resolve());
  paintWaiters.clear();
}

export function whenHeroPainted() {
  return new Promise<void>((resolve) => {
    if (painted) resolve();
    else paintWaiters.add(resolve);
  });
}
