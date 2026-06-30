#!/usr/bin/env python3
"""Generate PWA icons with bucket graphic on green background."""

from pathlib import Path

from PIL import Image, ImageDraw

GREEN = (27, 107, 74, 255)
RIM = (232, 243, 237, 255)
WHITE = (255, 255, 255, 255)
SHADOW = (216, 227, 220, 255)
OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "icons"


def draw_bucket(draw: ImageDraw.ImageDraw, size: int) -> None:
    margin = size * 0.08
    draw.rounded_rectangle(
        (margin, margin, size - margin, size - margin),
        radius=size * 0.1875,
        fill=GREEN,
    )

    cx = size / 2
    top_y = size * 0.41
    top_w = size * 0.42
    bot_w = size * 0.32
    bot_y = size * 0.74
    stroke = max(3, int(size * 0.055))

    handle_box = (
        cx - top_w * 0.62,
        top_y - size * 0.28,
        cx + top_w * 0.62,
        top_y + size * 0.02,
    )
    draw.arc(handle_box, start=200, end=-20, fill=WHITE, width=stroke)

    rim_h = size * 0.078
    draw.rounded_rectangle(
        (cx - top_w / 2, top_y - rim_h * 0.15, cx + top_w / 2, top_y + rim_h * 0.85),
        radius=size * 0.02,
        fill=RIM,
    )

    body = [
        (cx - top_w / 2 + size * 0.02, top_y + rim_h * 0.7),
        (cx + top_w / 2 - size * 0.02, top_y + rim_h * 0.7),
        (cx + bot_w / 2, bot_y),
        (cx - bot_w / 2, bot_y),
    ]
    draw.polygon(body, fill=WHITE)

    base_h = size * 0.04
    draw.polygon(
        [
            (cx - bot_w / 2, bot_y),
            (cx + bot_w / 2, bot_y),
            (cx + bot_w / 2 + size * 0.02, bot_y + base_h),
            (cx - bot_w / 2 - size * 0.02, bot_y + base_h),
        ],
        fill=SHADOW,
    )


def create_icon(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw_bucket(draw, size)
    return image


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for size, name in ((192, "icon-192.png"), (512, "icon-512.png")):
        create_icon(size).save(OUT_DIR / name, "PNG")
        print(f"Wrote {OUT_DIR / name}")


if __name__ == "__main__":
    main()
