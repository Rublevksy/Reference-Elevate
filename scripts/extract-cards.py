"""
Z původních reklamních karet (reference/kreativa/card-*.png) vyřízne pro
každou službu:
  - mascot.png  — maskota v póze té karty (rembg, alpha matting, feather)
  - bg.webp     — atmosférické, silně rozmazané a ztmavené pozadí místnosti
                  (bez ostrých hran, splývá do --bg)

Trademarkované ikony (App Store / Google Play, značky produktů na displejích)
se NEEXTRAHUJÍ jako samostatné objekty — na webu je nahrazují vlastní
neutrální HTML/SVG prvky.

Spuštění:
    .venv-tools/bin/python scripts/extract-cards.py
"""
import pathlib
from PIL import Image, ImageFilter, ImageEnhance
from rembg import remove, new_session

SRC_DIR = pathlib.Path("reference/kreativa")
OUT_DIR = pathlib.Path("public/services")

# hrubý oříznutý obdélník kolem maskota (levý, horní, pravý, dolní) v px
# zdrojového 1254x1254 obrázku — zvolený tak, aby se vyhnul cizím logům
# (Nike na botě v e-shopu, App Store/Google Play v aplikaci) a přebytečným
# stolním rekvizitám (hrnek, blok), pokud by se ořízly ošklivě.
CARDS = {
    "weby": {"file": "card-weby.png", "box": (560, 120, 1254, 920)},
    "seo": {"file": "card-seo.png", "box": (700, 520, 1254, 1254)},
    "e-shopy": {"file": "card-eshop.png", "box": (560, 60, 1150, 850)},
    "design": {"file": "card-design.png", "box": (680, 40, 1254, 960)},
    "aplikace": {"file": "card-aplikace.png", "box": (480, 100, 1254, 1000)},
}

session = new_session("isnet-general-use")


def make_mascot(src_path: pathlib.Path, box, out_path: pathlib.Path):
    img = Image.open(src_path).convert("RGB")
    crop = img.crop(box)
    cut = remove(
        crop,
        session=session,
        alpha_matting=True,
        alpha_matting_foreground_threshold=248,
        alpha_matting_background_threshold=15,
        alpha_matting_erode_size=8,
    ).convert("RGBA")

    bbox = cut.getbbox()
    if bbox:
        pad = 6
        l, t, r, b = bbox
        l = max(0, l - pad); t = max(0, t - pad)
        r = min(cut.width, r + pad); b = min(cut.height, b + pad)
        cut = cut.crop((l, t, r, b))

    cut.thumbnail((900, 1400), Image.LANCZOS)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cut.save(out_path, optimize=True)
    print(f"  mascot -> {out_path} ({cut.width}x{cut.height})")


def make_background(src_path: pathlib.Path, out_path: pathlib.Path):
    img = Image.open(src_path).convert("RGB")
    img.thumbnail((1400, 1400), Image.LANCZOS)
    img = img.filter(ImageFilter.GaussianBlur(38))
    img = ImageEnhance.Brightness(img).enhance(0.55)
    img = ImageEnhance.Color(img).enhance(0.85)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, quality=68, method=6)
    print(f"  bg -> {out_path} ({img.width}x{img.height})")


def make_cart_icon():
    """E-shop: neonová ikona košíku je generický tvar, bez cizí značky —
    bezpečně ji vyřízneme jako samostatný objekt."""
    src = SRC_DIR / "card-eshop.png"
    img = Image.open(src).convert("RGB")
    box = (900, 60, 1200, 300)
    crop = img.crop(box)
    cut = remove(
        crop, session=session, alpha_matting=True,
        alpha_matting_foreground_threshold=245,
        alpha_matting_background_threshold=20,
        alpha_matting_erode_size=6,
    ).convert("RGBA")
    bbox = cut.getbbox()
    if bbox:
        cut = cut.crop(bbox)
    out = OUT_DIR / "e-shopy" / "cart-icon.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    cut.save(out, optimize=True)
    print(f"  cart icon -> {out} ({cut.width}x{cut.height})")


def main():
    for slug, cfg in CARDS.items():
        print(f"=== {slug} ===")
        src = SRC_DIR / cfg["file"]
        make_mascot(src, cfg["box"], OUT_DIR / slug / "mascot.png")
        make_background(src, OUT_DIR / slug / "bg.webp")
    make_cart_icon()


if __name__ == "__main__":
    main()
