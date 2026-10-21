from pathlib import Path
from math import cos, sin, radians, pi

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "Визуал" / "Сгенерированные_картинки"

UNIT = 1024
SUPER = 4
WORK = UNIT * SUPER
FINAL = 2048


def spoint(point):
    return tuple(int(round(v * SUPER)) for v in point)


def scale_points(points):
    return [spoint(point) for point in points]


def cubic(p0, p1, p2, p3, steps=24):
    pts = []
    for i in range(steps + 1):
        t = i / steps
        mt = 1 - t
        pts.append(
            (
                mt**3 * p0[0]
                + 3 * mt**2 * t * p1[0]
                + 3 * mt * t**2 * p2[0]
                + t**3 * p3[0],
                mt**3 * p0[1]
                + 3 * mt**2 * t * p1[1]
                + 3 * mt * t**2 * p2[1]
                + t**3 * p3[1],
            )
        )
    return pts


def path_points(commands):
    points = []
    current = None
    for command in commands:
        if command[0] == "M":
            current = command[1]
            points.append(current)
        elif command[0] == "L":
            current = command[1]
            points.append(current)
        elif command[0] == "C":
            curve = cubic(current, command[1], command[2], command[3])
            points.extend(curve[1:])
            current = command[3]
    return points


PIECES = {
    "left": path_points(
        [
            ("M", (210, 182)),
            ("C", (210, 116), (258, 84), (314, 108)),
            ("C", (395, 146), (446, 250), (423, 356)),
            ("C", (402, 452), (327, 515), (224, 516)),
            ("L", (210, 516)),
        ]
    ),
    "top": path_points(
        [
            ("M", (448, 116)),
            ("L", (760, 116)),
            ("C", (824, 116), (903, 162), (906, 231)),
            ("C", (909, 310), (823, 372), (680, 374)),
            ("C", (568, 376), (474, 332), (448, 246)),
            ("L", (448, 116)),
        ]
    ),
    "right": path_points(
        [
            ("M", (818, 298)),
            ("C", (884, 300), (940, 354), (946, 424)),
            ("L", (946, 658)),
            ("C", (946, 726), (888, 774), (824, 760)),
            ("C", (742, 734), (690, 650), (704, 548)),
            ("C", (716, 448), (760, 346), (818, 298)),
        ]
    ),
    "bottom": path_points(
        [
            ("M", (312, 662)),
            ("C", (398, 596), (548, 562), (674, 588)),
            ("C", (794, 612), (861, 687), (862, 782)),
            ("L", (264, 782)),
            ("C", (264, 728), (276, 690), (312, 662)),
        ]
    ),
}


DETAIL_LINES = {
    "left": [
        [(315, 130), (310, 222), (336, 300), (312, 392), (260, 490)],
        [(388, 236), (352, 260), (332, 318)],
    ],
    "top": [
        [(502, 186), (574, 182), (626, 198), (700, 184), (808, 192)],
        [(670, 122), (650, 196), (668, 260), (640, 342)],
    ],
    "right": [
        [(902, 322), (884, 412), (902, 514), (874, 704)],
        [(764, 438), (812, 474), (840, 542)],
    ],
    "bottom": [
        [(336, 668), (438, 638), (550, 632), (704, 668), (824, 716)],
        [(516, 586), (526, 654), (516, 746)],
    ],
}


PALETTES = {
    "mono": {
        "left": ((188, 172, 139, 255), (118, 102, 79, 255)),
        "top": ((207, 190, 151, 255), (126, 109, 83, 255)),
        "right": ((184, 168, 137, 255), (105, 94, 80, 255)),
        "bottom": ((198, 181, 141, 255), (116, 98, 73, 255)),
        "outline": (30, 26, 23, 255),
        "rim": (225, 206, 157, 235),
        "detail": (48, 39, 31, 225),
    },
    "color": {
        "left": ((229, 126, 70, 255), (178, 68, 189, 255)),
        "top": ((242, 130, 30, 255), (246, 184, 34, 255)),
        "right": ((122, 60, 232, 255), (158, 82, 238, 255)),
        "bottom": ((32, 196, 213, 255), (46, 112, 230, 255)),
        "outline": (19, 17, 22, 255),
        "rim": (246, 219, 157, 210),
        "detail": (23, 20, 26, 215),
    },
}


def make_mask(points):
    mask = Image.new("L", (WORK, WORK), 0)
    draw = ImageDraw.Draw(mask)
    draw.polygon(scale_points(points), fill=255)
    return mask


def gradient(size, start, end):
    ramp = Image.linear_gradient("L").resize(size, Image.Resampling.BILINEAR)
    return Image.composite(Image.new("RGBA", size, end), Image.new("RGBA", size, start), ramp)


def rotated_ellipse(draw, cx, cy, rx, ry, angle, fill):
    pts = []
    theta = radians(angle)
    for i in range(72):
        a = 2 * pi * i / 72
        x = rx * cos(a)
        y = ry * sin(a)
        pts.append(
            spoint(
                (
                    cx + x * cos(theta) - y * sin(theta),
                    cy + x * sin(theta) + y * cos(theta),
                )
            )
        )
    draw.polygon(pts, fill=fill)


def cut_polygon(draw, points):
    draw.polygon(scale_points(points), fill=(0, 0, 0, 0))


def draw_piece(canvas, name, palette):
    points = PIECES[name]
    mask = make_mask(points)
    fill = gradient((WORK, WORK), *palette[name])
    fill.putalpha(mask)
    canvas.alpha_composite(fill)

    draw = ImageDraw.Draw(canvas)
    closed = scale_points(points + [points[0]])
    draw.line(closed, fill=palette["outline"], width=18 * SUPER, joint="curve")
    draw.line(closed, fill=palette["rim"], width=5 * SUPER, joint="curve")

    for line in DETAIL_LINES[name]:
        draw.line(scale_points(line), fill=palette["detail"], width=9 * SUPER, joint="curve")
        draw.line(scale_points(line), fill=(245, 226, 175, 80), width=3 * SUPER, joint="curve")


def cut_skull_features(canvas):
    draw = ImageDraw.Draw(canvas)

    # Left skull half.
    rotated_ellipse(draw, 315, 354, 75, 54, -16, (0, 0, 0, 0))
    cut_polygon(draw, [(382, 425), (410, 456), (356, 466)])
    draw.line(scale_points([(264, 448), (312, 438), (350, 456)]), fill=(0, 0, 0, 0), width=18 * SUPER)

    # Top brow piece.
    rotated_ellipse(draw, 575, 270, 66, 48, 5, (0, 0, 0, 0))
    rotated_ellipse(draw, 733, 268, 66, 48, -6, (0, 0, 0, 0))
    cut_polygon(draw, [(645, 292), (684, 292), (666, 346)])
    draw.line(scale_points([(500, 236), (596, 226), (655, 240), (725, 226), (836, 236)]), fill=(0, 0, 0, 0), width=15 * SUPER, joint="curve")

    # Right skull half.
    rotated_ellipse(draw, 806, 530, 73, 56, 14, (0, 0, 0, 0))
    cut_polygon(draw, [(724, 614), (782, 636), (720, 678)])
    draw.line(scale_points([(868, 620), (820, 638), (780, 684)]), fill=(0, 0, 0, 0), width=16 * SUPER)

    # Lower jaw piece.
    cut_polygon(draw, [(485, 594), (548, 594), (522, 646)])
    for x in [424, 470, 516, 562, 608, 654]:
        draw.rounded_rectangle(
            [int((x - 16) * SUPER), int(675 * SUPER), int((x + 16) * SUPER), int(770 * SUPER)],
            radius=10 * SUPER,
            fill=(0, 0, 0, 0),
        )
    draw.line(scale_points([(372, 646), (454, 626), (554, 620), (698, 654), (788, 700)]), fill=(0, 0, 0, 0), width=13 * SUPER, joint="curve")


def render_emblem(kind):
    palette = PALETTES[kind]
    canvas = Image.new("RGBA", (WORK, WORK), (0, 0, 0, 0))

    shadow = Image.new("RGBA", (WORK, WORK), (0, 0, 0, 0))
    for points in PIECES.values():
        ImageDraw.Draw(shadow).polygon(scale_points(points), fill=(0, 0, 0, 150))
    shadow = shadow.filter(ImageFilter.GaussianBlur(10 * SUPER))
    canvas.alpha_composite(shadow, (8 * SUPER, 12 * SUPER))

    for name in ["left", "top", "right", "bottom"]:
        draw_piece(canvas, name, palette)
    cut_skull_features(canvas)

    resized = canvas.resize((FINAL, FINAL), Image.Resampling.LANCZOS)
    return resized


def make_preview(mono, color):
    preview = Image.new("RGBA", (2400, 1300), (10, 10, 12, 255))
    for x in range(preview.width):
        tint = int(18 + 20 * x / preview.width)
        ImageDraw.Draw(preview).line([(x, 0), (x, preview.height)], fill=(tint, 14, 18, 255))

    mono_thumb = mono.resize((860, 860), Image.Resampling.LANCZOS)
    color_thumb = color.resize((860, 860), Image.Resampling.LANCZOS)
    preview.alpha_composite(mono_thumb, (260, 210))
    preview.alpha_composite(color_thumb, (1280, 210))

    draw = ImageDraw.Draw(preview)
    for box in [(210, 160, 1170, 1120), (1230, 160, 2190, 1120)]:
        draw.rounded_rectangle(box, radius=34, outline=(210, 182, 124, 130), width=4)
    return preview


def make_mockup(mono):
    source = OUT_DIR / "ИИ_Лорд_рамка_один_череп_gpt_v8.png"
    if not source.exists():
        return None

    base = Image.open(source).convert("RGBA")
    overlay = mono.resize((156, 156), Image.Resampling.LANCZOS)

    draw = ImageDraw.Draw(base, "RGBA")
    cx, cy = 1434, 146
    plaque = [
        (cx - 100, cy - 42),
        (cx - 70, cy - 74),
        (cx + 70, cy - 74),
        (cx + 100, cy - 42),
        (cx + 90, cy + 58),
        (cx - 90, cy + 58),
    ]
    draw.polygon(plaque, fill=(20, 18, 17, 238), outline=(170, 130, 70, 235))
    draw.line(plaque + [plaque[0]], fill=(221, 179, 103, 210), width=5, joint="curve")
    base.alpha_composite(overlay, (cx - 78, cy - 88))
    return base


def save_svg():
    svg_path = OUT_DIR / "playbox_skull_chest_emblem_source.svg"
    svg_path.write_text(
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img">
  <title>Playbox skull chest emblem source</title>
  <rect width="1024" height="1024" fill="none"/>
  <path d="M210 182 C210 116 258 84 314 108 C395 146 446 250 423 356 C402 452 327 515 224 516 L210 516 Z
           M448 116 L760 116 C824 116 903 162 906 231 C909 310 823 372 680 374 C568 376 474 332 448 246 Z
           M818 298 C884 300 940 354 946 424 L946 658 C946 726 888 774 824 760 C742 734 690 650 704 548 C716 448 760 346 818 298 Z
           M312 662 C398 596 548 562 674 588 C794 612 861 687 862 782 L264 782 C264 728 276 690 312 662 Z"
        fill="#cdbb8f" stroke="#211b16" stroke-width="16" stroke-linejoin="round"/>
  <g fill="#050505">
    <ellipse cx="315" cy="354" rx="75" ry="54" transform="rotate(-16 315 354)"/>
    <ellipse cx="575" cy="270" rx="66" ry="48" transform="rotate(5 575 270)"/>
    <ellipse cx="733" cy="268" rx="66" ry="48" transform="rotate(-6 733 268)"/>
    <ellipse cx="806" cy="530" rx="73" ry="56" transform="rotate(14 806 530)"/>
    <path d="M645 292 L684 292 L666 346 Z M485 594 L548 594 L522 646 Z"/>
    <path d="M424 675 h32 v95 h-32z M470 675 h32 v95 h-32z M516 675 h32 v95 h-32z M562 675 h32 v95 h-32z M608 675 h32 v95 h-32z M654 675 h32 v95 h-32z"/>
  </g>
</svg>
""",
        encoding="utf-8",
    )


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    mono = render_emblem("mono")
    color = render_emblem("color")

    mono_path = OUT_DIR / "playbox_skull_chest_emblem_mono.png"
    color_path = OUT_DIR / "playbox_skull_chest_emblem_color.png"
    preview_path = OUT_DIR / "playbox_skull_chest_emblem_preview.png"
    mockup_path = OUT_DIR / "playbox_skull_chest_emblem_mockup_frame.png"

    mono.save(mono_path)
    color.save(color_path)
    make_preview(mono, color).save(preview_path)

    mockup = make_mockup(mono)
    if mockup:
        mockup.save(mockup_path)
    save_svg()

    for path in [mono_path, color_path, preview_path, mockup_path, OUT_DIR / "playbox_skull_chest_emblem_source.svg"]:
        if path.exists():
            print(path)


if __name__ == "__main__":
    main()
