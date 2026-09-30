'use client';

import { useActionState, useState } from 'react';
import { loginWithPassword, sendMagicLink, type LoginState } from '../login/actions';
import { Btn, Field, inputClass } from './ui';

export function LoginForm() {
  const [mode, setMode] = useState<'password' | 'link'>('password');
  const [pwState, pwAction, pwPending] = useActionState<LoginState, FormData>(loginWithPassword, { status: 'idle' });
  const [linkState, linkAction, linkPending] = useActionState<LoginState, FormData>(sendMagicLink, { status: 'idle' });

  if (mode === 'link') {
    return linkState.status === 'sent' ? (
      <div className="space-y-5">
        <p className="rounded-xl border border-[rgba(61,123,255,0.4)] bg-[rgba(31,91,255,0.1)] px-4 py-3 text-sm leading-relaxed">
          Pokud je e-mail oprávněný, přišel vám přihlašovací odkaz. Otevřete ho v tomto prohlížeči.
        </p>
        <button type="button" onClick={() => setMode('password')} className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
          ← Zpět na přihlášení heslem
        </button>
      </div>
    ) : (
      <form action={linkAction} className="space-y-5">
        <Field label="E-mail" hint="Pošleme odkaz pro jednorázové přihlášení — hodí se poprvé nebo při zapomenutém hesle.">
          <input name="email" type="email" required autoComplete="email" placeholder="vas@email.cz" className={inputClass} />
        </Field>
        <Btn type="submit" variant="primary" className="w-full" disabled={linkPending}>
          {linkPending ? 'Odesílám…' : 'Poslat odkaz'}
        </Btn>
        {linkState.status === 'error' ? <p className="text-sm text-[#ffb3be]">{linkState.message}</p> : null}
        <button type="button" onClick={() => setMode('password')} className="block text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
          ← Přihlásit se heslem
        </button>
      </form>
    );
  }

  return (
    <form action={pwAction} className="space-y-5">
      <Field label="E-mail">
        <input name="email" type="email" required autoComplete="username" placeholder="vas@email.cz" className={inputClass} />
      </Field>
      <Field label="Heslo">
        <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
      </Field>
      <Btn type="submit" variant="primary" className="w-full" disabled={pwPending}>
        {pwPending ? 'Přihlašuji…' : 'Přihlásit se'}
      </Btn>
      {pwState.status === 'error' ? <p className="text-sm leading-snug text-[#ffb3be]">{pwState.message}</p> : null}
      <button type="button" onClick={() => setMode('link')} className="block text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
        Zapomenuté heslo / první přihlášení — poslat odkaz na e-mail
      </button>
    </form>
  );
}
