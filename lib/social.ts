import type { BrandId } from './brand-icons';

/**
 * Sociální sítě a messengery z administrace. Správce zadá název platformy
 * a odkaz (u messengerů stačí číslo nebo @jméno) — tady se rozpozná
 * platforma, odvodí se odkaz a ikona. Neznámá platforma dostane obecnou
 * ikonu a musí mít úplný odkaz (https://…).
 */
export type SocialInput = { label: string; value: string };
export type SocialKind = 'messenger' | 'social';
export type SocialLink = {
  label: string;
  href: string;
  /** rozpoznaná platforma (ikona), jinak null */
  brand: BrandId | null;
  kind: SocialKind;
  /** co ukázat jako text u messengerů (číslo / @jméno) */
  display: string;
};

type Platform = {
  id: BrandId;
  name: string;
  kind: SocialKind;
  /** slova v názvu, podle kterých se platforma pozná */
  names: string[];
  /** domény v odkazu */
  hosts: string[];
  /** odkaz z čísla / jména (messengery) */
  fromHandle?: (handle: string) => string | null;
};

const digits = (v: string) => v.replace(/[^\d]/g, '');

export const PLATFORMS: Platform[] = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    kind: 'messenger',
    names: ['whatsapp', 'whats app', 'wa'],
    hosts: ['wa.me', 'whatsapp.com'],
    fromHandle: (v) => (digits(v).length >= 8 ? `https://wa.me/${digits(v)}` : null),
  },
  {
    id: 'telegram',
    name: 'Telegram',
    kind: 'messenger',
    names: ['telegram', 'tg'],
    hosts: ['t.me', 'telegram.me', 'telegram.org'],
    fromHandle: (v) => {
      const user = v.trim().replace(/^@/, '');
      return /^[A-Za-z0-9_]{4,}$/.test(user) ? `https://t.me/${user}` : null;
    },
  },
  {
    id: 'viber',
    name: 'Viber',
    kind: 'messenger',
    names: ['viber'],
    hosts: ['viber.com', 'vb.me'],
    fromHandle: (v) => (digits(v).length >= 8 ? `viber://chat?number=%2B${digits(v)}` : null),
  },
  { id: 'messenger', name: 'Messenger', kind: 'messenger', names: ['messenger'], hosts: ['m.me', 'messenger.com'] },
  { id: 'instagram', name: 'Instagram', kind: 'social', names: ['instagram', 'insta', 'ig'], hosts: ['instagram.com'] },
  { id: 'facebook', name: 'Facebook', kind: 'social', names: ['facebook', 'fb'], hosts: ['facebook.com', 'fb.com', 'fb.me'] },
  { id: 'linkedin', name: 'LinkedIn', kind: 'social', names: ['linkedin', 'linked in'], hosts: ['linkedin.com'] },
  { id: 'tiktok', name: 'TikTok', kind: 'social', names: ['tiktok', 'tik tok'], hosts: ['tiktok.com'] },
  { id: 'youtube', name: 'YouTube', kind: 'social', names: ['youtube', 'yt'], hosts: ['youtube.com', 'youtu.be'] },
  { id: 'behance', name: 'Behance', kind: 'social', names: ['behance'], hosts: ['behance.net'] },
  { id: 'dribbble', name: 'Dribbble', kind: 'social', names: ['dribbble'], hosts: ['dribbble.com'] },
  { id: 'x', name: 'X', kind: 'social', names: ['x', 'twitter'], hosts: ['x.com', 'twitter.com'] },
  { id: 'threads', name: 'Threads', kind: 'social', names: ['threads'], hosts: ['threads.net'] },
  { id: 'pinterest', name: 'Pinterest', kind: 'social', names: ['pinterest'], hosts: ['pinterest.com', 'pin.it'] },
  { id: 'github', name: 'GitHub', kind: 'social', names: ['github'], hosts: ['github.com'] },
  { id: 'vimeo', name: 'Vimeo', kind: 'social', names: ['vimeo'], hosts: ['vimeo.com'] },
];

const norm = (v: string) =>
  v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

function hostOf(value: string) {
  try {
    return new URL(/^[a-z]+:\/\//i.test(value) ? value : `https://${value}`).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** Platforma podle názvu, případně podle domény v odkazu. */
export function detectPlatform(label: string, value = ''): Platform | null {
  const n = norm(label);
  const byName = PLATFORMS.find((p) => p.names.some((x) => n === x || (x.length > 3 && n.includes(x))));
  if (byName) return byName;
  const host = /[./]/.test(value) ? hostOf(value.trim()) : '';
  return PLATFORMS.find((p) => p.hosts.some((h) => host === h || host.endsWith(`.${h}`))) ?? null;
}

/**
 * Odkaz pro web, nebo chyba pro administraci. U messengerů stačí číslo
 * (WhatsApp, Viber) nebo @jméno (Telegram); jinak úplný odkaz https://.
 */
export function resolveSocial(input: SocialInput): { ok: true; link: SocialLink } | { ok: false; error: string } {
  const label = input.label.trim();
  const value = input.value.trim();
  if (!label) return { ok: false, error: 'Doplňte název sítě.' };
  if (!value) return { ok: false, error: `${label}: doplňte odkaz.` };
  const platform = detectPlatform(label, value);
  let href: string | null = null;
  if (/^https?:\/\//i.test(value)) href = value;
  else if (/^(mailto:|tel:|viber:)/i.test(value)) href = value;
  else if (platform?.fromHandle) href = platform.fromHandle(value);
  else if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(value)) href = `https://${value}`;
  if (!href) {
    return {
      ok: false,
      error: platform?.fromHandle
        ? `${label}: zadejte telefonní číslo${platform.id === 'telegram' ? ' nebo @uživatele' : ''}, případně celý odkaz.`
        : `${label}: odkaz musí začínat https://`,
    };
  }
  const kind = platform?.kind ?? 'social';
  const display =
    kind === 'messenger' && !/^https?:\/\//i.test(value)
      ? platform?.id === 'telegram'
        ? `@${value.replace(/^@/, '')}`
        : value
      : '';
  return { ok: true, link: { label, href, brand: platform?.id ?? null, kind, display } };
}

/** Uložená data → odkazy pro web (neplatné položky se tiše vynechají). */
export function resolveSocials(list: SocialInput[]): SocialLink[] {
  return list.flatMap((item) => {
    const r = resolveSocial(item);
    return r.ok ? [r.link] : [];
  });
}
