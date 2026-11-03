# Last Vehicle 1.10 — pursuit, contact and escape

A GingrSnaps Project. A complete low-poly browser game built with locally bundled Babylon.js 9.33.1. The editable source, models, animation source, licensed audio, launchers and instructions are included. The art remains low-poly throughout.

## Start safely

1. If you have an existing playthrough, use Pause → Export save for an extra backup.
2. Extract the entire complete ZIP into a new folder. Avoid merging new files into an old installation.
3. Windows: double-click `START_WINDOWS.bat`. Mac/Linux: run `sh START_MAC_LINUX.sh`. Alternatively, run `python START_GAME.py` from a terminal in the extracted folder.
4. The launcher needs Python 3.10+ or Node.js 20+. No additional runtime packages or game editor are required. Keep its terminal open while playing.
5. Use the address opened by the launcher. Do not double-click `dist/index.html`: browser security restrictions make `file://` loading unreliable.
6. Confirm **v1.10** on the title screen. Continue resumes a checkpoint. To start fresh, choose New game and a difficulty.
7. After loading and the Controls page, click Enter game / Capture mouse. Move the mouse without holding a button. Escape pauses. If the host denies mouse capture, open the standalone tab or explicitly select drag controls.

Saves and settings belong to the browser address and port. Moving between the hosted game, localhost and itch.io does not transfer a save automatically. Use Export save / Import save to move it. Existing save format 2 and earlier supported checkpoints remain readable. Preferences and remapped keys are preserved.

The three-second **A GingrSnaps Project** intro is enabled for new installations. Settings → Gameplay can skip it. Existing saved preferences retain their choice.

## Controls and the complete route

| Action | Default |
|---|---|
| Move / look | WASD / mouse movement |
| Interact / enter or leave a SHELTER | E |
| Flashlight | F |
| Sprint / crouch | Left Shift / C |
| Journal / hints | J / H |
| Pause | Escape |

The journal contains the current task, its reason, notes, progressive hints and a floor plan. H opens its hint page; answers are revealed only when requested. The journal pauses gameplay. Prompts and instructions use your current key bindings.

The required route is: inspect bay 042 → recover the battery from the floor → take the key in Security → collect the cable and fuse in Workshop → install both repair parts under the car's hood → restore Electrical power → authorize the exit in Security → raise the north shutter → enter the car's **left driver door**.

The left side means left while seated facing forward. The parked car faces west, so its left door is on the **north side of bay 042**, beside the removed battery side of the car. Its front hood still faces the central driving lane. The journal, map marker and interaction target now agree with the door location.

Spoilers: the power sequence is VENTILATION → LIGHTING → ACCESS. Security's code is 1986. Sirens, the valve, the temporary grille and additional evidence are optional. Walking through the exit does not end the game: escape in the repaired car.

## Reliable pursuit

The enemy's navigation now uses a finer eight-direction grid prepared during loading, one consistent body clearance, and collision checks along every movement segment. Static regions are labelled during preparation so clearly disconnected destinations can be rejected quickly. A bounded search prevents an impossible destination from exploring forever.

`locomotion.js` measures progress toward a waypoint over roughly one second. A few millimetres of sideways movement no longer count as successful pursuit. Seeing the player does not erase recovery history. When movement fails, the creature performs a short physical backstep or sidestep and replans; a recently failed navigation edge receives a temporary cost penalty. The controller never relocates the creature through a wall.

Noise inside a cabinet or car is projected onto nearby accessible floor before movement. The remembered evidence is retained separately. Repeated failed approaches become a finite search. Recovery events are kept in the existing bounded diagnostic export with location and state, so another stuck report can be tied to a route.

The AI still sees through a cone and actual height-aware geometry, hears sound at its source, remembers the last observed position and predicts from observed movement. Medium and Hard can intercept plausible routes. Searching ranks reachable cover, entrances and hiding places, and remembers cleared locations. Display brightness does not improve enemy vision.

| Difficulty | Pursuit and hiding |
|---|---|
| Easy | Lower awareness, slower pursuit, shorter searches and longer warning/recovery windows. Unwitnessed hiding remains forgiving. |
| Medium | Route prediction and evidence-based locker searches, with time to react to attack preparation. |
| Hard | Faster pursuit, longer and wider searches, shorter warnings and stronger hearing. |

If it sees you enter a locker, it remembers that entry and can catch you there. An unwitnessed inspection becomes a near discovery: it leans toward the slats and tries the handle, then continues its finite search. Hiding does not reveal your concealed coordinates to its planner. You can still leave with the same interaction key.

## Water and sound that follow contact

`surfaces.js` is the single source for five visible puddle footprints. Each ellipse controls both its drawing and wet-step detection. Water sounds no longer depend on a large pump-room rectangle. A dry spot in the pump room stays dry; a puddle elsewhere produces a splash.

At each foot contact, the game checks the actual left/right foot position, selects one of five distinct recorded splashes without immediate repetition, emits a ripple and optionally droplets, and sends one hearing event to the AI. Crouching creates quieter, smaller splashes; sprinting produces stronger ones. Creature footsteps use the same surface lookup and remain spatially positioned at the creature.

The five shoe recordings come from **Joseph Sardin / BigSoundBank, Shoes in the Water (0690)**. Three new metal effects by **rubberduck** supply scraping, handle strain and solid door contact. All eight runtime additions are CC0 and total 73,772 compressed bytes. Provenance, exact source windows, original hashes and processing are in `dist/assets/assets-manifest.json`; notices are in `dist/assets/licenses/`. `source-assets/surface-audio/prepare-audio.py` reproduces their preparation with FFmpeg.

Rings and droplets are constructed before play and reused. Low quality retains water sounds and four ripple slots without droplets; Medium and High enable bounded droplet pools. There is no fluid simulation, realtime planar reflection or gameplay download. Mineral deposits and damp growth outline the same leaks using batched geometry and the existing material textures.

Settings → Audio includes independent sound-effect captions, loud-effects volume and Night dynamic range. The captions also require Subtitles to be enabled. Room ambience and tension layers continue to follow the room and actual enemy state. Encounter preparation briefly lowers the music so the directional warning can be heard.

## Creature encounters and animation

| Encounter | Behavior |
|---|---|
| Security glass | The blind lifts, the real creature winds up, and its planted strike, glass damage and sound share a contact cue. |
| Workshop breach | The enemy walks to the entrance and braces at the grille. Its hand strikes, the latch lifts, and normal pursuit resumes. The service passage remains another route. |
| Restored power | After the creature reaches the Electrical doorway, a readable view allows the electrical surge and silhouette reveal. |
| Service close pass — new | A nearby creature moves into the west passage, stops and listens. This is conditional on its real position and an available route. |
| Shelter inspection — new | An evidence-based inspection brings its head and hand close to the locker slats and handle. Unwitnessed and witnessed entries have different outcomes. |
| Left window — bonus | A pursuing enemy within physical striking reach can wind up and strike the left window before the car pulls away. |

These are conditional encounters, not a guarantee that every run will display all of them. The director will not teleport the enemy into position or block a required task while waiting for a view. Walking away cancels staging; unfinished story encounters remain eligible. Completed impacts are saved once. Major encounters leave a 45-second authored quiet interval; ordinary pursuit can still occur during that interval.

The GLB now contains **15 clips**, retaining the eight existing actions and adding **TurnLeft, TurnRight, Brake, Backstep, Brace, Strike and InspectClose**. The mesh remains 1,868 triangles with 38 deform joints. The added contact clips contain baked hand reaches and planted feet, so they do not require runtime inverse kinematics.

Sharp turns finish their planted turn cycle. Recovery translation follows the backstep's authored movement phase. Attack/recovery and staged impacts follow the paused gameplay clock. Contact cues are emitted at the intended frame, rather than at the start of a clip. Existing Walk and Run speed matching remains in place.

See `Attendant_Contact_Poses.png` for actual rendered Blender poses, and `source-assets/attendant/` for the editable `.blend`, generator, manifests and pose validation. The eight legacy clips were numerically checked against the previous file and preserved.

## A readable escape

Entry now approaches the left door, reaches for its handle, opens the door, moves into the left seat, and closes/latches before the engine starts. The wheel, instruments, seat and hands have all moved together. Driving hands follow the steering wheel. Mouse look remains available within cockpit limits; Escape pauses the sequence.

The same two prepared spotlight slots switch from handheld placement to mounts **beyond the front bumper**. They face the car's forward direction while you look around. During driving, the car and cockpit are excluded from those beams, and the instrument needles use a restrained glow. The handheld flashlight model stays put away.

Loading prepares the cockpit/headlight material variant before play. The car begins moving at 2.2 seconds; the complete automatic exit takes 14.6 seconds. Its route keeps the original clear bay turn and north driving lane. Reduced motion skips the camera's entry travel while retaining door and vehicle actions.

Geometry checks establish beam placement and route clearance. They cannot establish perceived glare on your display; that still requires a browser playtest at the selected brightness, bloom and graphics settings.

## Learn and customize

| File | What to edit |
|---|---|
| `dist/js/tasks.js` | Journal instructions, hints, labels and map destinations. Keep task IDs and prerequisites consistent. |
| `dist/js/difficulty.js` | Awareness, chase speed, searches, warnings and stamina. |
| `dist/js/navigation.js` | Grid, clearance, path validation and reachable floor projection. |
| `dist/js/locomotion.js` | Route progress, bounded recovery and physical turning. |
| `dist/js/threat.js` | Evidence, pursuit, search, hiding and attack decisions. |
| `dist/js/creature-scenes.js` | Encounter positions, approach, anticipation, contact and release. |
| `dist/js/surfaces.js` | Shared puddle footprints, foot-contact strength and pooled effects. |
| `dist/js/audio.js` | Local recordings, shuffled steps, spatial emitters and room/tension mix. |
| `dist/js/staging.js` | Left-side car layout, entry sequence, window check and escape path. |
| `dist/js/visuals.js` | Animation blending, hand contact and beam intensity. |

For a first edit, change one puddle's `x`, `z`, `rx` and `rz` in `PUDDLES`, reload, and walk across its edge. Both the mesh and contact response follow that record. Do not maintain a second set of sound-only puddle coordinates.

For an encounter edit, change its route goal in `CREATURE_SCENES`, then check that the goal is outside collision, physically reachable, visible from the intended player approach and aligned with the hand contact. The creature's `Strike` right palm reaches approximately `(-0.20, 1.44, +1.10)` in local metres at phase 0.50. Rotation must transform that contact into the target surface; changing only the sound position is insufficient.

Run `npm test` for the automated suite and `npm run check` for syntax/assets. Node's built-in runner is used; `npm install` is unnecessary. Rebuild the two ZIPs with `python tools/package.py --output releases`. Full commented reading copies are regenerated in `docs/Full_Code.md`.

Read `BUILD_AND_EDIT_GUIDE.md` for the broader beginner walkthrough, settings, saves, source layout and level conventions. Historical update notes remain included; this guide describes the current behavior where an older note differs.

## Browser and itch.io packages

`LastVehicle_Browser_Complete.zip` includes the local launchers, full source, editable asset source, tests and teaching documents. `LastVehicle_Itch_HTML5.zip` contains only the playable `dist` contents with `index.html` at its root. Upload the latter to itch.io as an HTML game and enable fullscreen. Test mouse capture and audio in the actual hosted frame. There is no Windows EXE in either archive.

All runtime dependencies are local. Playing the downloaded package requires no external CDN, account, paid asset or network game service. Public-host distribution settings are separate from this game's files.

## Verification and remaining playtest

See `VERIFICATION.md` for the recorded checks. Automated checks exercise movement at 30/60/144 FPS, changing barriers, actual imported obstacle footprints, full progression, saves, contact pools, skeletal clips, left entry and the entire escape path.

The managed browser-preview service was unavailable for this release. WebGL appearance, subjective scare quality, audible mixing and frame pacing on real hardware have **not** been verified. Treat the supplied build as ready for your next playtest; no zero-freeze or premium-quality certification is claimed.

For that playtest, walk each route once with a cold load and once after a checkpoint reload. Chase around a car, close/open a barrier, hide after breaking sight, and try a witnessed entry. Cross every puddle edge. Finish the car escape with the flashlight previously both on and off, at Low and High graphics and different brightness levels. Check that a paused encounter resumes once and a checkpoint never replays a saved impact. Export diagnostics if a problem remains.
