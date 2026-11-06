# Last Vehicle 1.17 — supplemental surface pack

Six public CC0 materials from Poly Haven, delivered as twelve **512 × 512**
JPEGs: one diffuse/base-color map and one roughness map per material.
Runtime addition: **643,916 bytes**. A conservative uncompressed RGBA8 allocation
with all mip levels is about **16 MiB** for all twelve maps, before engine
overhead; actual hardware/browser memory can differ. These files introduce no
runtime download from an external website.

| Runtime prefix | Official asset / authors | Physical tile size | Suggested use |
|---|---|---|---|
| `v117-asphalt` | Asphalt 01 / Dario Barresi, Charlotte Baglioni | 2.08 m | Service yard and road; keep the pebble grain small. |
| `v117-concrete` | Rough Concrete / Dimitrios Savva | 1.23 m | Interior floor, columns, foundation and plain concrete walls. |
| `v117-brick` | Brick Wall 001 / Rob Tuytel, Dimitrios Savva | 3 m | Selected exterior building walls; not every cabinet or small prop. |
| `v117-wood` | Weathered Brown Planks / Dimitrios Savva, Rico Cilliers | 1.8 m | Pallets, boards and wood crates; align grain to the plank direction. |
| `v117-metal` | Painted Metal Shutter / Dario Barresi, Rico Cilliers, Charlotte Baglioni | 2 m | Shutters and corrugated cladding; align the ridges to physical ribs. |
| `v117-leaf-litter` | Forest Leaves 02 / Rob Tuytel | 3 m | Damp ground under bushes and fence borders, not a cutout leaf card. |

Each prefix has `-albedo.jpg` and `-roughness.jpg`. Use `albedo` in sRGB;
roughness is data and must be sampled in linear space. The roughness JPEGs are
grayscale stored as RGB, so select one color channel and disable the metallic
channel contribution if using a packed metal/roughness material input.

Use physical-unit UVs on the actual mesh faces before merging static geometry.
Do not stretch a single texture tile over a 60 m slab or every face of a long
thin box. The brick/wood/shutter materials have a visible direction and should
not be assigned by a generic material-color name alone. Solid-color item labels,
glass and small readable handles should remain deliberately simple.

The source images' color has not been graded. Material tint, roughness strength
and the game lighting control the final low-poly art direction. Existing moss,
peeling paint and rust materials remain complementary. No new normals or
displacement are required; this keeps texture fetch and shader cost bounded.

## Rebuild and provenance

Run `python prepare_textures.py` with Python 3.10+ and Pillow. The script uses the
official `*-files.json` metadata and verifies each cached/downloaded source MD5
before resampling to 512 px. Original 1K maps are in `originals/`; per-source
SHA256 and the exact download URLs are recorded in `manifest-fragment.json`.
Cached originals avoid network requests on a normal rebuild. A missing source
is downloaded through Python's ordinary HTTPS/proxy configuration with TLS
verification enabled. No environment credential overrides are used.

`*-info.json` and `*-files.json` were retrieved from Poly Haven's official public
API on 2026-11-05. The asset pages and `https://polyhaven.com/license` identify
the files as CC0. See `../../dist/assets/licenses/Surfaces-v117.txt` for the
specific credits and license links.

`Surface_Contact_Sheet.jpg` repeats each actual diffuse map in a 2 × 2 grid for
visual seam inspection. Its six cells were inspected. The maps have coherent
granular/industrial detail with no conspicuous tile-boundary break at this
scale. Brick and wood repetition remains visible, so use the physical scales
above and break up large surfaces with authored architecture and damp patches.
This is a texture QA montage, not an in-game screenshot or rendered approval.

`qa-summary.json` records dimensions, encoded size and verification scope. The
runtime loading/material work is implemented elsewhere in the game project.
