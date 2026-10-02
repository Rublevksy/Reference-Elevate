import 'server-only';
import { Resend } from 'resend';
import { getSettings } from '@/lib/content/server';
import { site } from '@/content/site';

/**
 * Odesílání e-mailů přes Resend. Odesílatel se bere z CONTACT_FROM_EMAIL
 * (Vercel → Environment Variables, prostředí Production; po změně Redeploy)
 * a musí být na doméně ověřené v Resend → Domains.
 *
 * Bez proměnné se už NEPOUŽÍVÁ testovací onboarding@resend.dev (ten doručí
 * jen majiteli účtu Resend a jinak končí chybou 403) — výchozí odesílatel je
 * noreply@ na doméně webu (elevateit.cz je v Resend ověřená).
 */
const SITE_DOMAIN = new URL(site.url).hostname.replace(/^www\./, '');
export const DEFAULT_SENDER = `ELEVATE <noreply@${SITE_DOMAIN}>`;

/** Hodnota z prostředí bez okolních uvozovek; holý e-mail dostane jméno ELEVATE. */
function senderFromEnv(raw: string | undefined) {
  const value = (raw ?? '').trim().replace(/^(['"])(.*)\1$/, '$2').trim();
  if (!value) return '';
  return value.includes('<') ? value : `ELEVATE <${value}>`;
}

export type MailConfig = {
  hasKey: boolean;
  from: string;
  /** odkud odesílatel je: proměnná prostředí, nebo výchozí noreply@doména webu */
  fromSource: 'env' | 'default';
  /** doména odesílatele, např. elevateit.cz */
  fromDomain: string;
  usingTestSender: boolean;
  to: string;
};

export async function mailConfig(): Promise<MailConfig> {
  const fromEnv = senderFromEnv(process.env.CONTACT_FROM_EMAIL);
  const from = fromEnv || DEFAULT_SENDER;
  const to = (await getSettings()).contactEmail || process.env.CONTACT_EMAIL?.trim() || '';
  return {
    hasKey: Boolean(process.env.RESEND_API_KEY?.trim()),
    from,
    fromSource: fromEnv ? 'env' : 'default',
    fromDomain: from.match(/@([^>\s]+)/)?.[1]?.toLowerCase() ?? '',
    usingTestSender: /@resend\.dev\b/i.test(from),
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
    if (error) {
      console.error(`[mail] Resend odmítl e-mail (from: ${config.from}, zdroj: ${config.fromSource}):`, error.message);
      return { delivered: false, error: explainMailError(error.message, config) };
    }
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
