/**
 * Záznam cizích webů pro sekce „Weby, které žijí" a „Reference".
 *
 *   node scripts/capture-sites.mjs            # vše
 *   node scripts/capture-sites.mjs demo       # jen ukázkový web
 *   node scripts/capture-sites.mjs euromotors # jeden case
 *
 * Používá nainstalovaný Google Chrome (channel: 'chrome'), takže se nestahují
 * žádné prohlížeče navíc. Snímky bere přes CDP screencast — tedy skutečný
 * průběh animací při plynulém skrolu, ne poskládané statické screenshoty.
 * Video se pak kóduje s každým snímkem jako klíčovým (-g 1), aby šlo
 * scrubovat přes video.currentTime bez sekání.
 */
import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';

const run = promisify(execFile);
const ROOT = process.cwd();

const TARGETS = {
  // zdroj pro scripts/build-demo.py (snímky a statická verze se generují z něj)
  demo: { url: 'https://voyarelle-travel.higgsfield.app/', out: 'reference/demo-source', name: 'animated' },
  euromotors: { url: 'https://www.euromotors.cz/', out: 'public/cases/euromotors', name: 'euromotors' },
  inhome: { url: 'https://inhomepraha.cz/', out: 'public/cases/inhome', name: 'inhome' },
  biodent: { url: 'https://biodentclinic.cz/', out: 'public/cases/biodent', name: 'biodent' },
};

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, dsf: 1, encode: '1152:-2', seconds: 9, fps: 15 },
  mobile: { width: 390, height: 844, dsf: 2, encode: '584:-2', seconds: 8, fps: 15 },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function captureOne(browser, target, viewportName) {
  const vp = VIEWPORTS[viewportName];
  const outDir = path.join(ROOT, target.out);
  const frameDir = path.join(ROOT, '.capture-frames', `${target.name}-${viewportName}`);
  await fs.mkdir(outDir, { recursive: true });
  await fs.rm(frameDir, { recursive: true, force: true });
  await fs.mkdir(frameDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.dsf,
    isMobile: viewportName === 'mobile',
    hasTouch: viewportName === 'mobile',
    userAgent:
      viewportName === 'mobile'
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        : undefined,
    reducedMotion: 'no-preference',
  });

  const page = await context.newPage();
  console.log(`  → ${target.url} (${viewportName})`);

  try {
    await page.goto(target.url, { waitUntil: 'networkidle', timeout: 60_000 });
  } catch {
    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  }
  await sleep(2500);

  // cookie lišty a podobné překryvy pryč, ať nekazí záznam
  await page.evaluate(() => {
    const kill = /cookie|consent|gdpr|cky|cc-|banner/i;
    document.querySelectorAll('div,section,aside,dialog').forEach((el) => {
      const id = `${el.id} ${el.className}`;
      const st = getComputedStyle(el);
      if (kill.test(id) && (st.position === 'fixed' || st.position === 'sticky')) el.remove();
    });
  });
  await sleep(600);

  // --- full-page screenshot ---
  const shotPath = path.join(outDir, `${viewportName}.jpg`);
  await page.screenshot({ path: shotPath, fullPage: true, type: 'jpeg', quality: 68 });
  const shotMeta = await page.evaluate(() => ({
    height: document.documentElement.scrollHeight,
    width: document.documentElement.clientWidth,
  }));
  console.log(`    screenshot ${shotMeta.width}x${shotMeta.height}`);

  // --- screencast během plynulého skrolu ---
  const session = await context.newCDPSession(page);
  let index = 0;
  const writes = [];

  session.on('Page.screencastFrame', async ({ data, sessionId }) => {
    const i = index++;
    writes.push(
      fs.writeFile(path.join(frameDir, `f-${String(i).padStart(4, '0')}.jpg`), Buffer.from(data, 'base64')),
    );
    try { await session.send('Page.screencastFrameAck', { sessionId }); } catch {}
  });

  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(800);

  await session.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 85,
    everyNthFrame: 1,
    maxWidth: 1600,
    maxHeight: 1700,
  });

  await page.evaluate(async (seconds) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const start = performance.now();
    await new Promise((resolve) => {
      const step = (now) => {
        const t = Math.min(1, (now - start) / (seconds * 1000));
        // mírný ease, ať to nepůsobí strojově
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        window.scrollTo(0, max * eased);
        if (t < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }, vp.seconds);

  await sleep(500);
  await session.send('Page.stopScreencast');
  await Promise.all(writes);
  await context.close();

  console.log(`    frames: ${index}`);
  if (index < 10) throw new Error('příliš málo snímků – screencast selhal');

  // --- kódování ---
  const mp4 = path.join(outDir, `${viewportName}.mp4`);
  const poster = path.join(outDir, `${viewportName}-poster.jpg`);

  const inputFps = index / (vp.seconds + 1.3);
  const common = ['-y', '-framerate', inputFps.toFixed(2), '-i', path.join(frameDir, 'f-%04d.jpg')];
  const scale = `scale=${vp.encode}:flags=lanczos`;

  await run('ffmpeg', [
    ...common,
    '-vf', `${scale},fps=${vp.fps}`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '30',
    '-g', '1', '-keyint_min', '1', '-sc_threshold', '0',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    mp4,
  ]);


  await run('ffmpeg', ['-y', '-i', mp4, '-frames:v', '1', '-q:v', '4', poster]);

  const size = async (f) => Math.round((await fs.stat(f)).size / 1024);
  console.log(`    mp4 ${await size(mp4)} kB`);

  await fs.rm(frameDir, { recursive: true, force: true });

  return { frames: index, pageHeight: shotMeta.height, pageWidth: shotMeta.width };
}

const only = process.argv[2];
const keys = only ? [only] : Object.keys(TARGETS);
const manifest = {};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const key of keys) {
    const target = TARGETS[key];
    if (!target) throw new Error(`neznámý cíl: ${key}`);
    console.log(`\n=== ${key} ===`);
    manifest[key] = {};
    for (const vpName of Object.keys(VIEWPORTS)) {
      manifest[key][vpName] = await captureOne(browser, target, vpName);
    }
  }
} finally {
  await browser.close();
  await fs.rm(path.join(ROOT, '.capture-frames'), { recursive: true, force: true });
}

const manifestPath = path.join(ROOT, 'content/capture-manifest.json');
let existing = {};
try { existing = JSON.parse(await fs.readFile(manifestPath, 'utf8')); } catch {}
await fs.writeFile(manifestPath, JSON.stringify({ ...existing, ...manifest }, null, 2) + '\n');
console.log('\nhotovo →', manifestPath);
