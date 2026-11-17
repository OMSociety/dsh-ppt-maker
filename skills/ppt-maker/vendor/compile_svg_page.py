#!/usr/bin/env python3
"""Compile one PPTD svg page into a single-slide .pptx (DrawingML shapes).

Usage:
    python compile_svg_page.py <svg-file> <out.pptx> <resource-root>

Exit code 0 on success; prints a JSON object on stdout:
    {"ok": true, "out": "...", "bytes": 12345}
On failure prints {"ok": false, "error": "..."} and exits 1.

The vendored converter lives next to this script (ppt-master/); the venv
interpreter supplies the pinned third-party dependencies.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

VENDOR_DIR = Path(__file__).resolve().parent / "ppt-master"
sys.path.insert(0, str(VENDOR_DIR))

from svg_to_pptx import create_pptx_with_native_svg  # noqa: E402


def fonts_of_pptx(pptx_path: Path) -> list[str]:
    """Scan slide XML in the compiled pptx for run-level typeface attributes."""
    import re
    import zipfile

    fonts: set[str] = set()
    with zipfile.ZipFile(pptx_path) as zf:
        for name in zf.namelist():
            if not (name.startswith("ppt/slides/slide") and name.endswith(".xml")):
                continue
            xml = zf.read(name).decode("utf-8", errors="replace")
            fonts.update(m for m in re.findall(r'typeface="([^"]+)"', xml) if m and not m.startswith("+"))
    return sorted(fonts)


def main(argv: list[str]) -> int:
    if len(argv) != 4:
        print(json.dumps({"ok": False, "error": "usage: compile_svg_page.py <svg> <out.pptx> <resource-root>"}))
        return 2
    svg_path = Path(argv[1]).resolve()
    out_path = Path(argv[2]).resolve()
    resource_root = Path(argv[3]).resolve()
    if not svg_path.is_file():
        print(json.dumps({"ok": False, "error": f"svg not found: {svg_path}"}))
        return 1
    out_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        ok = create_pptx_with_native_svg(
            [svg_path],
            out_path,
            resource_root=resource_root,
            pptx_structure="flat",
            transition=None,
            animation=None,
            enable_notes=False,
        )
    except Exception as exc:  # noqa: BLE001 - report any converter failure as JSON
        print(json.dumps({"ok": False, "error": f"{type(exc).__name__}: {exc}"}))
        return 1
    if not ok or not out_path.is_file():
        print(json.dumps({"ok": False, "error": "converter reported failure"}))
        return 1
    print(json.dumps({
        "ok": True,
        "out": str(out_path),
        "bytes": os.path.getsize(out_path),
        "fonts": fonts_of_pptx(out_path),
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
