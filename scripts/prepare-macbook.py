"""
Připraví MacBook mockup pro použití napříč webem:
  - najde bílou obrazovku (flood fill od středu) a bílé POZADÍ KOLEM notebooku
    (flood fill od rohů obrázku) a obě udělá průhlednými, s jemně roztaženým
    (feathered) okrajem, aby nevznikaly tvrdé hranaté hrany;
  - zapíše přesné souřadnice obrazovky (v % rozměrů obrázku) a poloměr
    zaoblení rohů do lib/devices.ts, aby obsah pod rámečkem seděl pixel na pixel
    na všech místech webu, která tenhle mockup používají.

Spuštění:
    .venv-tools/bin/python scripts/prepare-macbook.py
"""
import pathlib
from PIL import Image, ImageFilter

SRC = pathlib.Path("public/assets/macbook-frame-src.jpg")
OUT = pathlib.Path("public/assets/macbook-frame-cut.png")
DEVICES_TS = pathlib.Path("lib/devices.ts")

WHITE_THRESHOLD = 235
FEATHER_RADIUS = 2.2
# zdrojový mockup je jen 736x427 — pro retinu ho zvětšíme Lanczosem
# (kresba je jednoduchá, upscale zůstává čitelný a ostrý)
UPSCALE = 2


def flood_fill(img: Image.Image, seeds, w, h):
    """BFS flood fill přes téměř bílé pixely od zadaných seed bodů."""
    px = img.load()

    def is_white(x, y):
        r, g, b = px[x, y][:3]
        return r > WHITE_THRESHOLD and g > WHITE_THRESHOLD and b > WHITE_THRESHOLD

    visited = bytearray(w * h)
    stack = []
    for sx, sy in seeds:
        idx = sy * w + sx
        if not visited[idx] and is_white(sx, sy):
            visited[idx] = 1
            stack.append((sx, sy))

    while stack:
        x, y = stack.pop()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h:
                idx = ny * w + nx
                if not visited[idx] and is_white(nx, ny):
                    visited[idx] = 1
                    stack.append((nx, ny))

    return visited


def bbox_of(visited, w, h):
    min_x, min_y, max_x, max_y = w, h, 0, 0
    for y in range(h):
        row = y * w
        for x in range(w):
            if visited[row + x]:
                if x < min_x: min_x = x
                if x > max_x: max_x = x
                if y < min_y: min_y = y
                if y > max_y: max_y = y
    return min_x, min_y, max_x, max_y


def corner_radius(visited, w, h, bbox):
    min_x, min_y, _, _ = bbox

    def px_in(x, y):
        return 0 <= x < w and 0 <= y < h and visited[y * w + x]

    r = 0
    while r < 40 and not px_in(min_x + r, min_y + r):
        r += 1
    return r


def main():
    img = Image.open(SRC).convert("RGB")
    if UPSCALE != 1:
        img = img.resize((img.width * UPSCALE, img.height * UPSCALE), Image.LANCZOS)
    w, h = img.size

    screen_mask = flood_fill(img, [(w // 2, int(h * 0.35))], w, h)
    screen_bbox = bbox_of(screen_mask, w, h)
    radius = corner_radius(screen_mask, w, h, screen_bbox)

    # pozadí kolem notebooku: seed ve všech čtyřech rozích + středy hran
    border_seeds = [
        (2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3),
        (w // 2, 2), (w // 2, h - 3), (2, h // 2), (w - 3, h // 2),
    ]
    bg_mask = flood_fill(img, border_seeds, w, h)

    print(f"image: {w}x{h}")
    print(f"screen bbox: {screen_bbox}, corner radius: {radius}px")
    print(f"screen px: {sum(screen_mask)}, outer bg px: {sum(bg_mask)}")

    # spojená maska (screen ∪ outer bg) → čistě binární obrázek
    combined = Image.new("L", (w, h), 0)
    cpx = combined.load()
    for y in range(h):
        row = y * w
        for x in range(w):
            if screen_mask[row + x] or bg_mask[row + x]:
                cpx[x, y] = 255

    # zjemnit hranu masky, ať přechod není zubatý (JPEG artefakty na hraně bezelu)
    feathered = combined.filter(ImageFilter.GaussianBlur(FEATHER_RADIUS))

    rgba = img.convert("RGBA")
    r, g, b, _ = rgba.split()
    alpha = Image.eval(feathered, lambda v: 255 - v)
    rgba = Image.merge("RGBA", (r, g, b, alpha))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    rgba.save(OUT, optimize=True)
    print(f"written {OUT}")

    min_x, min_y, max_x, max_y = screen_bbox
    left_pct = min_x / w * 100
    top_pct = min_y / h * 100
    right_pct = (w - 1 - max_x) / w * 100
    bottom_pct = (h - 1 - max_y) / h * 100
    radius_pct = radius / w * 100

    ts = f"""/**
 * Přesné souřadnice obrazovky v přiloženém MacBook mockupu
 * (public/assets/macbook-frame-cut.png), v procentech rozměrů obrázku.
 * Vygenerováno scripts/prepare-macbook.py — needituj ručně, spusť skript znovu.
 *
 * Rámeček (a "čelka" kamery) leží NAD obsahem — obsah se pozicuje přesně
 * do tohoto výřezu a nic z něj nesmí vyčnívat mimo.
 */
export const macbookScreen = {{
  /** poměr stran celého PNG mockupu */
  imageAspect: {w} / {h},
  /** odsazení obrazovky od okrajů obrázku, v % šířky/výšky obrázku */
  inset: {{
    left: {left_pct:.4f},
    top: {top_pct:.4f},
    right: {right_pct:.4f},
    bottom: {bottom_pct:.4f},
  }},
  /** poloměr zaoblení rohů obrazovky, v % šířky obrázku */
  cornerRadiusPct: {radius_pct:.4f},
}} as const;
"""
    DEVICES_TS.parent.mkdir(parents=True, exist_ok=True)
    DEVICES_TS.write_text(ts, encoding="utf-8")
    print(f"written {DEVICES_TS}")


if __name__ == "__main__":
    main()
