import { NextResponse } from 'next/server';
import cs from '@/messages/cs.json';
import { CHANNEL, START_OLD_SITE, conditionalIssues, contactSchema } from '@/lib/contactSchema';
import { getBlock, getGallery, getIndustries } from '@/lib/content/server';
import { MAX_LIKES, OTHER_INDUSTRY, industryName } from '@/lib/content/gallery';
import { applyTextOverrides } from '@/lib/content/editable';
import { patchInquiry, saveInquiry, type InquiryData } from '@/lib/content/inquiries';
import { mailConfig, sendMail } from '@/lib/mail';
import { site } from '@/content/site';

export const runtime = 'nodejs';

/**
 * Jednoduchý rate limit v paměti instance. Na Vercelu se instance recyklují,
 * takže tohle drží jen nejhrubší nálety — pro tvrdší ochranu nasaďte
 * Upstash Ratelimit nebo Vercel WAF.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function isRateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);

  // úklid, ať mapa neroste donekonečna
  if (hits.size > 500) {
    for (const [key, times] of hits) {
      if (!times.some((time) => now - time < WINDOW_MS)) hits.delete(key);
    }
  }

  return recent.length > MAX_PER_WINDOW;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char,
  );

/** Odkaz z volného textu (reference) — jen http(s), nic jiného se neprolinkuje. */
const linkify = (value: string) => {
  const safe = escapeHtml(value);
  return safe.replace(/(https?:\/\/[^\s<]+)/g, (url) => `<a href="${url}" style="color:#7da6ff">${url}</a>`);
};

const absolute = (url: string) => (url.startsWith('/') ? `${site.url}${url}` : url);

const chunk = <T,>(list: T[], size: number) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return y && m && d ? `${d}. ${m}. ${y}` : iso;
};

type Section = { title: string; rows: [string, string, boolean?][] };

/**
 * Ověření tokenu Turnstile. Neplatný / chybějící / použitý token = robot.
 * Naopak chyba na NAŠÍ straně (špatně zkopírovaný tajný klíč, výpadek
 * Cloudflare) poptávku neblokuje — jen se hlasitě zaloguje (Vercel → Logs):
 * přijít o zákazníka je horší než pustit jeden spam, honeypot a rate limit
 * platí dál.
 */
async function verifyCaptcha(token: string, ip: string): Promise<'pass' | 'fail'> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return 'pass';
  if (!token) return 'fail';
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip !== 'unknown') body.set('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(8000),
    });
    const out = (await res.json()) as { success?: boolean; action?: string; hostname?: string; 'error-codes'?: string[] };
    if (out.success) {
      if (out.action && out.action !== 'contact') {
        console.warn('[contact] Turnstile: token z jiné akce', out.action);
        return 'fail';
      }
      return 'pass';
    }
    const codes = out['error-codes'] ?? [];
    if (codes.some((code) => code === 'invalid-input-secret' || code === 'missing-input-secret')) {
      console.error('[contact] TURNSTILE_SECRET_KEY je neplatný — zkontrolujte ho ve Vercelu (Secret key z Cloudflare → Turnstile). Poptávka propuštěna bez ověření.');
      return 'pass';
    }
    if (codes.includes('internal-error')) {
      console.error('[contact] Turnstile: interní chyba Cloudflare — poptávka propuštěna bez ověření.');
      return 'pass';
    }
    console.warn('[contact] Turnstile zamítl token', codes.join(', ') || '(bez kódu)');
    return 'fail';
  } catch (error) {
    console.error('[contact] Turnstile nedostupný — poptávka propuštěna bez ověření.', error);
    return 'pass';
  }
}

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json({ ok: false, code: 'rate' }, { status: 429 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: 'server' }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(payload);
  if (!parsed.success || conditionalIssues(parsed.data).length) {
    return NextResponse.json({ ok: false, code: 'server' }, { status: 422 });
  }

  const data = parsed.data;

  // Cloudflare Turnstile: s nastaveným tajným klíčem musí token projít ověřením
  if ((await verifyCaptcha(data.captcha ?? '', ip)) === 'fail') {
    return NextResponse.json({ ok: false, code: 'captcha' }, { status: 403 });
  }

  // Honeypot vyplněn → tváříme se, že je vše v pořádku, ale nic neodesíláme.
  if (data.website) {
    return NextResponse.json({ ok: true });
  }
  // jen vývoj: snímkování nápověd pro administraci (scripts/capture-admin-hints.mjs)
  // formulář odesílá naostro — takovou poptávku neukládat ani neposílat
  if (process.env.NODE_ENV === 'development' && request.headers.get('cookie')?.includes('elevate-annotate=1')) {
    return NextResponse.json({ ok: true, delivered: false, stored: false });
  }

  // adresát: nastavení z administrace, pak proměnná prostředí
  const { to } = await mailConfig();

  // Poptávku vždy popsat česky — volby přišly jako indexy, popisky bereme
  // z češtiny včetně úprav z administrace.
  const texts = applyTextOverrides(cs as unknown as Record<string, unknown>, await getBlock('messages_cs'));
  const c = texts.contact as typeof cs.contact;
  const list = (labels: string[], picks: number[] = []) => picks.map((i) => labels[i]).filter(Boolean).join(', ');
  const one = (labels: string[], i: number) => (i >= 0 ? labels[i] ?? '' : '');

  const refs = (data.refs ?? []).map((r) => r.trim()).filter(Boolean);
  // obor = id ze seznamu v administraci → český název
  const industries = await getIndustries();
  const niche = industryName(industries.find((i) => i.id === data.niche), 'cs') || (data.niche === OTHER_INDUSTRY ? 'Jiný obor' : data.niche);
  // vybrané ukázky z galerie (jen existující snímky)
  const gallery = await getGallery();
  const liked = [...new Set(data.likes ?? [])]
    .map((id) => gallery.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, MAX_LIKES)
    // v e-mailu musí být adresy absolutní (snímky původních projektů jsou ve složce webu)
    .map(({ id, url, thumb, label }) => ({ id, url: absolute(url), thumb: absolute(thumb), label }));
  const channel = one(c.channels, data.channel);
  const reach =
    data.channel === CHANNEL.phone || data.channel === CHANNEL.whatsapp
      ? `${channel}: ${data.phone}`
      : data.channel === CHANNEL.telegram
        ? `${channel}: ${data.telegram}`
        : channel;

  const sections: Section[] = [
    {
      title: 'Projekt',
      rows: [
        ['Typ projektu', list(c.needs, data.needs)],
        ['Vybraný balíček', data.plan || ''],
        ['Obor', niche],
        ['Upřesnění oboru', data.nicheDetail || ''],
      ],
    },
    {
      title: 'Výchozí stav',
      rows: [
        ['Co už mají', one(c.starts, data.start)],
        ['Současný web', data.start === START_OLD_SITE ? data.currentSite || '' : '', true],
        ['Podklady', list(c.assets, data.assets)],
      ],
    },
    {
      title: 'Vzhled',
      rows: [
        ['Vybrané ukázky', liked.length ? `${liked.length} z galerie oboru${liked.some((l) => l.label) ? ` — ${liked.map((l) => l.label).filter(Boolean).join(', ')}` : ''}` : ''],
        ['Líbí se jim', refs.join('\n'), true],
        ['Styl', one(c.styles, data.style)],
        ['Barvy', [list(c.colors, data.colors), data.colorNote].filter(Boolean).join(' · ')],
      ],
    },
    {
      title: 'Rozpočet a termín',
      rows: [
        ['Rozpočet', one(c.budgets, data.budget)],
        ['Termín', one(c.timelines, data.timeline)],
        ['Pevný termín', data.deadline ? formatDate(data.deadline) : ''],
      ],
    },
    {
      title: 'Kontakt',
      rows: [
        ['Jméno', data.name],
        ['E-mail', data.email],
        ['Ozvat se přes', reach],
        ['Zpráva', data.message || ''],
        ['Jazyk webu', (data.locale || 'cs').toUpperCase()],
      ],
    },
  ];

  const html = `
    <div style="font-family:system-ui,sans-serif;background:#04060b;color:#f2f5ff;padding:28px">
      <h1 style="font-size:18px;margin:0 0 6px">Nová poptávka z webu ELEVATE</h1>
      <p style="margin:0 0 20px;color:#8a93a8;font-size:13px">${escapeHtml(data.name)} · ${escapeHtml(list(c.needs, data.needs))} · ${escapeHtml(one(c.budgets, data.budget))}</p>
      ${sections
        .map(
          (section) => `
      <h2 style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#7da6ff;margin:22px 0 6px">${section.title}</h2>
      <table style="border-collapse:collapse;width:100%;max-width:600px">
        ${section.rows
          .map(
            ([label, value, links]) => `
          <tr>
            <td style="padding:7px 12px 7px 0;border-bottom:1px solid rgba(80,120,255,0.2);color:#8a93a8;white-space:nowrap;vertical-align:top;width:150px">${label}</td>
            <td style="padding:7px 0;border-bottom:1px solid rgba(80,120,255,0.2);white-space:pre-line">${value ? (links ? linkify(value) : escapeHtml(value)) : '<span style="color:#4d5670">—</span>'}</td>
          </tr>`,
          )
          .join('')}
      </table>`,
        )
        .join('')}
      ${
        liked.length
          ? `<h2 style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#7da6ff;margin:26px 0 10px">Vybrané ukázky z galerie (${liked.length})</h2>
      <table style="border-collapse:separate;border-spacing:0 0">
        ${chunk(liked, 3)
          .map(
            (row) => `<tr>${row
              .map(
                (item) => `<td style="padding:0 10px 12px 0;vertical-align:top;width:190px">
          <a href="${escapeHtml(item.url)}" style="text-decoration:none;color:#c8d4f0">
            <img src="${escapeHtml(item.thumb)}" width="180" height="113" alt="${escapeHtml(item.label || 'Ukázka')}" style="display:block;width:180px;height:113px;object-fit:cover;border-radius:8px;border:1px solid rgba(80,120,255,0.35)">
            <span style="display:block;margin-top:5px;font-size:11px">${escapeHtml(item.label || 'Ukázka')}</span>
          </a></td>`,
              )
              .join('')}</tr>`,
          )
          .join('')}
      </table>`
          : ''
      }
      <p style="margin-top:22px;font-size:12px;color:#8a93a8">Poptávka je uložená i v administraci: <a href="${site.url}/admin#inquiries" style="color:#7da6ff">${site.url.replace(/^https?:\/\//, '')}/admin</a> · IP: ${escapeHtml(ip)}</p>
    </div>`;

  const text = sections
    .map((section) => `${section.title.toUpperCase()}\n${section.rows.map(([label, value]) => `${label}: ${value || '—'}`).join('\n')}`)
    .join('\n\n') + (liked.length ? `\n\nVYBRANÉ UKÁZKY\n${liked.map((l) => `${l.label || 'Ukázka'}: ${l.url}`).join('\n')}` : '');

  // 1) uložit do administrace (záložka Poptávky) — nezávisle na e-mailu
  const inquiry: InquiryData = {
    created_at: new Date().toISOString(),
    status: 'new',
    name: data.name,
    email: data.email,
    reach,
    locale: data.locale || 'cs',
    headline: [list(c.needs, data.needs), niche].filter(Boolean).join(' · '),
    budget: one(c.budgets, data.budget),
    sections: sections.map((section) => ({ title: section.title, rows: section.rows.filter(([, value]) => value).map(([label, value]) => [label, value] as [string, string]) })),
    ...(liked.length ? { likes: liked } : {}),
  };
  let key: string | null = null;
  try {
    key = await saveInquiry(inquiry);
  } catch (error) {
    console.error('[contact] uložení poptávky selhalo', error);
  }
  const stored = Boolean(key);

  // 2) upozornění e-mailem
  const mail = await sendMail({
    to,
    replyTo: data.email,
    subject: `Nová poptávka: ${list(c.needs, data.needs)}${niche ? ` · ${niche}` : ''} — ${data.name}`,
    html,
    text,
  });
  if (!mail.delivered) console.error('[contact] e-mail neodešel:', mail.error, stored ? '(poptávka je v administraci)' : '\n' + text);

  // výsledek odeslání k poptávce — v administraci je vidět, proč e-mail nedorazil
  if (key) {
    try {
      await patchInquiry(key, inquiry, { mail: { delivered: mail.delivered, error: mail.delivered ? undefined : mail.error, to, at: new Date().toISOString() } });
    } catch (error) {
      console.error('[contact] stav e-mailu se nepodařilo uložit', error);
    }
  }

  // poptávka je v administraci → pro návštěvníka je odeslaná, i když e-mail selhal
  if (stored || mail.delivered) return NextResponse.json({ ok: true, delivered: mail.delivered, stored });
  return NextResponse.json({ ok: false, code: 'send', to }, { status: 502 });
}
