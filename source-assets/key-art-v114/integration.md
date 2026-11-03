# Integration — maintenance key and wall marks

## Key placement and pickup

Load `assets/models/maintenance-key-v114.glb` during preparation, with the other
bounded model jobs. Replace the existing `key on desk` yellow mesh and retain
the same task/action ID `key`; do not create another quest item. Keep the
original model and label visible at every quality setting.

All design axes are metres, +Y up. The exported mesh's bottom is at Y=0. Its
source bounds are X=-.166..+.249, Y=0...0121, Z=-.038..+.048. The longest axis
is X and the total dimensions are .415 × .0121 × .086 m. The origin is centered
on the main ring, not the entire key/tag assembly. All node scales are 1.

The real Security desk top is **world Y=.925**. The placeholder's .98 was a
mesh-center height and must not be reused as the new model's support height.
Place the support origin at **(-23.4, .925, 18)** before applying any desired yaw.
Use actual loaded bounds / the support anchor for verification. The model fits
within the clear table area around this position. Do not add a collider for it.

Named exported nodes:

| Node suffix | Source position | Meaning |
|---|---|---|
| `__support_bottom` | (0, 0, 0) | Model origin/support level |
| `__table_support` | (-.105, 0, .005) | Blade underside that rests on desk |
| `__grip` | (0, .008, 0) | Ring grip for the pickup hand |
| `__ring` | (0, .008, 0) | Main steel ring center |
| `__tag_center` | (.145, .010, .005) | Center of the tag face |

Every complete node name starts with `maintenance-key-v114`. Babylon's default
left-handed glTF import mirrors source **X**, preserving Y and Z: for example
`tag_center` becomes (-.145, .010, .005) before world transforms. Resolve the
actual node's absolute position instead of copying the source coordinates into
hand targets. `validation.json` records both handedness conventions.

Keep the root under `visuals.dynamicRoots` before static batching. Preserve the
full model's scale through the pickup; move/rotate its root and attach the hand
to the actual grip anchor. Commit the task once at completion, then hide the
whole root. Checkpoint restoration should restore its grounded transform, not
an old animation's midpoint. Use the runtime action prompt for accessible text;
the small physical tag is supporting art.

The key has five non-emissive PBR materials. Do not apply metallic glare/bloom
as an interaction cue. Its material names start `Key114_`; retaining those
materials preserves the intended warm brass, subdued tag and dark printing.
A yaw adjustment may improve readability from the desk's normal approach; test
the loaded orientation from the player camera rather than assuming source X.

## Wall marks

Runtime paths:

- `assets/textures/v114-graffiti-low-tide.svg`
- `assets/textures/v114-graffiti-night.svg`
- `assets/textures/v114-inspection-surface.svg`
- `assets/textures/v114-inspection-meridian.svg`

Each SVG is 512 × 256, with transparent background and only static authored
vector paths. Keep the **2:1** aspect ratio. Suggested physical sizes are
1.2–1.8 × .6–.9 m for paint tags and .55–.8 × .275–.4 m for stamps. These are
cosmetic; they do not get prompts, pickups or navigation blockers.

Use a local texture with alpha enabled on a single outward-facing, lit plane.
Set the plane's normal to the supporting wall normal and keep it **3–5 mm** in
front of that plane to avoid z-fighting. No emissive color is needed. The SVGs
already contain restrained opacity (.48–.56); avoid multiplying that by another
strong fade until in-game contrast has been checked. Keep planes disjoint and
one-sided. Never wrap them over doorways, key labels or essential wayfinding.

Useful placement candidates are the damp Pump perimeter, an empty Storage wall
bay, or the Workshop's flaking wall above unused space. Choose actual wall
surfaces from the level, then check bounds against fixtures and signs. These
are placement suggestions; this pack does not claim those world mounts have
been reviewed. Parent them to permanent architecture and include them in the
appropriate room visibility policy.

Four 512 × 256 RGBA rasterizations are roughly 2 MiB before mipmaps; reuse each
texture for repeated stamps. Do not allocate a new texture per instance. These
subtle marks can remain on Low as a small fixed set, instead of reserving all
environmental storytelling for High.
