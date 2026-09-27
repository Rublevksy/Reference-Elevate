# ELEVATE — web digitálního studia

Animovaný vícejazyčný web pro pražské studio **ELEVATE**.
Next.js 15 (App Router) · TypeScript · Tailwind · next-intl · GSAP + Lenis · Framer Motion · React Three Fiber.

```bash
npm install
cp .env.example .env.local   # a vyplnit (viz níže)
npm run dev                  # http://localhost:3000 → přesměruje na /cs
npm run build && npm start   # produkční build
```

---

## Jazyky

Čeština (výchozí), angličtina, ruština, ukrajinština — na cestách `/cs`, `/en`, `/ru`, `/uk`.

- Veškeré texty jsou v `messages/{cs,en,ru,uk}.json` (274 klíčů v každém, struktura je identická).
- Přepínač v navigaci se z pilulky rozbalí do panelu, po přepnutí se **zachová pozice skrolu**.
- `hreflang`, `x-default`, lokalizovaná metadata a sitemap pro všechny jazyky.
- Cyrilice se stahuje jen pro `ru`/`uk`, `cs`/`en` dostanou lehčí latinku.

> **Překlady prosím nechte vyčíst rodilému mluvčímu.** Texty jsou připravené tak, aby seděly
> významem i délkou, ale marketingová čeština/angličtina/ruština/ukrajinština si zaslouží korekturu.

---

## Sekce a jejich firmní efekt

Žádný efekt se neopakuje ve dvou sousedních sekcích — to byl hlavní cíl druhé iterace.

| Sekce | Efekt |
|---|---|
| Hero | 3D notebook se otáčí, otevírá víko, na displeji běží mini-web, kamera nalétne dovnitř |
| Nevíte, kde začít? | Vrstvená scéna s hloubkou, rukopisné otázky se škrtají a mění v odpovědi, scéna přejde z teplé do modré |
| Stůl služeb | Karty ve vějíři, maskot chodí podél stolu, klik otočí kartu |
| Detaily služeb | Kolota karet: aktivní odjíždí dozadu, další vyjíždí; každá služba má vlastní scénář mockupu |
| Weby, které žijí | Skrol stránky = skrol skutečného webu uvnitř notebooku + přepínač statický/animovaný |
| Proces | Světelná osa se prokresluje, maskot po ní sestupuje |
| Reference | Vodorovný připnutý skrol, zařízení s parallaxem, pozadí se přebarvuje podle projektu |
| Ceník | Karty vystupují zpoza horizontu, ceny se protáčí jako odometr, po rámečku běží paprsek |
| FAQ | Akordeon, „+" se otočí na „×" |
| Kontakt | Vícekrokový formulář, maskot reaguje na kroky |

---

## Podklady z cizích webů

`scripts/capture-sites.mjs` (Playwright + nainstalovaný Chrome, žádné stahování prohlížečů):

```bash
node scripts/capture-sites.mjs            # vše
node scripts/capture-sites.mjs euromotors # jeden cíl
```

Pro každý web vytvoří full-page screenshot a video plynulého proskrolování
(každý snímek klíčový, aby šlo scrubovat přes `video.currentTime`).
Výstupy: `public/demo/` a `public/cases/{slug}/`. Rozměry stránek se ukládají
do `content/capture-manifest.json` a web z nich počítá posun screenshotu v zařízení.

`scripts/split-cafe.py` rozloží fotku maskota v kavárně na pozadí a vyříznutou postavu
(rembg, izolovaně ve `.venv-tools`) — výstup `public/assets/cafe-bg.webp`
a `mascot-cafe-cutout.png`.

---

## Logo

`public/brand/logo-elevate.png` + komponenta `components/ui/Logo.tsx`.

Logo se **nepřekresluje ani nedeformuje** — zadává se jen výška, šířka dopočítá poměr stran.
Animuje se pouze obálka a samostatná vrstva se září nad šipkou.

> Dodaný soubor přišel slitý na šachovnicové pozadí bez alfa kanálu. Bílá typografie je ale
> jasnější než obě políčka šachovnice, takže šlo pozadí čistě vyklíčovat (histogram má mezi
> pozadím a logem mezeru) a modrou šipku odmíchat i s gradientem. **Pokud máte originální SVG,
> stačí vyměnit import v `Logo.tsx`** — zbytek webu se nemění. Favicony (`app/icon.png`,
> `app/apple-icon.png`) jsou vyříznuté z téhož loga.

---

## Co je potřeba doplnit

### Proměnné prostředí (`.env.local`)

| Proměnná | K čemu |
|---|---|
| `RESEND_API_KEY` | Odesílání poptávek. **Bez klíče se poptávka jen zaloguje** a formulář hlásí úspěch. |
| `CONTACT_EMAIL` | Kam poptávky chodí |
| `CONTACT_FROM_EMAIL` | Odesílatel — doména ověřená v Resendu |
| `NEXT_PUBLIC_SITE_URL` | Metadata, OG, `sitemap.xml`, `hreflang` |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Nepovinné. Prázdné = analytika vypnutá a **není potřeba cookie lišta**. |

### Placeholdery

- **`content/pricing.ts` + `messages/*.json` → `pricing.plans.*.price`** — ceny jsou zástupné
  (45 000 / 95 000 / 180 000 Kč, v EN v eurech). Seznamy funkcí u balíčků jsou návrh k úpravě.
- `pricing.vat` — „Ceny jsou uvedeny bez DPH." potvrďte nebo změňte.
- `content/site.ts` — e-mail, telefon, adresa, IČO, právní název, odkazy na sociální sítě.
- `privacy.updated` (datum) a identifikace firmy na stránce ochrany osobních údajů —
  text je vzor, **nechte ho zkontrolovat právníkem**.
- FAQ a FAQ u služeb obsahují termíny a počty revizí, které si upravte podle své praxe.

### Čísla v mockupech

Hodnoty v SEO reportu a v mockupu aplikace jsou označené jako
**„Ilustrativní ukázka"**. Nevydávejte je za výsledky konkrétního klienta.

---

## Maskot

`<Mascot pose="point" />` funguje stejně pro 2D i 3D:

- **Teď:** 2D sprity z `/public/assets/`, póza se dohrává pohybem (houpání, náklon ke kurzoru, poskok).
- **Až bude model:** vložte zariggovaný `mascot.glb` (klipy `Idle`, `Walk`, `Wave`, `Point`,
  `Think`, `ThumbsUp`, `Celebrate`) do `public/models/` a v `content/site.ts` přepněte `mascot3d: true`.
- Další PNG pózy stačí zapsat do `poseSprite` v `content/mascot.ts`.

Průvodce v rohu řídí `content/mascot.ts` (sekce → póza) + texty z `messages` (`mascot.cues.*`).
Ve velkých scénách se schovává, protože tam maskot vystupuje přímo.

---

## Naměřené hodnoty

Produkční build, lokálně, headless Chrome se **softwarovým rendererem** (GPU práce padá na CPU):

| | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| Desktop | **97** | **100** | **100** | 92\* |
| Mobil | **86** | **100** | **100** | 92\* |

LCP 1,1 s (desktop) / 3,9 s (mobil, simulovaná pomalá 4G), TBT 0–10 ms, CLS 0,002–0,032.

\* Jediný neúspěšný audit je `canonical` — Lighthouse testuje `http://localhost`, zatímco
kanonická URL míří na produkční doménu. Po nasazení bude v pořádku.

**Skrol s 4× zpomaleným CPU** (sekce stůl služeb → ceník): **0 dlouhých úloh nad 50 ms**,
medián 60 fps. Ověřeno skriptem přes CDP.

Vodorovný skrol stránky: **žádný** na 1440 / 1280 / 1024 / 768 / 390 px.

---

## Výkon a přístupnost

- 3D scéna se připojuje až v `requestIdleCallback`; pod 1024 px, bez WebGL, na dotykových
  zařízeních a při `prefers-reduced-motion` se nespustí vůbec.
- Stůl karet nemá sdílený `preserve-3d` kontext — karty se nemůžou protnout, pořadí řídí
  `z-index`. Animuje se jen `transform` a `opacity`, `will-change` jen po dobu přeskupení.
- Atmosféra stolu (platforma, světelné sloupy) je **jedno SVG se dvěma CSS animacemi**,
  které se zastaví, jakmile sekce opustí obrazovku.
- Videa mají `preload="none"`, stahují se až když se sekce blíží.
- `prefers-reduced-motion` vypne Lenis, 3D, vlastní kurzor, preloader, připínání sekcí;
  kolota karet i vodorovný skrol se změní na obyčejný svislý seznam. Ověřeno, bez chyb v konzoli.
- Accessibility 100/100: role, popisky, kontrast, pořadí nadpisů, ovládání z klávesnice.

---

## Struktura

```
app/[locale]/     stránky (home, služby, ochrana osobních údajů, 404, OG obrázek)
app/api/contact   odeslání poptávky (Resend, honeypot, rate limit)
i18n/             routing, navigace a načítání překladů
messages/         VEŠKERÉ texty, 4 jazyky
components/
  sections/       sekce stránky
  three/          3D scéna notebooku (+ připravený 3D maskot)
  mockups/        animované ukázky + rám notebooku a telefonu
  mascot/         Mascot, SpeechBubble, MascotGuide
  ui/             Button, Logo, LocaleSwitcher, Odometer, Cursor, Preloader…
content/          struktura dat, která se nepřekládá (ikony, slugy, ceny, kejsy)
lib/              GSAP, Lenis, detekce zařízení, schéma formuláře
scripts/          capture-sites.mjs (Playwright), split-cafe.py (rembg)
public/brand      logo a favicony
public/assets     obrázky webu
public/demo       záznam ukázkového webu pro sekci „Weby, které žijí"
public/cases      záznamy tří referencí
reference/        původní podklady od zadavatele (nenasazuje se)
```

## Deploy

Vercel: naimportovat repozitář, doplnit env proměnné, nasadit.
`npm run build` musí projít bez chyb — je to zároveň typecheck i lint.
