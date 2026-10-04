#!/usr/bin/env node
/**
 * Obrázky pro sdílení odkazu (Open Graph / Twitter, 1200 × 630) — jeden na jazyk.
 *
 * Karta = první záběr úvodního filmu (maskot, neonová šipka) + logo, hlavní
 * slogan a přehled služeb v písmech webu. Texty se berou z messages/<jazyk>.json
 * (hero.eyebrow, hero.tagline, hero.taglineAccent, services.items.*.card),
 * takže po změně sloganu stačí skript pustit znovu.
 *
 * Výstup: public/og/<jazyk>.jpg (odkazuje na ně lib/seo.ts)
 *
 * Spuštění (potřebuje internet kvůli písmům z Google Fonts; Chrome se spustí
 * sám, nebo se použije běžící s --remote-debugging-port=9222):
 *   node scripts/make-og-images.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public/og');
const LOCALES = ['cs', 'en', 'ru', 'uk'];
const W = 1200;
const H = 630;
const HOST = 'elevateit.cz';

const file = (relative) => pathToFileURL(path.join(ROOT, relative)).href;
const esc = (value) => String(value).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function page(messages) {
  const hero = messages.hero;
  const lines = [...hero.tagline];
  const services = Object.values(messages.services.items).map((item) => item.card);
  return `<!doctype html>
<html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600&family=Unbounded:wght@600;700&display=block" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; }
  body { width: ${W}px; height: ${H}px; position: relative; overflow: hidden; background: #04060B; color: #EEF1FF; font-family: 'Manrope', sans-serif; }
  /* první záběr filmu: maskot vlevo, neonová šipka uprostřed */
  .film { position: absolute; left: -34px; top: -22px; width: 1198px; height: 674px; object-fit: cover; }
  .scrim { position: absolute; inset: 0; background:
    linear-gradient(90deg, rgba(4,6,11,0.28) 0%, rgba(4,6,11,0.06) 20%, rgba(4,6,11,0.18) 44%, rgba(4,6,11,0.84) 57%, rgba(4,6,11,0.97) 68%, #04060B 100%),
    linear-gradient(180deg, rgba(4,6,11,0.55) 0%, rgba(4,6,11,0) 24%, rgba(4,6,11,0) 70%, rgba(4,6,11,0.85) 100%); }
  .glow { position: absolute; right: -120px; top: -160px; width: 620px; height: 520px; border-radius: 50%; background: radial-gradient(circle, rgba(31,91,255,0.34), rgba(31,91,255,0) 68%); }
  .logo { position: absolute; left: 664px; top: 54px; height: 30px; }
  .text { position: absolute; left: 664px; top: 0; bottom: 0; width: 480px; display: flex; flex-direction: column; justify-content: center; padding-top: 22px; }
  .eyebrow { display: flex; align-items: center; gap: 14px; font-size: 15px; font-weight: 600; letter-spacing: 0.24em; text-transform: uppercase; color: #9FB6E6; }
  .eyebrow i { display: block; width: 34px; height: 1px; background: #6F82B4; }
  h1 { margin-top: 22px; font-family: 'Unbounded', sans-serif; font-weight: 700; font-size: 56px; line-height: 1.06; text-transform: uppercase; letter-spacing: -0.01em; white-space: nowrap; }
  h1 span { display: block; }
  h1 .accent { color: #3D7BFF; text-shadow: 0 0 34px rgba(61,123,255,0.55); }
  .rule { margin-top: 26px; width: 120px; height: 3px; border-radius: 3px; background: #9FC0FF; box-shadow: 0 0 12px 2px rgba(61,123,255,0.9), 0 0 30px 6px rgba(31,91,255,0.5); }
  /* služby jako štítky — zalamují se po celých položkách */
  .services { margin-top: 26px; display: flex; flex-wrap: wrap; gap: 9px; }
  .services span { white-space: nowrap; padding: 7px 14px 8px; border-radius: 999px; font-size: 17px; line-height: 1.2; font-weight: 600; color: #DCE5FF; background: rgba(31,91,255,0.16); box-shadow: inset 0 0 0 1px rgba(143,178,255,0.38); }
  .host { position: absolute; right: 56px; bottom: 44px; font-family: 'Unbounded', sans-serif; font-weight: 600; font-size: 16px; letter-spacing: 0.1em; color: #EEF1FF; }
</style></head>
<body>
  <img class="film" src="${file('public/hero/frames-desktop/000.webp')}" alt="">
  <div class="scrim"></div>
  <div class="glow"></div>
  <img class="logo" src="${file('public/brand/logo-elevate.png')}" alt="">
  <div class="text">
    <div class="eyebrow"><i></i>${esc(hero.eyebrow)}</div>
    <h1>${lines.map((line) => `<span>${esc(line)}</span>`).join('')}<span class="accent">${esc(hero.taglineAccent)}</span></h1>
    <div class="rule"></div>
    <div class="services">${services.map((name) => `<span>${esc(name)}</span>`).join('')}</div>
  </div>
  <div class="host">${HOST}</div>
  <script>
    // nejdelší řádek sloganu se musí vejít do sloupce — písmo se případně zmenší
    document.fonts.ready.then(() => {
      const h1 = document.querySelector('h1');
      let size = 56;
      while (h1.scrollWidth > h1.clientWidth && size > 30) h1.style.fontSize = --size + 'px';
      document.body.dataset.ready = String(size);
    });
  </script>
</body></html>`;
}

/* ---------------------------- Chrome (CDP) ---------------------------- */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cdpEndpoint() {
  try {
    return await (await fetch('http://127.0.0.1:9222/json/version')).json();
  } catch {
    const bin = process.env.CHROME_BIN ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'elevate-og-'));
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
const ev = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result?.value;

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await fs.mkdir(OUT_DIR, { recursive: true });
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'elevate-og-page-'));

for (const locale of LOCALES) {
  const messages = JSON.parse(await fs.readFile(path.join(ROOT, `messages/${locale}.json`), 'utf8'));
  const html = path.join(tmp, `${locale}.html`);
  await fs.writeFile(html, page(messages));
  await send('Page.navigate', { url: pathToFileURL(html).href });
  let ready = null;
  for (let i = 0; i < 60 && !ready; i++) {
    await sleep(250);
    ready = await ev('document.body && document.body.dataset.ready');
  }
  await sleep(400);
  const fonts = await ev(`[...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family).filter((v, i, a) => a.indexOf(v) === i).join(', ')`);
  const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
  const out = path.join(OUT_DIR, `${locale}.jpg`);
  await fs.writeFile(out, Buffer.from(shot.data, 'base64'));
  const { size } = await fs.stat(out);
  console.log(`${path.relative(ROOT, out)}  ${Math.round(size / 1024)} kB  nadpis ${ready}px  písma: ${fonts || '— (bez internetu?)'}`);
}

await fetch(`http://127.0.0.1:9222/json/close/${target.id}`);
ws.close();
await fs.rm(tmp, { recursive: true, force: true });
process.exit(0);
