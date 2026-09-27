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

## Co přinesla 3. iterace

- **Logo** — přiložený PNG mockup (slitý na šachovnici) se vyklíčoval skriptem a je teď
  jediný zdroj loga na webu (viz níže).
- **Nová sekce „MacBook-přechod"** (`components/sections/MacbookIntro.tsx`) mezi Hero
  a Stolem služeb: notebook (plochý PNG mockup, ne 3D) se vynoří ze tmy a scroll ho
  přiblíží až obrazovka vyplní viewport — beze švu naváže na stůl služeb, kam pak
  se stagerem přiletí karty, kruh platformy zabliká a přijde maskot.
- **Hero zjednodušen** — už není připnutý (žádný scroll-jacking), 3D scéna jen klidně
  idluje (zavřený notebook, jemná rotace + náklon ke kurzoru), bez hraněného podstavce.
  Připraven `<HeroMedia mode="3d" | "video" />` pro budoucí video.
- **Sekce „Nevíte, kde začít?" odstraněna** celá (komponenta, texty, cue maskota).
- **Panely služeb přepsané** — každý je živá verze původní reklamní karty (vyříznutý
  maskot + rozmazané pozadí místnosti + zmenšený mockup), 4 různé přechody mezi
  panely (flip / stack / diagonální řez / složení doprostřed).
- **Reference přepsané** — „jedna obrazovka, tři projekty": fixní kompozice
  notebook+telefon vpravo, seznam projektů vlevo, screenshoty uvnitř zařízení
  se posouvají v čase (rychleji při hoveru).
- **Ceník** — přibyl řádek tří FAQ „pilulek" (rozbalí odpověď na místě), samostatná
  FAQ sekce zmizela; `FAQPage` JSON-LD zůstal (zdroj: `pricing.faq`).
- **Min. textu všude** — zkrácené nadpisy (≤ 3 řádky na 1440 px ve všech 4 jazycích),
  kratší repliky maskota, žádné odstavce v kartách/kejsech/ceníku.
- **Opraveny 2 reálné bugy** nalezené při testování (viz commit historie):
  vlastnost `entered` v závislostech vlastního efektu, která ho sama okamžitě
  rušila (proto se nikdy nespustila animace karet/nadpisu), a Framer Motion,
  který u panelů služeb nechával „viset" transform vlastnost vynechanou
  z `animate` objektu jiného typu přechodu (karta mohla po rychlém přeskoku
  zůstat pootočená). Obojí opraveno a ověřeno.

---

## Jazyky

Čeština (výchozí), angličtina, ruština, ukrajinština — na cestách `/cs`, `/en`, `/ru`, `/uk`.

- Veškeré texty jsou v `messages/{cs,en,ru,uk}.json` (identická struktura klíčů).
- Přepínač v navigaci se z pilulky rozbalí do panelu, po přepnutí se **zachová pozice skrolu**.
- `hreflang`, `x-default`, lokalizovaná metadata a sitemap pro všechny jazyky.
- Cyrilice se stahuje jen pro `ru`/`uk`, `cs`/`en` dostanou lehčí latinku.
- Nadpis hera má pro `ru`/`uk` samostatný (menší) `clamp()`, ať se vejde do 3 řádků
  i s delšími azbukovými slovy — viz `HEADING_SIZE` v `Hero.tsx`.

> **Překlady prosím nechte vyčíst rodilému mluvčímu.** Texty jsou zkrácené a připravené
> tak, aby seděly významem i délkou, ale marketingová čeština/angličtina/ruština/ukrajinština
> si zaslouží korekturu.

---

## Sekce a jejich firemní efekt

Žádný efekt se neopakuje ve dvou sousedních sekcích.

| Sekce | Efekt |
|---|---|
| Hero | Zavřený notebook klidně idluje (3D), text nikdy nezasahuje do scény |
| MacBook-přechod | Notebook (PNG) se přiblíží, obrazovka vyplní viewport, beze švu naváže na stůl služeb |
| Stůl služeb | Karty přiletí z různých stran se stagerem, kruh zabliká, maskot přijde po platformě |
| Detaily služeb | Kolota s jiným přechodem pro každou dvojici (flip/stack/diagonála/složení) |
| Weby, které žijí | Skrol stránky = skrol skutečného webu uvnitř notebooku + přepínač statický/animovaný |
| Proces | Světelná osa se prokresluje, maskot po ní sestupuje |
| Reference | Fixní kompozice zařízení, projekty se mění vlevo, screenshoty jedou v čase |
| Ceník | Karty vystupují zpoza horizontu, ceny se protáčí jako odometr, FAQ pilulky |
| Kontakt | Vícekrokový formulář, maskot reaguje na kroky |

---

## Podklady z cizích webů a maskota

`scripts/capture-sites.mjs` (Playwright + nainstalovaný Chrome, žádné stahování prohlížečů):

```bash
node scripts/capture-sites.mjs            # vše
node scripts/capture-sites.mjs euromotors # jeden cíl
```

Pro každý web vytvoří full-page screenshot (výstup: `public/demo/`, `public/cases/{slug}/`).
Rozměry stránek se ukládají do `content/capture-manifest.json`.

`scripts/extract-cards.py` (rembg, `.venv-tools`) z původních reklamních karet
(`reference/kreativa/card-*.png`) vyřízne pro každou službu maskota v její póze
(alpha matting, feather) a silně rozmazané/ztmavené pozadí místnosti —
výstup `public/services/{slug}/{mascot,bg}.webp`. Trademarkované ikony
(App Store / Google Play, značky na displejích) se **neextrahují** — nahrazují
je vlastní neutrální prvky.

`scripts/prepare-macbook.py` (Pillow, `.venv-tools`) z přiloženého MacBook mockupu
(byl slitý na šachovnicové pozadí bez alfa kanálu) vyklíčuje obrazovku i okolní
bílé pozadí (feather okraj), 2× zvětší Lanczosem pro retinu a zapíše přesné
souřadnice výřezu obrazovky do `lib/devices.ts`. Výstup `public/assets/
macbook-frame-cut.png` (+ `.webp` pro použití na webu) používá **jeden sdílený**
`<MacbookFrame>` (`components/mockups/MacbookFrame.tsx`) na všech místech webu,
která ukazují notebook — obsah se pozicuje přesně do výřezu podle `lib/devices.ts`.

`scripts/split-cafe.py` — zůstal z 2. iterace, teď nepoužitý (sekce s kavárnou
je pryč), ponechán pro referenci.

---

## Logo

`public/brand/logo-elevate.png` + komponenta `components/ui/Logo.tsx`.

Logo se **nepřekresluje ani nedeformuje** — zadává se jen výška, šířka dopočítá
poměr stran. Animuje se pouze obálka a samostatná vrstva se září nad šipkou.

> Dodaný mockup přišel slitý na šachovnicové pozadí bez alfa kanálu. Bílá typografie
> je ale jasnější než obě políčka šachovnice (v histogramu je mezi nimi mezera), takže
> šlo pozadí čistě vyklíčovat a modrou šipku odmíchat i s gradientem přes celý obrázek
> (ne jen přes výřez obrazovky). **Pokud máte originální SVG, stačí vyměnit import
> v `Logo.tsx`** — zbytek webu se nemění. Favicony (`app/icon.png`, `app/apple-icon.png`)
> jsou vyříznuté z téhož loga.

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
- FAQ pilulky v ceníku (`pricing.faq`) a FAQ u jednotlivých služeb obsahují termíny,
  které si upravte podle své praxe.

### Čísla v mockupech

Hodnoty v SEO reportu a v mockupu aplikace jsou označené jako
**„Ilustrativní ukázka"**. Nevydávejte je za výsledky konkrétního klienta.

---

## Maskot

`<Mascot pose="point" />` funguje stejně pro 2D i 3D:

- **Teď:** 2D sprity z `/public/assets/`, póza se dohrává pohybem (houpání, náklon ke kurzoru, poskok).
  V panelech služeb navíc vyříznuté PNG v konkrétní póze té karty (`public/services/{slug}/mascot.webp`).
- **Až bude model:** vložte zariggovaný `mascot.glb` (klipy `Idle`, `Walk`, `Wave`, `Point`,
  `Think`, `ThumbsUp`, `Celebrate`) do `public/models/` a v `content/site.ts` přepněte `mascot3d: true`.
- Další PNG pózy stačí zapsat do `poseSprite` v `content/mascot.ts`.

Průvodce v rohu řídí `content/mascot.ts` (sekce → póza) + texty z `messages` (`mascot.cues.*`).
Ve velkých scénách se schovává, protože tam maskot vystupuje přímo.

---

## Výkon a přístupnost

- 3D scéna se připojuje až v `requestIdleCallback`; pod 1024 px, bez WebGL, na dotykových
  zařízeních a při `prefers-reduced-motion` se nespustí vůbec.
- Stůl karet i panely služeb nemají sdílený `preserve-3d` kontext mezi kartami — animuje se
  jen `transform`/`opacity`/`clip-path`, `will-change` jen po dobu přeskupení.
- Atmosféra stolu (platforma, světelné sloupy) je sdílená komponenta `<PlatformScene>`
  (jedno SVG, dvě CSS animace) — používá ji beze švu i miniatura v MacBook-přechodu.
- Videa a screenshoty referencí mají `loading="eager"`/`preload="none"` podle toho,
  jestli jsou hned viditelná, nebo se teprve blíží.
- `prefers-reduced-motion` vypne Lenis, 3D, vlastní kurzor, preloader, připínání sekcí;
  MacBook-přechod, kolota panelů i vodorovná kompozice referencí se změní na jednoduchý
  svislý sled/fade. Ověřeno, bez chyb v konzoli.
- Accessibility: role, popisky, `aria-labelledby` cílí na skutečné `id` (opraveno u všech
  sekcí), kontrast, pořadí nadpisů, ovládání z klávesnice.

**Lighthouse ani CPU-throttling scroll test nebyly ve 3. iteraci přeměřeny** (poslední
změřená čísla z 2. iterace jsou v git historii) — doporučuji přeměřit po nasazení,
především kvůli nové MacBook-přechodové sekci a pěti panelům služeb.

---

## Struktura

```
app/[locale]/     stránky (home, služby, ochrana osobních údajů, 404, OG obrázek)
app/api/contact   odeslání poptávky (Resend, honeypot, rate limit)
i18n/             routing, navigace a načítání překladů
messages/         VEŠKERÉ texty, 4 jazyky
components/
  sections/       sekce stránky (+ PlatformScene, ServiceScene — sdílené scény)
  three/          3D idle scéna notebooku pro Hero (+ připravený 3D maskot)
  mockups/        MacbookFrame (sdílený mockup), animované ukázky, rám telefonu
  mascot/         Mascot, SpeechBubble, MascotGuide
  ui/             Button, Logo, LocaleSwitcher, Odometer, Cursor, Preloader…
content/          struktura dat, která se nepřekládá (ikony, slugy, ceny, kejsy, scéna panelu)
lib/              GSAP, Lenis, detekce zařízení, schéma formuláře, devices.ts (souřadnice mockupu)
scripts/          capture-sites.mjs, extract-cards.py, prepare-macbook.py, split-cafe.py
public/brand      logo a favicony
public/assets     obrázky webu + MacBook mockup
public/services   vyříznutí maskoti a pozadí pro panely služeb
public/demo       záznam ukázkového webu pro sekci „Weby, které žijí"
public/cases      záznamy tří referencí
reference/        původní podklady od zadavatele (nenasazuje se)
```

## Deploy

Vercel: naimportovat repozitář, doplnit env proměnné, nasadit.
`npm run build` musí projít bez chyb — je to zároveň typecheck i lint.
