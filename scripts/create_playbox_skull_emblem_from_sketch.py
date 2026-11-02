from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "scratch" / "playbox_skull_logo_user_sketch.png"
OUT_DIR = ROOT / "Визуал" / "Сгенерированные_картинки"


def threshold_mask(image):
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    mask = Image.new("L", rgba.size, 0)
    out = mask.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pixels[x, y]
            mx, mn = max(r, g, b), min(r, g, b)
            brightness = (r * 30 + g * 59 + b * 11) // 100
            saturation = mx - mn
            if a > 0 and (brightness > 28 or saturation > 38):
                out[x, y] = 255
    return mask


def fill_enclosed_holes(mask):
    width, height = mask.size
    source = mask.load()
    seen = bytearray(width * height)
    queue = deque()

    def push(x, y):
        if x < 0 or y < 0 or x >= width or y >= height:
            return
        idx = y * width + x
        if seen[idx] or source[x, y] > 0:
            return
        seen[idx] = 1
        queue.append((x, y))

    for x in range(width):
        push(x, 0)
        push(x, height - 1)
    for y in range(height):
        push(0, y)
        push(width - 1, y)

    while queue:
        x, y = queue.popleft()
        push(x + 1, y)
        push(x - 1, y)
        push(x, y + 1)
        push(x, y - 1)

    filled = Image.new("L", mask.size, 0)
    dst = filled.load()
    for y in range(height):
        for x in range(width):
            if source[x, y] > 0 or not seen[y * width + x]:
                dst[x, y] = 255
    return filled


def edge_from_alpha(alpha, radius=5):
    dilated = alpha.filter(ImageFilter.MaxFilter(radius))
    eroded = alpha.filter(ImageFilter.MinFilter(radius))
    return ImageChops.subtract(dilated, eroded)


def compose_flat_icon(icon_crop, keep_color=False, rim="heraldic"):
    icon = icon_crop.convert("RGBA")
    rough = threshold_mask(icon)
    closed = rough.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    alpha = fill_enclosed_holes(closed).filter(ImageFilter.GaussianBlur(0.6))

    gray = ImageOps.grayscale(icon)
    gray = gray.filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.GaussianBlur(0.9))
    color = Image.new("RGBA", icon.size, (0, 0, 0, 0))
    src = icon.load()
    gpx = gray.load()
    apx = alpha.load()
    rpx = rough.load()
    cpx = color.load()

    for y in range(icon.height):
        for x in range(icon.width):
            if apx[x, y] == 0:
                continue

            r, g, b, _ = src[x, y]
            mx, mn = max(r, g, b), min(r, g, b)
            saturation = mx - mn
            value = gpx[x, y]

            if rpx[x, y] == 0:
                cpx[x, y] = (4, 3, 3, apx[x, y])
            elif keep_color and saturation > 42 and value > 35:
                # Muted source accents: cyan, purple, rust stay as stained enamel, not realism.
                cpx[x, y] = (
                    int(r * 0.72 + 40),
                    int(g * 0.72 + 36),
                    int(b * 0.72 + 30),
                    apx[x, y],
                )
            elif value > 172:
                cpx[x, y] = (196, 178, 137, apx[x, y])
            elif value > 118:
                cpx[x, y] = (142, 124, 94, apx[x, y])
            elif value > 68:
                cpx[x, y] = (82, 70, 56, apx[x, y])
            else:
                cpx[x, y] = (25, 21, 18, apx[x, y])

    outline = edge_from_alpha(alpha, 9 if rim == "heraldic" else 5)
    rim_mask = edge_from_alpha(alpha, 5 if rim == "heraldic" else 3)
    base = Image.new("RGBA", icon.size, (0, 0, 0, 0))
    outline_layer = Image.new("RGBA", icon.size, (11, 9, 8, 255 if rim == "heraldic" else 170))
    outline_layer.putalpha(outline)
    rim_color = (206, 173, 104, 170) if rim == "heraldic" else (166, 146, 105, 70)
    rim_layer = Image.new("RGBA", icon.size, rim_color)
    rim_layer.putalpha(rim_mask)
    base.alpha_composite(outline_layer)
    base.alpha_composite(color)
    base.alpha_composite(rim_layer)
    return base


def fit_to_canvas(image, size, padding):
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        return canvas
    cut = image.crop(bbox)
    max_w = size[0] - padding * 2
    max_h = size[1] - padding * 2
    ratio = min(max_w / cut.width, max_h / cut.height)
    resized = cut.resize((int(cut.width * ratio), int(cut.height * ratio)), Image.Resampling.LANCZOS)
    canvas.alpha_composite(resized, ((size[0] - resized.width) // 2, (size[1] - resized.height) // 2))
    return canvas


def full_logo_from_icon(source, icon):
    width, height = 1024, 1366
    logo = Image.new("RGBA", (width, height), (0, 0, 0, 255))
    fitted = fit_to_canvas(icon, (width, 810), 62)
    logo.alpha_composite(fitted, (0, 40))

    word = source.crop((0, 450, source.width, source.height)).convert("RGBA")
    word = word.resize((840, int(word.height * 840 / word.width)), Image.Resampling.LANCZOS)
    logo.alpha_composite(word, ((width - word.width) // 2, 1038))
    return logo


def mockup_on_frame(icon):
    frame_path = OUT_DIR / "ИИ_Лорд_рамка_один_череп_gpt_v8.png"
    if not frame_path.exists():
        return None
    base = Image.open(frame_path).convert("RGBA")
    emblem = fit_to_canvas(icon, (230, 190), 12)
    draw = ImageDraw.Draw(base, "RGBA")
    cx, cy = 1436, 141
    plaque = [
        (cx - 128, cy - 50),
        (cx - 88, cy - 86),
        (cx + 88, cy - 86),
        (cx + 128, cy - 50),
        (cx + 112, cy + 70),
        (cx - 112, cy + 70),
    ]
    draw.polygon(plaque, fill=(15, 13, 12, 244), outline=(178, 135, 74, 240))
    draw.line(plaque + [plaque[0]], fill=(230, 184, 104, 230), width=4, joint="curve")
    base.alpha_composite(emblem, (cx - emblem.width // 2, cy - emblem.height // 2 - 6))
    return base


def preview(mono, color):
    width, height = 2200, 1220
    canvas = Image.new("RGBA", (width, height), (8, 7, 7, 255))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, width, height), fill=(10, 8, 8, 255))
    for x in range(width):
        if x % 5 == 0:
            tone = int(9 + 18 * x / width)
            draw.line([(x, 0), (x, height)], fill=(tone, 8, 9, 255))

    left = fit_to_canvas(mono, (900, 900), 20)
    right = fit_to_canvas(color, (900, 900), 20)
    canvas.alpha_composite(left, (145, 145))
    canvas.alpha_composite(right, (1155, 145))
    draw.rounded_rectangle((92, 90, 1098, 1100), radius=20, outline=(188, 146, 86, 170), width=4)
    draw.rounded_rectangle((1102, 90, 2108, 1100), radius=20, outline=(188, 146, 86, 170), width=4)
    return canvas


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGBA")
    icon_crop = source.crop((0, 0, source.width, 426))

    mono_raw = compose_flat_icon(icon_crop, keep_color=False)
    color_raw = compose_flat_icon(icon_crop, keep_color=True)
    relief_raw = compose_flat_icon(icon_crop, keep_color=False, rim="relief")
    mono = fit_to_canvas(mono_raw, (2048, 1700), 24)
    color = fit_to_canvas(color_raw, (2048, 1700), 24)
    relief = fit_to_canvas(relief_raw, (2048, 1700), 24)

    paths = {
        "mono": OUT_DIR / "playbox_skull_emblem_from_sketch_mono.png",
        "color": OUT_DIR / "playbox_skull_emblem_from_sketch_color.png",
        "logo_mono": OUT_DIR / "playbox_skull_logo_from_sketch_mono.png",
        "logo_color": OUT_DIR / "playbox_skull_logo_from_sketch_color.png",
        "relief": OUT_DIR / "playbox_skull_emblem_from_sketch_relief.png",
        "logo_relief": OUT_DIR / "playbox_skull_logo_from_sketch_relief.png",
        "preview": OUT_DIR / "playbox_skull_emblem_from_sketch_preview.png",
        "mockup": OUT_DIR / "playbox_skull_emblem_from_sketch_mockup_frame.png",
    }

    mono.save(paths["mono"])
    color.save(paths["color"])
    relief.save(paths["relief"])
    full_logo_from_icon(source, mono_raw).save(paths["logo_mono"])
    full_logo_from_icon(source, color_raw).save(paths["logo_color"])
    full_logo_from_icon(source, relief_raw).save(paths["logo_relief"])
    preview(mono_raw, color_raw).save(paths["preview"])
    mockup = mockup_on_frame(mono_raw)
    if mockup:
        mockup.save(paths["mockup"])

    for path in paths.values():
        if path.exists():
            print(path)


if __name__ == "__main__":
    main()
