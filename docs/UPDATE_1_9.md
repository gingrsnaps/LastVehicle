# Last Vehicle 1.9 — placement, decay and recovery

A GingrSnaps Project. Low-poly art, Babylon.js 9.33.1. This is the complete browser game source, local launchers and licensed assets. No engine/editor installation or paid asset is required to play.

## Start or upgrade

1. In your existing game, use Pause → Export save if you want an extra backup.
2. Extract the entire new complete ZIP into its own folder. Do not merge it over an old `dist` folder: mixed script versions can cause errors.
3. On Windows, double-click `START_WINDOWS.bat`. On macOS/Linux, run `sh START_MAC_LINUX.sh`. You need Python 3.10+ or Node.js 20+, but no extra packages.
4. Keep the server window open while playing. Do not double-click `dist/index.html`; browser restrictions prevent reliable model loading through `file://`.
5. Choose Continue for the saved checkpoint. Saves belong to a browser origin, including its port. If a new local address does not show Continue, import your exported save from the title screen's save controls.
6. Choose your difficulty, wait for loading, then click Capture mouse. Move the mouse without holding a button. Escape pauses. The explicit drag alternative remains available if the host/browser denies pointer lock.

The itch.io ZIP has `index.html` at its root. Upload it as an HTML game, enable fullscreen, and test it in the actual itch.io frame. Do not upload the complete source ZIP as the HTML entry. Hosted and local saves are separate; export/import transfers progress.

## Controls and objective flow

| Action | Default |
|---|---|
| Move / look | WASD / mouse movement |
| Interact / enter or leave a marked shelter | E |
| Flashlight | F |
| Sprint / crouch | Shift / Ctrl |
| Journal / hints | J / H |
| Pause | Escape |

Bindings can be changed in Settings. Prompts show the active binding. Reading the journal pauses the world. H opens the hint page; you choose how much help to reveal. Important objects and their actions share the same task data used by the journal.

The required route remains: inspect bay 042 → recover the floor battery → collect the Security key → collect fuse and cable in Workshop → install battery and cable under the open hood → restore Electrical power → authorize the exit in Security → raise the north shutter → return to the driver door and escape. The first inspection is a real action; it does not secretly require a workshop item. Optional clues and distractions remain optional.

## What changed and why

### Grounded objects and aligned parking

`placement.js` owns the parking boundaries and car positions. Each car is centered between the two corresponding stripes. Bay 042 has a wider space centered at its existing location so its door and escape route remain usable.

Imported geometry is measured after Babylon applies glTF conversion, yaw and scale. The placement root is then moved until the lowest point rests on its supporting surface. Collision and contact shadows use those transformed dimensions. This also handles source pivots that are not centered.

Workshop cloths now use the actual desk/workbench height. Loose tools rest on the cloth. Shelf crates have been returned to supported shelf positions, the extra monitor is clear of the existing CRT, hero-car tyres touch the floor, and the battery body rests on the floor.

### Deterioration with room-specific details

Six new 512×512 maps supply moss, corroded metal and peeling paint. Damp lower walls, runoff below fittings, damaged cabinets, fallen plaster, broken vent covers and displaced drain covers are built before play. Drainage/ramp growth and the wet pump room differ from the dry workshop and security office.

The added meshes join the existing room/material/sector batches. They introduce no new realtime lights, reflection pass or large transparent decal stack. The art remains low-poly; no pixel-art filter or 32-bit style is mixed in. Actual browser appearance still requires visual inspection.

### New sound, with bounded resource use

The default exploration bed is now a 60-second edit of TokyoGeisha's CC0 Dream 2 Ambience. Eight additional recordings provide cabinet opening, lock turning, tool handling, mechanical strain, structural cracking, shelf creaks, wet footsteps and the creature's metallic step. Full author/source/license details are in `dist/assets/CREDITS.md` and the manifest.

Interaction sounds follow their contact cue. Wet footsteps play in the pump-room wet region. Creature footfalls follow the existing skeletal foot-contact tracker. Quiet structural sounds have room positions, distance falloff and wall muffling, and yield to major scares/chases. Music, ambience, effects, interface volume, loud effects and night dynamic range remain adjustable.

Only two audio decodes run concurrently. Continuing without sound cancels remaining preparation work. Voices are capped at 24, and restarting immediately disconnects old sources and processing nodes. The old 100-second music asset remains available for customization but is not decoded by the default game.

### More deliberate pursuit

The enemy still uses visible evidence, audible events and finite memory. It does not read hidden player coordinates to choose a search target.

Medium and Hard can infer an interception point from observed direction and reachable room connections. A small route graph is prepared during loading; the existing collision-safe navigation still moves the actual actor. Closed shutters are checked live. Failed predictions are cached too, preventing repeated graph work on every frame.

Search choices take reachable travel distance into account. A weaker new noise cannot continually redirect a committed investigation. Turns reduce forward stride to prevent sideways skating. Repeated movement failures cause replanning and eventually a finite search, without teleporting the creature. Difficulty retains its existing warning, hearing, stamina and search differences; Easy uses direct evidence prediction instead of route interception.

### Interaction motion and encounter timing

The hand reaches, holds through contact, curls its fingers and retracts. It follows the battery's moving carrying handle. The battery lifts toward the player, the repair lead seats progressively, and the wrist adds restrained work motion. Locomotion playback follows actual travel speed, including slower cornering. Mouse direction remains under player control.

The three authored Security, Workshop and Electrical encounters wait for the relevant geometry to enter the actual camera view, including its vertical field of view. Positional strain sounds encourage attention without rotating the camera. Looking down at the Security key defers the glass impact. Walking away releases the creature along a real route; a later visible first sighting can complete that encounter instead of leaving it dormant forever.

The workshop event briefly dims the existing fixtures with a smooth envelope; Reduced flashes softens the change. The flashlight remains independent. The escape ignition produces real AI noise evidence, and the existing side-window encounter still requires the actual creature to reach the car. It is optional and is never simulated by teleporting a second monster.

### Safer failure recovery

The recovery screen preserves the last validated checkpoint. It does not write a partially failed interaction over that checkpoint. Reload checkpoint releases the old browser scene and returns to the title screen; Continue restores progress. Reload with Low graphics also selects the lower preset. Neither option forces drag controls.

If storage is blocked, export the checkpoint first. After reloading, import that file. Download diagnostic report includes the error stack, a bounded local action history, current objective, failed assets, graphics settings, frame-time samples and resource counts. Reports stay on your machine until you choose to share them.

Graphics-context loss pauses play. Babylon's restoration mechanism remains in charge; a complete reload is available when restoration cannot produce a reliable scene. This improves recovery but does not identify the cause of an unreported earlier crash.

## Editing the new systems

| File | Main responsibility |
|---|---|
| `dist/js/placement.js` | Bay boundaries, parked-car anchors and transformed model grounding |
| `dist/js/props.js` | Furniture and shelf support positions |
| `dist/js/decay.js` | New surfaces, material loading and static deterioration geometry |
| `dist/js/pursuit.js` | Small route graph and evidence-based interception |
| `dist/js/threat.js` | Hearing, search commitment, cornering and stuck recovery |
| `dist/js/visuals.js`, `staging.js` | Grip/contact motion, battery, vehicle and skeletal presentation |
| `dist/js/audio.js` | New recordings, decoding, voice limits, spatial mix and cleanup |
| `dist/js/recovery.js`, `game.js`, `ui.js` | Bounded fault history and checkpoint reload controls |

For a new prop: choose its support height, measure the complete imported model, and keep the visual/collision definition together. Check nearby objective approaches and the car's complete footprint. For a new recording: copy a locally licensed file, record its source and SHA256, add it to the preparation list, and call it from a real action/event. Never add a first-use download inside a chase.

`docs/Full_Code.md` contains the full current commented text source in code blocks. The actual editable files are also present. The original creature's Blender source and generator remain under `source-assets/attendant/`; Blender is needed only to edit that source, not to run the game.

## Verification and remaining limits

Run `npm test` and `npm run check` with Node.js to repeat the automated checks; no installation step is required. See `VERIFICATION.md` for the measured result and scope.

Browser QA is unavailable in this build environment because the managed preview relay cannot start. Automated tests import real model geometry, run the production scene/controllers, check progression, verify the vehicle route and simulate faults. They do not validate GPU shading, actual pointer-lock permissions, the audible mix, subjective fear, or hardware frame pacing. No guaranteed FPS, crash-free certification or measured 15–30-minute completion time is claimed.

Before a public release, play all three difficulties; inspect every parked car and raised prop; compare flashlight on/off in each room; run each encounter while looking toward and away from it; hide after breaking sight; finish the vehicle escape; and reload saved games. Repeat the same route twice with the FPS/frametime display enabled and export the diagnostic report after any fault. A steady target depends on the player's hardware and graphics settings.
