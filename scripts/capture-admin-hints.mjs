#!/usr/bin/env node
/**
 * Screenshoty pro vizuální nápovědy v administraci (záložka Texty webu).
 *
 * Projde web (česky, 1440 × 900) a u každého upravitelného textu zjistí,
 * na kterém snímku a kde přesně je. Texty najde podle neviditelných značek,
 * které dev server vloží, když dostane cookie `elevate-annotate=1`
 * (lib/content/editable.ts → annotateTexts, i18n/request.ts).
 *
 * Výstup:
 *   public/admin-hints/*.webp          — snímky (zmenšené na 75 %)
 *   lib/content/editable-hints.json    — pole → snímek + obdélník
 *
 * Spuštění (běžící `npm run dev` na :3000; Chrome se spustí sám, nebo se
 * použije běžící s --remote-debugging-port=9222):
 *   node scripts/capture-admin-hints.mjs
 *
 * Po větší změně vzhledu webu stačí skript pustit znovu.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EDIT_FIELDS, HINT_PATHS } from '../lib/content/editable.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public/admin-hints');
const OUT_JSON = path.join(ROOT, 'lib/content/editable-hints.json');
const SITE = process.env.SITE_URL ?? 'http://localhost:3000';
const W = 1440;
const H = 900;
const SCALE = 0.75;

const cs = JSON.parse(await fs.readFile(path.join(ROOT, 'messages/cs.json'), 'utf8'));
const get = (p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), cs);
const LENGTHS = HINT_PATHS.map((p) => String(get(p) ?? '').length);

/* ---------------------------- Chrome (CDP) ---------------------------- */

async function cdpEndpoint() {
  try {
    return await (await fetch('http://127.0.0.1:9222/json/version')).json();
  } catch {
    const bin = process.env.CHROME_BIN ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'elevate-hints-'));
    spawn(bin, ['--headless=new', '--remote-debugging-port=9222', `--user-data-dir=${profile}`, '--hide-scrollbars', '--no-first-run'], { stdio: 'ignore', detached: true }).unref();
    for (let i = 0; i < 50; i++) {
      await sleep(200);
      try {
        return await (await fetch('http://127.0.0.1:9222/json/version')).json();
      } catch {
        /* ještě startuje */
      }
    }
    throw new Error('Chrome se nepodařilo spustit (nastavte CHROME_BIN).');
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await cdpEndpoint();
const target = await (await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m.result ?? { error: m.error });
    pending.delete(m.id);
  }
});
await new Promise((r) => ws.addEventListener('open', r));
const send = (method, params = {}) =>
  new Promise((r) => {
    const i = ++seq;
    pending.set(i, r);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const ev = async (expression) => {
  const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description ?? 'eval error');
  return res.result?.value;
};

await send('Page.enable');
await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await send('Network.setCookie', { name: 'elevate-annotate', value: '1', url: SITE });
await send('Page.navigate', { url: `${SITE}/cs` });
await sleep(10000);
await ev(`(() => {
  const st = document.createElement('style');
  st.textContent = 'html{scrollbar-width:none}::-webkit-scrollbar{display:none}*{caret-color:transparent!important}';
  document.head.appendChild(st);
  window.__LENGTHS = ${JSON.stringify(LENGTHS)};
})()`);

/* --------------------- hledání značek na stránce --------------------- */

// Vrátí [{ i, box: [x, y, w, h] }] pro viditelné texty v okně (případně v `clip`).
const DECODE = `((clip) => {
  const START = '\\u2063';
  const re = /\\u2063([\\u200B\\u200C]{10})\\u2064/g;
  const idx = (bits) => parseInt(bits.replace(/\\u200B/g, '0').replace(/\\u200C/g, '1'), 2);
  const vw = innerWidth, vh = innerHeight;
  const area = clip ?? { x: 0, y: 0, width: vw, height: vh };
  const shown = (el) => {
    let o = 1;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.visibility === 'hidden' || cs.display === 'none') return 0;
      o *= parseFloat(cs.opacity);
    }
    return o;
  };
  const inside = (b) => b.w >= 4 && b.h >= 4 && b.x >= area.x - 2 && b.y >= area.y - 2 && b.x + b.w <= area.x + area.width + 2 && b.y + b.h <= area.y + area.height + 2 && (clip || b.y > 78);
  const found = [];
  const skip = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE']);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (skip.has(n.parentElement?.tagName) ? 2 : 1) });
  const nodes = [];
  let full = '';
  while (walker.nextNode()) { nodes.push([walker.currentNode, full.length]); full += walker.currentNode.data; }
  const locate = (pos) => {
    let lo = 0, hi = nodes.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (nodes[mid][1] <= pos) lo = mid; else hi = mid - 1; }
    return [nodes[lo][0], Math.min(pos - nodes[lo][1], nodes[lo][0].data.length)];
  };
  let m;
  while ((m = re.exec(full))) {
    const i = idx(m[1]);
    const start = m.index + m[0].length;
    const next = full.indexOf(START, start);
    const close = full.indexOf('\u2062', start);
    let end = close !== -1 && (next === -1 || close < next) ? close : Math.min(full.length, start + (window.__LENGTHS[i] || 1));
    if (next !== -1 && next < end) end = next;
    if (end <= start) continue;
    const [sn, so] = locate(start);
    const [en, eo] = locate(end - 1);
    const r = document.createRange();
    try { r.setStart(sn, so); r.setEnd(en, Math.min(eo + 1, en.data.length)); } catch { continue; }
    const rects = [...r.getClientRects()].filter((x) => x.width > 0.5 && x.height > 0.5);
    if (!rects.length) continue;
    const x1 = Math.min(...rects.map((x) => x.left)), y1 = Math.min(...rects.map((x) => x.top));
    const x2 = Math.max(...rects.map((x) => x.right)), y2 = Math.max(...rects.map((x) => x.bottom));
    const box = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    const o = Math.min(shown(sn.parentElement), shown(en.parentElement));
    if (o >= 0.85 && inside(box)) found.push({ i, box: [box.x - area.x, box.y - area.y, box.w, box.h].map((v) => Math.round(v)) });
  }
  // texty v atributech (placeholder, aria-label, title) → obdélník prvku
  for (const el of document.querySelectorAll('[placeholder], [aria-label], [title]')) {
    for (const attr of ['placeholder', 'aria-label', 'title']) {
      const v = el.getAttribute(attr);
      if (!v || !v.includes(START)) continue;
      const mm = /\\u2063([\\u200B\\u200C]{10})\\u2064/.exec(v);
      if (!mm) continue;
      const rr = el.getBoundingClientRect();
      const box = { x: rr.left, y: rr.top, w: rr.width, h: rr.height };
      if (shown(el) >= 0.85 && inside(box)) found.push({ i: idx(mm[1]), box: [box.x - area.x, box.y - area.y, box.w, box.h].map((v) => Math.round(v)) });
    }
  }
  return found;
})`;

/* ---------------------------- snímkování ----------------------------- */

const hints = {};
const shots = {};
let shotNo = 0;
await fs.rm(OUT_DIR, { recursive: true, force: true });
await fs.mkdir(OUT_DIR, { recursive: true });

/**
 * Zachytí aktuální stav: najde nové texty (nebo jen `only`), a pokud nějaké
 * přibyly, uloží snímek okna / výřezu `clip`.
 */
async function capture(label, { clip = null, only = null, force = false } = {}) {
  const found = (await ev(`${DECODE}(${JSON.stringify(clip)})`)) ?? [];
  const fresh = new Map();
  for (const f of found) {
    const fieldPath = HINT_PATHS[f.i];
    if (!fieldPath) continue;
    if (only && !only(fieldPath)) continue;
    if (hints[fieldPath] && !force) continue;
    const prev = fresh.get(fieldPath);
    if (!prev || f.box[2] * f.box[3] > prev.box[2] * prev.box[3]) fresh.set(fieldPath, f);
  }
  if (!fresh.size) return 0;
  const id = `${String(++shotNo).padStart(2, '0')}-${label}`;
  const scroll = await ev('[scrollX, scrollY]');
  const area = clip ?? { x: 0, y: 0, width: W, height: H };
  const scale = clip ? 1 : SCALE;
  const { data } = await send('Page.captureScreenshot', {
    format: 'webp',
    quality: clip ? 80 : 72,
    clip: { x: area.x + scroll[0], y: area.y + scroll[1], width: area.width, height: area.height, scale },
  });
  await fs.writeFile(path.join(OUT_DIR, `${id}.webp`), Buffer.from(data, 'base64'));
  shots[id] = { src: `/admin-hints/${id}.webp`, w: Math.round(area.width), h: Math.round(area.height) };
  for (const [p, f] of fresh) hints[p] = { shot: id, box: f.box };
  console.log(`  ${id}: ${fresh.size} polí`);
  return fresh.size;
}

const scrollTo = async (y, settle = 900) => {
  await ev(`(window.__lenis ? window.__lenis.scrollTo(${Math.round(y)}, { immediate: true, force: true }) : 0, window.scrollTo(0, ${Math.round(y)}))`);
  await sleep(settle);
};

/** Postupně projet sekci (i připnutou) a sbírat, co se ukáže. */
async function sweep(id, stepVh = 0.45) {
  const [top, height] = await ev(`(() => { const s = document.getElementById('${id}'); const r = s.getBoundingClientRect(); return [r.top + scrollY, s.offsetHeight]; })()`);
  // dojet k sekci postupně, ať scény před ní proběhnou jako při čtení
  const from = Math.max(0, top - H * 0.6);
  const to = top + Math.max(0, height - H * 0.6);
  let y = await ev('scrollY');
  while (Math.abs(y - from) > 10) {
    y += Math.sign(from - y) * Math.min(Math.abs(from - y), 700);
    await scrollTo(y, 30);
  }
  for (let y2 = from; y2 <= to; y2 += H * stepVh) {
    await scrollTo(y2, 1100);
    await capture(id);
  }
}

// ONLY=form → jen formulář (ladění)
const onlyForm = process.env.ONLY === 'form';
console.log('Sekce webu…');
if (!onlyForm) {
await sweep('hero', 0.3);
await sweep('proc-animace');
await sweep('proces', 0.3);
await sweep('reference');
await sweep('detaily', 0.35);
await sweep('cenik', 0.3);
// odpovědi na otázky pod ceníkem se ukážou až po rozkliknutí
for (let i = 0; i < (cs.pricing.faq?.length ?? 0); i++) {
  // Lenis řídí scroll sám — posun přes scrollTo, ne scrollIntoView
  const top = await ev(`(() => { const b = [...document.querySelectorAll('#cenik button[aria-expanded]')][${i}]; return b ? Math.round(b.getBoundingClientRect().top + scrollY) : null; })()`);
  if (top === null) break;
  // otázky u spodku okna — o kus níž už sekci zhasíná přechodová scéna
  await scrollTo(top - H * 0.78, 600);
  await ev(`[...document.querySelectorAll('#cenik button[aria-expanded]')][${i}].click()`);
  await sleep(900);
  await capture('cenik-otazky');
}
}

/* ------------------------- kontaktní formulář ------------------------- */

console.log('Formulář…');
const STRIP = `(s) => s.replace(/[\\u2062\\u2063\\u2064\\u200B\\u200C]/g, '').trim()`;
const click = (text) =>
  ev(`(() => { const strip = ${STRIP}; const b = [...document.querySelectorAll('#kontakt button')].find((b) => strip(b.textContent) === ${JSON.stringify(text)} || strip(b.getAttribute('aria-label') || '') === ${JSON.stringify(text)}) ?? [...document.querySelectorAll('#kontakt button')].find((b) => strip(b.textContent).endsWith(${JSON.stringify(text)})); if (!b) return false; b.click(); return true; })()`);
const setInput = (selector, value) =>
  ev(`(() => { const i = document.querySelector(${JSON.stringify(selector)}); if (!i) return false; const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, ${JSON.stringify(value)}); i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
const next = async () => {
  await click(cs.contact.next);
  await sleep(900);
};
const formTop = () => ev(`Math.round(document.querySelector('#kontakt form, #kontakt [class*="min-h-[420px]"]').closest('.glass').getBoundingClientRect().top + scrollY)`);
const formBottom = () => ev(`Math.round(document.querySelector('#kontakt .glass').getBoundingClientRect().bottom + scrollY)`);
const bubbleClip = () =>
  ev(`(() => { const c = [...document.querySelectorAll('#kontakt aside .glass')].find((e) => e.offsetParent); const r = c.getBoundingClientRect(); return { x: Math.round(r.left - 8), y: Math.round(r.top - 8), width: Math.round(r.width + 16), height: Math.round(r.height + 16) }; })()`);

/** Celý formulář v aktuálním kroku (nahoře i dole, když je delší než okno). */
async function formState(label) {
  const top = await formTop();
  await scrollTo(top - 96, 700);
  await capture(label);
  const bottom = await formBottom();
  if (bottom - (top - 96) > H) {
    await scrollTo(bottom - H + 30, 700);
    await capture(label);
    await scrollTo(top - 96, 400);
  }
}

const isBubble = (p) => p.startsWith('contact.hints') || p.startsWith('contact.reactions') || p === 'mascot.success';
async function bubble(label, wait = 2600) {
  await sleep(wait);
  const top = await formTop();
  await scrollTo(top - 96, 300);
  await capture(label, { clip: await bubbleClip(), only: isBubble });
}

async function reactEach(group, labels, { toggle = false } = {}) {
  for (const text of labels) {
    await click(text);
    await bubble(`maskot-${group}`);
    if (toggle) {
      await click(text);
      await sleep(150);
    }
  }
}

// dojet k formuláři jako návštěvník (navigace z menu); nejdřív záhlaví sekce
await ev(`document.querySelector('header a[href$="#kontakt"]').click()`);
await sleep(1600);
await scrollTo(await ev(`Math.round(document.getElementById('kontakt').getBoundingClientRect().top + scrollY)`), 1600);
await capture('kontakt');

// krok 1
await bubble('maskot-napoveda', 2400);
// balíček z Ceníku: předvybere „Web" (maskot na něj zareaguje) a ukáže štítek balíčku
await ev(`window.dispatchEvent(new CustomEvent('elevate:preselect', { detail: { needIndex: 0, plan: 'Weby' } }))`);
await bubble('maskot-needs');
await formState('formular-1');
await reactEach('needs', cs.contact.needs.slice(1), { toggle: true });
await reactEach('niches', cs.contact.niches);
await formState('formular-1');
await next();

// krok 2
await bubble('maskot-napoveda');
await formState('formular-2');
await reactEach('starts', cs.contact.starts);
await click(cs.contact.starts[1]);
await sleep(700);
await formState('formular-2');
await setInput('#currentSite', 'www.puvodni-web.cz');
await next();

// krok 3
await bubble('maskot-napoveda');
await formState('formular-3');
await reactEach('styles', cs.contact.styles);
await next();

// krok 4
await bubble('maskot-napoveda');
await formState('formular-4');
await reactEach('budgets', cs.contact.budgets);
await reactEach('timelines', cs.contact.timelines);
await next();

// krok 5
await bubble('maskot-napoveda');
await formState('formular-5');
// WhatsApp (3), telefon (1), Telegram (2), nakonec zpět e-mail (0)
for (const i of [3, 1, 2, 0]) {
  await click(cs.contact.channels[i]);
  await bubble('maskot-channels');
  await formState('formular-5');
}
await setInput('#name', 'Jana Nováková');
await setInput('#email', 'jana@example.cz');
await ev(`document.querySelector('#kontakt input[type=checkbox]').click()`);
await sleep(300);
await click(cs.contact.submit);
await sleep(2600);
await formState('formular-hotovo');
await bubble('maskot-hotovo', 800);

/* ----------------- Kontakt a firma (data z databáze) ----------------- */

/** Obdélníky prvků podle selektorů → nápovědy s klíčem „settings.*". */
async function captureElements(label, selectors) {
  const boxes = await ev(`(() => { const out = {}; ${Object.entries(selectors)
    .map(([k, expr]) => `{ const el = ${expr}; if (el) { const r = el.getBoundingClientRect(); if (r.width && r.height) out[${JSON.stringify(k)}] = [r.left, r.top, r.width, r.height].map(Math.round); } }`)
    .join('\n')} return out; })()`);
  const keys = Object.keys(boxes);
  if (!keys.length) return;
  const id = `${String(++shotNo).padStart(2, '0')}-${label}`;
  const scroll = await ev('[scrollX, scrollY]');
  const { data } = await send('Page.captureScreenshot', { format: 'webp', quality: 72, clip: { x: scroll[0], y: scroll[1], width: W, height: H, scale: SCALE } });
  await fs.writeFile(path.join(OUT_DIR, `${id}.webp`), Buffer.from(data, 'base64'));
  shots[id] = { src: `/admin-hints/${id}.webp`, w: W, h: H };
  for (const k of keys) hints[k] = { shot: id, box: boxes[k] };
  console.log(`  ${id}: ${keys.length} polí`);
}

await scrollTo((await formTop()) - 96, 900);
await captureElements('kontakt-firma', {
  'settings.contactEmail': `document.querySelector('#kontakt aside a[href^="mailto:"]')`,
  'settings.city': `[...document.querySelectorAll('#kontakt aside li')].find((li) => !li.querySelector('a'))`,
  // sítě a messengery se zobrazují v kontaktech (messengery) a pod nimi (odkazy)
  'settings.social': `document.querySelector('#kontakt aside ul')`,
});

/* ------------------------------ patička ------------------------------ */

await scrollTo(await ev('document.documentElement.scrollHeight - innerHeight'), 1500);
await capture('paticka');

// právní název a IČO — stránka Ochrana osobních údajů
await send('Page.navigate', { url: `${SITE}/cs/ochrana-osobnich-udaju` });
await sleep(6000);
await scrollTo(await ev(`(() => { const el = [...document.querySelectorAll('main p, main li')].find((e) => /IČO|digitální studio/.test(e.textContent)); return el ? Math.round(el.getBoundingClientRect().top + scrollY - innerHeight * 0.4) : 0; })()`), 900);
await captureElements('ochrana-udaju', {
  'settings.company': `[...document.querySelectorAll('main p, main li')].find((e) => /IČO|digitální studio/.test(e.textContent))`,
});

/* ------------------------------ zápis ------------------------------- */

// prázdné části nadpisů (např. nadpis bez začátku) nejdou vyfotit — ukázat celý nadpis
for (const f of EDIT_FIELDS) {
  if (hints[f.path] || get(f.path) !== '') continue;
  const sibling = EDIT_FIELDS.find((g) => g.path !== f.path && g.path.replace(/\.\d+$/, '') === f.path.replace(/\.\d+$/, '') && hints[g.path]);
  if (sibling) hints[f.path] = { ...hints[sibling.path], empty: true };
}

const missing = HINT_PATHS.filter((p) => !hints[p] && !p.startsWith('meta.') && typeof get(p) === 'string');
await fs.writeFile(OUT_JSON, JSON.stringify({ viewport: [W, H], shots, fields: hints }, null, 1) + '\n');
console.log(`Hotovo: ${Object.keys(hints).length} polí, ${Object.keys(shots).length} snímků.`);
if (missing.length) console.log('Bez snímku:', missing.join(', '));
// značkovací cookie po sobě uklidit (sdílený Chrome by dál dostával označené texty)
await send('Network.deleteCookies', { name: 'elevate-annotate', url: SITE });
ws.close();
process.exit(0);
