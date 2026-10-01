/**
 * Které texty webu (česká verze) jdou měnit v administraci. Cesta míří do
 * messages/cs.json („hero.tagline.0" = první řádek pole tagline). Uložené
 * změny se při sestavení stránky položí přes texty ze souboru — co se
 * nezměnilo, bere se dál ze souboru.
 *
 * Struktura kopíruje web shora dolů: sekce → skupiny → pole. Kde přesně
 * text na webu je, ukazuje v administraci screenshot se zvýrazněním
 * (public/admin-hints, skript scripts/capture-admin-hints.mjs) — popisky
 * tu proto jen pojmenovávají, `note` je vyhrazená pro omezení (délka, pořadí).
 *
 * Záměrně tu NENÍ: nadpis a záložky sekce Služby (jejich screenshot je
 * zapečený ve filmu na displeji notebooku), navigace a služební texty.
 */
export type EditField = { path: string; label: string; long?: boolean; note?: string };
export type EditGroup = { id: string; title: string; fields: EditField[] };
export type EditSection = { id: string; title: string; groups: EditGroup[]; preview?: 'serp' };

const f = (path: string, label: string, extra: Partial<EditField> = {}): EditField => ({ path, label, ...extra });
const options = (base: string, labels: string[], prefix = 'Volba'): EditField[] =>
  labels.map((label, i) => f(`${base}.${i}`, `${prefix} „${label}“`));

const SERVICES = [
  ['weby', '01 Weby'],
  ['seo', '02 SEO'],
  ['e-shopy', '03 E-shopy'],
  ['design', '04 Design'],
  ['aplikace', '05 Aplikace'],
] as const;

const NEEDS = ['Web', 'E-shop', 'SEO', 'Logo a design', 'Aplikace', 'Projekt na míru', 'Nevím, poraďte mi'];
const NICHES = ['Služby a řemesla', 'Auto-moto', 'Zdraví a krása', 'Gastro a ubytování', 'Reality a stavebnictví', 'Obchod a e-commerce', 'Vzdělávání a kurzy', 'Jiný obor'];
const STARTS = ['Nic, od nuly', 'Starý web', 'Jen nápad'];
const ASSETS = ['Logo', 'Texty', 'Fotky', 'Grafický manuál'];
const STYLES = ['Minimalistický', 'Výrazný', 'Prémiový', 'Hravý', 'Technický', 'Nechám na vás'];
const COLORS = ['Modrá', 'Černá', 'Bílá', 'Zelená', 'Červená', 'Oranžová', 'Fialová', 'Zlatá'];
const BUDGETS = ['do 10 000', '10–30 000', '30–60 000', '60–120 000', 'nad 120 000', 'Zatím nevím'];
const TIMELINES = ['Co nejdřív', 'Do měsíce', 'Do tří měsíců', 'Nespěchá'];
const CHANNELS = ['E-mail', 'Telefon', 'Telegram', 'WhatsApp'];
const STEP_NAMES = ['Projekt', 'Výchozí stav', 'Vzhled', 'Rozpočet', 'Kontakt'];

export const EDIT_SECTIONS: EditSection[] = [
  {
    id: 'hero',
    title: 'Úvodní obrazovka',
    groups: [
      {
        id: 'hero-main',
        title: 'Texty',
        fields: [
          f('hero.eyebrow', 'Nadpis nad titulkem'),
          f('hero.tagline.0', 'Titulek — 1. řádek'),
          f('hero.tagline.1', 'Titulek — 2. řádek'),
          f('hero.taglineAccent', 'Titulek — modré zakončení'),
          f('hero.subtitle', 'Podtitulek', { long: true }),
          f('hero.ctaBook', 'Hlavní tlačítko'),
          f('hero.ctaBookNote', 'Drobný text v tlačítku'),
          f('hero.ctaWork', 'Odkaz na práce'),
          f('hero.scrollHint', 'Pozvánka ke skrolování'),
        ],
      },
    ],
  },
  {
    id: 'why',
    title: 'Weby, které žijí',
    groups: [
      {
        id: 'why-main',
        title: 'Texty',
        fields: [
          f('whyAnimated.title', 'Nadpis — bílá část'),
          f('whyAnimated.titleAccent', 'Nadpis — modrá část'),
          f('whyAnimated.lead', 'Úvodní věta', { long: true }),
          f('whyAnimated.static', 'Přepínač — statický'),
          f('whyAnimated.animated', 'Přepínač — animovaný'),
          f('whyAnimated.hint', 'Nápověda u přepínače'),
          f('whyAnimated.pills.0', 'Štítek 1'),
          f('whyAnimated.pills.1', 'Štítek 2'),
          f('whyAnimated.pills.2', 'Štítek 3'),
          f('whyAnimated.footnote', 'Poznámka pod štítky', { long: true }),
        ],
      },
    ],
  },
  {
    id: 'process',
    title: 'Proces',
    groups: [
      {
        id: 'process-head',
        title: 'Záhlaví',
        fields: [
          f('process.eyebrow', 'Nadpis nad titulkem'),
          f('process.title', 'Nadpis — bílá část'),
          f('process.titleAccent', 'Nadpis — modrá část'),
          f('process.lead', 'Úvodní věta'),
        ],
      },
      ...[0, 1, 2, 3, 4].map((i) => ({
        id: `process-step-${i}`,
        title: `Krok ${i + 1}`,
        fields: [f(`process.steps.${i}.title`, 'Název kroku'), f(`process.steps.${i}.text`, 'Text kroku', { long: true })],
      })),
    ],
  },
  {
    id: 'cases',
    title: 'Práce',
    groups: [
      {
        id: 'cases-head',
        title: 'Záhlaví sekce',
        fields: [
          f('cases.eyebrow', 'Nadpis nad titulkem'),
          f('cases.title', 'Nadpis — bílá část'),
          f('cases.titleAccent', 'Nadpis — modrá část'),
          f('cases.lead', 'Úvodní text', { long: true }),
          f('cases.visit', 'Tlačítko u projektu'),
        ],
      },
    ],
  },
  {
    id: 'services',
    title: 'Služby — panely',
    groups: SERVICES.map(([slug, label]) => ({
      id: `panel-${slug}`,
      title: label,
      fields: [
        f(`services.items.${slug}.card`, 'Název na kartě'),
        f(`services.items.${slug}.headline.0`, 'Nadpis — začátek'),
        f(`services.items.${slug}.headline.1`, 'Nadpis — modrá část'),
        f(`services.items.${slug}.headline.2`, 'Nadpis — konec'),
        ...[0, 1, 2].flatMap((i) => [
          f(`services.items.${slug}.features.${i}.title`, `Výhoda ${i + 1} — tučně`),
          f(`services.items.${slug}.features.${i}.sub`, `Výhoda ${i + 1} — pod tím`),
        ]),
        f(`services.items.${slug}.cta`, 'Text tlačítka'),
      ],
    })),
  },
  {
    id: 'contact',
    title: 'Kontaktní formulář',
    groups: [
      {
        id: 'contact-head',
        title: 'Záhlaví a průběh',
        fields: [
          f('contact.eyebrow', 'Nadpis nad titulkem'),
          f('contact.title', 'Nadpis — bílá část'),
          f('contact.titleAccent', 'Nadpis — modrá část'),
          f('contact.lead', 'Úvodní text', { long: true }),
          ...STEP_NAMES.map((name, i) => f(`contact.steps.${i}`, `Průběh — krok ${i + 1} (${name})`)),
          f('contact.back', 'Tlačítko zpět'),
          f('contact.next', 'Tlačítko pokračovat'),
        ],
      },
      {
        id: 'contact-1',
        title: 'Krok 1 · Projekt',
        fields: [
          f('contact.questions.0', 'Otázka kroku'),
          f('contact.needsLabel', 'Popisek — typ projektu'),
          f('contact.needsHint', 'Nápověda pod popiskem'),
          ...options('contact.needs', NEEDS).map((x, i) => (i === 0 ? { ...x, note: 'Pořadí voleb odpovídá službám (tlačítka v Ceníku je předvybírají).' } : x)),
          f('contact.planLabel', 'Štítek vybraného balíčku z Ceníku'),
          f('contact.nicheLabel', 'Popisek — obor'),
          ...options('contact.niches', NICHES),
          f('contact.nicheDetailLabel', 'Popisek — upřesnění oboru'),
          f('contact.nicheDetailPlaceholder', 'Nápověda v poli upřesnění'),
        ],
      },
      {
        id: 'contact-2',
        title: 'Krok 2 · Výchozí stav',
        fields: [
          f('contact.questions.1', 'Otázka kroku'),
          f('contact.startLabel', 'Popisek — co už máte'),
          ...options('contact.starts', STARTS),
          f('contact.currentSiteLabel', 'Popisek — adresa webu'),
          f('contact.currentSitePlaceholder', 'Nápověda v poli adresa'),
          f('contact.assetsLabel', 'Popisek — podklady'),
          ...options('contact.assets', ASSETS),
        ],
      },
      {
        id: 'contact-3',
        title: 'Krok 3 · Vzhled',
        fields: [
          f('contact.questions.2', 'Otázka kroku'),
          f('contact.refsLabel', 'Popisek — oblíbené weby'),
          f('contact.refsHint', 'Nápověda pod popiskem', { long: true }),
          f('contact.refsPlaceholder', 'Nápověda v poli odkazu'),
          f('contact.refsAdd', 'Přidat další odkaz'),
          f('contact.styleLabel', 'Popisek — styl'),
          ...options('contact.styles', STYLES),
          f('contact.colorsLabel', 'Popisek — barvy'),
          ...options('contact.colors', COLORS, 'Barva'),
          f('contact.colorNotePlaceholder', 'Nápověda v poli firemní barvy'),
        ],
      },
      {
        id: 'contact-4',
        title: 'Krok 4 · Rozpočet a termín',
        fields: [
          f('contact.questions.3', 'Otázka kroku'),
          f('contact.budgetLabel', 'Popisek — rozpočet'),
          f('contact.budgetHint', 'Nápověda pod popiskem', { long: true }),
          ...options('contact.budgets', BUDGETS),
          f('contact.timelineLabel', 'Popisek — termín'),
          ...options('contact.timelines', TIMELINES),
          f('contact.deadlineLabel', 'Popisek — pevný termín'),
          f('contact.deadlineHint', 'Nápověda pod popiskem'),
        ],
      },
      {
        id: 'contact-5',
        title: 'Krok 5 · Kontakt',
        fields: [
          f('contact.questions.4', 'Otázka kroku'),
          f('contact.nameLabel', 'Popisek — jméno'),
          f('contact.emailLabel', 'Popisek — e-mail'),
          f('contact.channelLabel', 'Popisek — jak se ozvat'),
          ...options('contact.channels', CHANNELS),
          f('contact.phoneLabel', 'Popisek — telefon'),
          f('contact.whatsappLabel', 'Popisek — WhatsApp'),
          f('contact.telegramLabel', 'Popisek — Telegram'),
          f('contact.messageLabel', 'Popisek — zpráva'),
          f('contact.messagePlaceholder', 'Nápověda v poli zpráva'),
          f('contact.summaryLabel', 'Nadpis shrnutí'),
          f('contact.consent', 'Souhlas se zpracováním údajů', { long: true }),
          f('contact.submit', 'Tlačítko odeslání'),
        ],
      },
      {
        id: 'contact-done',
        title: 'Po odeslání',
        fields: [
          f('contact.successTitle', 'Nadpis'),
          f('contact.successText', 'Text', { long: true }),
          f('contact.successLink', 'Odkaz na konci textu'),
        ],
      },
    ],
  },
  {
    id: 'mascot',
    title: 'Maskot u formuláře',
    groups: [
      {
        id: 'mascot-hints',
        title: 'Nápověda na začátku kroku',
        fields: STEP_NAMES.map((name, i) => f(`contact.hints.${i}`, `Krok ${i + 1} · ${name}`, { long: true })),
      },
      { id: 'mascot-needs', title: 'Reakce · typ projektu', fields: options('contact.reactions.needs', NEEDS, 'Po volbě').map((x) => ({ ...x, long: true })) },
      { id: 'mascot-niches', title: 'Reakce · obor', fields: options('contact.reactions.niches', NICHES, 'Po volbě').map((x) => ({ ...x, long: true })) },
      { id: 'mascot-starts', title: 'Reakce · výchozí stav', fields: options('contact.reactions.starts', STARTS, 'Po volbě').map((x) => ({ ...x, long: true })) },
      { id: 'mascot-styles', title: 'Reakce · styl', fields: options('contact.reactions.styles', STYLES, 'Po volbě').map((x) => ({ ...x, long: true })) },
      { id: 'mascot-budgets', title: 'Reakce · rozpočet', fields: options('contact.reactions.budgets', BUDGETS, 'Po volbě').map((x) => ({ ...x, long: true })) },
      { id: 'mascot-timelines', title: 'Reakce · termín', fields: options('contact.reactions.timelines', TIMELINES, 'Po volbě').map((x) => ({ ...x, long: true })) },
      { id: 'mascot-channels', title: 'Reakce · jak se ozvat', fields: options('contact.reactions.channels', CHANNELS, 'Po volbě').map((x) => ({ ...x, long: true })) },
      { id: 'mascot-done', title: 'Po odeslání', fields: [f('mascot.success', 'Replika po odeslání', { long: true })] },
    ],
  },
  {
    id: 'footer',
    title: 'Patička',
    groups: [
      {
        id: 'footer-main',
        title: 'Texty',
        fields: [f('footer.tagline', 'Slogan pod logem', { long: true }), f('footer.rights', 'Text za ©')],
      },
    ],
  },
  {
    id: 'seo',
    title: 'Google a sdílení',
    preview: 'serp',
    groups: [
      {
        id: 'seo-main',
        title: 'Výsledek vyhledávání a náhled odkazu',
        fields: [
          f('meta.home.title', 'Titulek stránky', { note: 'Ideálně do 60 znaků.' }),
          f('meta.home.description', 'Popis', { long: true, note: 'Ideálně 120–160 znaků.' }),
          f('meta.ogTitle', 'Titulek náhledu na sociálních sítích'),
        ],
      },
    ],
  },
];

export const EDIT_FIELDS: EditField[] = EDIT_SECTIONS.flatMap((s) => s.groups.flatMap((g) => g.fields));
export const EDITABLE_PATHS = new Set(EDIT_FIELDS.map((x) => x.path));

export function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined), obj);
}

/** Nastaví hodnotu na cestě (jen existující větve — neznámé cesty ignoruje). */
export function setPath(obj: Record<string, unknown>, path: string, value: string) {
  const keys = path.split('.');
  let node: unknown = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!node || typeof node !== 'object') return;
    node = (node as Record<string, unknown>)[keys[i]];
  }
  const last = keys[keys.length - 1];
  if (node && typeof node === 'object' && typeof (node as Record<string, unknown>)[last] === 'string') {
    (node as Record<string, unknown>)[last] = value;
  }
}

/** Uložené změny textů položené přes výchozí zprávy (hluboká kopie dotčených větví). */
export function applyTextOverrides<T extends Record<string, unknown>>(messages: T, overrides: Record<string, unknown> | null): T {
  if (!overrides) return messages;
  const out = structuredClone(messages);
  for (const [path, value] of Object.entries(overrides)) {
    if (EDITABLE_PATHS.has(path) && typeof value === 'string' && value.trim()) setPath(out, path, value);
  }
  return out;
}

/**
 * Texty mimo záložku Texty webu, které mají v administraci také obrazovou
 * nápovědu — Ceník (upravuje se na vlastní záložce, data jsou v databázi).
 */
const PLAN_IDS = ['web', 'seo', 'eshop', 'design', 'app'];
export const HINT_EXTRA_PATHS: string[] = [
  ...['title', 'titleAccent', 'lead', 'from', 'includes', 'extra', 'term', 'vat', 'customPrice', 'customCta', 'custom.name', 'custom.tagline'].map((k) => `pricing.${k}`),
  ...PLAN_IDS.flatMap((id) => [
    ...['name', 'price', 'tagline', 'extra', 'term', 'cta'].map((k) => `pricing.plans.${id}.${k}`),
    ...Array.from({ length: 12 }, (_, i) => `pricing.plans.${id}.features.${i}`),
  ]),
  ...Array.from({ length: 8 }, (_, i) => `pricing.custom.items.${i}`),
  ...Array.from({ length: 6 }, (_, i) => [`pricing.faq.${i}.q`, `pricing.faq.${i}.a`]).flat(),
];

/** Pořadí značek: nejdřív pole Textů webu, pak texty Ceníku. */
export const HINT_PATHS: string[] = [...EDIT_FIELDS.map((x) => x.path), ...HINT_EXTRA_PATHS];

/*
 * Značkování textů pro screenshoty nápověd v administraci (jen vývoj).
 * Každý text dostane neviditelnou značku s pořadím v HINT_PATHS:
 * na začátek U+2063, 10 bitů (U+200B = 0, U+200C = 1), U+2064; na konec U+2062.
 * Skript scripts/capture-admin-hints.mjs podle nich najde, kde text na webu je.
 */
export const MARK_START = '\u2063';
export const MARK_END = '\u2064';
export const MARK_CLOSE = '\u2062';

export function markIndex(index: number) {
  return MARK_START + index.toString(2).padStart(10, '0').replace(/0/g, '\u200B').replace(/1/g, '\u200C') + MARK_END;
}

export function annotateTexts<T extends Record<string, unknown>>(messages: T): T {
  const out = structuredClone(messages);
  HINT_PATHS.forEach((path, i) => {
    const value = getPath(out, path);
    if (typeof value === 'string') setPath(out, path, markIndex(i) + value + MARK_CLOSE);
  });
  return out;
}
