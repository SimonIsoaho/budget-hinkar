#!/usr/bin/env python3
"""Rasterize public/icon.svg into PWA PNG sizes."""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SVG = ROOT / "public" / "icon.svg"
OUT_DIR = ROOT / "public" / "icons"


def render_with_sharp(size: int, output: Path) -> None:
    sharp = shutil.which("npx")
    if not sharp:
        raise RuntimeError("npx is required to rasterize icons")

    subprocess.run(
        [
            "npx",
            "sharp-cli",
            "-i",
            str(SVG),
            "-o",
            str(output),
            "resize",
            str(size),
            str(size),
        ],
        check=True,
        cwd=ROOT,
    )


def main() -> None:
    if not SVG.exists():
        print(f"Missing source icon: {SVG}", file=sys.stderr)
        raise SystemExit(1)

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for size, name in ((192, "icon-192.png"), (512, "icon-512.png")):
        output = OUT_DIR / name
        render_with_sharp(size, output)
        print(f"Wrote {output}")


if __name__ == "__main__":
    main()
