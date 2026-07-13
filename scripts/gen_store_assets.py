#!/usr/bin/env python3
"""Rich Chrome Web Store assets for SalaryLens — aurora backgrounds, glassmorphism,
gradient hero numbers, glow halos and in-context product mocks.
Brand: ink #0b1120, mint #34e0a1, cyan #22d3ee accents."""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops, ImageEnhance

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "store-assets")
ICONS = os.path.join(ROOT, "public", "icons")
os.makedirs(OUT, exist_ok=True)

# ── palette ──
MINT = (52, 224, 161)
MINT_HI = (109, 247, 196)
CYAN = (34, 211, 238)
BLUE = (96, 148, 245)
RED = (248, 113, 104)
GOLD = (245, 184, 74)
VIOLET = (167, 139, 250)
WHITE = (236, 241, 249)
MUTE = (150, 167, 196)
FAINT = (99, 116, 143)

HN = "/System/Library/Fonts/HelveticaNeue.ttc"
REG, BOLD, MED = 0, 1, 10  # face indices (all carry the ₹ glyph)
AU = ARB = BOLD
AR = REG


def f(idx, size):
    return ImageFont.truetype(HN, size, index=idx)


# ── low-level helpers ─────────────────────────────────────────────────────
def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def vgrad(w, h, top, bot):
    g = Image.new("L", (1, h))
    for y in range(h):
        g.putpixel((0, y), int(255 * y / max(1, h - 1)))
    g = g.resize((w, h))
    return Image.composite(Image.new("RGB", (w, h), bot), Image.new("RGB", (w, h), top), g)


def hgrad(w, h, left, right):
    g = Image.new("L", (w, 1))
    for x in range(w):
        g.putpixel((x, 0), int(255 * x / max(1, w - 1)))
    g = g.resize((w, h))
    return Image.composite(Image.new("RGB", (w, h), right), Image.new("RGB", (w, h), left), g)


def rounded_mask(size, radius):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=255)
    return m


def mesh_bg(W, H, blobs):
    """Deep gradient + soft colored aurora blobs (screen-blended) + grid + vignette."""
    img = vgrad(W, H, (12, 18, 38), (6, 9, 17))
    layer = Image.new("RGB", (W, H), (0, 0, 0))
    ld = ImageDraw.Draw(layer)
    for cx, cy, r, col in blobs:
        ld.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
    layer = layer.filter(ImageFilter.GaussianBlur(150))
    img = ImageChops.screen(img, layer)
    # faint dot-grid
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(ov)
    for x in range(0, W, 46):
        for y in range(0, H, 46):
            od.ellipse([x, y, x + 2, y + 2], fill=(255, 255, 255, 7))
    base = img.convert("RGBA")
    base.alpha_composite(ov)
    img = base.convert("RGB")
    # vignette
    v = Image.new("L", (W, H), 0)
    ImageDraw.Draw(v).ellipse([int(W * 0.02), int(H * 0.0), int(W * 0.98), int(H * 1.25)], fill=255)
    v = v.filter(ImageFilter.GaussianBlur(170)).point(lambda p: 255 - p)
    shade = Image.new("RGBA", (W, H), (2, 5, 11, 0))
    shade.putalpha(v.point(lambda p: int(p * 0.55)))
    base = img.convert("RGBA")
    base.alpha_composite(shade)
    return base.convert("RGB")


def glow(img, box, radius, color, blur=40, alpha=150, dy=0):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle(
        [box[0], box[1] + dy, box[2], box[3] + dy], radius=radius, fill=color + (alpha,))
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    base = img.convert("RGBA")
    base.alpha_composite(layer)
    return base.convert("RGB")


def glass(img, box, radius=26, tint=(120, 150, 200), alpha=20, blur=16, bright=1.06,
          border=(150, 175, 210)):
    x0, y0, x1, y1 = [int(v) for v in box]
    region = img.crop((x0, y0, x1, y1)).filter(ImageFilter.GaussianBlur(blur))
    region = ImageEnhance.Brightness(region).enhance(bright)
    region = region.convert("RGBA")
    region.alpha_composite(Image.new("RGBA", region.size, tint + (alpha,)))
    img.paste(region.convert("RGB"), (x0, y0), rounded_mask((x1 - x0, y1 - y0), radius))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([x0, y0, x1 - 1, y1 - 1], radius=radius, outline=border, width=1)
    # top light edge
    d.line([x0 + radius, y0 + 1, x1 - radius, y0 + 1], fill=(210, 225, 245), width=1)


def lin_gradient(size, c0, c1):
    return hgrad(size[0], size[1], c0, c1)


def gtext(img, xy, text, font, c0, c1):
    """Draw gradient-filled text; returns advance width."""
    d = ImageDraw.Draw(img)
    w = int(d.textlength(text, font=font)) + 8
    h = int(font.size * 1.7) + 8
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).text((0, 0), text, font=font, fill=255)
    img.paste(lin_gradient((w, h), c0, c1), (int(xy[0]), int(xy[1])), mask)
    return int(d.textlength(text, font=font))


def rr(d, box, radius, fill=None, outline=None, width=1):
    d.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def tcenter(d, cx, y, s, font, fill):
    b = d.textbbox((0, 0), s, font=font)
    d.text((cx - (b[2] - b[0]) / 2 - b[0], y), s, font=font, fill=fill)


# ── brand mark ────────────────────────────────────────────────────────────
def draw_logo(size):
    S = size * 4
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = int(S * 0.03)
    tile = vgrad(S - 2 * pad, S - 2 * pad, (18, 28, 50), (7, 11, 20)).convert("RGBA")
    img.paste(tile, (pad, pad), rounded_mask(tile.size, int(S * 0.22)))
    d.rounded_rectangle([pad, pad, S - pad, S - pad], radius=int(S * 0.22), outline=(30, 44, 72), width=max(1, S // 200))
    cx, cy, r = int(S * 0.44), int(S * 0.44), int(S * 0.235)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=MINT, width=int(S * 0.072))
    d.line([int(S * 0.61), int(S * 0.61), int(S * 0.80), int(S * 0.80)], fill=MINT, width=int(S * 0.086))
    rf = f(BOLD, int(S * 0.30))
    tb = d.textbbox((0, 0), "\u20b9", font=rf)
    d.text((cx - (tb[2] - tb[0]) / 2 - tb[0], cy - (tb[3] - tb[1]) / 2 - tb[1]), "\u20b9", font=rf, fill=(234, 255, 246))
    return img.resize((size, size), Image.LANCZOS)


def brand_bar(img, W, H):
    d = ImageDraw.Draw(img)
    lg = draw_logo(38)
    img.paste(lg, (92, 74), lg)
    d.text((142, 78), "SalaryLens", font=f(BOLD, 24), fill=WHITE)
    d.text((142, 106), "CTC to in-hand", font=f(AR, 14), fill=MINT)
    tag = "chrome extension \u00b7 for indian tech"
    tw = d.textlength(tag, font=f(MED, 15))
    d.text((W - 92 - tw, 88), tag, font=f(MED, 15), fill=FAINT)


def check_icon(d, x, y, s=22):
    d.ellipse([x, y, x + s, y + s], fill=(16, 46, 34), outline=MINT, width=2)
    d.line([x + s * 0.28, y + s * 0.52, x + s * 0.44, y + s * 0.68], fill=MINT, width=3)
    d.line([x + s * 0.44, y + s * 0.68, x + s * 0.74, y + s * 0.32], fill=MINT, width=3)


def chips(d, x, y, items, gap=12):
    fc = f(MED, 17)
    cx = x
    for label in items:
        w = int(d.textlength(label, font=fc)) + 34
        rr(d, [cx, y, cx + w, y + 38], 19, fill=(17, 30, 49), outline=(40, 62, 92), width=1)
        d.ellipse([cx + 14, y + 16, cx + 22, y + 24], fill=MINT)
        d.text((cx + 28, y + 9), label, font=fc, fill=(200, 213, 232))
        cx += w + gap
    return 38


# ── the result card (glassmorphic) ────────────────────────────────────────
def _card_body(img, x, y, data, w, h):
    glass(img, [x, y, x + w, y + h], 28, tint=(90, 130, 190), alpha=16, blur=18, bright=1.04)
    d = ImageDraw.Draw(img)
    d.line([x + 28, y + 2, x + w - 28, y + 2], fill=MINT, width=3)
    pad = 28
    cx0, cy = x + pad, y + pad
    lg = draw_logo(36)
    img.paste(lg, (cx0, cy), lg)
    d.text((cx0 + 46, cy + 7), "SalaryLens", font=f(BOLD, 21), fill=WHITE)
    badge = data["badge"]
    bw = int(d.textlength(badge, font=f(BOLD, 15))) + 24
    rr(d, [x + w - pad - bw, cy + 3, x + w - pad, cy + 28], 8, fill=(15, 44, 33), outline=(34, 78, 58), width=1)
    d.text((x + w - pad - bw + 12, cy + 7), badge, font=f(BOLD, 15), fill=MINT_HI)

    cy += 56
    d.text((cx0, cy), data["label"], font=f(AR, 17), fill=MUTE)
    cy += 28
    bigw = gtext(img, (cx0, cy), data["big"], f(BOLD, 56), MINT_HI, CYAN)
    d.text((cx0 + bigw + 10, cy + 28), "/mo", font=f(AR, 21), fill=MUTE)
    chw = 100
    rr(d, [x + w - pad - chw, cy + 4, x + w - pad, cy + 62], 13, fill=(14, 43, 32), outline=(32, 74, 55), width=1)
    tcenter(d, x + w - pad - chw / 2, cy + 10, data["pct"], f(BOLD, 27), MINT_HI)
    tcenter(d, x + w - pad - chw / 2, cy + 42, data["pctlabel"], f(AR, 13), MUTE)

    cy += 76
    d.text((cx0, cy), data["sub"], font=f(AR, 15), fill=MUTE)
    cy += 36
    seg = data["seg"]
    total = sum(s[1] for s in seg) or 1
    bx = cx0
    bw2 = w - 2 * pad
    for i, (col, val, _l) in enumerate(seg):
        sw = int(bw2 * val / total) if i < len(seg) - 1 else (cx0 + bw2) - bx
        if sw > 0:
            rr(d, [bx, cy, bx + sw, cy + 14], 3, fill=col)
        bx += sw
    cy += 30
    colx = [cx0, cx0 + bw2 // 2]
    fleg, flegb = f(AR, 16), f(BOLD, 16)
    for i, (col, val, lab) in enumerate(seg):
        gx = colx[i % 2]
        gy = cy + (i // 2) * 27
        d.rounded_rectangle([gx, gy + 3, gx + 11, gy + 14], radius=3, fill=col)
        d.text((gx + 19, gy), lab, font=fleg, fill=(176, 190, 214))
        d.text((gx + 19 + int(d.textlength(lab + " ", font=fleg)), gy), data["legvals"][i], font=flegb, fill=WHITE)


# ── in-page pill + browser + job post ─────────────────────────────────────
def draw_pill(img, x, y):
    glow(img, [x, y, x + 236, y + 48], 24, MINT, blur=26, alpha=90)
    d = ImageDraw.Draw(img)
    rr(d, [x, y, x + 236, y + 48], 24, fill=(13, 34, 27), outline=MINT, width=2)
    lg = draw_logo(28)
    img.paste(lg, (x + 10, y + 10), lg)
    d.text((x + 48, y + 14), "In-hand", font=f(AR, 16), fill=MUTE)
    gtext(img, (x + 120, y + 12), "\u20b91.05L/mo", f(BOLD, 19), MINT_HI, CYAN)


def draw_browser(img, x, y, w, h, url):
    glow(img, [x, y, x + w, y + h], 18, (20, 40, 70), blur=45, alpha=170, dy=22)
    d = ImageDraw.Draw(img)
    rr(d, [x, y, x + w, y + h], 16, fill=(14, 21, 35), outline=(44, 60, 90), width=2)
    bar = 48
    region = vgrad(w - 4, bar, (24, 33, 52), (18, 26, 42))
    img.paste(region, (x + 2, y + 2), rounded_mask((w - 4, bar), 14))
    d.line([x, y + bar, x + w, y + bar], fill=(40, 54, 82), width=2)
    for i, col in enumerate([(237, 106, 94), (245, 191, 79), (98, 197, 108)]):
        d.ellipse([x + 22 + i * 24, y + 18, x + 34 + i * 24, y + 30], fill=col)
    ub = [x + 100, y + 12, x + w - 22, y + 36]
    rr(d, ub, 12, fill=(10, 16, 28), outline=(40, 55, 84), width=1)
    d.ellipse([ub[0] + 13, y + 18, ub[0] + 25, y + 30], outline=MUTE, width=2)
    d.text((ub[0] + 36, y + 15), url, font=f(AR, 15), fill=(160, 176, 205))
    return x, y + bar, w, h - bar


def draw_job_post(img, rect, job, card_data):
    cx, cy, cw, ch = rect
    d = ImageDraw.Draw(img)
    px, yy = cx + 32, cy + 30
    rr(d, [px, yy, px + 44, yy + 44], 11, fill=job["logo"])
    tcenter(d, px + 22, yy + 9, job["logo_ch"], f(BOLD, 23), (10, 15, 26))
    d.text((px + 58, yy + 2), job["company"], font=f(BOLD, 19), fill=WHITE)
    d.text((px + 58, yy + 26), job["place"], font=f(AR, 15), fill=MUTE)
    yy += 62
    d.text((px, yy), job["title"], font=f(BOLD, 31), fill=WHITE)
    yy += 44
    d.text((px, yy), job["meta"], font=f(AR, 16), fill=MUTE)
    yy += 36
    if job.get("salary"):
        sw = int(d.textlength(job["salary"], font=f(MED, 17))) + 26
        rr(d, [px, yy, px + sw, yy + 36], 9, fill=(16, 27, 44), outline=(42, 58, 86), width=1)
        d.text((px + 13, yy + 8), job["salary"], font=f(MED, 17), fill=(212, 222, 238))
    else:
        d.ellipse([px, yy + 3, px + 16, yy + 19], outline=GOLD, width=2)
        d.text((px + 6, yy + 1), "!", font=f(BOLD, 15), fill=GOLD)
        d.text((px + 28, yy), job["no_salary"], font=f(AR, 16), fill=FAINT)
    yy += 54
    _card_body(img, px, yy, card_data, cw - 64, 316)


# ── donut ring ────────────────────────────────────────────────────────────
def donut(img, cx, cy, r, thick, segs, center_top, center_big, center_bot):
    d = ImageDraw.Draw(img)
    start = -90
    for frac, col in segs:
        d.arc([cx - r, cy - r, cx + r, cy + r], start, start + frac * 360, fill=col, width=thick)
        start += frac * 360
    d.text((cx, cy - 42), center_top, font=f(AR, 16), fill=MUTE, anchor="mm")
    gt = center_big
    fw = f(BOLD, 44)
    ww = ImageDraw.Draw(img).textlength(gt, font=fw)
    gtext(img, (cx - ww / 2, cy - 26), gt, fw, MINT_HI, CYAN)
    d.text((cx, cy + 34), center_bot, font=f(AR, 15), fill=MUTE, anchor="mm")


# ── slide layouts ─────────────────────────────────────────────────────────
def base_img(blobs):
    return mesh_bg(1280, 800, blobs)


def left_text(img, kicker, headline_parts, sub, y0=250):
    """headline_parts: list of (text, gradient_bool) lines."""
    d = ImageDraw.Draw(img)
    lx = 92
    d.text((lx, y0), kicker, font=f(BOLD, 22), fill=MINT)
    ty = y0 + 44
    for text, grad in headline_parts:
        if grad:
            gtext(img, (lx, ty), text, f(BOLD, 62), MINT_HI, CYAN)
        else:
            d.text((lx, ty), text, font=f(BOLD, 62), fill=WHITE)
        ty += 72
    ty += 8
    for line in sub.split("\n"):
        d.text((lx, ty), line, font=f(AR, 23), fill=MUTE)
        ty += 33
    return lx, ty


def slide_hero(idx):
    img = base_img([(1080, 120, 460, (16, 120, 92)), (300, 720, 420, (30, 60, 120)),
                    (760, 420, 300, (14, 90, 110))])
    brand_bar(img, 1280, 800)
    lx, ty = left_text(img, "REAL TAKE-HOME, DECODED",
                       [("Your \u20b918L offer", False), ("is really \u20b91.05L", True), ("a month.", False)],
                       "SalaryLens decodes any Indian CTC into the money\nthat actually lands in your bank \u2014 instantly.", y0=232)
    d = ImageDraw.Draw(img)
    chips(d, lx, ty + 20, ["New regime FY25-26", "EPF + gratuity", "87A rebate"])
    card = dict(badge="IN-HAND", label="Real monthly in-hand", big="\u20b91,05,204", pct="70%",
                pctlabel="of cash", sub="from \u20b918,00,000 CTC \u00b7 new tax regime",
                seg=[(MINT, 1264000, "In-hand"), (BLUE, 216000, "EPF"), (GOLD, 180000, "Bonus")],
                legvals=["\u20b912.6L", "\u20b92.2L", "\u20b91.8L"])
    _card_body(img, 726, 244, card, 470, 322)
    save(img, idx)


def slide_context(idx, kicker, headline_parts, sub, job, card):
    img = base_img([(1090, 140, 460, (16, 110, 86)), (280, 700, 400, (28, 54, 110)),
                    (820, 460, 280, (12, 80, 100))])
    brand_bar(img, 1280, 800)
    bx, by, bw, bh = 618, 138, 626, 566
    lx, ty = left_text(img, kicker, headline_parts, sub, y0=250)
    d = ImageDraw.Draw(img)
    chips(d, lx, ty + 20, job["chips"])
    rect = draw_browser(img, bx, by, bw, bh, job["url"])
    draw_job_post(img, rect, job, card)
    save(img, idx)


def slide_stock(idx):
    img = base_img([(1050, 150, 460, (70, 40, 130)), (300, 700, 400, (16, 100, 80)),
                    (820, 460, 260, (40, 60, 120))])
    brand_bar(img, 1280, 800)
    left_text(img, "CASH vs STOCK, DONE RIGHT",
              [("RSU is not your", False), ("monthly salary.", True)],
              "SalaryLens splits total comp into cash and stock,\nso your in-hand reflects real take-home \u2014\nnot the inflated headline number.", y0=250)
    # donut on the right
    glow(img, [800, 300, 1180, 680], 190, VIOLET, blur=70, alpha=55)
    donut(img, 990, 470, 150, 42,
          [(0.53, VIOLET), (0.28, MINT), (0.10, RED), (0.09, BLUE)],
          "Senior SWE @ Google", "~\u20b91.05Cr", "total comp / year")
    d = ImageDraw.Draw(img)
    leg = [(VIOLET, "Stock / RSU", "53%"), (MINT, "In-hand cash", "28%"),
           (RED, "Tax", "10%"), (BLUE, "EPF + others", "9%")]
    ly = 640
    for col, lab, pc in leg:
        d.rounded_rectangle([760, ly + 3, 771, ly + 14], radius=3, fill=col)
        d.text((782, ly), lab, font=f(AR, 17), fill=(196, 208, 226))
        d.text((1130, ly), pc, font=f(BOLD, 17), fill=WHITE)
        ly += 30
    save(img, idx)


def slide_private(idx):
    img = base_img([(1060, 150, 440, (16, 110, 90)), (300, 700, 380, (26, 52, 108)),
                    (800, 470, 260, (12, 84, 104))])
    brand_bar(img, 1280, 800)
    lx, ty = left_text(img, "PRIVATE BY DESIGN",
                       [("Runs 100%", False), ("on your device.", True)],
                       "No sign-up. No tracking. No servers.\nYour numbers never leave Chrome.", y0=252)
    d = ImageDraw.Draw(img)
    feats = ["New tax regime FY25-26 + 87A rebate",
             "EPF, gratuity & professional tax modelled",
             "Cash vs stock separated \u2014 90+ companies",
             "Free forever \u2014 no account required"]
    fy = ty + 24
    for item in feats:
        check_icon(d, lx, fy, 24)
        d.text((lx + 38, fy + 1), item, font=f(AR, 20), fill=(200, 212, 230))
        fy += 44
    # glass "privacy" card on right with lock
    bx, by, bw, bh = 726, 250, 470, 300
    glow(img, [bx, by, bx + bw, by + bh], 28, MINT, blur=55, alpha=60)
    glass(img, [bx, by, bx + bw, by + bh], 28, tint=(90, 130, 190), alpha=16, blur=18)
    lock_x, lock_y = bx + bw // 2, by + 92
    d.arc([lock_x - 21, lock_y - 30, lock_x + 21, lock_y + 12], 180, 360, fill=MINT, width=7)
    d.rounded_rectangle([lock_x - 33, lock_y, lock_x + 33, lock_y + 50], radius=12,
                        fill=(15, 44, 33), outline=MINT, width=3)
    d.ellipse([lock_x - 8, lock_y + 15, lock_x + 8, lock_y + 31], fill=MINT_HI)
    d.polygon([(lock_x - 4, lock_y + 26), (lock_x + 4, lock_y + 26),
               (lock_x + 6, lock_y + 42), (lock_x - 6, lock_y + 42)], fill=MINT_HI)
    tcenter(d, bx + bw // 2, by + 172, "0 bytes collected", f(BOLD, 30), WHITE)
    tcenter(d, bx + bw // 2, by + 216, "chrome.storage.local only \u00b7 on-device", f(AR, 16), MUTE)
    save(img, idx)


def save(img, idx):
    img.save(os.path.join(OUT, f"screenshot-{idx}.png"))
    print("wrote", f"screenshot-{idx}.png")


# ── promo tiles ───────────────────────────────────────────────────────────
def promo(name, W, H, headline, sub, small=False):
    img = mesh_bg(W, H, [(int(W * 0.82), int(H * 0.2), int(H * 1.1), (16, 110, 86)),
                         (int(W * 0.1), int(H * 0.9), int(H * 0.9), (28, 54, 110))])
    d = ImageDraw.Draw(img)
    ls = int(H * (0.34 if small else 0.30))
    lg = draw_logo(ls)
    ly = int(H * (0.12 if small else 0.16))
    img.paste(lg, (int(W * 0.07), ly), lg)
    tx = int(W * 0.07) + ls + 22
    d.text((tx, ly + int(H * 0.03)), "SalaryLens", font=f(BOLD, int(H * (0.14 if small else 0.12))), fill=WHITE)
    d.text((tx, ly + int(H * (0.20 if small else 0.17))), sub, font=f(MED, int(H * 0.05)), fill=MINT)
    gtext(img, (int(W * 0.07), int(H * (0.58 if small else 0.62))), headline, f(BOLD, int(H * (0.10 if small else 0.085))), MINT_HI, CYAN) \
        if small else d.text((int(W * 0.07), int(H * 0.62)), headline, font=f(BOLD, int(H * 0.085)), fill=WHITE)
    img.save(os.path.join(OUT, name))
    print("wrote", name)


def main():
    for s in (16, 48, 128):
        draw_logo(s).save(os.path.join(ICONS, f"icon{s}.png"))
    draw_logo(128).save(os.path.join(OUT, "store-icon-128.png"))
    draw_logo(512).save(os.path.join(OUT, "icon-512.png"))
    print("wrote icons")

    real = dict(badge="IN-HAND", label="Real monthly in-hand", big="\u20b91,05,204", pct="70%",
                pctlabel="of cash", sub="from \u20b918L CTC \u00b7 new tax regime FY25-26",
                seg=[(MINT, 1264000, "In-hand"), (BLUE, 216000, "EPF"), (GOLD, 180000, "Bonus")],
                legvals=["\u20b912.6L", "\u20b92.2L", "\u20b91.8L"])
    est = dict(badge="ESTIMATED", label="Est. monthly in-hand (cash)", big="\u20b91,78,300", pct="62%",
               pctlabel="of cash", sub="Senior SWE \u00b7 ~\u20b942L total \u00b7 cash \u20b930L + stock \u20b912L/yr",
               seg=[(MINT, 2140000, "In-hand"), (BLUE, 220000, "EPF"), (RED, 640000, "Tax"), (VIOLET, 1200000, "Stock")],
               legvals=["\u20b921.4L", "\u20b92.2L", "\u20b96.4L", "\u20b912L"])
    job2 = dict(url="linkedin.com/jobs/view/software-engineer-ii", company="Razorpay",
                place="Bengaluru, India \u00b7 Full-time", logo=(2, 102, 255), logo_ch="R",
                title="Software Engineer II", meta="Posted 3 days ago \u00b7 214 applicants",
                salary="\u20b918,00,000 \u2013 \u20b922,00,000 a year",
                chips=["LinkedIn", "Naukri", "One-click"])
    job3 = dict(url="linkedin.com/jobs/view/senior-software-engineer", company="Flipkart",
                place="Bengaluru, India \u00b7 Full-time", logo=(255, 183, 0), logo_ch="F",
                title="Senior Software Engineer", meta="Posted 1 week ago \u00b7 530 applicants",
                no_salary="Salary not disclosed by employer",
                chips=["90+ companies", "Role & level aware", "Honest fallbacks"])

    slide_hero(1)
    slide_context(2, "WORKS ON THE JOB POST",
                  [("Right where", False), ("you apply.", True)],
                  "The tile appears on the job post itself \u2014 no\ncopy-paste, no spreadsheet, no tab-switching.", job2, real)
    slide_context(3, "NO SALARY? WE ESTIMATE IT",
                  [("Salary hidden?", False), ("We estimate it.", True)],
                  "Role- and seniority-aware estimates from 90+\ntop employers \u2014 with honest fallbacks.", job3, est)
    slide_stock(4)
    slide_private(5)

    promo("promo-small-440x280.png", 440, 280, "See your real in-hand.", "CTC to monthly take-home", small=True)
    promo("promo-marquee-1400x560.png", 1400, 560, "Decode any Indian CTC into real monthly in-hand.", "on LinkedIn & Naukri")


if __name__ == "__main__":
    main()
