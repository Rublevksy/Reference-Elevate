'use client';

import { useEffect } from 'react';
import { INQUIRY_STORE } from '@/lib/inquiryLink';

/** Přihlašovací stránka: zapamatovat poptávku z odkazu v e-mailu — administrace ji po přihlášení otevře. */
export function RememberInquiry({ id }: { id: string }) {
  useEffect(() => {
    try {
      localStorage.setItem(INQUIRY_STORE, JSON.stringify({ id, at: Date.now() }));
    } catch {
      /* soukromé okno — po přihlášení se otevře seznam poptávek */
    }
  }, [id]);
  return null;
}
