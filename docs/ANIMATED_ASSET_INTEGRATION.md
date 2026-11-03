> Historical asset notes: this describes the optional legacy human. Version 1.8 uses the original Attendant; see UPDATE_1_8.md and source-assets/attendant/INTEGRATION.txt.

# Animated actor and foley integration

## Integrated files

The final game already contains `dist/assets/models/contractor.glb`, all four added audio files, merged asset-manifest entries, and the original license records. No manual copy step is needed. The acquisition/conversion workspace is not part of the runtime ZIP. Source download links and archive hashes are in the merged manifest.

## Actor

`models/contractor.glb` is an actual skinned and animated glTF 2.0 model, with an embedded original 32×32 color palette. The complete model, texture, skeleton and four clips fit in about 598 KiB. Its appearance is simple clothing: pale-blue shirt and blue trousers. It is not a detailed maintenance uniform.

- One draw primitive, one mesh, one material, one skin, 41 joints.
- 1,578 triangles; glTF has 4,651 exported vertices because UV seams and flat face normals duplicate original mesh vertices.
- Source mesh had 791 geometric vertices. The export retains its low-poly silhouette.
- File coordinates: +Y up, face toward +Z. Verified by rendering the imported GLB from the front and inspecting its face/feet.
- Keep scale **1**. The included `Contractor_Normalization` parent already scales the original source and places its feet on the floor.
- At Idle frame 0 its exact sampled bounds are approximately X −0.432 to +0.389 m, Y 0 to 1.850 m, Z −0.348 to +0.447 m. Walk stands taller, about 1.93 m. These are sampled skinned-pose bounds, not a guarantee for every frame.
- The animation clips are in-place cycles with small original pose motion. Move the actor wrapper through the level; the animation does not move the NPC from waypoint to waypoint.
- An upright collision capsule of about 1.9 m height and 0.32 m radius is a reasonable starting point. Keep gameplay collision separate from the visual mesh.

| Exact animation group name | Duration | Suggested use |
|---|---:|---|
| `Idle` | 10.000 s | Stationary watching/listening loop |
| `Walk` | 1.000 s | Patrol or slow investigation loop |
| `Run` | 0.625 s | Brief chase loop |
| `Working` | 6.417 s | One-shot crouched/bent interaction or investigating a fixture |

Preserve the glTF loader's generated root transformation. Babylon's usual left-handed scene adds a coordinate-conversion root for glTF. Put all imported roots under your own `TransformNode`, then translate/rotate **that wrapper**. Do not replace the imported root's quaternion or scaling. For this exact file, the tested Babylon conversion preserves its +Z front. No extra π heading adjustment is applied.

Select animation groups by name, stop all before starting the first one, then play one state at a time or cross-fade weights briefly. Play looping locomotion with a speed ratio that matches the actor's movement to reduce foot sliding. A switch from walk to run should switch both actual speed and animation. Stop all groups when the actor is disabled. Do not replace the rig with procedural limb cylinders.

The conversion used Blender 4.3.2. It preserved original skeletal actions and mesh, used the author's `ClothedLightSkin.png` palette, generated an exportable PBR material with roughness 0.92, and kept the largest four weights per vertex according to the glTF exporter's standard behavior. It does not need Draco or other decoder extensions. Independent reimported-pose checks and renders were used while preparing the asset; those intermediate inspection images are not runtime files.

## Foley

| File | Duration | Channels | Intended use |
|---|---:|---:|---|
| `click.ogg` | 0.010 s | Mono | Small UI/contact tick; do not amplify sharply. |
| `switch.ogg` | 0.611 s | Stereo | Flashlight or small switch activation. Downmix through your positional Web Audio graph if attached to a world object. |
| `ui-open.ogg` | 0.148 s | Mono | Menu/inventory opening cue. It is not mechanical door foley. |
| `drip.ogg` | 20.063 s | Mono | Low-gain loop attached to a pipe or puddle, using distance attenuation and room occlusion. |

All audio is 44.1 kHz. Keep existing metal/rattle sounds for physical doors/drawers. The water recording was already offered as a loop; a very short boundary cross-fade can soften a seam if repeated in an unusually quiet room. Start playback only after the player starts/resumes the game. Keep sound-category gains and distance attenuation separate.

## Source and verification

The original 2017 author-uploaded archive is linked in `dist/assets/assets-manifest.json`. To make a new version, download that exact source, open its `.blend` file in Blender, preserve the four named actions, and export glTF with the palette embedded. Keep the model’s normalization and floor placement consistent, then update the runtime file hash and rerun the animation test. Blender is not required to run or edit the game’s JavaScript.

Validation performed: inspected the author's license text and saved source-page snapshots; parsed the resulting GLB for actual skeleton and animation channels; re-imported the exported GLB into Blender; sampled each action to confirm changing bone poses; rendered the exported Idle and Walk clips; probed all OGG files and hashed every shipped asset. The shipped regression suite also imports the real GLB through Babylon and samples changing poses. Full in-browser appearance/audio/playthrough verification remains outstanding; see VERIFICATION.md.
