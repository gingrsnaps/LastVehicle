# Meridian Yard Details — Last Vehicle 1.16

Six original CC0 props extend the existing yard and gatehouse palette. The
complete set contains **5,128 triangles and 295,064 encoded bytes (288.15 KiB)**.
All runtime geometry is opaque and closed. There are no textures, external
requests, animations, cameras, lights, particle systems, physics or audio.

## Runtime files and measured dimensions

Dimensions below are width × height × depth in metres. `validation.json`
records actual Babylon-loaded bounds, rather than relying only on source
object dimensions. Float32 differences below 0.00001 m are expected.

| File under `dist/assets/models/` | Dimensions (m) | Triangles | Bytes | Material primitives |
|---|---:|---:|---:|---:|
| `v116-yard-loading-trolley.glb` | 1.200 × 1.100 × 1.000 | 796 | 45,920 | 8 |
| `v116-yard-bollard-chain.glb` | 1.600 × 0.986 × 0.603 | 1,600 | 88,624 | 7 |
| `v116-yard-freight-tarp.glb` | 2.500 × 1.200 × 1.500 | 572 | 34,992 | 5 |
| `v116-yard-wall-services.glb` | 1.300 × 2.400 × 0.292 | 728 | 41,016 | 5 |
| `v116-yard-gatehouse-chair.glb` | 0.650 × 0.976410 × 0.650 | 436 | 26,096 | 6 |
| `v116-yard-calendar-coat.glb` | 1.100 × 1.200 × 0.218 | 996 | 58,416 | 8 |

The bollard concrete feet themselves are 0.600 m deep. A supported 3 mm
front wear patch makes the measured overall depth 0.603 m.

## Placement and axes

Coordinates are metres, +Y up, +Z front. Root transforms have unit scale.
Every model's actual lowest vertex is Y=0, and each exports a named
`<asset-id>__support_bottom` node at (0,0,0). Floor prop origins are the
horizontal footprint centre, not the visual mesh centre. Set their roots to
the actual support height; do not add half their mesh height.

The two wall props have a true rear mounting plane at local Z=0:

| Node | Position (local glTF metres) | Facing normal |
|---|---:|---:|
| `wall-services__rear_mount` | (0, 1.200, 0) | (0, 0, 1) |
| `calendar-coat__rear_mount` | (0, 0.600, 0) | (0, 0, 1) |

For wall props, Y=0 is the lower edge of the assembled prop, not the floor.
Position the rear plane 2–3 mm ahead of the wall and rotate +Z into the
room/yard. Suggested lower-edge height is 0.08–0.20 m for the service pipes,
and 0.85–1.05 m for the coat/calendar. The lower origin is preferable when
placing by floor height; the rear anchor is preferable when targeting a
known point on a wall. Use one convention consistently.

Babylon's default left-handed glTF loader mirrors source X through its
import-root transform. Preserve that transform under the placement root.
Resolve actual loaded anchor nodes instead of copying authored X values.
Both handedness modes, including every named anchor, were validated. All
additional anchor positions/normals are listed in `yard-build.json`:
`handle`, `chain_midpoint`, `cover_top`, `junction_face`, `seat_top` and
`calendar_face`. These are attachment markers, not promised interactions.

## Collision, routes and batching

- The trolley has four wheel contacts and two strapped crates. It is fixed
  scenery, with no push mechanic. Use one coarse body blocker derived from
  transformed bounds; place it beside the loading area rather than across
  a doorway or the car lane.
- The bollard pair has clipped concrete feet and a sagging, alternating-link
  chain. The visual gap is open. Use post blockers and, if needed, an explicit
  crossing barrier for the chain. A broad opaque AI sight blocker would be
  incorrect for this prop.
- The freight/tarp cluster is low, solid cover. Its two crates, pallet and
  folded tarp are supported geometry. A coarse opaque body blocker is
  appropriate; leave enough width for the player/enemy route around it.
- Wall services and the calendar/coat belong to the supporting wall's
  collision. Avoid a separate deep box that steals walking clearance.
- The chair is a 0.65 m square footprint and has a seat-top anchor at
  Y=0.524 m. Keep it clear of both gatehouse doors and control approach areas.

Derive collision and navigation dimensions from actual rotated bounds. Do
not assign every small component its own collider or callback. Load each
type once, then instance/clone cached containers and join static placements
to the existing region/material batches. Exterior yard and gatehouse
interior visibility groups should remain separate.

The ten shared names `Yard115_teal`, `Yard115_steel`, `Yard115_dark`,
`Yard115_rubber`, `Yard115_ochre`, `Yard115_paper`, `Yard115_rust`,
`Yard115_concrete`, `Yard115_cloth`, and `Yard115_dust` intentionally reuse
v115's exact colours and PBR values. Each GLB has one glTF mesh with 5–8
material primitives; Babylon imports those primitives as separate render
meshes. Share materials by name and batch them instead of multiplying all
39 raw primitive draws per repeated pack. All source materials use backface
culling because their geometry is closed.

On Low quality, reduce background repetitions while retaining cover and
route silhouettes. This pack adds no lighting, animation or particle cost.
Browser frame rate and final-world collision behaviour are not established
by asset QA.

## Editable source, rebuild and QA

`build_props.py` is the commented, self-contained editable generator.
`Meridian_Yard_Details_v116.blend` contains the six source objects and their
anchors, each at its independent local origin. The objects intentionally
overlap in that source scene; isolate one to edit it. All paths are resolved
relative to the script, so the commands can be run from the project root:

```bash
blender --background --python source-assets/yard-v116/build_props.py
node source-assets/yard-v116/validate_props.mjs
python source-assets/yard-v116/make_manifest.py
blender --background source-assets/yard-v116/Meridian_Yard_Details_v116.blend --python source-assets/yard-v116/render_props.py
python source-assets/yard-v116/build_sheet.py
```

Build tools used: Blender 4.3.2, Node 24 and Python/Pillow. None is required
at runtime. `manifest-fragment.json` includes every GLB's SHA-256, encoded
size, dimensions, anchors, source and license. It is intentionally isolated;
the release owner merges it into the shared release manifest.

Completed verification:

- All 246 authored closed components have two faces per edge, consistent
  winding and positive signed volume. Intentionally overlapping supported
  parts remain separate solids within a joined source mesh.
- The actual GLBs pass import through the project's Babylon.js 9.33.1 loader
  and NullEngine in both handedness modes. Loaded triangle counts, bounds,
  all anchor coordinates and SHA-256 hashes match the build records.
- Every loaded normal is finite and unit length. All imported triangles have
  nonzero area and winding consistent with their normals. The tarp folds are
  explicitly triangulated, so their flat normals match the actual geometry.
- All floor bottoms are Y=0 within 0.000001 m. Both wall rear planes are Z=0
  within the same tolerance. Every material is opaque; GLBs contain zero
  textures, external buffers, cameras, lights or animations.
- `Meridian_Yard_Details_v116_Contact_Sheet.png` and `renders/` show the actual
  editable meshes in Blender studio lighting. Each tile uses its own camera
  framing; the dimension labels are the scale reference. These renders are
  asset inspection, not screenshots of the final game.

`validation.json`, `qa-summary.json` and `yard-build.json` preserve the
machine-readable evidence. Final in-game placement, route clearance,
lighting, occlusion and performance require the release's browser pass.

All geometry and materials are original CC0. See `LICENSE.txt` and the
runtime copy `dist/assets/licenses/Yard-v116.txt`. No attribution is required.
