"""
Rozloží fotku maskota v kavárně na dvě vrstvy:
  public/assets/cafe-bg.webp           – pozadí (rozmazané, na celou šířku sekce)
  public/assets/mascot-cafe-cutout.png – vyříznutá postava s alfou

Spuštění:
    python3 -m venv .venv-tools
    .venv-tools/bin/pip install rembg[cpu] pillow
    .venv-tools/bin/python scripts/split-cafe.py
"""
import pathlib
from PIL import Image, ImageFilter
from rembg import remove, new_session

SRC = pathlib.Path("reference/081b52a8-0314-4b22-acc8-fb21eb96022e.jpeg")
OUT = pathlib.Path("public/assets")
OUT.mkdir(parents=True, exist_ok=True)

src = Image.open(SRC).convert("RGB")
print("source", src.size)

# --- postava ---
session = new_session("isnet-general-use")
cut = remove(src, session=session, alpha_matting=True,
             alpha_matting_foreground_threshold=250,
             alpha_matting_background_threshold=15,
             alpha_matting_erode_size=8)
cut = cut.convert("RGBA")

bbox = cut.getbbox()
if bbox:
    cut = cut.crop(bbox)
cut.thumbnail((900, 1400), Image.LANCZOS)
cut.save(OUT / "mascot-cafe-cutout.png", optimize=True)
print("cutout", cut.size)

# --- pozadí: rozmazané, bez ostrých okrajů ---
bg = src.copy()
bg = bg.filter(ImageFilter.GaussianBlur(radius=9))
bg.thumbnail((1600, 1600), Image.LANCZOS)
bg.save(OUT / "cafe-bg.webp", quality=72, method=6)
print("bg", bg.size)
