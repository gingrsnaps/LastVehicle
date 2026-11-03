# Last Vehicle 1.9 — compact public material additions

Prepared 2026-11-02. All six runtime maps are derived from the official Poly Haven assets below. The official pages and API identify the authors and CC0 license. Original file hashes and exact URLs are recorded in `dist/assets/assets-manifest.json`; captured API metadata and the conversion script are retained under `source-assets/decay/`.

| Runtime prefix | Source / author | Suggested use |
| --- | --- | --- |
| `moss` | [Concrete Moss](https://polyhaven.com/a/concrete_moss), Rob Tuytel | Damp drainage edges and the lit entrance/ramp; small dark tinted patches in the pump room, not bright green coverage of the entire garage. |
| `rust` | [Rusty Metal Sheet](https://polyhaven.com/a/rusty_metal_sheet), Amal Kumar | Damaged cabinets, vent covers, corroded pipe guards, door kick plates, and sheet-metal patches. |
| `peeling` | [Peeling Painted Wall](https://polyhaven.com/a/peeling_painted_wall), Dimitrios Savva | Lower security/storage walls, cracked plaster panels beneath leaks, worn pillar faces. |

## Integration

Copy only the six `*-albedo.jpg` and `*-roughness.jpg` files to `dist/assets/textures/`; merge the `assets` array into the existing license/hash manifest. The package already includes the conversion script and API metadata under `source-assets/decay/`. These assets introduce no external runtime dependency.

Each map is 512×512 RGB JPEG, filtered down from the author's 1K map. Source colors are retained. Use trilinear filtering and mipmaps. A restrained material tint and room lighting should bind these to the existing low-poly geometry; avoid nearest-neighbor filters or pixel-dither effects.

The three albedo maps alone are adequate for Low quality. For PBR roughness use the gray roughness map as the metallic/roughness texture, read roughness from green, disable roughness from alpha, and disable metalness from blue (choose the scalar metalness separately). Maps are already equally gray in each RGB channel. Load roughness maps as linear data, not sRGB. No normal or displacement maps were added, so there is no parallax, extra vertices, shader normal-map variant, or 8K memory cost.

Use UV tiling proportional to surface size rather than stretching one square over a long wall. The original photographed widths are 3m for Concrete Moss, 2m for Rusty Metal Sheet, and 1.8m for Peeling Painted Wall. Reuse shared materials/textures across static surfaces. Avoid multiple stacked transparent decals.

## License

All source assets: **CC0 1.0 Universal**. Poly Haven explicitly allows use, modification, redistribution, and commercial inclusion: https://polyhaven.com/license . License deed: https://creativecommons.org/publicdomain/zero/1.0/ . Credits are included as courtesy and provenance.

## Verification

The official API's MD5 hashes were checked against every downloaded source. Runtime images were fully decoded and checked at 512×512 RGB; output SHA256 and sizes are in the manifest. Base maps were visually inspected as standalone images. No browser, lighting, or in-game placement verification has been claimed; those remain the integrating owner's checks.
