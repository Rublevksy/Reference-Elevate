import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { contactSchema } from '@/lib/contactSchema';
import { getSettings } from '@/lib/content/server';

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
  if (!parsed.success) {
    return NextResponse.json({ ok: false, code: 'server' }, { status: 422 });
  }

  const data = parsed.data;

  // Honeypot vyplněn → tváříme se, že je vše v pořádku, ale nic neodesíláme.
  if (data.website) {
    return NextResponse.json({ ok: true });
  }

  const apiKey = process.env.RESEND_API_KEY;
  // prázdná hodnota v .env = výchozí (?? by nechalo prázdný řetězec a Resend by selhal)
  // adresát: nastavení z administrace, pak proměnná prostředí
  const to = (await getSettings()).contactEmail || process.env.CONTACT_EMAIL || '';
  const from = process.env.CONTACT_FROM_EMAIL || 'ELEVATE <onboarding@resend.dev>';

  const rows: [string, string][] = [
    ['Služby', data.needs.join(', ')],
    ['Rozpočet', data.budget || '—'],
    ['Termín', data.timeline || '—'],
    ['Stávající web', data.currentSite || '—'],
    ['Jméno', data.name],
    ['E-mail', data.email],
    ['Telefon', data.phone || '—'],
    ['Zpráva', data.message || '—'],
  ];

  const html = `
    <div style="font-family:system-ui,sans-serif;background:#04060b;color:#f2f5ff;padding:28px">
      <h1 style="font-size:18px;margin:0 0 18px">Nová poptávka z webu ELEVATE</h1>
      <table style="border-collapse:collapse;width:100%;max-width:560px">
        ${rows
          .map(
            ([label, value]) => `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid rgba(80,120,255,0.2);color:#8a93a8;white-space:nowrap">${label}</td>
            <td style="padding:8px 12px;border-bottom:1px solid rgba(80,120,255,0.2)">${escapeHtml(value)}</td>
          </tr>`,
          )
          .join('')}
      </table>
      <p style="margin-top:18px;font-size:12px;color:#8a93a8">IP: ${escapeHtml(ip)}</p>
    </div>`;

  if (!apiKey) {
    // Bez klíče poptávku aspoň zalogujeme, ať se na vývoji nic neztratí.
    console.warn('[contact] RESEND_API_KEY není nastavený — poptávka jen zalogována.', {
      ...data,
      website: undefined,
    });
    return NextResponse.json({ ok: true, delivered: false });
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: data.email,
      subject: `Nová poptávka: ${data.needs.join(', ')} — ${data.name}`,
      html,
    });

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, delivered: true });
  } catch (error) {
    console.error('[contact] odeslání selhalo', error);
    return NextResponse.json({ ok: false, code: 'send', to }, { status: 502 });
  }
}
