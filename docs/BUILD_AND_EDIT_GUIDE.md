> Current release: **1.19 — Patrols, wayfinding and the night yard**. Start with [UPDATE_1_19.md](UPDATE_1_19.md) for the expanded campaign, manual driving, controls and verified limits. Earlier update files are historical.

# Last Vehicle — build, play, and edit guide

**A GingrSnaps Project**  
Browser edition 1.19 candidate · Babylon.js 9.33.1 · 6 November 2026

This guide assumes you have never built a 3D game. You do not need an Unreal project, a game-editor installation, or a build pipeline. The browser runs the JavaScript, Babylon.js draws the world, and the files in this package supply the story, models, sound, and interface.

The delivered implementation contains the beginning, middle, failure recovery, and ending. It is not only a walking demo. However, automated scene and gameplay checks are not the same as a human browser playtest. Read `VERIFICATION.md` for the exact limits before advertising performance or charging for a release.

Read **UPDATE_1_19.md** first for the current exterior routes, sky, scenery, controls, settings, source walkthrough and release limits. UPDATE_1_3.md through UPDATE_1_16.md are historical notes. Browser QA is outstanding, so the live site remains 1.12. The story and walkthrough below still apply.

## 1. Start with a working copy

Extract the ZIP into a normal folder such as `Documents/LastVehicle`. Keep one untouched copy as your backup. Open the extracted folder in VS Code if you want to edit it. A useful first step is to run the game before changing anything, so you know the original files load correctly on your machine.

You need either Python 3.10+ or Node.js 20+ to serve the local files. These are free. You do not need to install any packages. On Windows, double-click `START_WINDOWS.bat`; on macOS/Linux, run `sh START_MAC_LINUX.sh`. If Python is already installed, the simplest terminal command is:

```bash
python START_GAME.py
```

The Node alternative is:

```bash
node tools/serve.mjs --open
```

The launcher opens `http://127.0.0.1:8080/` after the server has bound its port. Keep the terminal open while playing; Ctrl+C stops it. If the browser does not open, paste that address yourself. Close an earlier game server if the port is occupied. Keep using the same address: browser saves belong to the origin, which includes its port.

Python serves the files; gameplay remains JavaScript. This downloadable project is a browser game, not an EXE, and it does not install anything on your computer. All runtime dependencies and licensed assets are inside `dist/`, so local play does not need a CDN or internet connection after download.

Opening `dist/index.html` directly produces a `file://` address. That is unsuitable for this game: browser security rules can block glTF and audio requests. Always use the local server or a real HTTPS host.

After a code change, save the file in VS Code and refresh the page. If the browser displays an old copy, perform a hard refresh. Do not clear all site data casually: that also removes local saves. Export your save first.

## 2. What the files do

| File or folder | Responsibility | Good first edit |
|---|---|---|
| `dist/index.html` | The canvas, title screen, HUD, loading screen, and modal container | Menu labels |
| `dist/style.css` | Typography, spacing, colors, responsive layout, and studio animation | `--accent` color |
| `dist/js/main.js` | Starts the game and reports startup failures | Normally leave alone |
| `dist/js/game.js` | Progression, interactions, puzzles, scares, pursuit, and ending | Subtitle text |
| `dist/js/tasks.js` | Shared task text, prerequisites, destinations and inventory status | Task wording in one place |
| `dist/js/atmosphere.js` | Room details, dust, Security blind/window, hatch, lamp and panel animation | A room detail or scare duration |
| `dist/js/encounters.js` | Saved encounter IDs, queues, pacing and checkpoint recovery | Spacing between events |
| `dist/js/props.js` | Public model dimensions, placements and matching collisions | A measured prop position |
| `dist/js/staging.js` | Original car, battery, lockers, hood repair and cinematic drive | A prop color or shelter position |
| `dist/js/details.js`, `rich-details.js`, `detail-layout.js`, `anchors.js` | New prop/support records, physical sign mounts and placement inspection | A grounded prop position |
| `dist/js/distractions.js`, `lighting.js` | Three pooled bolts and shared story lighting/stealth | Contact tuning or circuit strength |
| `dist/js/controller.js` | Standard gamepad polling, deadzones, button edges and safe disconnect | Controller feel |
| `dist/js/tactics.js` | Short-lived, visibly observed looping behavior | Observation thresholds |
| `dist/js/equipment-scenes.js` | Prebuilt cart, dynamic collision and persistent water | Effect position and timing |
| `dist/js/evidence.js` | Bounded clue memory and committed AI decisions | A clue lifetime |
| `dist/js/acoustics.js`, `surfaces.js` | Doorway sound, surface contacts and wet traces | A shared drain/puddle record |
| `dist/js/world.js` | Level geometry, models, materials, lights, signs, and scene optimization | A prop coordinate |
| `dist/js/capture.js` | Event-driven mouse-capture requests, cancellation, and failure feedback | Normally leave alone |
| `dist/js/difficulty.js` | Easy/Medium/Hard tuning | Enemy speed or stamina rates |
| `dist/js/journal.js` | Task, optional hints, evidence, map, and controls pages | Journal layout or labels |
| `dist/js/preparation.js` | Batched task yields and readiness timeouts | Advanced edits only |
| `dist/js/guidance.js` | Interaction policy and helpers using tasks.js | Optional action rules |
| `dist/js/interaction.js` | Aim volumes, complete 3D sight tests, reach and stable targeting | Interaction radius |
| `dist/js/player.js` | Movement, camera look, sprint, crouch, and interaction targeting | Walking speed |
| `dist/js/state.js` | Save schema, valid flags, documents, objectives, and settings defaults | A journal paragraph |
| `dist/js/ui.js` | Pause, journal, credits, prompts and FPS display | Menu text |
| `dist/js/settings-ui.js` | Settings controls and staged/live edit behavior | An option label |
| `dist/js/preferences.js` | Graphics rollback and settings import | Preview duration |
| `dist/js/performance.js` | Frame metrics and GPU-driven scale | Overlay sample window |
| `dist/js/presentation.js` | Intro timing and animation contact cues | Studio animation |
| `dist/js/audio.js` | Loading, mixing, playback, and browser audio permission | Music gain |
| `dist/js/animation.js` | Small pauseable tween scheduler | An interaction duration |
| `dist/js/visuals.js` | Held flashlight, moving props, skeletal clips, dynamic exclusions | Hand sway or cabinet travel |
| `dist/js/threat.js` | Sight, hearing, investigation, search, chase, and lure states | Detection radius |
| `START_GAME.py` | Standard-library Python launcher | Usually leave alone |
| `dist/js/navigation.js` | Collision sliding, line-of-sight tests, and pathfinding | Advanced edits only |
| `dist/assets/models/` | Kenney props and the original Attendant; optional legacy human | Swap one vehicle |
| `dist/assets/audio/` | Sixty-four locally bundled Ogg files | Replace a sound |
| `dist/assets/licenses/` | Asset license records | Add a new asset credit |
| `dist/vendor/` | Pinned Babylon.js and loader files | Update together only |
| `tests/` | Automated rule, scene, and interaction checks | Add a regression for a real bug |
| `tools/` | Local server and integrity checks | Normally leave alone |

The project has no build step. Editing a source file inside `dist/js/` changes the actual shipped game. `dist/` is the complete deployable game, while the outer folder adds documentation, tests, and helper tools. `Full_Code.md` is a convenient reading copy of the complete original code; edit the actual `.js`, `.html`, and `.css` files, not the reading copy.

### How one frame works

Babylon schedules a callback near the display refresh rate. `Game.frame()` first applies the selected frame cap. It computes elapsed time in seconds, updates movement and the threat only if gameplay is active, updates HUD text and lighting, and renders the scene. Pausing stops game simulation; it does not require destroying the scene.

Movement uses speed multiplied by elapsed seconds. This matters because a player running at 30 FPS must not walk half as fast as a player at 60 FPS. Very large elapsed steps are clamped after stalls. The circle controller also subdivides movement, so a long step cannot jump through a thin wall.

## 3. The complete story

You play **Erin Cole**, leaving a late shift at **Meridian Parking** at 00:17. Your parking ticket is the final active ticket of the night. Vehicles in other bays are stored cars; your ticket is the one that should have checked out.

Your battery has been removed and its lead deliberately cut. A notice directs you to recover it and find a replacement cable through Security. The office log reports movement behind the inspection blind, although there is no night attendant on the roster. An incident report describes a shape too tall to be an ordinary worker. The exit and stairs have been isolated. The creature seems to be repeating an old shift, collecting the last ticket each night. The horror comes from a familiar place becoming a controlled trap.

You cannot kill him. A direct bolt hit briefly staggers him; repeated rapid hits are resisted. Repair the car, restore and authorize the exit, then survive the return to bay 042. Corners, eight shelter lockers, the west passage and optional distractions provide ways to break pursuit. The garage opens into a service yard with four additional tasks. The ending requires driving the main car through the yard and left around the roadworks container to the street. See UPDATE_1_19.md for the current full walkthrough.

### Pacing and scares

Three required-task opportunities form the core: the Security blind lifts and the Attendant strikes the wired window after the key pickup; the Workshop hatch bursts open after collecting supplies; and Electrical's cover bangs open during the change to emergency lighting. The single enemy walks around the Security partition to begin its hunt. Workshop and Electrical noises can attract it through ordinary hearing rules.

A director saves each contact once and spaces optional beats. The key reveal bypasses progression delay; the electrical contact belongs directly to its action. Optional staged scenes have bounded timeouts and do not force the camera. Exterior impacts are placed in the natural view from their controls. The single hunter retains its actual position. Optional lamp, locker and car-window moments depend on view, actual proximity and pacing. Completed impacts persist in saves. Journal observations describe only fired events. No microphone is required. See UPDATE_1_8.md for the full staging and testing details.

## 4. Walkthrough — spoilers

1. **Inspect bay 042.** Press F for the flashlight. Aim at the teal car's driver handle, passenger side, or front hood and use E. All three inspect the same car at this stage. Read the notice in J; the hood opens.
2. **Recover the battery.** Take the battery from the floor near the front of the same car. Inventory is automatic.
3. **Take the Security key.** Walk north to the west office, collect the maintenance key and its log. The Security window reveal releases the Attendant after a short grace period; use corners and shelter lockers when needed. The key also opens the west service shortcuts.
4. **Collect repair supplies.** Open the labelled workshop cabinet. It contains a replacement battery cable and exit-control fuse. The restart procedure is added to the journal.
5. **Repair the car.** Return to the open hood and use it. The battery and cable are installed and the hood closes. The 2.1-second action can be cancelled with E; incomplete repairs do not enter a checkpoint.
6. **Restore exit power.** At Electrical's panel select **Ventilation → Lighting → Access**. A wrong order resets this puzzle without losing the fuse.
7. **Authorize the motor.** Enter **1986** at Security's terminal. The shift log and north dedication plaque give this founding year. The motor is authorized directly; no release-key or coolant task is required.
8. **Raise the shutter.** Use the motor to the left of the north exit. You can move while it opens. The noise draws attention and the final return becomes more pressured.
9. **Inspect the yard barrier.** Walk through the garage shutter and use the north service-yard cabinet.
10. **Select the dry supply.** At the east utility awning choose LOADING OFF, then GATEHOUSE ON.
11. **Release the brake.** Use the yellow wheel beside the damaged side door in the gatehouse.
12. **Clear the approach.** Use the loading-dock winch to pull the cargo dolly aside.
13. **Return and drive out.** Enter the car's left driver door. W/S accelerate, brake or reverse; A/D steer. Drive through the garage shutter and street barrier, then pass the roadworks container along the OPEN LANE sign. E exits only when stopped with space on the left. Mouse-look and Escape remain available. Walking out on foot does not finish the story.

The valve and siren provide an initial nine-second distraction with an eighteen-second reset. Repeated use of the same source shortens its investigation, with a 2.5-second minimum. They do not override a fresh visual chase. The workshop grille can be dropped only from outside while the Attendant is inside; it lasts twelve seconds. It is not a required objective or permanent solution. Use E at a SHELTER locker to enter and again to leave. If it saw you enter, find another route before it finishes checking the locker.

Optional evidence: recover the handover log, the incident report in Storage (or inspect the grey van), and the dispatch transcript. All three produce the stronger police-report ending text. The main story can be completed without manually reading every optional page.

If caught, use **Retry checkpoint**. The unfinished pursuit restarts from a safe position. You do not have to repeat the entire game.

## 5. Layout and visual direction

The style is clean low-poly. There is no pixel-resolution filter, affine texture wobble, VHS overlay, or mixed retro-console effect. Vehicles retain their faceted shapes. A restrained palette makes independently sourced public assets feel like one environment:

- Concrete and ceiling: grey with a green undertone.
- Walls and utility furniture: deep teal.
- Work lights and interface accents: pale amber.
- Emergency details: small red accents.
- Distance: cool blue-green fog, with readable pools of light.

The garage is about 60 metres wide and 110 metres long. World **Y** is height; **X** runs west/east; **Z** increases toward the south. The north exit is near Z=0. This convention is deliberately written down so adding a room does not become guesswork.

| Place | Approximate X | Approximate Z | Function |
|---|---:|---:|---|
| Player arrival | 10 | 98 | Initial safe spawn |
| Bay 042 | 13 | 78 | Inspection, repair and vehicle escape |
| Removed battery | 9.6 | 77.1 | Recoverable car component |
| Security | -24 | 18 | Key, log, terminal, optional evidence |
| Storage | -24 | 45 | Optional evidence |
| Workshop | -24 | 76 | Fuse/cable kit, siren, temporary grille |
| Electrical | 26 | 39 | Circuit-order puzzle |
| Pump room | 25 | 98 | Optional valve distraction, dispatch evidence |
| Gate motor | -4.7 | 5 | Final release |
| Street beyond service road | 0 | -95 | Controlled driving finish |

Architecture is built in `World.buildArchitecture()` and rooms in `World.buildRooms()`. The models are loaded afterward. Keeping interaction anchors independent of the model mesh means you can replace a car without rewriting its story logic.

### Add a prop safely

The new office, storage and machinery placements live in `props.js`. Each record is `[name, x, z, yaw, scale, y]`. `propCollider()` derives the matching rotated footprint from the measured GLB size. Factory models use near-metre scale; office furniture uses approximately 1.8–1.95×. A monitor is raised onto the desk instead of being placed through its top. Never move only the mesh while leaving its collider behind.

For a first edit, duplicate an existing cone placement in `world.js`, change its X and Z, save, and refresh. A decorative cone does not block movement. A solid object such as a cabinet needs a matching collision rectangle. Otherwise the player could walk through it.

```javascript
// Add a decorative public model at a floor position.
this.placeModel('cone', 8, 60, 0, 0.8);

// Add original geometry and a matching solid collision rectangle.
// Arguments: name, X, Y, Z, width, height, depth, material, collision.
this.box('extra cabinet', 25, 1, 55, 1.5, 2, 0.8, 'teal', true);
```

Do not place a solid cabinet across a doorway or on a safe checkpoint. Run the route/checkpoint tests after layout edits. A room can look open while an old invisible collision rectangle still blocks it; update both representations together.

## 6. Public models and sound

The hero car, battery, repair kit and shelter lockers are original low-poly geometry in `staging.js`. The selected background vehicles and props come from **Kenney Car Kit 3.1**, with the original CC0 notice included. Models are GLB, which is a compact binary glTF format. They use a shared `Textures/colormap.png` file. The uppercase `Textures` folder matters on case-sensitive hosts such as itch.io.

The source cars are roughly 1.3–1.5 units wide and 2.55–2.85 units long. They are placed at approximately 1.5× scale. Babylon creates a root transform to convert glTF coordinate conventions. The game parents that imported root to a new placement node instead of deleting its conversion. Deleting it can mirror or rotate a vehicle incorrectly.

Seven additional embedded GLBs come from Kenney Factory Kit 3.0 and Furniture Kit. `IMMERSION_ASSETS.md` records dimensions and source details; `props.js` uses them to size collision. These props share the game’s subdued material treatment. No extra room or puzzle is needed to justify them.

The current main music bed is **Confined Spaces** by **Tsorthan Grove**. **Nobody's Home** by **aspiringcodemonkey** supplies the default aftermath excerpt. **Dream 2 — Ambience** by **TokyoGeisha** remains bundled as an optional alternative. Earlier music layers, including **EmptyCity** by **yd**, remain bundled with their notices. Effects include ventilation by qubodup, mechanical sounds by Brian MacIntosh/BMacZero, footsteps and a horror effect by TinyWorlds, and an actual alarm by Frenchyboy. The original Attendant GLB has 38 deform joints and 21 authored clips. The older Quaternius 2017 human remains as an optional historical asset, but is no longer the gameplay enemy. Added small switch/menu sounds are from Kenney; the drip loop is by Independent.nu, uploaded by qubodup. All selected asset entries have explicit CC0 notices. The asset manifest records original URLs, names, authors, edits, hashes, and runtime paths.

“Available on the internet” is not the same as permission to ship an asset. For future replacements, prefer files with an explicit CC0 notice or a license that clearly permits your intended use and redistribution. Keep the author/source/license record with the project. Do not infer that every file on a free-sound site has the same terms.

### Replace a sound

1. Download a licensed file and retain its source/license record.
2. Trim unwanted silence and keep a conservative peak level in an editor such as Audacity.
3. Export an Ogg Vorbis file. Effects can be mono; music can remain stereo.
4. Replace the appropriate file in `dist/assets/audio/`, preserving its name, or change the name in `audio.js` and its callers.
5. Update the credits and provenance manifest.
6. Test the loop boundary with headphones at a moderate volume, then test each mixer slider.

`AudioMixer` creates Master, Music, Ambience, and SFX gains plus a UI branch. World emitters use Web Audio `PannerNode` for distance and direction. The mixer checks one positional voice every 80 ms, rotating through active voices; an intervening wall lowers volume and rolls off high frequencies. A clear two-segment route through an authored doorway can redirect the apparent source to that opening; closed barriers are checked live. Unchanged obstruction does not reschedule filter ramps. Listener orientation/position update at 30 Hz using smoothed audio parameters. This is an intentionally inexpensive approximation of sound obstruction, not a full acoustic simulation.

A short deterministic convolution impulse adds room reverberation. It is generated DSP, not a downloaded recording. Full/Night dynamic range controls a compressor, followed by a peak limiter. Night mode softens level contrast; Master remains the final output control. Changing a slider uses a short gain ramp to avoid clicks. AudioContext creation/resume happens after a player gesture, which is required by browser autoplay policies. Missing audio never removes a required clue or prevents the ending.

### The added room and suspense layers

`unease.ogg` adds exploration/search texture by congusbongus; the older `aftermath.ogg` remains an optional asset while the runtime aftermath alias loads `nobody-aftermath.ogg`; three distinct creature recordings and an electrical snap have their own credits and source hashes. `service.ogg` is congusbongus’s *Abandoned passages* ambience and belongs to the Ambience slider. `tension.ogg` is an edited loop from Juhani Junkala/SubspaceAudio’s *Horror Atmosphere* and belongs to Music. `sceneMix()` in `audio.js` returns the levels for the current room and AI mode; a real chase raises tension, while Security is quieter. All loops are loaded and decoded before play and gain ramps avoid abrupt transitions. A brief pre-impact dip leaves room for a scare without requiring extreme loudness.

`hatch-impact.ogg` is a documented Kenney metal-impact effect. `door-close.ogg` is a real CC0 car-door recording by looneybits. The engine remains a small synthesized sound made in Web Audio. The new audio was decoded and level-checked; subjective balance and device playback still need a browser listening pass. Master, Music, Ambience, SFX, Loud effects and Night range remain adjustable.

To replace a recording, keep its runtime filename, use a legal local Ogg file, retain its license, and update its hash and processing notes in `assets-manifest.json`. For a new sound, add its name to `AudioMixer.load()` and decide which volume bus it uses. A music loop should crossfade at its seam. Do not download an entire audio pack during gameplay.

## 7. Understand an interaction

The player aims at a small authored interaction volume around a visible handle or item. `selectInteraction()` checks the full 3D sight segment, aim and reach; `availability()` checks current progress and special trap conditions. The prompt and actual interaction key use the same policy. The key handler also rechecks the current target rather than relying on a previous frame.

A usable object shows the configured interaction key and a specific verb. An out-of-reach object says Move closer. A locked object shows its requirement without an active key badge. Completed pickups disappear from targeting. Low desk geometry does not hide paper resting above it, but a wall near the far end of the sight segment still blocks it. The usual reach is 2.35 metres to the interaction volume; hints can appear out to 3.6 metres. `UPDATE_1_3.md` explains radius, stability and size settings.

`Game.interact(id)` checks the shared policy again, then starts a visible action. `performAction()` commits its flag only when the animation completes. Ordinary pickups leave movement enabled. Repair and the valve temporarily hold movement, allow looking, and can be cancelled with the same interaction key. For example:

```javascript
// Teaching example. availability() is shared with the HUD to avoid false prompts.
const status = availability('fuse', state, player, threat);
if (!status.available) {
    ui.subtitle(status.reason);
    return; // Nothing is consumed and progress is unchanged.
}
game.performAction('fuse', 'TAKING FUSE & CABLE', 0.85, () => {
    // Save progress only after the visible pickup finishes.
    game.complete('fuse', 'Cable and fuse acquired. Repair the car at its open hood.');
});
```

A flag is a short name such as `fuse` or `power`. It records an event that has already happened. The scene checks these flags rather than trying to infer progress from a mesh's current position. This makes loading predictable: a saved `gate` flag opens the gate, regardless of how the previous scene was animated.

`tasks.js` is the authoritative task list. Save flag IDs, journal instruction/title, prompts, map destination and progressive hint text derive from it. Keep existing IDs stable. Early hood/side interactions alias to `car`; after inspection the hood becomes the repair target and the driver door becomes the eventual escape target. `inventoryStatus()` derives Missing, Carrying and Installed states from completed flags.

If adding a new mandatory task, update `TASKS`, safe checkpoint placement, action handlers, visual synchronization, migrations and tests together. Merely adding a new button does not create a complete saveable objective.

### Tasks, hints, and evidence in the journal

Press **J** to read the current next step and why it matters. The Task page also links relevant collected notes and shows missing, carried and installed parts plus collapsible completed history. Press **H** to open Hints without revealing anything. Its buttons reveal a nudge, a clearer direction, and finally the solution. Only reached tasks can retain saved hint levels.

The Notes & evidence page marks unread documents with a dot. Reading marks only that collected note as read and returns to the same journal tab. Map shows your position, known rooms, destination, and shortcuts; its direction marker is explicit and lasts 20 active-play seconds. Controls uses your remapped keys and appears once when first entering this version.

The journal pauses the Attendant and interaction animations. Resume game requests your saved input mode from the click. Escape returns to Pause. Automatic task/hint/tutorial cards are off; the small J/unread indicator remains. Settings → Gameplay can opt into an objective HUD or brief journal-update notifications. Reading and asking for help never advance a story flag.

## 8. Checkpoints and settings

The main local-storage keys are `lastvehicle.save` and `lastvehicle.settings`. `lastvehicle.introSeen` remembers whether the intro has already played, and `lastvehicle.controlsSeen` remembers the brief Controls page. No account or backend is involved. This reduces operating costs, but it also means saves do not automatically follow a player to another device or website.

A save contains a schema version, completed flags, collected note IDs, fired scare IDs, active-play seconds, a safe checkpoint, a timestamp, discovered room IDs, legacy first-use guidance IDs, and journal metadata: revealed hint levels, read note IDs, the last seen task, and whether Controls has been seen. It does not contain executable code or arbitrary HTML. Imported files have a size limit; unknown flags/notes are removed, numeric fields are bounded, and malformed or incompatible files are rejected. Imported coordinates are replaced with known safe checkpoints.

Objectives form an ordered prefix. For example, a save cannot claim the gate is open while the fuse has never been found. The validator drops out-of-order progress. If you intentionally change the objective order in a future game update, create a proper save migration and test it rather than simply changing the version number.

The game saves immediately on completed objectives. Routine 30-second saves prefer an idle callback (with a deadline/fallback); pausing and page exit also save. Journal reading/reveal changes save while play is paused. Manual Save uses the same safe-checkpoint policy. Export produces a JSON file; Import validates and restores it. Enemy pursuit, temporary traps, locker occupancy and a running car sequence are transient. Reloading restores completed progress to a safe authored location with a fresh grace period. Schema-1 saves migrate to schema 3 with completed old tasks credited; the original local JSON is backed up once under `lastvehicle.save.v1.backup` when storage works.

Read `UPDATE_1_19.md` for current behavior, and historical `UPDATE_1_4.md`/`UPDATE_1_5.md` for earlier settings and preparation changes. Quick setup plus all six detailed categories, safe graphics preview, rolling FPS metrics, GPU-dependent adaptive resolution, reduced motion and intro replay remain included. Gameplay now offers optional objective HUD and journal notifications instead of automatic hint reminders.

Settings are independent of the story save. Exporting story progress does not change another player's preferred sensitivity or volume. Invalid imported settings are clamped, and keybinding conflicts are rejected or swapped by the remapping interface.

### Browser-managed display behavior

There is no genuine browser-independent VSync switch to expose. The interface explains this instead of showing a control that does nothing. The FPS cap throttles renders at the application level. It cannot make a slow GPU meet the selected target.

Render resolution and scale control how many pixels Babylon draws. The HTML interface stays at the browser's native CSS resolution, so text remains readable when the 3D scene is rendered at 75%. Fullscreen requests require browser permission and may be restricted by a host iframe. The game handles a rejected request without breaking the menu.

## 9. Lighting and performance

This scene uses one hemispheric fill light, two flashlight spotlights (center and spill), and four reusable local PointLights. All seven light identities and enabled states stay stable while walking and toggling the flashlight. Local slots fade out, move to nearby fixtures in the current room, and fade in. The Security desk lamp uses an imported emitter anchor in the same pool. Ambient fill is deliberately low; fixture ranges are limited and signs have only subtle emission. These are bounded dynamic lights, not baked lightmaps. Quick setup has a live flashlight-contrast preview. Flashlight intensity reaches zero while off. This avoids repeatedly changing which lights are attached to materials. It does not disable the visible fixture meshes or stream level sections.

The flashlight casts dynamic shadows. The Medium preset uses a 512 shadow map; High uses 1024 plus FXAA. Low disables dynamic shadows and glow. Custom permits independent shadows, glow and FXAA; graphics are staged until Apply and Keep. These settings are functional differences, not just labels. Fog establishes depth without volumetric ray marching. Emissive fixture meshes and subtle bloom suggest luminous tubes without making every tube cast a shadow.

Static geometry is grouped by material, room, 25-metre sector, and shadow-caster flag, then merged. Only meaningful blockers, cars, relevant doors and the Attendant cast shadows; tiny decorative details do not. This cuts repeated drain slots, parking lines, and structural pieces into far fewer draw calls while retaining useful spatial bounds. The Attendant, hands, interaction marker, doors, pickups, fans, water drops, valve, exit shutter, and workshop grille stay separate because they move. `Visuals.dynamicRoots` is the exclusion list; all descendants of those nodes remain dynamic. Collision rectangles are separate data, so batching visual meshes does not silently remove walls.

Navigation now caches static walkability and collision-safe edges during loading, uses a priority queue, reuses valid routes, and checks moving doors separately. Exact segment tests replace repeated 20 cm sight samples and avoid temporary per-axis arrays. Typed path-search scratch buffers are reused. Audio is prepared before entry. See `navigation-benchmark.json` for measured CPU results and `UPDATE_1_3.md` for their limitations.

Architecture, room construction, static batching and navigation yield to the browser between batches. Seven camera views prepare graphics behind the loading overlay, including hands, cockpit and skeletal material paths. A readiness timeout is a visible failure with Retry/Simpler graphics, never a Ready result. Progress describes stages, not estimated time. First-time graphics/driver work can still block a frame; only an actual browser profile can establish the remaining cause.

The new **Pause → Performance test route** exports two comparable manual passes. CPU section maxima and at most 40 retained slow events cover the pass; rolling frame metrics cover its latest 30 seconds. The old navigation benchmark is historical and must not be described as a v1.8 GPU improvement.

Avoid adding many shadow-casting lights, transparent full-screen layers, or high-resolution textures without measuring. A low triangle count alone does not guarantee performance: draw calls, pixels, lights, transparency, audio decoding, and device thermals also matter.

Fresh installations now begin on Low; existing saved preferences are preserved. For a slower computer, try Low quality, 720p maximum rendering, 0.75 render scale, and a 30 FPS cap. For a stronger desktop, start with Medium and 60 FPS. These are starting configurations, not measured hardware guarantees. Leave the FPS counter on during a real playtest and inspect the most crowded view, not only the title screen.

## 10. Make changes without losing work

Use one small change at a time. Save an untouched ZIP, or initialize your own Git repository and commit a known-working version. A browser save is not a project-source backup.

Useful beginner edits, from least to most risky:

1. Change a journal paragraph in `state.js`.
2. Change subtitle wording in `game.js`.
3. Adjust a mixer default in `DEFAULT_SETTINGS`.
4. Move a decorative cone in `world.js`.
5. Change a light's color/intensity.
6. Change a car model and its collision rectangle.
7. Add a new room, then test routes and interaction approaches.
8. Add a new saved objective with a migration and tests.

After editing, run:

```bash
npm run check
npm test
```

The check command validates syntax and essential runtime files. The test suite exercises the save rules, every possible flag mask, progression locks, both puzzle handlers, trap safety, collision sliding, navigation routes, safe spawns, interaction approaches, static batching, mouse input math/fallback paths, flashlight direction/intensity, action completion boundaries, threat perception, and the actual imported skeletal clips using Babylon's NullEngine.

NullEngine validates scene logic without a GPU. It cannot tell you whether the fog is attractive, text looks correct, shadows flicker, or the audio is too loud. Those require the browser playtest described below.

## 11. Test the actual game before release

Check that loading finishes before Ready and that a forced failure shows Retry/Simpler graphics. Check J/H without automatic hint reveal, note read dots, save/reload of revealed hints, pause while reading, remapped control labels, and marker expiry only during active play. Use the two-pass performance route with fixed settings.

Run a complete first playthrough without editing the save. Verify you can understand the objective, locate doors, read each document, recover the battery, repair the car, solve both puzzles, hide successfully, open the exit and drive out. Then deliberately get caught and retry.

At each major checkpoint, pause, reload, and Continue. Try exporting a save, starting a new game, then importing the backup. Check invalid JSON and blocked browser storage. Confirm that changes to volume and sensitivity survive a refresh.

Check that F starts with no flashlight visible, equips it smoothly, and fully puts it away when turned off. Toggle rapidly halfway through the animation. Approach each important object, verify its E prompt, remap E to Q, and verify that both the displayed badge and activation use Q. Verify that a wall prevents activation.

Run the pursuit on all three difficulty modes. Change difficulty in Pause and reload to check persistence. During a cabinet, repair, valve, shutter or drive animation, pause, resume, and reload; the visible action should continue after pause and return to its last completed checkpoint after reload. Test with Cinematic interaction motion both on and off.

Test at least your current Firefox and a Chromium browser. Check a 1280×720 window and a larger display. Check fullscreen, Alt+Tab, Escape, losing mouse capture, muted audio, resizing, and a low-quality setting. If you plan to advertise touch support, test an actual touch device before marking the itch page Mobile Friendly.

Listen to a complete music loop. Confirm effects are audible but not painfully louder than the background. Let a new player try the game without your explanations. If they repeatedly miss a door or the red handle, improve the visual cue rather than adding a long tutorial paragraph over the action.

Keep a release note with tested browser versions, hardware, measured frame rates, and actual playtime. Do not invent minimum system requirements from a code review.

## 12. Learn the repaired systems

### Mouse look: one owner, explicit capture

The camera has no built-in Babylon input attached. `Player` owns its yaw (turning left/right) and pitch (looking up/down), so two controllers cannot apply the same delta twice. In this left-handed scene, positive mouse X increases yaw and turns right. Positive mouse Y increases pitch and looks down; Invert Y changes that second sign.

Mouse deltas are multiplied by sensitivity, **not** by frame time or display pixel ratio. They already describe the distance the physical mouse traveled. Movement speeds and smoothing do use seconds. Mixing these conventions makes sensitivity change with frame rate, one of the most common first-person controller mistakes.

`requestPointerLock()` is called synchronously on the trusted button-click stack, after focusing the game canvas. The primary **Enter game** button deliberately requests standard input with no optional raw-input arguments. If you enable the advanced raw option in Settings, a separate button requests that mode; its failure never prevents a fresh standard request.

The game prepares sound before entry, then requests capture from a fresh Enter game click without rebuilding that clicked dialog. It listens for `pointerlockchange` or `pointerlockerror`, supporting both Promise-returning and older void-returning browsers. A success enables play and focuses the canvas. A rejected request leaves a clear error and mode choice visible; a five-second watchdog reports a missing response. Drag controls require an explicit choice. Standard/raw/drag preference is saved, and the standalone-tab link is emphasized on failure. Cancelled requests cannot resume a different game or drag session later. The capture dialog and Pause menu can download a local diagnostic report.

A sandboxed embed can prohibit pointer lock. The game cannot grant itself that browser permission. The capture screen therefore includes an **Open the game in its own tab** link and explicit drag controls. For a custom embed you control, include the normal `allow-pointer-lock` sandbox token. Do not disable browser security or remove the sandbox. A download run from the included local server also gives the game its own page.

The first recenter packet is ignored, stale movement keys are cleared on pause/resume, and pitch is clamped so the camera cannot flip upside down. Escape leaves Pause visible; click Resume to make a fresh capture request.

Smoothing is off by default. If enabled, its value is a time constant in seconds; 0.05 gives a small delayed response. Start with sensitivity 1, smoothing 0, and no inverted Y. Pause → Mouse controls lets you switch back from drag mode. Escape releases capture and leaves the Pause screen visible; click Resume to continue.

### Flashlight: light, model, and readable contrast

The first-person flashlight is original low-poly geometry parented to the camera. It starts switched off and completely hidden. F raises it over approximately 0.38 seconds; F again switches off its beam and holsters it over 0.28 seconds. The mesh is disabled once holstered. Rapid toggles reverse from the current position instead of jumping to an endpoint. Menus hide it immediately; ordinary interactions never summon an inactive flashlight. It contains a sleeve, glove, barrel, bezel, lens, and moving switch. It draws in a separate rendering group so a nearby wall does not cut the handheld model in half. Its meshes are excluded from the flashlight’s shadow casters and light influence, avoiding a hand that blocks its own beam.

A held model by itself does not illuminate anything. The two real spotlights do that work. The center uses luminous-intensity mode, approximately 950 candela, a 0.78-radian outer cone, and a 32 m range. The spill is wider and weaker (90 candela, 16 m). PBR materials use distance falloff, so a tiny arbitrary intensity can be virtually invisible ten metres away. Exposure is separate: changing the Brightness setting does not repair an incorrectly aimed spotlight.

Before rendering, the world refreshes the camera matrix, samples its forward direction, and copies that direction to both lights. While walking, their emitter is slightly right of the camera, near the held flashlight. During escape, the two slots move beyond the front bumper, face the car's forward direction, and exclude the car and cockpit from light influence. F animates the equip/holster and switch while the beam follows the active state. The lens glows while on; it is not a substitute for the real light. Medium/High add center-beam shadows. Low keeps illumination but turns off those shadows.

To check a flashlight change, stand a few metres from a plain wall. Toggle F and compare the beam center, spill, and shadow edges at all three quality levels. Turn left, right, up, and down. Then approach a wall closely and check for self-shadowing or clipping. This procedure still requires a real browser; numeric checks cannot judge the final look.

### Animation: bones versus object transforms

Doors, switches, the wheel, and shutters use **transform animation**: change position or rotation over time. `Animator.to()` accepts a named channel, starting value, ending value, duration, an update function, and a completion callback. The named channel replaces an earlier animation on the same object. The revised actions use different curves: cabinet and locker doors ease open, keys/fuses lift and shrink into collection, the valve accelerates and settles, the exit motor starts before the shutter rises, and the workshop grille accelerates downward with a small settling movement. Impact cues fire at specific points in the animation rather than always at the initial key press. `Animator.tick(dt)` advances it only when its clock is allowed to run.

The Attendant uses **skeletal animation**: a mesh is weighted to 38 deform joints, and 21 named clips move those joints. `Visuals.loadActor()` preserves the glTF conversion root, then places all imported roots under a wrapper that AI can move. The bundled file faces +Z after this loader conversion; adding an extra half-turn would make it walk backward. The runtime cross-fades the original Idle, Walk, Run, Listen, Search, Attack, Recover and Inspect, plus TurnLeft, TurnRight, Brake, Backstep, Brace, Strike, InspectClose, Stalk, PeekLeft, PeekRight, DoorPush, CrouchSearch and StartRun. The controller owns the character position and heading; the clips are in place. Staged Strike contact occurs at normalized phase 0.50. Inactive clips pause after fading; attack/recovery phases follow the game clock. Walk/run playback rates follow movement speed. Clips pause when the character is hidden or play is paused.

`Attack` is a purpose-made raised-arm strike with a contact cue at normalized phase 0.50. The AI has a difficulty-specific warning, a 0.24-second committed lunge, and recovery on a miss. `Inspect` is a separate bent search. Exact finger-to-handle alignment during every locker approach still needs a browser visual review; a functioning animation is not the same as bespoke contact animation for every prop.

A separate empty gloved hand reaches during interactions; it works when the flashlight is put away. Optional Cinematic interaction motion adds a small, two-degree field-of-view focus change during the valve action, without forced aiming or camera shake. Turn it off in Settings → Comfort if you prefer a steady camera. Object animation remains enabled.

Ordinary pickups and the exit shutter allow movement. Repair and the valve briefly lock translation while allowing looking, and the interaction key cancels it without advancing progress. Pausing freezes action progress; returning to the title or loading another run clears it. A run token prevents stale callbacks from writing flags into a new game, and an active-time watchdog releases an action that fails to finish. The gate collider opens near the end of travel; its completed objective is saved only at the end. Version-1 saves migrate to schema 3.

### The Attendant: information it actually has

`Threat` is separate from meshes and sound. It owns position, heading, state, suspicion, last-known position and a route. Taking the Security key activates it. A clear sight ray and viewing cone build suspicion into a chase. Crouching, fixture falloff and the flashlight influence detection. Brightness and graphics settings never change the simulation's visibility value.

Footsteps send noise at roughly 2 m for crouching, 7 m for walking and 16 m for running before difficulty and wall attenuation. These are gameplay hearing distances, independent of speaker volume. After losing sight, the Attendant goes to its last evidence, searches and eventually patrols.

A hidden player never updates `lastKnown`. A witnessed shelter entry records that specific locker. On Medium/Hard, a search can also inspect the nearest locker within a difficulty-specific radius of the last evidence. Easy checks only witnessed entries. The handle/door moves before capture, and leaving the checked locker can work if another route is available. The actor uses InspectClose during a shelter inspection. An uncorroborated check becomes a near discovery. On Medium/Hard a nearby audible locker door plus a recent sighting or visible wet footprint near that locker can also authorize capture after a completed inspection. The journal explains this change. Searches also sample nearby cover and junctions, remember cleared points for 45 seconds, and can predict briefly from observed movement direction. They never read a hidden player’s position.

Distractions last nine seconds and leave a remembered sound location; they do not erase fresh visual contact. A grille contains the actor for twelve seconds, then opens again after a warning. Optional tools never advance a mandatory story flag.

### Difficulty and save compatibility

Choose Easy, Medium, or Hard on the new-game screen. Settings → Gameplay can change it during the same run. The chosen ID is stored in `state.difficulty` and preserved by export/import and checkpoint normalization. The save schema is now version 3; schema-1 and schema-2 checkpoints migrate, and files without a difficulty field become Medium. Invalid values also become Medium.

| Tuning | Easy | Medium | Hard |
|---|---:|---:|---:|
| Chase speed, m/s | 2.65 | 3.15 | 3.75 |
| Standing / crouched sight, m | 16 / 10 | 21 / 13 | 25 / 16 |
| Hearing multiplier | 0.65× | 1× | 1.3× |
| Suspicion buildup multiplier | 0.75× | 1× | 1.35× |
| Search duration, seconds | 6 | 10 | 16 |
| Initial grace, seconds | 12 | 9 | 7 |
| Locker search radius from evidence | 0 m | 3 m | 5 m |
| Sprint drain, fraction/second | 0.075 | 0.115 | 0.16 |
| Stamina recovery, fraction/second | 0.22 | 0.14 | 0.11 |

Player walk/sprint speeds are 2.2/4.1 m/s. Exit pressure increases enemy movement by 4%. Changes affect pursuit and endurance, rather than hiding required clues or disabling saving. They are authored tuning values, not playtest-derived guarantees. All three modes use the same objective locks and three main story-encounter opportunities. Change the constants in `difficulty.js` if real player testing suggests a different balance.

### New settings and troubleshooting

| Symptom or preference | Check |
|---|---|
| Mouse does not turn the view | Use free mouse-look after one Enter game click. If capture fails, open the standalone-tab link or explicitly choose drag controls. Download a diagnostic report if entry still fails |
| Look feels delayed | Set look smoothing to 0; lower sensitivity if necessary |
| Looking up goes down | Check Invert vertical look |
| Hand movement feels uncomfortable | Enable the Reduced motion preset, or adjust bob/sway/focus independently |
| Scene is too dark | Toggle F, increase Brightness moderately, then inspect a nearby wall |
| Loud sounds dominate | Lower Loud effects or Effects and select Night dynamic range |
| Captions are too small | Raise Subtitle scale; captions are independent of 3D render scale |
| A doorway or prop is hard to find | Press H and click Reveal next hint for clearer assistance; open J → Map for your position and current destination |
| An imported save resumes earlier | Saves restore completed objectives, and temporary pursuit, hiding and distractions intentionally reset |
| A changed asset fails to load | Check exact filename case, browser console, MIME type, and the manifest entry |

The source includes fallback geometry when a public model cannot load and a visible model-load notice. Fallback art is recovery behavior, not a substitute for shipping the full `assets/` folder. If audio is unavailable, captions and documents still preserve every mandatory clue.

## 13. Publish the browser build

The ready-to-upload archive contains `index.html` at its root, along with `js/`, `assets/`, `vendor/`, and `style.css`. It uses relative URLs so it can run from itch.io's game subdirectory. Upload that archive as an HTML game, choose a resizable/fullscreen embed, and test the actual hosted version before publishing the page to players.

Official instructions: <https://itch.io/docs/creators/html5>. A downloadable source ZIP and the embedded HTML5 ZIP serve different purposes; the large outer project folder is not the file you should mark as playable in the browser.

For another static host, upload the contents of `dist/` unchanged. Preserve filename case and MIME types. For a future Windows release, Electron can package these files, but it needs its own desktop save adapter, window settings, installer/build tests, and Steam integration if desired. This package intentionally delivers the browser game requested here; it does not claim to include an EXE.

The application CSS and JavaScript module URLs include the release version. This helps avoid a mixture of cached code and a newer HUD after deployment. All files are still local, and no build service is needed.

## 14. References

- Browser mouse-capture behavior: <https://developer.mozilla.org/en-US/docs/Web/API/Element/requestPointerLock>
- Babylon npm distribution: <https://doc.babylonjs.com/setup/frameworkPackages/npmSupport/>
- Babylon shadows: <https://doc.babylonjs.com/features/featuresDeepDive/lights/shadows/>
- Babylon glTF loading: <https://doc.babylonjs.com/features/featuresDeepDive/importers/glTF/>
- Kenney Car Kit: <https://kenney.nl/assets/car-kit>
- Full asset provenance: `../dist/assets/assets-manifest.json`
- All original code blocks: `Full_Code.md`
- What was actually verified: `VERIFICATION.md`
