import { site } from '@/content/site';

/**
 * HTML upozornění na novou poptávku (Resend → schránka studia).
 *
 * E-mailové klienty neumí většinu běžného CSS (Gmail zahodí <style> v řadě
 * situací, Outlook nezná flexbox ani zaoblení), proto: rozvržení tabulkami,
 * styly přímo na prvcích, barvy pevnými hodnotami a u každého pozadí i
 * atribut bgcolor. Přechody mají vždy plnou barvu jako zálohu. Blok <style>
 * jen zjemňuje okraje na telefonu — bez něj vypadá e-mail stejně, jen
 * s o něco širšími okraji.
 */

const C = {
  bg: '#04060B',
  hero: '#070B18',
  panel: '#0A1022',
  line: '#1B2647',
  hair: '#141D3A',
  ink: '#EEF1FF',
  text: '#C9D2EC',
  muted: '#8C97B5',
  blue: '#1F5BFF',
  bright: '#3D7BFF',
  sky: '#8FB2FF',
} as const;

const FONT = "'Manrope',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
/** Nadpisy: firemní Unbounded tam, kde klient načte webové písmo (Apple Mail), jinde tučný bezpatkový řez. */
const DISPLAY = "'Unbounded','Helvetica Neue',Helvetica,Arial,sans-serif";
const GRADIENT = 'linear-gradient(90deg,#1F5BFF 0%,#3D7BFF 45%,#00C2FF 100%)';

export type InquiryEmailChannel = 'email' | 'phone' | 'telegram' | 'whatsapp';

export type InquiryEmail = {
  /** klíč poptávky v administraci (odkaz „Otevřít v administraci"); null = uložení selhalo */
  id: string | null;
  createdAt: string;
  name: string;
  email: string;
  phone?: string;
  telegram?: string;
  channel: InquiryEmailChannel;
  channelLabel: string;
  needs: string;
  plan?: string;
  industry: string;
  nicheDetail?: string;
  start: string;
  currentSite?: string;
  assets?: string;
  likes: { url: string; thumb: string; label: string }[];
  refs: string[];
  style?: string;
  colors: { name: string; hex: string }[];
  colorNote?: string;
  budget: string;
  timeline: string;
  deadline?: string;
  message?: string;
  locale: string;
  ip?: string;
  /** zkušební e-mail z administrace — nahoře výrazná poznámka */
  sample?: boolean;
};

const esc = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);

/** Text s odkazy: jen http(s) adresy, každý řádek zvlášť. */
const linkify = (value: string) =>
  esc(value)
    .replace(/(https?:\/\/[^\s<]+)/g, (url) => `<a href="${url}" style="color:${C.sky};text-decoration:underline;word-break:break-all;">${url.replace(/^https?:\/\//, '')}</a>`)
    .replace(/\n/g, '<br>');

/** Adresa webu bez protokolu → odkaz (zákazník ji často napíše jako „firma.cz"). */
const siteLink = (value: string) => {
  const url = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return `<a href="${esc(url)}" style="color:${C.sky};text-decoration:underline;word-break:break-all;">${esc(value.replace(/^https?:\/\//i, ''))}</a>`;
};

/** Částky a krátká spojení se nelámou uprostřed („30–60 000 Kč"). */
const nowrapNumbers = (value: string) => esc(value).replace(/(\d) (?=\d)/g, '$1&nbsp;').replace(/ Kč/g, '&nbsp;Kč');

/**
 * Náhled ukázky pro e-mail: přes optimalizátor obrázků webu. Snímky galerie
 * jsou WebP, který starší Outlook nezobrazí — optimalizátor vrátí JPEG každému,
 * kdo o WebP výslovně nežádá, a rovnou zmenší na šířku náhledu.
 */
export function mailThumb(url: string) {
  // vlastní soubory webu jdou optimalizátoru jako cesta, cizí (úložiště) jako celá adresa
  const source = url.startsWith(`${site.url}/`) ? url.slice(site.url.length) : url;
  return `${site.url}/_next/image?url=${encodeURIComponent(source)}&w=384&q=75`;
}

const when = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const day = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'Europe/Prague' }).format(date);
  const time = new Intl.DateTimeFormat('cs-CZ', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Prague' }).format(date);
  return `${day} · ${time}`;
};

/* ------------------------------------------------------------------ */
/*  Stavební prvky                                                     */
/* ------------------------------------------------------------------ */

const TABLE = 'role="presentation" cellpadding="0" cellspacing="0" border="0"';

const label = (text: string, color: string = C.sky) =>
  `<div style="font-family:${FONT};font-size:11px;line-height:1.3;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${color};">${esc(text)}</div>`;

type Row = [label: string, html: string];

const rows = (list: Row[]) =>
  list
    .map(
      ([name, html], i) => `
          <tr>
            <td width="36%" valign="top" style="padding:11px 12px 11px 0;${i ? `border-top:1px solid ${C.hair};` : ''}font-family:${FONT};font-size:13px;line-height:1.5;color:${C.muted};">${esc(name)}</td>
            <td valign="top" style="padding:11px 0;${i ? `border-top:1px solid ${C.hair};` : ''}font-family:${FONT};font-size:15px;line-height:1.5;color:${C.ink};">${html}</td>
          </tr>`,
    )
    .join('');

/** Karta sekce: nadpis, tenká linka, řádky (a případně volný obsah pod nimi). */
const card = (title: string, list: Row[], extra = '') =>
  list.length || extra
    ? `
    <tr>
      <td class="px" style="padding:0 24px 14px 24px;">
        <table ${TABLE} width="100%" bgcolor="${C.panel}" style="background:${C.panel};border:1px solid ${C.line};border-radius:16px;border-collapse:separate;">
          <tr>
            <td style="padding:16px 20px 12px 20px;border-bottom:1px solid ${C.line};">${label(title)}</td>
          </tr>
          ${
            list.length
              ? `<tr>
            <td style="padding:4px 20px ${extra ? '0' : '6px'} 20px;">
              <table ${TABLE} width="100%">${rows(list)}
              </table>
            </td>
          </tr>`
              : ''
          }
          ${extra}
        </table>
      </td>
    </tr>`
    : '';

/** Náhledy vybraných ukázek — tři vedle sebe, každý vede na plný snímek. */
const thumbs = (likes: InquiryEmail['likes'], bordered: boolean) => {
  if (!likes.length) return '';
  const perRow = 3;
  const lines = Array.from({ length: Math.ceil(likes.length / perRow) }, (_, i) => likes.slice(i * perRow, i * perRow + perRow));
  return `<tr>
            <td style="padding:14px 16px 12px 16px;${bordered ? `border-top:1px solid ${C.hair};` : ''}">
              <div style="padding:0 4px 10px 4px;font-family:${FONT};font-size:13px;line-height:1.5;color:${C.muted};">Vybrané ukázky z galerie <span style="color:${C.ink};font-weight:700;">${likes.length}</span></div>
              <table ${TABLE} width="100%">
                ${lines
                  .map(
                    (line) => `<tr>${Array.from({ length: perRow }, (_, i) => line[i])
                      .map((item) =>
                        item
                          ? `
                  <td width="33.33%" valign="top" style="padding:0 4px 10px 4px;">
                    <a href="${esc(item.url)}" style="text-decoration:none;color:${C.text};">
                      <img src="${esc(mailThumb(item.thumb))}" width="160" alt="${esc(item.label || 'Ukázka')}" style="display:block;width:100%;max-width:176px;height:auto;border:1px solid #2A3A6B;border-radius:10px;background:${C.hero};">
                      <span style="display:block;padding-top:6px;font-family:${FONT};font-size:11px;line-height:1.35;color:${C.muted};">${esc(item.label || 'Ukázka')}</span>
                    </a>
                  </td>`
                          : `
                  <td width="33.33%" style="padding:0 4px;font-size:0;line-height:0;">&nbsp;</td>`,
                      )
                      .join('')}
                </tr>`,
                  )
                  .join('')}
              </table>
            </td>
          </tr>`;
};

const swatches = (colors: InquiryEmail['colors']) =>
  colors
    .map(
      (color) =>
        `<span style="display:inline-block;white-space:nowrap;margin:0 14px 2px 0;"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${esc(color.hex)};border:1px solid #4A5C94;vertical-align:-1px;"></span>&nbsp;${esc(color.name)}</span>`,
    )
    .join('');

/** Tlačítko odolné vůči Outlooku: zaoblený tvar ve VML, všude jinde obyčejný odkaz. */
const button = (href: string, text: string, kind: 'primary' | 'ghost' = 'primary', width = 250) => {
  const primary = kind === 'primary';
  const base = `display:inline-block;padding:14px 26px;border-radius:999px;font-family:${FONT};font-size:15px;line-height:1.2;font-weight:700;text-decoration:none;white-space:nowrap;`;
  const look = primary
    ? `background:${C.blue};background-image:linear-gradient(120deg,${C.blue},${C.bright});color:#FFFFFF;border:1px solid ${C.bright};`
    : `background:transparent;color:${C.ink};border:1px solid #3A4E8C;`;
  return `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${esc(href)}" style="height:46px;v-text-anchor:middle;width:${width}px;" arcsize="50%" ${primary ? `stroke="f" fillcolor="${C.blue}"` : `strokecolor="#3A4E8C" fillcolor="${C.panel}"`}><w:anchorlock/><center style="color:#FFFFFF;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${esc(text)}</center></v:roundrect><![endif]--><!--[if !mso]><!-- --><a href="${esc(href)}" style="${base}${look}">${esc(text)}</a><!--<![endif]-->`;
};

/** Odkazy na zákazníka: telefon, WhatsApp, Telegram. */
function reachLinks(mail: InquiryEmail) {
  const phone = mail.phone?.trim() ?? '';
  const digits = phone.replace(/\D/g, '');
  const tel = phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : '';
  // wa.me chce číslo s předvolbou bez „+" — devítimístné číslo bereme jako české
  const whatsapp = digits ? `https://wa.me/${phone.startsWith('+') ? digits : digits.length === 9 ? `420${digits}` : digits.replace(/^00/, '')}` : '';
  const handle = (mail.telegram ?? '').trim().replace(/^https?:\/\/t\.me\//i, '').replace(/^@/, '');
  const telegram = /^[A-Za-z0-9_]{3,}$/.test(handle) ? `https://t.me/${handle}` : '';
  return { phone, tel, whatsapp, telegram, handle };
}

/* ------------------------------------------------------------------ */
/*  E-mail                                                             */
/* ------------------------------------------------------------------ */

export function inquiryEmailSubject(mail: InquiryEmail) {
  return `${mail.sample ? 'Zkušební e-mail — ' : ''}Nová poptávka: ${[mail.needs, mail.industry, mail.budget].filter(Boolean).join(' · ')} — ${mail.name}`;
}

export function renderInquiryEmail(mail: InquiryEmail) {
  const { phone, tel, whatsapp, telegram, handle } = reachLinks(mail);
  const adminUrl = mail.id ? `${site.url}/admin?inquiry=${encodeURIComponent(mail.id)}` : `${site.url}/admin#inquiries`;
  const host = site.url.replace(/^https?:\/\//, '');
  const headingSize = mail.needs.length > 24 ? 23 : 30;

  // hlavní tlačítko podle toho, jak se zákazník chce spojit
  const primary =
    mail.channel === 'whatsapp' && whatsapp
      ? button(whatsapp, 'Napsat na WhatsApp')
      : mail.channel === 'telegram' && telegram
        ? button(telegram, 'Napsat na Telegram')
        : mail.channel === 'phone' && tel
          ? button(tel, `Zavolat ${phone}`, 'primary', 280)
          : button(`mailto:${mail.email}`, 'Odpovědět e-mailem');
  const secondary = mail.channel === 'email' ? (tel ? button(tel, 'Zavolat', 'ghost', 150) : '') : button(`mailto:${mail.email}`, 'Napsat e-mail', 'ghost', 170);

  const contactRows: Row[] = [
    ...(phone ? [['Telefon', `<a href="${esc(tel)}" style="color:#FFFFFF;text-decoration:none;font-size:20px;font-weight:700;white-space:nowrap;">${esc(phone)}</a>`] as Row] : []),
    ['E-mail', `<a href="mailto:${esc(mail.email)}" style="color:#FFFFFF;text-decoration:none;font-size:16px;font-weight:600;word-break:break-all;">${esc(mail.email)}</a>`],
    ...(mail.telegram
      ? [['Telegram', telegram ? `<a href="${esc(telegram)}" style="color:#FFFFFF;text-decoration:none;font-size:16px;font-weight:600;">@${esc(handle)}</a>` : esc(mail.telegram)] as Row]
      : []),
  ];

  const lookRows: Row[] = [
    ...(mail.refs.length ? [['Líbí se jim', linkify(mail.refs.join('\n'))] as Row] : []),
    ...(mail.style ? [['Styl', esc(mail.style)] as Row] : []),
    ...(mail.colors.length ? [['Barvy', swatches(mail.colors)] as Row] : []),
    ...(mail.colorNote ? [['Poznámka k barvám', esc(mail.colorNote)] as Row] : []),
  ];

  return `<!DOCTYPE html>
<html lang="cs" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${esc(inquiryEmailSubject(mail))}</title>
<!--[if !mso]><!-->
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&family=Unbounded:wght@700&display=swap" rel="stylesheet">
<!--<![endif]-->
<style>
  body { margin: 0; padding: 0; }
  a { color: ${C.sky}; }
  @media only screen and (max-width: 520px) {
    .px { padding-left: 14px !important; padding-right: 14px !important; }
    .hero { padding: 26px 18px 22px 18px !important; }
    .h1 { font-size: 25px !important; }
    .stat { font-size: 21px !important; }
  }
</style>
</head>
<body bgcolor="${C.bg}" style="margin:0;padding:0;background:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bg};font-size:1px;line-height:1px;">${esc([mail.name, mail.needs, mail.industry, mail.budget].filter(Boolean).join(' · '))}</div>
<table ${TABLE} width="100%" bgcolor="${C.bg}" style="background:${C.bg};">
  <tr>
    <td align="center" style="padding:0;">
      <!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" align="center"><tr><td><![endif]-->
      <table ${TABLE} width="100%" style="width:100%;max-width:600px;margin:0 auto;">

    <!-- hlavička: logo, štítek, proužek ve firemních barvách -->
    <tr>
      <td class="px" bgcolor="${C.bg}" style="padding:26px 24px 20px 24px;background:${C.bg};">
        <table ${TABLE} width="100%">
          <tr>
            <td valign="middle">
              <a href="${esc(site.url)}" style="text-decoration:none;"><img src="${esc(site.url)}/brand/logo-elevate.png" width="148" height="26" alt="ELEVATE" style="display:block;width:148px;height:26px;border:0;font-family:${DISPLAY};font-size:18px;font-weight:700;letter-spacing:0.3em;color:#FFFFFF;"></a>
            </td>
            <td valign="middle" align="right" style="font-family:${FONT};font-size:12px;line-height:1.4;color:${C.muted};white-space:nowrap;">${esc(when(mail.createdAt))}</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td bgcolor="${C.blue}" height="3" style="height:3px;font-size:0;line-height:0;background:${C.blue};background-image:${GRADIENT};">&nbsp;</td>
    </tr>
${
  mail.sample
    ? `
    <tr>
      <td class="px" bgcolor="#1A2A66" style="padding:11px 24px;background:#1A2A66;font-family:${FONT};font-size:13px;line-height:1.5;color:#DCE6FF;">Zkušební e-mail z administrace — takhle vypadá upozornění na novou poptávku. Údaje jsou vymyšlené.</td>
    </tr>`
    : ''
}
    <!-- hlavní sdělení: co, pro jaký obor, za kolik -->
    <tr>
      <td class="hero" bgcolor="${C.hero}" style="padding:30px 24px 26px 24px;background:${C.hero};background-image:linear-gradient(180deg,#0D1740 0%,${C.hero} 100%);">
        ${label('Nová poptávka z webu')}
        <h1 class="h1" style="margin:12px 0 0 0;font-family:${DISPLAY};font-size:${headingSize}px;line-height:1.14;font-weight:700;text-transform:uppercase;color:#FFFFFF;">${esc(mail.needs)}</h1>
        ${mail.industry ? `<div class="h1" style="font-family:${DISPLAY};font-size:${headingSize}px;line-height:1.14;font-weight:700;text-transform:uppercase;color:#5E91FF;">${esc(mail.industry)}</div>` : ''}
        <table ${TABLE} width="100%" style="margin-top:22px;">
          <tr>
            <td width="58%" valign="top" style="padding:16px 12px 0 0;border-top:1px solid ${C.line};">
              ${label('Rozpočet', C.muted)}
              <div class="stat" style="padding-top:6px;font-family:${DISPLAY};font-size:25px;line-height:1.2;font-weight:700;color:#FFFFFF;">${nowrapNumbers(mail.budget || '—')}</div>
            </td>
            <td valign="top" style="padding:16px 0 0 0;border-top:1px solid ${C.line};">
              ${label('Termín', C.muted)}
              <div style="padding-top:8px;font-family:${FONT};font-size:17px;line-height:1.3;font-weight:700;color:${C.ink};">${esc(mail.timeline || '—')}</div>
            </td>
          </tr>
        </table>
        <div style="padding-top:18px;font-family:${FONT};font-size:15px;line-height:1.5;color:${C.text};">Píše <strong style="color:#FFFFFF;">${esc(mail.name)}</strong> · ozvat se přes <strong style="color:#FFFFFF;">${esc(mail.channelLabel)}</strong></div>
      </td>
    </tr>
    <tr><td height="18" style="height:18px;font-size:0;line-height:0;">&nbsp;</td></tr>
${card('Projekt', [
  ['Typ projektu', esc(mail.needs)],
  ...(mail.plan ? [['Vybraný balíček', esc(mail.plan)] as Row] : []),
  ['Obor', esc(mail.industry)],
  ...(mail.nicheDetail ? [['Čím se zabývá', esc(mail.nicheDetail)] as Row] : []),
])}${card('Výchozí stav', [
    ['Co už mají', esc(mail.start)],
    ...(mail.currentSite ? [['Současný web', siteLink(mail.currentSite)] as Row] : []),
    ...(mail.assets ? [['Podklady', esc(mail.assets)] as Row] : []),
  ])}${card('Vzhled', lookRows, thumbs(mail.likes, lookRows.length > 0))}${card('Rozpočet a termín', [
    ['Rozpočet', nowrapNumbers(mail.budget)],
    ['Termín', esc(mail.timeline)],
    ...(mail.deadline ? [['Pevný termín', esc(mail.deadline)] as Row] : []),
  ])}${
    mail.message
      ? `
    <tr>
      <td class="px" style="padding:0 24px 14px 24px;">
        <table ${TABLE} width="100%" bgcolor="${C.panel}" style="background:${C.panel};border:1px solid ${C.line};border-left:3px solid ${C.bright};border-radius:16px;border-collapse:separate;">
          <tr>
            <td style="padding:16px 20px 18px 20px;">
              ${label('Zpráva od zákazníka')}
              <div style="padding-top:10px;font-family:${FONT};font-size:15px;line-height:1.6;color:${C.ink};">${esc(mail.message).replace(/\n/g, '<br>')}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
      : ''
  }
    <!-- kontakt: komu se ozvat -->
    <tr>
      <td class="px" style="padding:6px 24px 0 24px;">
        <table ${TABLE} width="100%" bgcolor="#101C4A" style="background:#101C4A;background-image:linear-gradient(140deg,#16276A 0%,#0B1436 100%);border:1px solid #3657C9;border-radius:18px;border-collapse:separate;">
          <tr>
            <td style="padding:22px 22px 20px 22px;">
              ${label('Komu se ozvat', '#A9C2FF')}
              <div style="padding-top:8px;font-family:${DISPLAY};font-size:24px;line-height:1.2;font-weight:700;color:#FFFFFF;">${esc(mail.name)}</div>
              <div style="padding-top:6px;font-family:${FONT};font-size:14px;line-height:1.5;color:#C5D3FA;">Preferuje: <strong style="color:#FFFFFF;">${esc(mail.channelLabel)}</strong></div>
              <table ${TABLE} width="100%" style="margin-top:14px;">${contactRows
                .map(
                  ([name, html], i) => `
                <tr>
                  <td width="30%" valign="middle" style="padding:11px 12px 11px 0;border-top:1px solid ${i ? '#263A82' : '#2F4699'};font-family:${FONT};font-size:13px;line-height:1.5;color:#A9B8E6;">${esc(name)}</td>
                  <td valign="middle" style="padding:11px 0;border-top:1px solid ${i ? '#263A82' : '#2F4699'};font-family:${FONT};line-height:1.4;color:#FFFFFF;">${html}</td>
                </tr>`,
                )
                .join('')}
              </table>
              <!-- tlačítka vedle sebe, na úzkém displeji se druhé samo zalomí pod první (bez media queries) -->
              <div style="padding-top:16px;font-size:0;line-height:0;">
                <span style="display:inline-block;margin:0 10px 10px 0;">${primary}</span>${secondary ? `<span style="display:inline-block;margin:0 0 10px 0;">${secondary}</span>` : ''}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- administrace -->
    <tr>
      <td class="px" align="center" style="padding:28px 24px 8px 24px;">
        ${button(adminUrl, 'Otevřít v administraci', 'primary', 260)}
        <div style="padding-top:12px;font-family:${FONT};font-size:12px;line-height:1.5;color:${C.muted};">Poptávka je uložená v administraci — tam ji označíte jako vyřízenou a připíšete poznámku.</div>
      </td>
    </tr>

    <!-- patička -->
    <tr>
      <td class="px" style="padding:22px 24px 34px 24px;">
        <table ${TABLE} width="100%">
          <tr>
            <td style="padding-top:18px;border-top:1px solid ${C.line};font-family:${FONT};font-size:12px;line-height:1.6;color:${C.muted};">
              Odpovědí na tento e-mail píšete přímo zákazníkovi (<a href="mailto:${esc(mail.email)}" style="color:${C.muted};text-decoration:underline;">${esc(mail.email)}</a>).<br>
              Odesláno z formuláře na <a href="${esc(site.url)}" style="color:${C.sky};text-decoration:none;">${esc(host)}</a> · jazyk webu ${esc((mail.locale || 'cs').toUpperCase())}${mail.ip ? ` · IP ${esc(mail.ip)}` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>

      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Ukázková poptávka pro zkušební e-mail z administrace. */
export function sampleInquiryEmail(likes: InquiryEmail['likes'] = []): InquiryEmail {
  return {
    id: null,
    createdAt: new Date().toISOString(),
    name: 'Jan Novák',
    email: 'jan.novak@example.cz',
    phone: '+420 777 123 456',
    channel: 'whatsapp',
    channelLabel: 'WhatsApp',
    needs: 'E-shop',
    plan: 'E-shopy',
    industry: 'Auto-moto',
    nicheDetail: 'Prodej náhradních dílů a doplňků, vlastní sklad v Praze',
    start: 'Starý web, který chceme nahradit',
    currentSite: 'www.autodily-novak.cz',
    assets: 'Logo, Fotky',
    likes,
    refs: ['https://www.example.cz — líbí se mi přehledný katalog'],
    style: 'Technický a tmavý',
    colors: [
      { name: 'Modrá', hex: '#1F5BFF' },
      { name: 'Černá', hex: '#0B0D12' },
    ],
    colorNote: 'Firemní modrá #1F5BFF',
    budget: '30–60 000 Kč',
    timeline: 'Do měsíce',
    deadline: '',
    message: 'Dobrý den, potřebujeme e-shop napojený na skladový systém. Zavolejte prosím odpoledne.',
    locale: 'cs',
    sample: true,
  };
}
