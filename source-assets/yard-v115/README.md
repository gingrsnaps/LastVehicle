# Meridian Service Yard — Last Vehicle 1.15

Ten original reusable low-poly props for the stormy yard and gatehouse. These
add silhouettes and supported clutter without downloading textures or adding
runtime particle, physics, or animation systems. The palette matches the
existing teal, ochre, dark steel, paper and oxidized materials. Wear and moss
are small opaque geometry patches on actual surfaces.

Rebuild from the project root, with Blender 4.3+ and Node available:

```bash
blender --background --python source-assets/yard-v115/build_props.py
node source-assets/yard-v115/validate_props.mjs
python source-assets/yard-v115/make_manifest.py
blender --background source-assets/yard-v115/Meridian_Service_Yard_v115.blend --python source-assets/yard-v115/render_props.py
python source-assets/yard-v115/build_sheet.py
```

The last command requires Pillow; it only assembles inspection renders. No
Python, Blender, or Node dependencies are needed to display the exported GLBs
in the game. `build_props.py` is commented editable source; the `.blend` also
contains the ten source objects and their anchors at their independent origins.
`yard-build.json` records geometry and intended attachment points. The separate
`manifest-fragment.json` is compatible with the release asset manifest but is
not merged automatically. Geometry QA uses the project's real Babylon loader
and NullEngine, verifying both coordinate handedness modes. Blender studio
renders are asset inspection, not an in-game visual or performance test.

See `integration.md` for world placement, colliders, batching, and anchor rules.
All assets are original CC0; see `LICENSE.txt`. No attribution is required.
