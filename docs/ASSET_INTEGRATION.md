# Asset integration notes

These public assets are already integrated into the supplied complete build; no copy step is needed to play. The notes below explain their layout for future edits. In 1.6 the bay-042 hero car is original procedural geometry in `js/staging.js`; the public vehicles remain as background cars.

Copy the `models/` and `audio/` directories into the game's `assets/` directory. Copy `CREDITS.md`, `assets-manifest.json`, and `licenses/` to the source package; it is also useful to expose the credits through the game's Credits menu. Do not bundle the acquisition working directory `sources/` or this helper script merely to run the game.

## Models

These are glTF 2.0 binary models with an **external** shared palette at `models/Textures/colormap.png`. That exact case-sensitive relative path must be preserved. Models include their own materials and the vehicles include four wheels; the separate wheel is an optional prop. No animation or rig is included.

In source glTF coordinates, Y is up, vehicle front wheels are toward positive Z, and vehicles rest at approximately Y=0. Babylon's default left-handed glTF conversion adds a root transform: parent that imported root to a placement transform instead of resetting its negative scale. Check the actual in-game heading when applying yaw.

| Model | Bounds: width X × height Y × length Z | Triangles |
|---|---|---:|
| sedan.glb | 1.50 × 1.30 × 2.55 | 2,032 |
| hatchback.glb | 1.30 × 1.10 × 2.85 | 2,088 |
| van.glb | 1.50 × 1.35 × 2.75 | 2,082 |
| suv.glb | 1.50 × 1.30 × 2.70 | 2,474 |
| cone.glb | 0.4762 × 0.5952 × 0.4762 | 172 |
| box.glb | 0.715 × 0.715 × 0.715 | 124 |
| wheel.glb | 0.40 × 0.60 × 0.60 | 332 |
| car-door.glb | 0.188 × 0.90 × 0.80 | 68 |

A uniform vehicle scale near 1.5 produces intentionally stylized cars about four meters long. Their proportions are compact and chunky; this is low-poly art, not photorealism. A slightly darker material multiplier and the same garage lighting will unify the colors. Keep one simple box collider per vehicle and no collision on the decorative wheel or small debris. The wheel's pivot is its center; raise it by its radius when using it as a loose prop.

Load one asset container per model, then instantiate it. Do not fetch the same GLB for every parked car. Keep the imported root transform and material texture dependency intact. Exact source-hierarchy bounds are included in `model-bounds.json`.

## Audio

| File | Duration | Suggested use |
|---|---:|---|
| music.ogg | 100.00 seconds | Quiet looping ambient music; menu and low-level exploration bed |
| ambience.ogg | 2.89 seconds | Looping ventilation hum, preferably positional near vents |
| footstep.ogg | 0.30 seconds | Stone/concrete step; vary playback rate slightly |
| metal.ogg | 0.67 seconds | Door latch, breaker, distant impact |
| rattle.ogg | 0.78 seconds | Service grille or metallic disturbance |
| alarm.ogg | 2.00 seconds | Frenchyboy warning siren (CC0) |
| scare.ogg | 2.60 seconds | Brief authored sting; use sparingly |

Start AudioContext from the user's Begin/Continue click so browser autoplay rules are satisfied. Route music, ambience, effects, and scare sounds through separate gains, then a master gain. Pause or suspend audio while the game is paused or the tab is hidden. The music is already a loopable track; use an AudioBufferSourceNode loop for sample-accurate looping rather than repeatedly recreating an HTML audio element.

There are 16 runtime files including the shared texture, totaling approximately **2.94 MB** before ZIP compression. The supplied Ogg files were decoded successfully by FFmpeg. Actual browser audio, rendering, and game mix still require the owning game's runtime tests.
