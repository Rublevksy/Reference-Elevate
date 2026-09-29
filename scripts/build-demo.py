"""
Podklady pro ukázku „Weby, které žijí" (notebook a telefon s přepínačem).

  .venv-tools/bin/python3 scripts/build-demo.py

Zdroj: reference/demo-source/ — záznam animovaného webu (screencast plynulého
skrolu, desktop.mp4 / mobile.mp4) a jeho full-page screenshoty.

Výstup (public/demo/):
  anim/d/000.webp …  snímky animované verze pro notebook (960 × 600)
  anim/m/000.webp …  snímky pro telefon (438 × 948)
  static-d.webp      statická verze stejného webu: hero + textové bloky
  static-m.webp      a k nim fotky ze scény (místo prázdných ploch, které
                     full-page screenshot animovaného webu obsahuje)
  + content/demo-manifest.json (počty snímků a rozměry pro komponentu)

Scrubbing přes <video>.currentTime sekal (dekódování při každém posunu);
komponenta teď kreslí hotové snímky do <canvas> a mezi sousedními prolíná.
"""
import json, os, subprocess, tempfile, glob
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'reference/demo-source')
OUT = os.path.join(ROOT, 'public/demo')
CREAM = (251, 246, 240)


def frames_from(video, every=1):
    tmp = tempfile.mkdtemp()
    subprocess.run(['ffmpeg', '-v', 'error', '-i', video, os.path.join(tmp, '%04d.png')], check=True)
    files = sorted(glob.glob(os.path.join(tmp, '*.png')))
    return [Image.open(f).convert('RGB') for f in files[::every]]


def export_frames(frames, size, folder, quality=72):
    os.makedirs(folder, exist_ok=True)
    for old in glob.glob(os.path.join(folder, '*.webp')):
        os.remove(old)
    total = 0
    for i, im in enumerate(frames):
        p = os.path.join(folder, f'{i:03d}.webp')
        im.resize(size, Image.LANCZOS).save(p, 'WEBP', quality=quality, method=6)
        total += os.path.getsize(p)
    return total


def blocks(sheet):
    """Souvislé úseky obsahu na krémovém pozadí (řádky, které nejsou prázdné)."""
    a = np.asarray(sheet).astype(np.float32)
    d = np.abs(a - np.array(CREAM, np.float32)).max(2)
    content = (d > 28).mean(1) > 0.004
    runs, start = [], None
    for y, c in enumerate(content):
        if c and start is None:
            start = y
        if not c and start is not None:
            runs.append([start, y]); start = None
    if start is not None:
        runs.append([start, len(content)])
    merged = []
    for r in runs:
        if merged and r[0] - merged[-1][1] < 40:
            merged[-1][1] = r[1]
        else:
            merged.append(r)
    return merged


def rounded(im, radius):
    mask = Image.new('L', im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, im.width - 1, im.height - 1], radius, fill=255)
    return im, mask


def cover(im, w, h, focus=(0.5, 0.5)):
    s = max(w / im.width, h / im.height)
    r = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x = int((r.width - w) * focus[0]); y = int((r.height - h) * focus[1])
    return r.crop((x, y, x + w, y + h))


def static_desktop(sheet, stills):
    """Hero + pět textových bloků, do prázdné poloviny každého bloku fotka ze scény."""
    W = sheet.width
    bl = [b for b in blocks(sheet) if b[0] > 0]
    hero = sheet.crop((0, 0, W, 720))
    parts = []
    for i, (a, b) in enumerate(bl):
        blk = sheet.crop((0, a, W, b))
        arr = np.asarray(blk).astype(np.float32)
        cols = (np.abs(arr - np.array(CREAM, np.float32)).max(2) > 28).mean(0) > 0.002
        xs = np.nonzero(cols)[0]
        text_left = xs.min() < W / 2 - 40
        H = max(b - a, 300) + 56
        canvas = Image.new('RGB', (W, H), CREAM)
        # text vertikálně na střed bloku
        canvas.paste(blk, (0, (H - (b - a)) // 2))
        img = cover(stills[i % len(stills)], 470, H - 56, (0.5, 0.45))
        img, mask = rounded(img, 18)
        x = W - 470 - 72 if text_left else 72
        canvas.paste(img, (x, 28), mask)
        parts.append(canvas)
    gap = Image.new('RGB', (W, 64), CREAM)
    out_h = hero.height + sum(p.height + gap.height for p in parts) + 40
    page = Image.new('RGB', (W, out_h), CREAM)
    y = 0
    page.paste(hero, (0, y)); y += hero.height + 40
    for p in parts:
        page.paste(p, (0, y)); y += p.height + gap.height
    return page


def static_mobile(sheet, stills):
    """Hero přes celou obrazovku + unikátní textové bloky, nad každým fotka."""
    W = sheet.width
    bl = blocks(sheet)
    hero = sheet.crop((0, 0, W, bl[0][1]))
    seen, texts = set(), []
    # bloky těsně za sebou (nadpis, text, štítek) patří k sobě
    groups = []
    for a, b in bl[1:]:
        if b - a > 1000:          # druhé hero (připnutá scéna) — přeskočit
            continue
        if groups and a - groups[-1][1] < 80:
            groups[-1][1] = b
        else:
            groups.append([a, b])
    for a, b in groups:
        key = np.asarray(sheet.crop((0, a, W, min(b, a + 60)))).astype(np.int16)[::4, ::4].tobytes()
        if key in seen:
            continue
        seen.add(key); texts.append(sheet.crop((0, a, W, b)))
    parts = []
    for i, t in enumerate(texts):
        img = cover(stills[i % len(stills)], W - 64, 330, (0.5, 0.45))
        img, mask = rounded(img, 16)
        H = 330 + 36 + t.height + 24
        c = Image.new('RGB', (W, H), CREAM)
        c.paste(img, (32, 0), mask)
        c.paste(t, (0, 330 + 36))
        parts.append(c)
    out_h = hero.height + 48 + sum(p.height + 56 for p in parts)
    page = Image.new('RGB', (W, out_h), CREAM)
    y = 0
    page.paste(hero, (0, y)); y += hero.height + 48
    for p in parts:
        page.paste(p, (0, y)); y += p.height + 56
    return page


def main():
    manifest = {}
    d_frames = frames_from(os.path.join(SRC, 'desktop.mp4'))
    size_d = export_frames(d_frames, (960, 600), os.path.join(OUT, 'anim/d'))
    m_frames = frames_from(os.path.join(SRC, 'mobile.mp4'))
    size_m = export_frames(m_frames, (438, 948), os.path.join(OUT, 'anim/m'))

    # fotky do statické verze: čisté výřezy scény (bez lišty webu a textu hera)
    stills_d = [d_frames[i].crop(box) for i, box in (
        (100, (380, 70, 1152, 720)),
        (12, (560, 70, 1152, 720)),
        (60, (520, 70, 1152, 720)),
        (128, (300, 80, 1152, 720)),
        (144, (380, 110, 1152, 720)),
    )]
    sheet_d = Image.open(os.path.join(SRC, 'desktop.jpg')).convert('RGB')
    pd = static_desktop(sheet_d, stills_d)
    page_d = pd.resize((960, round(pd.height * 960 / sheet_d.width)), Image.LANCZOS)
    page_d.save(os.path.join(OUT, 'static-d.webp'), 'WEBP', quality=80, method=6)

    stills_m = [m_frames[i].crop(box) for i, box in (
        (100, (0, 540, 584, 1264)),
        (50, (0, 250, 584, 700)),
        (0, (0, 250, 584, 780)),
    )]
    sheet_m = Image.open(os.path.join(SRC, 'mobile.jpg')).convert('RGB')
    pm = static_mobile(sheet_m, stills_m)
    page_m = pm.resize((438, round(pm.height * 438 / sheet_m.width)), Image.LANCZOS)
    page_m.save(os.path.join(OUT, 'static-m.webp'), 'WEBP', quality=80, method=6)

    manifest = {
        'desktop': {'frames': len(d_frames), 'w': 960, 'h': 600, 'staticH': page_d.height},
        'mobile': {'frames': len(m_frames), 'w': 438, 'h': 948, 'staticH': page_m.height},
    }
    with open(os.path.join(ROOT, 'content/demo-manifest.json'), 'w') as f:
        json.dump(manifest, f, indent=2); f.write('\n')
    print(json.dumps(manifest), f'anim d {size_d/1e6:.2f} MB, m {size_m/1e6:.2f} MB',
          f"static d {os.path.getsize(os.path.join(OUT,'static-d.webp'))/1e3:.0f} kB, m {os.path.getsize(os.path.join(OUT,'static-m.webp'))/1e3:.0f} kB")


if __name__ == '__main__':
    main()
