'use client';

import { useActionState } from 'react';
import { sendMagicLink, type LoginState } from '../login/actions';

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, { status: 'idle' });
  if (state.status === 'sent') {
    return (
      <p className="mt-6 rounded-xl border border-[rgba(61,123,255,0.4)] bg-[rgba(31,91,255,0.1)] px-4 py-3 text-sm">
        Pokud je e-mail oprávněný, přišel vám odkaz. Otevřete ho v tomto prohlížeči.
      </p>
    );
  }
  return (
    <form action={action} className="mt-6 space-y-3">
      <input
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="vas@email.cz"
        className="w-full rounded-xl border border-[var(--line)] bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-[rgba(61,123,255,0.7)]"
      />
      <button type="submit" disabled={pending} className="w-full rounded-xl bg-[var(--blue)] px-4 py-3 font-display text-xs uppercase tracking-[0.14em] text-white disabled:opacity-60">
        {pending ? 'Odesílám…' : 'Poslat odkaz'}
      </button>
      {state.status === 'error' ? <p className="text-sm text-red-300">{state.message}</p> : null}
    </form>
  );
}
