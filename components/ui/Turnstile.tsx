'use client';

import { useEffect, useRef } from 'react';

/**
 * Cloudflare Turnstile — ochrana formuláře proti robotům bez „vyber všechny
 * semafory". Režim „interaction-only": běžný návštěvník nic nevidí, ověření
 * proběhne na pozadí; jen u podezřelého provozu se ukáže malé políčko
 * (tmavé, v rámečku ladícím s formulářem).
 *
 * Klíče: NEXT_PUBLIC_TURNSTILE_SITE_KEY (web) + TURNSTILE_SECRET_KEY (server).
 * Bez klíče se komponenta nevykreslí a formulář jede jen s honeypotem.
 */
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading: Promise<TurnstileApi> | null = null;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT;
      script.async = true;
      script.defer = true;
      script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile')));
      script.onerror = () => {
        loading = null;
        reject(new Error('turnstile'));
      };
      document.head.appendChild(script);
    });
  }
  return loading;
}

export function Turnstile({ onToken, language }: { onToken: (token: string) => void; language: string }) {
  const box = useRef<HTMLDivElement>(null);
  const tokenRef = useRef(onToken);
  tokenRef.current = onToken;

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !box.current) return;
    let id: string | undefined;
    let cancelled = false;
    loadTurnstile()
      .then((api) => {
        if (cancelled || !box.current) return;
        id = api.render(box.current, {
          sitekey: TURNSTILE_SITE_KEY,
          action: 'contact',
          theme: 'dark',
          size: 'flexible',
          appearance: 'interaction-only',
          language,
          'refresh-expired': 'auto',
          callback: (token: string) => tokenRef.current(token),
          'expired-callback': () => tokenRef.current(''),
          'error-callback': () => tokenRef.current(''),
        });
      })
      .catch(() => tokenRef.current(''));
    return () => {
      cancelled = true;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, [language]);

  if (!TURNSTILE_SITE_KEY) return null;
  // prázdný kontejner nezabírá místo; když Cloudflare ukáže políčko, dostane rámeček formuláře
  return <div ref={box} className="turnstile-box" />;
}
