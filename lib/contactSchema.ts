import { z } from 'zod';

/**
 * Kvalifikační formulář. Volby se posílají jako indexy do polí v
 * messages/<jazyk>.json (contact.needs, contact.niches…), takže server
 * poptávku vždy popíše česky, ať návštěvník vyplňoval v jakémkoli jazyce.
 * Počty tu musí sedět s délkou těch polí.
 */
export const CONTACT_OPTIONS = {
  needs: 7,
  niches: 8,
  starts: 3,
  assets: 4,
  styles: 6,
  colors: 8,
  budgets: 6,
  timelines: 4,
  channels: 3,
} as const;

/** contact.starts[1] = „starý web" → chceme jeho adresu */
export const START_OLD_SITE = 1;
/** contact.niches[7] = „jiný obor" → upřesnění je nejdůležitější */
export const NICHE_OTHER = 7;
export const CHANNEL = { email: 0, phone: 1, telegram: 2 } as const;
export const MAX_REFS = 4;

/** Odstíny k contact.colors (stejné pořadí). */
export const COLOR_SWATCHES = ['#1F5BFF', '#0B0D12', '#F4F6FB', '#1FAE6B', '#E0393E', '#FF8A2A', '#7C4DFF', '#C9A24A'];

export type ContactMessages = {
  needs: string;
  niche: string;
  start: string;
  currentSite: string;
  budget: string;
  timeline: string;
  name: string;
  email: string;
  phone: string;
  telegram: string;
  message: string;
  site: string;
  consent: string;
};

/** Neutrální hlášky pro server; klient si schéma postaví s překlady. */
export const serverMessages: ContactMessages = {
  needs: 'Select at least one option.',
  niche: 'Select an industry.',
  start: 'Select a starting point.',
  currentSite: 'Enter the current website.',
  budget: 'Select a budget range.',
  timeline: 'Select a timeline.',
  name: 'Enter your name.',
  email: 'Check the e-mail format.',
  phone: 'Enter a phone number.',
  telegram: 'Enter a Telegram username.',
  message: 'The message is too long.',
  site: 'The address is too long.',
  consent: 'Consent is required.',
};

const text = (max: number, message?: string) => z.string().trim().max(max, message).optional().or(z.literal(''));
/** povinná volba jedné možnosti; -1 = zatím nevybráno */
const pick = (count: number, message: string) => z.number().int().min(0, message).max(count - 1, message);
const picks = (count: number) => z.array(z.number().int().min(0).max(count - 1)).max(count);

export const makeContactSchema = (m: ContactMessages) =>
  z.object({
    // 1 — projekt
    needs: picks(CONTACT_OPTIONS.needs).min(1, m.needs),
    plan: text(120),
    niche: pick(CONTACT_OPTIONS.niches, m.niche),
    nicheDetail: text(160),
    // 2 — výchozí stav
    start: pick(CONTACT_OPTIONS.starts, m.start),
    currentSite: text(200, m.site),
    assets: picks(CONTACT_OPTIONS.assets),
    // 3 — vzhled
    refs: z.array(z.string().trim().max(300, m.site)).max(MAX_REFS),
    style: z.number().int().min(-1).max(CONTACT_OPTIONS.styles - 1),
    colors: picks(CONTACT_OPTIONS.colors),
    colorNote: text(200),
    // 4 — rozpočet a termín
    budget: pick(CONTACT_OPTIONS.budgets, m.budget),
    timeline: pick(CONTACT_OPTIONS.timelines, m.timeline),
    deadline: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/).optional(),
    // 5 — kontakt
    name: z.string().trim().min(2, m.name).max(80),
    email: z.string().trim().email(m.email),
    channel: z.number().int().min(0).max(CONTACT_OPTIONS.channels - 1),
    phone: text(40),
    telegram: text(64),
    message: text(2000, m.message),
    consent: z.literal(true, { message: m.consent }),
    locale: z.string().max(5).optional(),
    /**
     * Honeypot — skryté pole, které vyplní jen robot.
     * Schválně ho neodmítáme validací: API se tváří, že je vše v pořádku,
     * ale nic neodešle. Robot se tak nedozví, že prohrál.
     */
    website: z.string().max(200).optional(),
  });

export const contactSchema = makeContactSchema(serverMessages);
export type ContactInput = z.infer<typeof contactSchema>;

type Conditional = 'currentSite' | 'phone' | 'telegram';

/**
 * Pole povinná jen podle jiné odpovědi (starý web → adresa, telefon →
 * číslo…). Kontroluje je formulář před dalším krokem i server.
 */
export function conditionalIssues(v: Partial<Pick<ContactInput, 'start' | 'currentSite' | 'channel' | 'phone' | 'telegram'>>): Conditional[] {
  const out: Conditional[] = [];
  if (v.start === START_OLD_SITE && !(v.currentSite ?? '').trim()) out.push('currentSite');
  if (v.channel === CHANNEL.phone && (v.phone ?? '').replace(/\D/g, '').length < 6) out.push('phone');
  if (v.channel === CHANNEL.telegram && (v.telegram ?? '').replace(/^@/, '').trim().length < 3) out.push('telegram');
  return out;
}
