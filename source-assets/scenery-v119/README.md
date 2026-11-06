# Meridian scenery kit — Last Vehicle 1.19

Ten original low-poly props use the existing `Yard115_*` surface palette. All geometry is authored in metres, with +Y up and +Z at the front after glTF export. The kit contains no external textures, models, animations, lights or cameras. Every loaded mesh includes finite face UVs; Last Vehicle can replace those with its physically scaled surface projection.

| File suffix | Purpose | Suggested placement |
|---|---|---|
| `worn-pallet-stack` | Three used, supported wooden pallets | Against loading-bay walls or in garage storage alcoves |
| `dented-bin` | Hollow bin, supported lid, wheel forks and feet | Beside a wall or drain, outside task reach volumes |
| `damaged-road-barrier` | Broad concrete barrier, clipped body and grounded chip | Beyond playable boundary or along roadworks shoulders |
| `tire-stack` | Three real open torus tyres with supported contact | Garage corner, behind parked cars, or outside fence |
| `abandoned-hand-truck` | Fixed wheel/toe-supported hand truck | Beside a stacked crate, facing a loading wall |
| `wall-vent` | Framed, recessed, slatted metal vent | Mounted against an actual wall; rear plane Z=0, lower edge Y=0 |
| `timber-bundle` | Supported timber layers and solid flat bands | Along a wall or shoulder, never across a route |
| `drain-reeds` | Opaque grounded stems with leaves and seed heads | Damp wall/fence bases, drainage margins |
| `rubble-cluster` | Small grounded masonry and wood debris | Damaged wall base or exterior shoulder |
| `maintenance-shed` | Closed distant shed, roof, door and boarded window | Background beyond the fence; it has no explorable interior |

Each filename starts with `lv119-` and ends with `.glb`. Precise dimensions, bounds, material count, anchors, triangle counts and SHA-256 hashes are in `scenery-build.json` and `manifest-fragment.json`. There are **4,136 prototype triangles total**, at most **864** per prop; ten GLBs total **314,888 bytes**. Instances still cost rendering work: share material state, sector-batch static copies and do not give background props shadows or AI collisions.

The source geometry uses closed, consistently wound opaque components. Component intersections are intentional support joins. The tyre centres use the actual polygonal ring height, and the timber layers use their actual thickness, so those stacks have no artificial air gaps. Ground props' actual imported minimum Y is zero; the wall vent is mounted by its rear-plane/lower-edge origin rather than floor placement.

Keep large props out of the player's route and the full swept car footprint. Small reeds and rubble are decorative: do not add invisible full-size collision rectangles to them. Large bins or pallet stacks in a playable space need deliberate matching colliders and clear routes around them. Avoid stacking scenery in front of control faces, journal hints, shelter doors, or line-of-sight affordances. The shed belongs beyond the fence because no interior was authored.

## Rebuild

From the project root, using Blender 4.3+ and Node.js:

```bash
blender -b --threads 2 --python source-assets/scenery-v119/build_props.py
node source-assets/scenery-v119/validate_props.mjs
blender -b source-assets/scenery-v119/Meridian_Scenery_v119.blend --threads 2 --python source-assets/scenery-v119/render_props.py
python source-assets/scenery-v119/build_sheet.py
python source-assets/scenery-v119/make_manifest.py
```

Pillow is needed only for contact-sheet assembly. The game needs neither Blender nor Pillow. Blender saves editable objects in a gallery arrangement; the individual GLBs are exported beforehand at their support origins. The render script makes inspection-only studio transforms and never re-exports gameplay assets.

`validate_props.mjs` imports every actual GLB with the shipped Babylon.js runtime, in both left- and right-handed scenes. It verifies bounds, support origins, anchors, complete finite UVs, normals, winding, opaque materials, hash matches and absence of external dependencies. These are geometry checks, not in-game rendering acceptance.

`Meridian_Scenery_v119_Contact_Sheet.jpg` is made from actual Blender studio renders, with each object fitted to its own tile. Tile sizes are **not a shared physical scale**. It shows the authored base palettes, not Last Vehicle's runtime texture/lighting pass. Final in-game texture scale, lighting, supports and camera views still need review after integration.

The art and generator are dedicated under CC0; see `LICENSE.txt`. Game code, engine libraries and GingrSnaps branding retain their separate terms.
