# Meridian Industrial Detail Pack

24 original low-poly assets for Last Vehicle 1.11. No downloaded geometry or
textures were used. The muted teal/steel/ochre/rubber palette matches the game's
existing materials. The models use embedded PBR material values; they make no
external texture requests and contain no lights, cameras, animation or physics.

## Integration

Every GLB uses **metres, +Y up, +Z front**. Mesh-local geometry starts at its
support bottom Y=0. Wall assets also start at their rear mounting plane Z=0.
Use a parent transform to place the asset; preserve the loader conversion root.
For a wall, +Z points outward into the room. At yaw 0 the front faces south in
the game's existing plan; rotate the parent to the supporting wall's inward
normal. Do not independently change a mesh and leave its anchor behind.

`manifest.json` records each actual mesh's dimensions, minimum/maximum bounds,
triangle count, support type, contacts, byte size, SHA256 and named anchors.
Materials use consistent `Meridian_*` names. Reuse identical material objects across imports before static batching to avoid creating a separate draw group for each copy. Preserve the supplied roughness/metallic values.

Anchor entries contain their exact exported node name. Resolve those nodes and
use their transformed positions when attaching an interaction, emitter or prop.
This is important because Babylon's default left-handed glTF conversion changes
coordinate handedness. Source metadata records glTF coordinates. Read imported
world bounds instead of assuming the source's X coordinate signs are unchanged.

Examples:

- `ticket-dispenser`: front faces the approaching driver; `ticket_slot` and
  `button` are distinct anchors. Keep a clear interaction area in front.
- `battery-charger`: place `support_bottom` on the workshop bench. Its leads and
  clamps are part of the mesh and must also clear the shelf/bench bounds.
- `maintenance-trolley`: all four tires meet Y=0. `top_support` gives the real
  upper tray surface; its rim sits above that plane.
- `parts-cabinet`: `top_support` is the upper work surface. Avoid placing an item
  into the rear raised rim.
- `pressure-gauge`: `connection` aligns with the pipe; `dial_centre` is useful
  for optional inspection. Do not make the gauge float beside a pipe.
- `pipe-bracket`: `pipe_centre` is the clamp axis. Its mounting plate meets Z=0.
- `conduit-junction` and `cable-tray`: use join anchors when extending conduits.
- `desk-lamp`: `light_emitter` is only a marker; any light belongs to the game's
  existing capped light system, not to the imported asset.
- `drain-grate`: its top is 0.04 m above the base (bolt heads slightly higher).
  Place it in a matching opening/recess; covering it with solid floor defeats
  the slotted geometry. The model is not a hole cutter.
- `wall-fan`: blades are static. If a later release animates them, split and rig
  those parts deliberately instead of pretending that the single static mesh
  contains a rotating subassembly.

The wheel stop, bollard, trolley, warning stand and cabinet have explicit ground
contact points. Decorative small objects should not automatically receive full
character-blocking colliders. Ground a model first, then derive an appropriate
collider or mark it decoration-only. Mounting and collision decisions belong to
the level, not a generic model loader.

## Authoring

Run `blender --background --python build_props.py` with Blender 4.3.2. It writes
all GLBs, the manifest and `Meridian_Industrial_Props.blend`. The .blend presents
the editable meshes on an inspection grid; those display offsets are not part
of the exported assets. Every model is a combined static mesh with material
slots and named child anchor nodes.

Render the actual source geometry with:

`blender --background Meridian_Industrial_Props.blend --python render_props.py`

Then run `python build_sheet.py` to assemble the labelled contact sheet (Pillow
is an authoring-only dependency). Inspection-only studio lights are not exported.

Validate with `node validate_models.mjs /absolute/path/to/dist/vendor` using the
project's bundled Babylon.js and glTF loader. The report checks actual imported
GLB geometry in both glTF right-handed and Babylon default left-handed scenes, exact bounds, ground/mount planes, anchor transforms, finite vertex
and normal data, counts and external dependency absence. It does not constitute
a WebGL gameplay performance or subjective lighting review.

## Rights

Original assets are dedicated under CC0; see LICENSE.txt. The asset source and
readable integration metadata are included so future placements can be audited.
