-- ELEVATE — obsah webu v Supabase (1. etapa: Práce, Ceník, kontaktní e-mail)
-- Spustit jednou v Supabase → SQL Editor → Run. Skript lze bezpečně pustit znovu.

create extension if not exists pgcrypto;

-- Projekty v sekci „Práce"
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  kind text not null default '',
  url text not null default '',
  accent text not null default '#1f5bff',
  tags text[] not null default '{}',
  desktop_image text not null,
  desktop_width int not null,
  desktop_height int not null,
  mobile_image text not null,
  mobile_width int not null,
  mobile_height int not null,
  sort int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bloky obsahu (JSON): texty Ceníku, nastavení webu
create table if not exists public.content_blocks (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects for each row execute function public.touch_updated_at();
drop trigger if exists blocks_touch on public.content_blocks;
create trigger blocks_touch before update on public.content_blocks for each row execute function public.touch_updated_at();

-- Čtení veřejné (web); zápis jen ze serveru přes service role — administrátora
-- ověřuje aplikace (přihlášení přes Supabase Auth + seznam ADMIN_EMAILS).
alter table public.projects enable row level security;
alter table public.content_blocks enable row level security;
drop policy if exists "projects are public" on public.projects;
create policy "projects are public" on public.projects for select using (published);
drop policy if exists "blocks are public" on public.content_blocks;
create policy "blocks are public" on public.content_blocks for select using (key in ('pricing_cs', 'settings'));

-- Úložiště obrázků (screenshoty projektů): veřejné čtení, nahrávání přes
-- podepsané URL, které vydá server až po ověření administrátora.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 15728640, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Výchozí obsah (to, co je teď na webu)
insert into public.projects (slug, name, kind, url, accent, tags, desktop_image, desktop_width, desktop_height, mobile_image, mobile_width, mobile_height, sort, published) values
  ('euromotors', 'EURO-MOTORS', 'Autoservis, Praha 10', 'https://www.euromotors.cz/', '#b3222f', array['Web od nuly','Návrh','Vývoj']::text[], '/cases/euromotors/desktop.jpg', 1152, 4892, '/cases/euromotors/mobile.jpg', 585, 15276, 0, true),
  ('inhome', 'InHome Praha', 'Úklidová firma, celá ČR', 'https://inhomepraha.cz/', '#1470c8', array['Web od nuly','Návrh','Vývoj']::text[], '/cases/inhome/desktop.jpg', 1152, 2426, '/cases/inhome/mobile.jpg', 585, 6485, 10, true),
  ('biodent', 'BioDent', 'Stomatologická klinika, Praha 2', 'https://biodentclinic.cz/', '#0e6f8a', array['Web od nuly','Návrh','Vývoj']::text[], '/cases/biodent/desktop.jpg', 1152, 9199, '/cases/biodent/mobile.jpg', 585, 26027, 20, true)
on conflict (slug) do nothing;

insert into public.content_blocks (key, data) values
  ('pricing_cs', '{"eyebrow": "Ceník", "title": "Co dostanete", "titleAccent": "a za kolik", "lead": "U každé služby vidíte, co přesně je v ceně a co se platí zvlášť. Konečnou částku potvrdíme po krátkém nezávazném hovoru.", "from": "od", "includes": "V ceně", "extra": "Zvlášť", "term": "Termín", "vat": "Ceny jsou uvedeny bez DPH.", "plans": {"web": {"name": "Weby", "price": "5 000 Kč", "tagline": "Web na jedné stránce pro živnostníka, řemeslníka nebo novou službu.", "features": ["Jedna stránka se 4–6 sekcemi: úvod, služby, o vás, reference, kontakt", "Grafika v barvách vašeho loga, pohodlná na mobilu i počítači", "Kontaktní formulář, který chodí rovnou do vašeho e-mailu", "Telefon na jedno kliknutí, mapa a odkazy na sociální sítě", "Základní SEO: titulky, popisky a náhled pro sdílení odkazu", "Spuštění na vaší doméně včetně HTTPS", "Jedno kolo úprav po předání"], "extra": "Texty a fotky dodáváte vy. Doménu a hosting platíte zvlášť — pomůžeme vybrat.", "term": "do 7 pracovních dní", "cta": "Chci web"}, "seo": {"name": "SEO", "price": "2 500 Kč", "tagline": "Jednorázová kontrola a oprava základů u webu, který už máte.", "features": ["Kontrola webu: co Google vidí, rychlost a chyby na mobilu", "Propojení s Google Search Console a Google Analytics", "Nové titulky a popisky až pro 10 stránek", "Oprava nadpisů a popisků obrázků na hlavních stránkách", "Mapa webu (sitemap.xml) a nastavení robots.txt", "Kontrola firemního profilu na Google Mapách", "Zpráva: co jsme opravili a co má smysl dělat dál"], "extra": "Pravidelnou měsíční péči, psaní článků a získávání odkazů řešíme zvlášť.", "term": "3–5 pracovních dní", "cta": "Chci SEO kontrolu"}, "eshop": {"name": "E-shopy", "price": "15 000 Kč", "tagline": "Menší e-shop na hotové platformě (Shoptet, WooCommerce nebo Shopify), připravený prodávat.", "features": ["Nastavení platformy a šablony podle vaší značky", "Až 30 produktů s fotkami, variantami a kategoriemi", "Platby kartou přes bránu (Comgate, GoPay nebo Stripe), převodem i na dobírku", "Doprava: Zásilkovna, PPL nebo Česká pošta, cena se počítá v košíku", "Automatické e-maily k objednávce a faktury", "Vložení obchodních podmínek, reklamačního řádu a GDPR", "Hodina zaškolení: přidání produktu a vyřízení objednávky"], "extra": "Měsíční poplatek platformě a poplatky za platby platíte napřímo. Právní texty dodáváte vy.", "term": "2–3 týdny", "cta": "Chci e-shop"}, "design": {"name": "Logo a design", "price": "2 000 Kč", "tagline": "Logo pro nový podnik nebo osvěžení toho stávajícího.", "features": ["2 různé návrhy loga na výběr", "2 kola úprav vybraného návrhu", "Barevná, černobílá a světlá verze na tmavý podklad", "Soubory pro web i tisk: SVG, PDF a PNG s průhledným pozadím", "Čtvercová verze na profilovku a ikonu webu", "Přehled barev (HEX, RGB, CMYK) a písma na jedné stránce"], "extra": "Vizitky, grafiku pro sociální sítě nebo celý vizuální styl naceníme zvlášť.", "term": "5–7 pracovních dní", "cta": "Chci logo"}, "app": {"name": "Aplikace", "price": "12 500 Kč", "tagline": "Jednoduchá webová aplikace, kterou si lidé uloží do telefonu jako ikonu.", "features": ["Až 4 obrazovky — třeba rezervace, katalog, formulář nebo kalkulačka", "Funguje na iPhonu, Androidu i v počítači", "Instalace na plochu telefonu bez App Store a Google Play (PWA)", "Ukládání dat do jednoduché databáze nebo Google Tabulek", "Upozornění e-mailem vám i zákazníkovi", "Nasazení na vaši doménu", "Jedno kolo úprav a 30 dní opravy chyb po spuštění"], "extra": "Aplikaci do obchodů App Store a Google Play, přihlašování nebo platby naceníme podle rozsahu.", "term": "2–3 týdny", "cta": "Chci aplikaci"}}, "custom": {"name": "Větší projekt?", "tagline": "Víc stránek, víc jazyků nebo napojení na vaše systémy — cenu spočítáme podle zadání.", "items": ["Vícestránkové weby", "Vícejazyčné verze", "Napojení na sklad a účetnictví", "Pravidelná SEO péče"]}, "customPrice": "Podle zadání", "customCta": "Domluvit cenu", "faq": [{"q": "Kolik to trvá?", "a": "Web obvykle do týdne, e-shop a aplikace 2–3 týdny od dodání podkladů."}, {"q": "Zpomalí animace web?", "a": "Ne — rychlost měříme u všeho, co spouštíme."}, {"q": "Co když už web mám?", "a": "Začněte SEO kontrolou — ukáže, co opravit jako první."}]}'::jsonb),
  ('settings', '{"contact_email": "elevateitcz@gmail.com"}'::jsonb)
on conflict (key) do nothing;
