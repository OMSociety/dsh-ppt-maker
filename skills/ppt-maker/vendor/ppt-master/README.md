# Vendored ppt-master converter

This directory contains the SVG → native DrawingML PPTX converter vendored from
[ppt-master](https://github.com/hugohe3/ppt-master) (commit
`7e0df6705de0cd24345210d31f07fcb5a32b6900`), licensed under the MIT License —
see [LICENSE](LICENSE) in this directory. Copyright (c) 2025-2026 Hugo He.

Only the import closure of `svg_to_pptx.pptx_package.builder` is kept; the
upstream attribution gate (`attribution_guard.py`, integrity checks in
`console_encoding.py`) is not part of this copy. The MIT license terms,
including the copyright notice in `LICENSE`, are preserved as required.

Data files under `pptx_shapes/data/` carry their own licenses (Apache-2.0 and
MIT, see `LICENSE-APACHE-2.0.txt`, `LICENSE-OPEN-XML-SDK-MIT.txt`, `NOTICE.md`
in that directory).

Python dependencies are pinned in `../requirements.txt` and installed into
`skills/ppt-maker/vendor/.venv/` by `scripts/prepare-vendor-env.mjs`.
