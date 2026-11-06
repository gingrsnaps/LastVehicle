# Integration — yard and gatehouse props

The ten GLBs are ready for the existing bounded loading queue. They contain
one joined mesh apiece and a handful of material primitives; do not give each
subpart its own rigid body, light, update callback, or navigation box. There
are no textures, cameras, animations, or embedded lights.

## Files and authored bounds

| File under `assets/models/` | Width × height × depth (m) | Support | Triangles |
|---|---:|---|---:|
| `v115-yard-dock-cluster.glb` | 1.551 × 1.147 × 1.325 | ground | 464 |
| `v115-yard-dumpster-refuse.glb` | 2.226 × 1.633 × 1.080 | ground | 448 |
| `v115-yard-cable-reel.glb` | 1.449 × 0.780 × 1.012 | ground | 1156 |
| `v115-yard-drain-weeds.glb` | 1.097 × 0.232 × 0.877 | ground | 539 |
| `v115-yard-road-barrier.glb` | 2.400 × 1.024 × 0.630 | ground | 384 |
| `v115-yard-gatehouse-desk.glb` | 1.680 × 1.571 × 0.766 | ground | 612 |
| `v115-yard-coat-noticeboard.glb` | 1.121 × 1.380 × 0.199 | wall | 336 |
| `v115-yard-utility-transformer.glb` | 1.564 × 2.130 × 1.050 | ground | 680 |
| `v115-yard-fence-panel.glb` | 3.100 × 2.230 × 0.240 | ground | 608 |
| `v115-yard-drum-store.glb` | 1.500 × 1.179 × 1.505 | ground | 640 |

All units are metres, +Y up and +Z front. All loaded mesh bottoms are Y=0.
Place a floor prop origin exactly at the supporting ground height. Keep scale
1 unless intentionally changing size; never use a mesh-centre Y as its bottom.

The wall coat/noticeboard's rear mounting plane is Z=0. Place its lower edge
roughly 1.0 m above the floor, rear plane 2–3 mm ahead of the actual wall,
rotated so +Z faces into the room. This is the only wall prop. Its coat hangs
from the board, not from a detached or floating attachment point.

Babylon's default left-handed glTF import mirrors source X. Resolve actual
loaded anchor nodes instead of copying source X coordinates. The files'
`__support_bottom` nodes identify the support origin; `__rear_mount` identifies
the wall backing. Each full node name begins with the unprefixed asset ID,
e.g. `gatehouse-desk__radio` or `fence-panel__strike`. `validation.json` records
actual bounds/anchors in both handedness modes. Preserve the import root's
handedness transform when parenting to a world placement root.

## Suggested use

- **Loading bay:** place dock clusters and drum stores in two or three staggered
  groups against the loading wall. Leave at least a 1.5 m continuous passage
  and a broad central vehicle lane; clutter should outline routes.
- **Service corner:** put the dumpster against a wall, cable reel near a work
  area, and drains at water-collection points. The reel includes a toolbox and
  the dumpster includes refuse, so they do not need additional loose clutter.
- **Gatehouse:** the workstation includes drawers, radio, handset, shift sheet,
  trays, tickets and mug. Its actual tabletop is Y=.830 m; the `work_surface`
  anchor is Y=.831. The `radio` anchor faces the player side. Keep furniture
  clear of both exits. Put the coat/board on a different wall from wayfinding.
- **Utility area:** the transformer is grounded on a concrete plinth. Use its
  `control` anchor only if an actual action is authored; otherwise it is scenery.
- **Perimeter:** repeat fence panels end to end at 2.90 m post spacing. Posts
  and feet overlap at joints by design; avoid duplicating both overlapping
  collider posts. Keep the intended gate opening clear.
- **Road:** barriers mark the detour's outside edge, never its centre. The car
  route needs width for the entire turning footprint, not only its centreline.

Small moss patches and wear are part of the geometry. Use the existing damp
walls/decals around the clusters to unify them with the broader environment.
Do not float a drain over a large puddle plane: its rim should sit at the same
terrain support level and remain visible at the water edge.

## Collision and visibility

Derive coarse colliders from actual rotated bounds, not hard-coded unrotated
sizes. Drain/weeds are decorative and receive no walking or navigation
blocker. Furniture, crate, dumpster, drums, spool, transformer, and barrier
need one coarse body blocker each if they can be approached. A wall board is
covered by its supporting wall blocker. Fence wire should block crossing but
allow sight through its openings; the implementation must explicitly support
that distinction. Do not make the wire panel an opaque AI sight wall merely
because its broad navigation rectangle is solid. Perimeter fencing should
also use the actual gate opening for enemy routes.

## Runtime budget

Load each type once before play, then clone/instance from its cached asset
container. Reuse materials by name (`Yard115_*`) across different files, and
include static placements in the world's existing room/material batches.
Classify exterior placements together and gatehouse interiors separately.
Prefer reducing repeated background clusters on Low rather than removing
important navigation silhouettes, controls, or every bit of clutter.

The complete pack is about 351 KiB and 5,867 triangles before repeating props.
Each type is 336–1,156 triangles. Up to eight opaque palette materials are used
by one type; cross-file material sharing and batching avoid multiplying those
costs for every instance. No claim of measured browser FPS is made.

The contact sheet was inspected using Blender studio lighting; the final
in-game placement and lighting still need a real-browser visual pass.
