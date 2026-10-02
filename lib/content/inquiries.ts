import 'server-only';
import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Poptávky z kontaktního formuláře. Ukládají se do tabulky content_blocks
 * pod klíčem „inquiry:<čas ISO>:<náhodný kód>" — klíč se řadí podle času,
 * žádná další migrace databáze není potřeba a veřejné čtení blokuje RLS
 * (veřejně čitelné jsou jen bloky pricing_cs a settings). Čte a zapisuje
 * jen server přes service role.
 */
export const INQUIRY_PREFIX = 'inquiry:';

export type InquiryStatus = 'new' | 'progress' | 'done';
export type InquirySection = { title: string; rows: [string, string][] };
export type InquiryData = {
  created_at: string;
  status: InquiryStatus;
  name: string;
  email: string;
  reach: string;
  locale: string;
  headline: string;
  budget: string;
  sections: InquirySection[];
  note?: string;
  /** ukázky z galerie oboru, které se zákazníkovi líbily */
  likes?: { id: string; url: string; thumb: string; label: string }[];
  /** doručení upozornění e-mailem (Resend) — kvůli diagnostice v administraci */
  mail?: { delivered: boolean; error?: string; to?: string; at: string };
};
export type Inquiry = InquiryData & { id: string };

export async function saveInquiry(data: InquiryData) {
  const key = `${INQUIRY_PREFIX}${data.created_at}:${randomUUID().slice(0, 8)}`;
  const { error } = await supabaseAdmin().from('content_blocks').insert({ key, data });
  if (error) throw error;
  return key;
}

/** Doplnit k uložené poptávce další údaje (např. výsledek odeslání e-mailu). */
export async function patchInquiry(key: string, data: InquiryData, patch: Partial<InquiryData>) {
  const { error } = await supabaseAdmin().from('content_blocks').update({ data: { ...data, ...patch } }).eq('key', key);
  if (error) throw error;
}

/** Nejnovější poptávky. Volat jen po ověření správce. */
export async function readInquiries(limit = 300): Promise<Inquiry[]> {
  const { data, error } = await supabaseAdmin()
    .from('content_blocks')
    .select('key, data')
    .like('key', `${INQUIRY_PREFIX}%`)
    .order('key', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...(row.data as InquiryData), id: row.key as string }));
}
