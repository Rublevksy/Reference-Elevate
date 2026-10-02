'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

/**
 * Cloudflare Turnstile — ochrana formuláře proti robotům bez „vyber všechny
 * semafory". Režim „interaction-only": běžný návštěvník nic nevidí, ověření
 * proběhne na pozadí; jen u podezřelého provozu se ukáže políčko
 * „Potvrďte, že jste člověk" (formulář na to upozorní).
 *
 * Token platí jednou a 5 minut — po každém pokusu o odeslání ho formulář
 * obnoví přes `reset()`, prošlý se obnovuje sám.
 *
 * Klíče: NEXT_PUBLIC_TURNSTILE_SITE_KEY (web) + TURNSTILE_SECRET_KEY (server).
 * Bez klíče se komponenta nevykreslí a formulář jede jen s honeypotem.
 */
export const TURNSTILE_SITE_KEY = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '').trim();

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

export type TurnstileHandle = { reset: () => void };

export type TurnstileEvent =
  | { type: 'token'; token: string }
  | { type: 'interactive'; on: boolean }
  /** widget se nenačetl nebo opakovaně selhává (blokovaný skript, starý prohlížeč…) */
  | { type: 'error'; code: string };

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
        script.remove();
        reject(new Error('turnstile'));
      };
      document.head.appendChild(script);
    });
  }
  return loading;
}

export const Turnstile = forwardRef<TurnstileHandle, { onEvent: (event: TurnstileEvent) => void; language: string }>(
  function Turnstile({ onEvent, language }, ref) {
    const box = useRef<HTMLDivElement>(null);
    const widget = useRef<string | undefined>(undefined);
    const emit = useRef(onEvent);
    emit.current = onEvent;

    useImperativeHandle(ref, () => ({
      reset: () => {
        emit.current({ type: 'token', token: '' });
        if (widget.current && window.turnstile) window.turnstile.reset(widget.current);
      },
    }));

    useEffect(() => {
      if (!TURNSTILE_SITE_KEY || !box.current) return;
      let cancelled = false;
      const send = (event: TurnstileEvent) => !cancelled && emit.current(event);
      loadTurnstile()
        .then((api) => {
          if (cancelled || !box.current) return;
          widget.current = api.render(box.current, {
            sitekey: TURNSTILE_SITE_KEY,
            action: 'contact',
            theme: 'dark',
            size: 'flexible',
            appearance: 'interaction-only',
            language,
            retry: 'auto',
            'retry-interval': 3000,
            'refresh-expired': 'auto',
            'refresh-timeout': 'auto',
            callback: (token: string) => {
              send({ type: 'token', token });
              send({ type: 'interactive', on: false });
            },
            'expired-callback': () => send({ type: 'token', token: '' }),
            'timeout-callback': () => send({ type: 'token', token: '' }),
            'before-interactive-callback': () => send({ type: 'interactive', on: true }),
            'after-interactive-callback': () => send({ type: 'interactive', on: false }),
            'unsupported-callback': () => send({ type: 'error', code: 'unsupported' }),
            'error-callback': (code: string) => {
              send({ type: 'token', token: '' });
              send({ type: 'error', code: String(code ?? '') });
              // true = chybu řešíme sami; Turnstile to dál zkouší podle `retry`
              return true;
            },
          });
        })
        .catch(() => send({ type: 'error', code: 'script' }));
      return () => {
        cancelled = true;
        if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
        widget.current = undefined;
      };
    }, [language]);

    if (!TURNSTILE_SITE_KEY) return null;
    // prázdný kontejner nezabírá místo; když Cloudflare ukáže políčko, má rámeček formuláře
    return <div ref={box} className="turnstile-box" />;
  },
);
