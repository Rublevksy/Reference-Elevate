'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from '@/lib/useReducedMotion';

/**
 * Jednoduchá časová osa pro mockupy: jakmile je karta aktivní,
 * posouvá se krok po kroku. Při reduced-motion skočí rovnou na konec.
 */
export function useSteps(active: boolean, count: number, interval = 620) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active) {
      setStep(0);
      return;
    }
    if (reduced) {
      setStep(count);
      return;
    }

    let current = 0;
    setStep(0);
    const id = window.setInterval(() => {
      current += 1;
      setStep(current);
      if (current >= count) window.clearInterval(id);
    }, interval);

    return () => window.clearInterval(id);
  }, [active, count, interval, reduced]);

  return step;
}
