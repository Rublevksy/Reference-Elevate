/**
 * Které texty webu (česká verze) jdou měnit v administraci. Cesta míří do
 * messages/cs.json („hero.tagline.0" = první řádek pole tagline). Uložené
 * změny se při sestavení stránky položí přes texty ze souboru — co se
 * nezměnilo, bere se dál ze souboru.
 *
 * Záměrně tu NENÍ: nadpis a záložky sekce Služby (jejich screenshot je
 * zapečený ve filmu na displeji notebooku), navigace a služební texty.
 */
export type EditField = { path: string; label: string; long?: boolean; hint?: string };
export type EditGroup = { id: string; title: string; subtitle?: string; fields: EditField[] };

const SERVICE_SLUGS = [
  ['weby', '01 Weby'],
  ['seo', '02 SEO'],
  ['e-shopy', '03 E-shopy'],
  ['design', '04 Design'],
  ['aplikace', '05 Aplikace'],
] as const;

const servicePanel = ([slug, label]: (typeof SERVICE_SLUGS)[number]): EditGroup => ({
  id: `panel-${slug}`,
  title: `Panel ${label}`,
  subtitle: 'Velký panel služby pod stolem s kartami (a karta služby na stole).',
  fields: [
    { path: `services.items.${slug}.card`, label: 'Název na kartě', hint: 'Líc karty na stole služeb' },
    { path: `services.items.${slug}.headline.0`, label: 'Nadpis — začátek', hint: 'Nadpis se skládá ze tří částí; prostřední je modře' },
    { path: `services.items.${slug}.headline.1`, label: 'Nadpis — modrá část' },
    { path: `services.items.${slug}.headline.2`, label: 'Nadpis — konec' },
    { path: `services.items.${slug}.features.0.title`, label: 'Výhoda 1 — tučně' },
    { path: `services.items.${slug}.features.0.sub`, label: 'Výhoda 1 — pod tím' },
    { path: `services.items.${slug}.features.1.title`, label: 'Výhoda 2 — tučně' },
    { path: `services.items.${slug}.features.1.sub`, label: 'Výhoda 2 — pod tím' },
    { path: `services.items.${slug}.features.2.title`, label: 'Výhoda 3 — tučně' },
    { path: `services.items.${slug}.features.2.sub`, label: 'Výhoda 3 — pod tím' },
    { path: `services.items.${slug}.cta`, label: 'Text tlačítka' },
  ],
});

export const EDIT_GROUPS: EditGroup[] = [
  {
    id: 'hero',
    title: 'Úvodní obrazovka',
    subtitle: 'Text vpravo vedle neonové šipky (na mobilu dole).',
    fields: [
      { path: 'hero.eyebrow', label: 'Nadpis nad titulkem' },
      { path: 'hero.tagline.0', label: 'Titulek — 1. řádek' },
      { path: 'hero.tagline.1', label: 'Titulek — 2. řádek' },
      { path: 'hero.taglineAccent', label: 'Titulek — modré zakončení' },
      { path: 'hero.subtitle', label: 'Podtitulek' },
      { path: 'hero.ctaBook', label: 'Hlavní tlačítko' },
      { path: 'hero.ctaBookNote', label: 'Drobný text v tlačítku' },
      { path: 'hero.ctaWork', label: 'Odkaz na práce' },
      { path: 'hero.scrollHint', label: 'Pozvánka ke skrolování' },
    ],
  },
  {
    id: 'why',
    title: 'Weby, které žijí',
    subtitle: 'Sekce s notebookem a přepínačem statický / animovaný.',
    fields: [
      { path: 'whyAnimated.title', label: 'Nadpis — bílá část' },
      { path: 'whyAnimated.titleAccent', label: 'Nadpis — modrá část' },
      { path: 'whyAnimated.lead', label: 'Úvodní věta' },
      { path: 'whyAnimated.static', label: 'Přepínač — vlevo' },
      { path: 'whyAnimated.animated', label: 'Přepínač — vpravo' },
      { path: 'whyAnimated.hint', label: 'Nápověda pod notebookem' },
      { path: 'whyAnimated.pills.0', label: 'Štítek 1' },
      { path: 'whyAnimated.pills.1', label: 'Štítek 2' },
      { path: 'whyAnimated.pills.2', label: 'Štítek 3' },
      { path: 'whyAnimated.footnote', label: 'Poznámka pod štítky' },
    ],
  },
  {
    id: 'process',
    title: 'Proces',
    subtitle: 'Pět kroků spolupráce.',
    fields: [
      { path: 'process.eyebrow', label: 'Nadpis nad titulkem' },
      { path: 'process.title', label: 'Nadpis — bílá část' },
      { path: 'process.titleAccent', label: 'Nadpis — modrá část' },
      { path: 'process.lead', label: 'Úvodní věta' },
      ...[0, 1, 2, 3, 4].flatMap((i) => [
        { path: `process.steps.${i}.title`, label: `Krok ${i + 1} — název` },
        { path: `process.steps.${i}.text`, label: `Krok ${i + 1} — text` },
      ]),
    ],
  },
  {
    id: 'cases',
    title: 'Práce',
    subtitle: 'Nadpis sekce s projekty (projekty samotné jsou na záložce Projekty).',
    fields: [
      { path: 'cases.title', label: 'Nadpis — bílá část' },
      { path: 'cases.titleAccent', label: 'Nadpis — modrá část' },
      { path: 'cases.visit', label: 'Tlačítko „navštívit web"' },
    ],
  },
  ...SERVICE_SLUGS.map(servicePanel),
  {
    id: 'contact',
    title: 'Kontakt a formulář',
    fields: [
      { path: 'contact.eyebrow', label: 'Nadpis nad titulkem' },
      { path: 'contact.title', label: 'Nadpis — bílá část' },
      { path: 'contact.titleAccent', label: 'Nadpis — modrá část' },
      { path: 'contact.steps.0', label: 'Krok 1 — otázka' },
      { path: 'contact.steps.1', label: 'Krok 2 — otázka' },
      { path: 'contact.steps.2', label: 'Krok 3 — otázka' },
      ...['Web', 'E-shop', 'SEO', 'Design', 'Aplikace', 'Nevím'].map((v, i) => ({ path: `contact.needs.${i}`, label: `Volba „${v}"`, hint: i === 0 ? 'Pořadí musí odpovídat službám (tlačítka v Ceníku je předvybírají)' : undefined })),
      ...[0, 1, 2, 3, 4].map((i) => ({ path: `contact.budgets.${i}`, label: `Rozpočet — volba ${i + 1}` })),
      ...[0, 1, 2].map((i) => ({ path: `contact.timelines.${i}`, label: `Termín — volba ${i + 1}` })),
      { path: 'contact.budgetLabel', label: 'Popisek „rozpočet"' },
      { path: 'contact.timelineLabel', label: 'Popisek „termín"' },
      { path: 'contact.siteLabel', label: 'Popisek „máte web?"' },
      { path: 'contact.nameLabel', label: 'Popisek „jméno"' },
      { path: 'contact.emailLabel', label: 'Popisek „e-mail"' },
      { path: 'contact.messageLabel', label: 'Popisek „zpráva"' },
      { path: 'contact.messagePlaceholder', label: 'Nápověda v poli zpráva' },
      { path: 'contact.consent', label: 'Souhlas se zpracováním údajů', long: true },
      { path: 'contact.submit', label: 'Tlačítko odeslání' },
      { path: 'contact.successTitle', label: 'Po odeslání — nadpis' },
      { path: 'contact.successText', label: 'Po odeslání — text' },
    ],
  },
  {
    id: 'mascot',
    title: 'Maskot',
    subtitle: 'Bubliny maskota u kontaktního formuláře.',
    fields: [
      { path: 'contact.hints.0', label: 'Krok 1', long: true },
      { path: 'contact.hints.1', label: 'Krok 2', long: true },
      { path: 'contact.hints.2', label: 'Krok 3', long: true },
      { path: 'mascot.success', label: 'Po odeslání formuláře', long: true },
    ],
  },
  {
    id: 'footer',
    title: 'Patička',
    subtitle: 'Město, sociální sítě a firemní údaje jsou na záložce Kontakt a firma.',
    fields: [
      { path: 'footer.tagline', label: 'Slogan pod logem', long: true },
      { path: 'footer.rights', label: 'Text za ©' },
    ],
  },
  {
    id: 'seo',
    title: 'SEO a sdílení',
    subtitle: 'Titulek a popis ve výsledcích Google a náhledu odkazu na sítích.',
    fields: [
      { path: 'meta.home.title', label: 'Titulek stránky', hint: 'Ideálně do 60 znaků' },
      { path: 'meta.home.description', label: 'Popis', long: true, hint: 'Ideálně 120–160 znaků' },
      { path: 'meta.ogTitle', label: 'Titulek náhledu na sociálních sítích' },
    ],
  },
];

export const EDITABLE_PATHS = new Set(EDIT_GROUPS.flatMap((g) => g.fields.map((f) => f.path)));

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
