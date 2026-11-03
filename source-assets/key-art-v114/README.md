# Last Vehicle 1.14 — key and original wall marks

This pack replaces the ambiguous yellow key block with a brass blade, open bow,
steel ring, eyelet and broad maintenance tag. The tag reads **MAINTENANCE / B2
042** using original numeric glyph geometry. It is intentionally larger than a
small household key so its silhouette remains useful in the low-poly scene.
There is no bitmap/pixelation screen treatment, downloaded font or texture.

The four wall marks are original transparent SVGs: two loose paint tags and two
worn administrative stamps. They contain no interaction arrows, puzzle answers,
third-party logos, fonts, scripts, filter effects or external dependencies.
Their lack of prompts should be consistent with decorative world dressing.

## Contents

- `build_key.py` — standalone commented Blender generator.
- `Maintenance_Key_v114.blend` — editable key geometry/materials/anchors.
- `build_decals.py` — original SVG paths and simple line glyphs.
- `validate_key.mjs`, `validation.json` — actual exported glTF/anchor checks in
  Babylon.js 9.33.1, both right- and left-handed scene conventions.
- `key-build.json`, `decals-build.json` — authored bounds and encoded hashes.
- `manifest-fragment.json` — five entries for the release owner to merge.
- `integration.md` — support heights, orientation, and material suggestions.
- `key-top.png`, `key-desk.png` — actual exported GLB imported and rendered in
  Blender, not an imagined product image.
- `Key_Art_v114_Contact_Sheet.png` — the key render and vector decal swatches.

## Rebuild

From the full project root:

```sh
blender --background --python source-assets/key-art-v114/build_key.py
python3 source-assets/key-art-v114/build_decals.py
node source-assets/key-art-v114/validate_key.mjs
python3 source-assets/key-art-v114/make_manifest.py
```

Optional inspection renders:

```sh
blender --background --python source-assets/key-art-v114/render_key.py
python3 source-assets/key-art-v114/build_sheet.py
```

The contact sheet requires Pillow, Inkscape, and an installed DejaVu Sans font
for its explanatory labels. Runtime assets do not use that font. Blender
4.3.2 authored the supplied key. Other Blender versions may change export bytes;
update the fragment hashes after a rebuild and let the release owner review the
shared manifest. The generators do not modify the shared runtime manifest.

## Budget and verification

The key has **882 triangles**, five material primitives, no textures and a
**51,828-byte GLB**. Four SVGs total **8,864 bytes**. Their declared raster size
is 512 × 256 each: approximately 2 MiB for four RGBA8 raster images before
mipmaps and browser bookkeeping. These are resource counts, not GPU benchmarks.

The exported key has finite positions/normals, normalized normals, correct
bounds, support at Y=0 and five named anchors. Both scene handedness conventions
passed the actual Babylon loader checks. The four SVGs passed XML/static-path
checks. The GLB renders and decal contact sheet were visually reviewed offline.
The game's WebGL lighting, pickup animation and camera composition still require
browser review after integration.

See LICENSE.txt. All original runtime artwork and authoring scripts in this
pack are dedicated under CC0-1.0. This does not change unrelated project licenses.
