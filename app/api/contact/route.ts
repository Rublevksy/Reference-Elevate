import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import cs from '@/messages/cs.json';
import { CHANNEL, START_OLD_SITE, conditionalIssues, contactSchema } from '@/lib/contactSchema';
import { getBlock, getSettings } from '@/lib/content/server';
import { applyTextOverrides } from '@/lib/content/editable';

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

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return y && m && d ? `${d}. ${m}. ${y}` : iso;
};

type Section = { title: string; rows: [string, string, boolean?][] };

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

  // Honeypot vyplněn → tváříme se, že je vše v pořádku, ale nic neodesíláme.
  if (data.website) {
    return NextResponse.json({ ok: true });
  }

  const apiKey = process.env.RESEND_API_KEY;
  // adresát: nastavení z administrace, pak proměnná prostředí
  // (prázdná hodnota v .env = výchozí; ?? by nechalo prázdný řetězec a Resend by selhal)
  const to = (await getSettings()).contactEmail || process.env.CONTACT_EMAIL || '';
  const from = process.env.CONTACT_FROM_EMAIL || 'ELEVATE <onboarding@resend.dev>';

  // Poptávku vždy popsat česky — volby přišly jako indexy, popisky bereme
  // z češtiny včetně úprav z administrace.
  const texts = applyTextOverrides(cs as unknown as Record<string, unknown>, await getBlock('messages_cs'));
  const c = texts.contact as typeof cs.contact;
  const list = (labels: string[], picks: number[] = []) => picks.map((i) => labels[i]).filter(Boolean).join(', ');
  const one = (labels: string[], i: number) => (i >= 0 ? labels[i] ?? '' : '');

  const refs = (data.refs ?? []).map((r) => r.trim()).filter(Boolean);
  const channel = one(c.channels, data.channel);
  const reach =
    data.channel === CHANNEL.phone ? `${channel}: ${data.phone}` : data.channel === CHANNEL.telegram ? `${channel}: ${data.telegram}` : channel;

  const sections: Section[] = [
    {
      title: 'Projekt',
      rows: [
        ['Typ projektu', list(c.needs, data.needs)],
        ['Vybraný balíček', data.plan || ''],
        ['Obor', one(c.niches, data.niche)],
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
      <p style="margin-top:22px;font-size:12px;color:#8a93a8">IP: ${escapeHtml(ip)}</p>
    </div>`;

  const text = sections
    .map((section) => `${section.title.toUpperCase()}\n${section.rows.map(([label, value]) => `${label}: ${value || '—'}`).join('\n')}`)
    .join('\n\n');

  if (!apiKey) {
    // Bez klíče poptávku aspoň zalogujeme, ať se na vývoji nic neztratí.
    console.warn('[contact] RESEND_API_KEY není nastavený — poptávka jen zalogována.\n' + text);
    return NextResponse.json({ ok: true, delivered: false });
  }

  try {
    const resend = new Resend(apiKey);
    const niche = one(c.niches, data.niche);
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: data.email,
      subject: `Nová poptávka: ${list(c.needs, data.needs)}${niche ? ` · ${niche}` : ''} — ${data.name}`,
      html,
      text,
    });

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, delivered: true });
  } catch (error) {
    console.error('[contact] odeslání selhalo', error);
    return NextResponse.json({ ok: false, code: 'send', to }, { status: 502 });
  }
}
