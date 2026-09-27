'use client';

import { useEffect, useState } from 'react';

export type DeviceTier = 'high' | 'low';

const hasWebGL = () => {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
};

/**
 * Rozhoduje, jestli se smí pustit 3D scéna.
 * Serverový render i první klientský průchod vrací 'low' —
 * fallback je tak vždycky to, co uvidí uživatel bez JS i na slabém zařízení.
 */
export function useDeviceTier(): { tier: DeviceTier; reducedMotion: boolean; ready: boolean } {
  const [state, setState] = useState<{ tier: DeviceTier; reducedMotion: boolean; ready: boolean }>({
    tier: 'low',
    reducedMotion: false,
    ready: false,
  });

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const cores = navigator.hardwareConcurrency ?? 4;
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;

    const evaluate = () => {
      const weak =
        !hasWebGL() ||
        cores <= 4 ||
        deviceMemory <= 4 ||
        coarse ||
        // pod 1024 px jedeme vždy 2D — na mobilu se 3D scéna nevyplatí
        window.innerWidth < 1024 ||
        motionQuery.matches;

      setState({ tier: weak ? 'low' : 'high', reducedMotion: motionQuery.matches, ready: true });
    };

    evaluate();
    motionQuery.addEventListener('change', evaluate);
    window.addEventListener('resize', evaluate);
    return () => {
      motionQuery.removeEventListener('change', evaluate);
      window.removeEventListener('resize', evaluate);
    };
  }, []);

  return state;
}
