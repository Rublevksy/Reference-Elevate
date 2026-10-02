import 'server-only';
import { Resend } from 'resend';
import { getSettings } from '@/lib/content/server';

/**
 * Odesílání e-mailů přes Resend. Odesílatel (CONTACT_FROM_EMAIL) musí být na
 * doméně ověřené v Resend (Domains) — bez ní funguje jen testovací
 * onboarding@resend.dev, který doručí výhradně na e-mail majitele účtu Resend.
 */
export const TEST_SENDER = 'ELEVATE <onboarding@resend.dev>';

export type MailConfig = {
  hasKey: boolean;
  from: string;
  /** doména odesílatele, např. elevateit.cz */
  fromDomain: string;
  usingTestSender: boolean;
  to: string;
};

export async function mailConfig(): Promise<MailConfig> {
  const from = process.env.CONTACT_FROM_EMAIL?.trim() || TEST_SENDER;
  const to = (await getSettings()).contactEmail || process.env.CONTACT_EMAIL?.trim() || '';
  return {
    hasKey: Boolean(process.env.RESEND_API_KEY?.trim()),
    from,
    fromDomain: from.match(/@([^>\s]+)/)?.[1]?.toLowerCase() ?? '',
    usingTestSender: from === TEST_SENDER || /@resend\.dev\b/i.test(from),
    to,
  };
}

export type MailResult = { delivered: true; id?: string } | { delivered: false; error: string };

/** Srozumitelné vysvětlení nejčastějších chyb Resend (pro administraci). */
export function explainMailError(message: string, config: MailConfig): string {
  const m = message.toLowerCase();
  if (m.includes('only send testing emails') || m.includes('verify a domain')) {
    return `Resend zatím posílá jen testovací e-maily na adresu majitele účtu. Ověřte doménu v Resend (Domains) a nastavte CONTACT_FROM_EMAIL na adresu na ní. (${message})`;
  }
  if (m.includes('domain is not verified') || m.includes('not verified')) {
    return `Doména odesílatele ${config.fromDomain || ''} není v Resend ověřená — zkontrolujte DNS záznamy a klikněte na Verify. (${message})`;
  }
  if (m.includes('api key is invalid') || m.includes('invalid api key') || m.includes('missing api key')) {
    return `RESEND_API_KEY ve Vercelu je neplatný nebo smazaný. (${message})`;
  }
  if (m.includes('invalid `from`') || m.includes('from field')) {
    return `CONTACT_FROM_EMAIL má špatný tvar — správně např. ELEVATE <poptavky@elevateit.cz>. (${message})`;
  }
  return message;
}

export async function sendMail(input: { to: string; subject: string; html: string; text: string; replyTo?: string }): Promise<MailResult> {
  const config = await mailConfig();
  if (!config.hasKey) return { delivered: false, error: 'RESEND_API_KEY není nastavený (Vercel → Settings → Environment Variables).' };
  if (!input.to) return { delivered: false, error: 'Chybí adresát — vyplňte kontaktní e-mail v záložce Kontakt a firma.' };
  try {
    const resend = new Resend(process.env.RESEND_API_KEY!.trim());
    const { data, error } = await resend.emails.send({
      from: config.from,
      to: input.to,
      replyTo: input.replyTo,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    if (error) return { delivered: false, error: explainMailError(error.message, config) };
    return { delivered: true, id: data?.id };
  } catch (e) {
    return { delivered: false, error: explainMailError(e instanceof Error ? e.message : String(e), config) };
  }
}

export type DomainStatus = { name: string; status: string };

/** Domény v účtu Resend (klíč s plným přístupem); s klíčem jen pro odesílání vrátí null. */
export async function resendDomains(): Promise<DomainStatus[] | null> {
  if (!process.env.RESEND_API_KEY?.trim()) return null;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY.trim());
    const { data, error } = await resend.domains.list();
    if (error || !data) return null;
    const list = (data as unknown as { data?: { name: string; status: string }[] }).data ?? [];
    return list.map((d) => ({ name: d.name, status: d.status }));
  } catch {
    return null;
  }
}
