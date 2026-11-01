"""Generates the repository's social preview image and touch icons.

Run with the bundled Python runtime:
    python scripts/make-assets.py

Only Pillow is required (it is bundled with the DSH Python runtime).
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

PUBLIC = Path(__file__).resolve().parent.parent / "public"
FONTS = Path("C:/Windows/Fonts")

BG = (8, 9, 10)
CARD = (16, 17, 20)
LINE = (38, 40, 45)
FG = (242, 243, 245)
MUTED = (155, 158, 166)
FAINT = (107, 111, 120)
ACCENT = (139, 139, 245)
ACCENT_DIM = (94, 106, 210)


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    path = FONTS / name
    if path.exists():
        return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def rounded(draw: ImageDraw.ImageDraw, box, radius, fill=None, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def make_og() -> None:
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    # soft vignette rings for depth without a loud gradient
    for i in range(6):
        r = 520 - i * 60
        d.ellipse(
            [W // 2 - r, H // 2 - r + 40, W // 2 + r, H // 2 + r + 40],
            outline=(20 + i * 3, 21 + i * 3, 26 + i * 3),
            width=1,
        )

    # ---- logo mark ---------------------------------------------------------
    rounded(d, (80, 74, 140, 134), 16, fill=CARD, outline=LINE, width=2)
    d.ellipse([96, 90, 128, 122], outline=ACCENT_DIM, width=4)
    d.ellipse([108, 102, 116, 110], fill=ACCENT)
    d.line([(123, 117), (132, 126)], fill=ACCENT_DIM, width=5)

    # ---- wordmark ----------------------------------------------------------
    d.text((160, 82), "MetaLens", font=font("segoeuib.ttf", 62), fill=FG)
    d.text(
        (162, 156),
        "See how your links look before you share.",
        font=font("segoeui.ttf", 27),
        fill=MUTED,
    )

    # ---- platform pills ----------------------------------------------------
    pills = ["X", "Facebook", "LinkedIn", "WeChat"]
    x = 82
    for label in pills:
        tw = d.textlength(label, font=font("segoeuib.ttf", 20))
        pw = int(tw) + 40
        rounded(d, (x, 214, x + pw, 258), 22, fill=CARD, outline=LINE, width=2)
        d.text((x + 20, 222), label, font=font("segoeuib.ttf", 20), fill=ACCENT)
        x += pw + 12

    # ---- preview card mock -------------------------------------------------
    cx, cy, cw, ch = 700, 292, 418, 250
    rounded(d, (cx, cy, cx + cw, cy + ch), 18, fill=(255, 255, 255))
    rounded(d, (cx, cy, cx + cw, cy + 150), 18, fill=(238, 240, 242))
    d.rectangle([cx, cy + 130, cx + cw, cy + 150], fill=(238, 240, 242))
    d.text((cx + 24, cy + 52), "1200 x 630", font=font("segoeuib.ttf", 26), fill=(154, 160, 166))
    d.text((cx + 22, cy + 170), "og:title", font=font("segoeuib.ttf", 24), fill=(15, 20, 25))
    d.text((cx + 22, cy + 204), "og:description — two lines of copy", font=font("segoeui.ttf", 20), fill=(83, 100, 113))
    d.text((cx + 22, cy + 230), "example.com", font=font("segoeui.ttf", 18), fill=(120, 130, 140))

    # ---- footer ------------------------------------------------------------
    d.line([(80, 470), (1120, 470)], fill=LINE, width=1)
    d.text(
        (80, 500),
        "Open Graph & X Card inspection  ·  4 platform previews  ·  meta tag generator",
        font=font("segoeui.ttf", 24),
        fill=FAINT,
    )
    d.text((80, 548), "x.com/0xkillcoin", font=font("segoeuib.ttf", 24), fill=ACCENT)

    out = PUBLIC / "og-cover.png"
    img.save(out, "PNG", optimize=True)
    print(f"wrote {out} ({out.stat().st_size} bytes)")


def make_icon(size: int, name: str) -> None:
    scale = 8
    s = size * scale
    img = Image.new("RGB", (s, s), BG)
    d = ImageDraw.Draw(img)
    rounded(d, (0, 0, s - 1, s - 1), int(s * 0.22), fill=BG)
    inset = int(s * 0.02)
    rounded(
        d,
        (inset, inset, s - inset, s - inset),
        int(s * 0.21),
        outline=(42, 44, 49),
        width=max(1, s // 90),
    )
    cx, cy, r = int(s * 0.44), int(s * 0.44), int(s * 0.21)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=ACCENT_DIM, width=int(s * 0.062))
    ir = int(s * 0.06)
    d.ellipse([cx - ir, cy - ir, cx + ir, cy + ir], fill=ACCENT)
    d.line(
        [(cx + int(r * 0.72), cy + int(r * 0.72)), (int(s * 0.80), int(s * 0.80))],
        fill=ACCENT_DIM,
        width=int(s * 0.075),
    )
    img = img.resize((size, size), Image.LANCZOS)
    out = PUBLIC / name
    img.save(out, "PNG", optimize=True)
    print(f"wrote {out} ({out.stat().st_size} bytes)")


if __name__ == "__main__":
    PUBLIC.mkdir(parents=True, exist_ok=True)
    make_og()
    make_icon(180, "apple-touch-icon.png")
    make_icon(32, "favicon-32.png")
