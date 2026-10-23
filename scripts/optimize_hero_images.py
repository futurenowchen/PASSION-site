#!/usr/bin/env python3
"""Safely optimize PASSION homepage photos without changing names or formats.

Default is a read-only preview. Use --apply to update original files in place.
Only existing images/hero assets are considered; hero.json and other media are untouched.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
import os
import sys
import tempfile

from PIL import Image, ImageOps, UnidentifiedImageError

FORMAT_BY_EXTENSION = {
    ".jpg": "JPEG", ".jpeg": "JPEG", ".png": "PNG", ".webp": "WEBP",
}


@dataclass(frozen=True)
class Result:
    filename: str
    status: str
    original_bytes: int
    candidate_bytes: int | None
    note: str = ""


def within(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def optimized_bytes(source: Path, max_edge: int, quality: int) -> tuple[bytes | None, str]:
    extension = source.suffix.lower()
    expected_format = FORMAT_BY_EXTENSION.get(extension)
    if not expected_format:
        return None, "unsupported format (AVIF unchanged)"
    try:
        with Image.open(source) as original:
            if original.format != expected_format:
                return None, f"extension mismatch: {extension} contains {original.format}"
            if getattr(original, "is_animated", False):
                return None, "animated image: do not flatten"
            original.load()
            color_profile = original.info.get("icc_profile")
            work = ImageOps.exif_transpose(original)
            dimensions = work.size
            if max(work.size) > max_edge:
                work.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)
            save_kwargs: dict[str, object] = {}
            if color_profile:
                save_kwargs["icc_profile"] = color_profile
            if expected_format == "JPEG":
                if work.mode not in ("RGB", "L"):
                    work = work.convert("RGB")
                save_kwargs.update(format="JPEG", quality=quality, optimize=True, progressive=True)
            elif expected_format == "PNG":
                save_kwargs.update(format="PNG", optimize=True, compress_level=9)
            elif expected_format == "WEBP":
                save_kwargs.update(format="WEBP", quality=quality, method=6)
            output = BytesIO()
            work.save(output, **save_kwargs)
            result = output.getvalue()
            # Decode the output completely before it can replace the original.
            with Image.open(BytesIO(result)) as verified:
                verified.load()
                if verified.format != expected_format or verified.size != work.size:
                    return None, "encoded image failed format/dimension validation"
            return result, f"{dimensions[0]}x{dimensions[1]} -> {work.width}x{work.height}"
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        return None, f"decode/encode error: {exc}"


def optimize(hero_dir: Path, repo_root: Path,
             apply: bool, max_edge: int, quality: int, min_savings: int) -> list[Result]:
    if not hero_dir.is_dir() or not within(hero_dir, repo_root):
        raise ValueError("Hero folder must exist inside the PASSION-site repo")
    if max_edge < 800 or quality < 50 or quality > 100 or not 0 <= min_savings <= 80:
        raise ValueError("Invalid sizing/quality/savings options")
    results = []
    files = sorted((p for p in hero_dir.iterdir() if p.is_file() and p.suffix.lower() in
                    set(FORMAT_BY_EXTENSION) | {".avif"}), key=lambda p: p.name.lower())
    for photo in files:
        size = photo.stat().st_size
        candidate, note = optimized_bytes(photo, max_edge, quality)
        if candidate is None:
            results.append(Result(photo.name, "SKIP", size, None, note))
            continue
        savings = (size - len(candidate)) / max(size, 1) * 100
        if savings < min_savings:
            results.append(Result(photo.name, "KEEP", size, len(candidate), f"saves {savings:.1f}%; {note}"))
            continue
        if not apply:
            results.append(Result(photo.name, "READY", size, len(candidate), f"saves {savings:.1f}%; {note}"))
            continue
        fd, temp_name = tempfile.mkstemp(prefix=".hero-optimized-", suffix=photo.suffix, dir=photo.parent)
        try:
            with os.fdopen(fd, "wb") as stream:
                stream.write(candidate)
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temp_name, photo)
        finally:
            if os.path.exists(temp_name):
                os.unlink(temp_name)
        results.append(Result(photo.name, "UPDATED", size, len(candidate), f"saves {savings:.1f}%; {note}"))
    return results


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Update original images (default: preview only)")
    parser.add_argument("--max-edge", type=int, default=1600)
    parser.add_argument("--quality", type=int, default=78)
    parser.add_argument("--min-savings", type=int, default=5, help="Minimum percentage saved")
    args = parser.parse_args(argv)
    repo_root = Path(__file__).resolve().parent.parent
    try:
        items = optimize(repo_root / "images" / "hero", repo_root,
                         args.apply, args.max_edge, args.quality, args.min_savings)
    except (ValueError, OSError) as err:
        print(f"ERROR: {err}", file=sys.stderr)
        return 2
    original = sum(x.original_bytes for x in items if x.status in ("READY", "UPDATED"))
    new = sum(x.candidate_bytes or 0 for x in items if x.status in ("READY", "UPDATED"))
    for item in items:
        print(f"{item.status:7} {item.filename:58} {item.original_bytes:>9} -> "
              f"{str(item.candidate_bytes) if item.candidate_bytes is not None else '-':>9}  {item.note}")
    print(f"TOTAL files={len(items)} optimized={sum(x.status in ('READY', 'UPDATED') for x in items)} "
          f"savings={original - new:,} bytes mode={'APPLY' if args.apply else 'PREVIEW'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
