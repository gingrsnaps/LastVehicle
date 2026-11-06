# Last Vehicle 1.15 — The Service Yard

**A GingrSnaps Project · Low-poly browser horror · Complete source candidate**

This update expands the same continuous level beyond the garage, adds a controllable car, and makes the environment denser without changing to a pixel-art style. The existing story, intro, credits, settings, public assets and recovery tools remain included.

**Verification limit:** the preview server starts, but the available test browser reports that WebGL is unavailable, including after retrying Low graphics. The code and actual model geometry have been tested with Babylon NullEngine. That does not verify rendered lighting, audible balance, physical mouse capture, subjective scares, hardware frame rate or an uninterrupted human playthrough. The download is a candidate; the live 1.12 site remains unchanged until the accepted browser playthrough gate passes.

## 1. Start here

1. Extract `LastVehicle_Browser_Complete.zip` completely. Keep its folders together.
2. On Windows, double-click `START_WINDOWS.bat`. On macOS/Linux, run `sh START_MAC_LINUX.sh`.
3. You need Python 3.10+ **or** Node 20+. No additional packages are needed to play.
4. The launcher opens `http://127.0.0.1:8080/`. Leave its terminal open while playing.
5. Choose New Game or Continue. Sound preparation finishes before mouse capture. Click Enter game, then move the mouse without holding a button.
6. Escape pauses. If a host blocks mouse capture, open the standalone-tab link. Drag look remains an explicit fallback.
7. If the browser cannot initialize WebGL, enable hardware acceleration and restart that browser, or use another WebGL-capable browser/device. The game cannot render 3D without it.

Do not open `index.html` directly through `file://`. The launcher serves the same bundled files locally; it is not an EXE, installer or cloud service. The HTML5 ZIP has `index.html` at its root for an itch.io HTML-game upload. No live publishing is required to try either package.

## 2. What changed

| Area | New behavior |
|---|---|
| Camera | Stable horizon defaults ON. Walking has no camera roll. Impact roll is disabled by this option; bob, hand sway and screen-edge effects remain separate controls. |
| Security key | The key sits on a raised tray near the wired window. Pickup starts the reveal without the old three-second progression delay. The blind snaps up and the glass contact fires about 0.22 seconds into the reveal. |
| Workshop | A shorter real-actor strike when the hunter can reach the grille; a bounded environmental hatch fallback if staging cannot arrive. No advance caption announces the surprise. |
| Electrical | The relay cover reacts to restoring power, without waiting for the hunter to pose in a doorway. Pursuit retains priority. |
| Exterior | A fenced service yard, sheltered utility awning, loading dock, furnished gatehouse and short service road extend the same level. |
| Story | Four exterior objectives: inspect the barrier, isolate the flooded supply, release its brake and winch the obstructing cargo aside. |
| Vehicle | You accelerate, brake/reverse and steer the main car. Its entire footprint collides; it cannot launch into the air. The final road has a broad left detour. |
| Hunter | Faster pursuit, outdoor search junctions, remembered evidence and a physical weak-door breach on Medium/Hard. Grace protects against attack instead of freezing all sensing. |
| Bolts | Hold the keyboard throw key for an optional trajectory guide; release to throw. Metal, glass and water contacts have different sounds. Only heard bolts count toward habituation. |
| Supplies | Three once-only bolt trays refill the three-bolt capacity. Used trays visibly empty and remain used after saving. |
| Dressing | Ten new original CC0 prop types, thirty placements, additional architecture, moss, drain details, tickets, freight, parked vans, supported signs and utility equipment. |
| Atmosphere | Twelve new local Oggs, exterior wind, roof rain, gravel contacts, engine/road layers, tension, fence and door contact; bounded rain and steam pools. |
| Guidance | Journal, map, prompts and checkpoints use the same task definitions. Driving changes the current instruction to reaching the street; leaving the car points back to its actual parked position. |

The added smoke/steam is visual atmosphere, not guaranteed stealth cover. The hunter uses solid geometry for occlusion. Wire fencing blocks crossing but allows sight through it. There is one physical hunter; an environmental strike never creates a second monster.

## 3. Controls without extra complexity

| Action | Keyboard / mouse | Standard controller |
|---|---|---|
| Move | W A S D | Left stick |
| Look | Mouse | Right stick |
| Use / hide / enter car / exit stopped car | E | A |
| Flashlight | F | X |
| Sprint | Left Shift | L3 |
| Crouch | C | B |
| Journal | J | Y |
| Hints | H | View |
| Request objective | Tab | D-pad Up |
| Bolt | Hold Q to aim, release to throw | RB throws directly |
| Drive | W accelerates; S brakes, then reverses; A/D steer | Left stick forward/back and left/right |
| Pause | Escape | Menu |

Bindings are editable. The interface and journal use the current mappings. Controller support is optional and disabled until enabled in Settings → Controls. Losing controller connection pauses play. Touch movement controls also feed the driving controller; desktop keyboard/mouse remains the primary target.

**Getting out of the car:** release the accelerator and let the car stop. Press Use. The left driver side must be clear. If the prompt reports insufficient space, reverse or steer to reposition. Exit is never forced through a wall. A small speed readout remains visible while driving. The flashlight stays holstered; two headlight beams originate outside the front bumper, and the cockpit is excluded from those beams.

## 4. Complete walkthrough — spoilers

1. **Inspect bay 042.** Use the teal car's hood or a door. The garage's overhead lights cut out. Turn on your flashlight. The notice explains the sabotage.
2. **Recover the battery.** Pick up the battery on the floor at the front of the car.
3. **Find the maintenance key.** In Security, take the brass ring/key/tag from its raised tray. The glass strike is immediate and does not force your mouse view. The glass protects you from that scripted contact. The hunter must use a real route around the partition.
4. **Take repair supplies.** The key opens the labelled Workshop cabinet. One pickup gives you the replacement cable and exit-control fuse. The west service shortcuts are available.
5. **Repair the car.** Use its open hood. The battery and cable install, then the hood closes. Use again to cancel if you need to flee.
6. **Restore exit power.** Electrical's sequence is VENTILATION → LIGHTING → ACCESS. The journal contains the procedure. A wrong order resets the sequence without consuming the fuse.
7. **Authorize the shutter.** Security's terminal accepts 1986, the founding year in the log and dedication plaque.
8. **Raise the garage shutter.** Use the motor left of the north exit. The next task sends you on foot into the yard; entering the car is not yet available.
9. **Inspect the street barrier.** Beyond the shutter, follow STREET BARRIER to the cabinet at the north fence. The new handover is added to the journal. A loose metal sheet can strike the fence in the natural forward view, with sound from that contact point.
10. **Isolate the wet circuit.** Go to the utility selector under the east awning. Choose LOADING OFF, then GATEHOUSE ON. The panel plate and journal give the same instructions. Selecting the wrong first button explains the required step and does not punish experimentation.
11. **Release the barrier brake.** Enter the gatehouse through its south doorway. Use the yellow wheel beside the damaged side door. The short crank action raises the street barrier. The side door can burst partway open and settle into a secondary exit; the hunter can also physically force it when evidence draws it there. The ordinary south door remains usable.
12. **Clear the approach.** Use the winch beside CLEAR ROUTE at the west dock. The cargo dolly moves sideways with its collision body. The red cable shows what the mechanism controls. Use again to cancel before completion if threatened.
13. **Return and drive.** Return through the garage shutter to bay 042. Enter the left driver door. Wait for the entry/door latch, then drive. Head west out of the bay, curve north into the central lane, continue through the open garage shutter and street barrier, and pass the roadworks container on its LEFT. Follow the amber road lights toward the street. The final departure/ending transition occurs after you drive beyond the road's end marker. Walking there does not finish the game.

The game saves completed tasks. The journal pauses play. Optional evidence strengthens the ending report, but reading every lore note is not required. Optional siren, valve and grille distractions remain available. Eight marked shelter lockers now span the garage and exterior. Break sight before hiding: the hunter remembers witnessed entries and can combine door sounds with recent evidence on Medium and Hard.

The pacing target is roughly **25–35 minutes for a cautious first exploration**, including pursuit, discovery and reading. This is an unmeasured design target. A player who already knows every solution can finish substantially faster. The expansion adds places and decisions rather than mandatory waiting timers.

## 5. Difficulty and fair pursuit

Easy, Medium and Hard retain the same clues and objectives. Walk speed is 2.95 m/s and sprint speed 4.9 m/s; the hunter's base chase speeds are 3.25, 4.05 and 4.6 m/s respectively, with a small endgame pressure multiplier. Stamina still limits sustained sprinting. Hard should reward breaking sight and choosing cover rather than simply holding sprint.

The hunter observes sight, flashlight spill, audible impacts, footsteps and temporary wet tracks. It travels to the last seen corner and searches nearby cover; it does not receive the hidden player's live coordinates. Its larger graph includes outdoor openings and the gatehouse. A damaged gatehouse door can be approached and forced from its real outside position. There is no teleport behind the player when a puddle is stepped in.

Attack grace now allows listening, turning and investigation. A close visible hunter holds off while protection lasts. Distraction habits advance only when a bolt's noise is actually accepted. Fresh visual pursuit remains stronger than a thrown bolt. Repeated impacts within the same small region become less useful, so vary direction and move while it investigates.

Bolts are optional. Capacity is three; each labelled tray can refill to three once: Workshop workbench, west loading-dock table and gatehouse desk. Reloading does not replenish a used tray. Holding Q displays the same ballistic path/collision approximation used by the physical bolt. Turning the guide off restores immediate keyboard throws.

## 6. Environment and sound

This remains one coherent low-poly art direction. The new props have 336–1,156 triangles per type and no texture downloads. Crates have pallets/straps, dumpsters include refuse, a reel includes a toolbox, and the gatehouse workstation includes radio, ticket trays and paperwork. Supports use actual imported bounds and mounting anchors. Scenery silhouettes remain on Low graphics; small effect counts scale with quality.

Large structures organize the space: the western loading bays, eastern awning, northeastern gatehouse and northern road. Cables link controls to machinery. Puddle ellipses are shared by visuals and contact tests. Damp footprints, ripples and droplets reuse fixed pools. Exterior rain uses 18/32/48 drops on Low/Medium/High; local steam uses 4 on Low and up to 12 otherwise. Nothing allocates a new particle mesh at a footstep or scare.

The twelve new sounds are roof rain, yard wind, two gravel steps, metal/glass/water bolt impacts, fence strike, door breach, road gravel, engine idle and an exterior tension layer. They are bundled Oggs with source hashes, CC0 notices and rebuild scripts. Ambient exterior/interior transitions use existing volume buses; the effects slider, loud-effects adjustment, master volume and night dynamic range still apply. Scare contacts briefly duck background layers instead of relying only on a louder master level.

The new audio pack is about 238 KB encoded and 9.38 MiB decoded at 48 kHz. Its samples are finite, unclipped, and its five loops passed numerical seam checks. Numerical checks and waveform inspection do not replace headphone/speaker listening tests. Use `source-assets/audio-v115/audition.html` through the local server or a media player to review the files; the project launcher only serves `dist`, so open the audition file locally if your browser permits its relative media URLs, or use a local development server rooted at the project for asset work.

## 7. Settings and safe upgrades

Before replacing an older folder, Pause → Export save and export your settings. Keep the old ZIP untouched. Extract the new full package into a separate folder. Stop only your own previous launcher before starting the new one. The normal local address remains the same; saves are tied to the exact browser and origin. A different port, itch.io address, profile or browser has different local storage.

Schema 1 and 2 saves migrate to schema 3. Original local JSON is backed up once under its old schema key when storage is available. An old completed run stays completed. An unfinished 1.14 run keeps its repairs and opens the yard after its garage objectives. Restart with New Game to see the new campaign from the beginning. Imported coordinates are never trusted as spawn positions.

Checkpoints use authored safe places. Car motion, active hiding, temporary distractions and enemy positions reset on Continue. The car returns to bay 042, while completed exterior tasks stay complete. Live car/road guidance is deliberately omitted from checkpoint exports; it cannot strand you in a saved collision pose. Used bolt trays and remaining stock persist.

Comfort → Stable horizon is ON by default. Bob, flashlight sway, impact shake, reduced motion, flashes and screen-edge intensity are independent. Existing preference exports remain compatible. FPS display, frame cap, render resolution/scale, fullscreen, sound levels, sensitivity and controller options remain available. Browser-managed VSync is explained honestly; the game does not claim to control the operating system's synchronization policy.

## 8. How the code fits together

A JavaScript module is a file that exports functions/classes for other files to import. All editable runtime modules are in `dist/js`. No bundler is required. After an edit, reload the local page. The complete source is reproduced in `docs/Full_Code.md`; edit the actual files, not that generated reading copy.

| File | What to edit |
|---|---|
| `campaign.js` | Exterior control coordinates, authoritative task text, hints and finite refill locations. |
| `tasks.js` | Ordered task contract; final driving/parked-car guidance derived from live state. |
| `yard.js` | Exterior construction, mounted signs, prop layout, importer, puddles, pooled weather, barrier/dolly and weak-door animation. |
| `vehicle.js` | Pure controlled-car simulation, full-footprint collisions, braking/reverse and safe left-side exit. |
| `staging.js` | Hero car mesh, entry/exit animation, cockpit, wheel/steering transforms and headlight origins. The old `drivePose` curve is retained only as a clearance regression reference, not runtime autopilot. |
| `game.js` | Action handlers, puzzle callbacks, saved completion, chase/encounter orchestration and per-frame coordination. |
| `state.js` | Schema migration, safe checkpoints, finite resources and validated preferences. |
| `threat.js` | Perception, evidence, search, pursuit and attack protection. |
| `navigation.js` | Collision-safe path graph and sliced A* work. The grid now covers garage, yard and road. |
| `distractions.js` | Three reusable bolts, swept contact tests and held aim guide. |
| `audio.js` | Prepared local buffers, spatialization, voice limit, weather/music crossfades and speed-driven engine layers. |
| `map.js`, `journal.js` | Matching task map, controls, collected clues and completed history. |
| `source-assets/yard-v115/` | Blender source, commented geometry generator, measured bounds/anchors, contact sheet and license. |
| `source-assets/audio-v115/` | Commented audio generator, exact source locks, waveform QA, audition page and license. |

Distances are metres, Y is height, and north is negative Z. B2 occupies roughly X −30…30, Z 1…111; the yard extends to Z −58 and the service road to approximately −100. Do not move a control mesh without moving its interaction anchor, task destination and support/collider. Do not add clutter across an intended route without checking the full vehicle footprint, including while turning.

To add a prop, first load one container during preparation, instantiate it at an authored position, preserve the imported glTF conversion root, ground it from measured bounds, and add one suitable collision proxy. A wall prop uses its mounting anchor instead of floor-centering. Detail-only weeds and tickets need no blocker. Dynamic meshes must stay in `Visuals.dynamicRoots` so the static batcher does not freeze them. Never fetch an asset for the first time in a scare callback.

To add a task, update the shared task contract and a real action handler, add a safe checkpoint, then test every progress prefix. Story saves are ordered prefixes, not arbitrary booleans. Preserve old IDs and write a migration when changing required order. Never simply mark all new tasks complete for an unfinished old save.

## 9. Optimization and checks

The expanded navigation grid is prepared while loading; static edges are cached, dynamic doors are checked live, and gameplay A* advances in bounded 128-node slices. Imports use two workers. Static geometry is merged by material/room/sector; the four fixture-light slots remain stable. Ten preparation views now include yard, gatehouse and road, with a separate headlight variant. Weather effects and impacts reuse prebuilt meshes. Audio has a 24-voice ceiling and deduplicates unchanged gain ramps.

Run from the extracted full project:

```bash
npm test
node tools/check.mjs
```

To rebuild the guide and both ZIPs:

```bash
python tools/build-guide.py
python tools/package.py --output releases
```

`docs/VERIFICATION.md` gives the exact result and limits. Tests include imported geometry, reachable objectives, natural scare sight lines, full-footprint controlled driving, finite save migration, bolt hearing, checkpoints, scene effects, startup recovery and existing regression coverage. The asset generators additionally check their actual GLBs and audio files.

Before calling this a public release, play the complete game on real WebGL hardware, including the yard, stopped-car exit/re-entry, difficulty changes, retries, imports and ending. Test mouse capture on the actual host and listen to all transitions. Record frame-time hitches, not only average FPS, on a representative low-end device. Confirm both new exterior scares are noticeable without forced turns. A release candidate with passing logic tests is not proof of premium visual polish or zero crashes on every machine.
