# Last Vehicle 1.11 — evidence, atmosphere and placement

**A GingrSnaps Project** · Complete low-poly browser edition · Babylon.js 9.33.1

You are Erin Cole, the last employee leaving Meridian. Your car is the last working way out, but its battery has been removed, the exit supply is dead, and something wearing an attendant's uniform is moving through the service rooms. Recover and repair the car, restore the exit, and reach the left driver door. The beginning, repair/exit objectives, checkpoint recovery, pursuit, vehicle escape and credits are included. First-time playtime remains a 15–30-minute design target, not a measured completion time.

This release concentrates on believable behavior and grounded detail. It keeps one visual style: deliberately low-poly shapes, restrained material textures and modern lighting. There is no pixelation or simulated 32-bit rendering layered on top.

## Start and upgrade

1. In your old installation, Pause → Export save if you want a portable backup. Export settings separately if you have customized them.
2. Extract the complete ZIP into a new folder. Keep its subfolders together instead of mixing versions.
3. Windows: double-click `START_WINDOWS.bat`. macOS/Linux: run `sh START_MAC_LINUX.sh`. Either Python 3.10+ or Node.js 20+ is required; no package installation is needed.
4. Alternatively, open a terminal in that folder and run `python START_GAME.py` or `node tools/serve.mjs --open`.
5. Keep the terminal open. The launcher opens `http://127.0.0.1:8080/`. Confirm **v1.11** at the bottom of the title screen.
6. Start a new game or Continue. Click Enter game / Capture mouse when prompted, then move the mouse freely. Escape pauses. An embedded host can deny capture; use the standalone-tab link or explicitly choose drag controls if necessary.
7. Read the current task in J → Task. H opens optional hints; it does not immediately reveal the solution.

Do not double-click `dist/index.html`. A `file://` page can block model and sound loading. The supplied server only serves local files; gameplay runs in JavaScript. The download is a complete browser game, not an EXE. Local play needs no external CDN, account or network service after download.

Saves and settings are tied to the browser address, including its port. Hosted, localhost and itch.io copies do not automatically share progress. Export/import moves progress between them. Existing supported checkpoint saves remain readable; this release keeps save schema 2 and the existing migration for older saves. It does not save an exact mid-chase position.

The three-second **A GingrSnaps Project** intro remains enabled on a fresh installation. Existing preferences retain their intro choice. Credits can replay it.

## Controls and the complete objective chain

| Action | Default |
|---|---|
| Walk / look | WASD / mouse movement |
| Use an object; enter or leave a shelter | E |
| Raise or put away the flashlight | F |
| Sprint / crouch | Left Shift / C |
| Journal / optional hints | J / H |
| Pause and release mouse | Escape |

All normal actions are remappable. Prompts and journal instructions follow those remaps. Tools are used automatically when you have the required part: there is no extra equipment wheel.

| Stage | What you actually do |
|---|---|
| Inspect | Use the hood or either side of your car in bay 042. This establishes the repair task. |
| Battery | Recover the displaced battery near the car. It becomes a carried repair item. |
| Security | Take the maintenance key. This unlocks the west service passage and starts the threat sequence. |
| Workshop | Use the cabinet to collect the replacement fuse and battery cable. |
| Repair | Return to the car hood and complete the repair action. The battery and cable become Installed. |
| Electrical | Install the fuse; switch Ventilation, Lighting, then Access. The technical note and progressive hints explain the order. |
| Authorization | Return to the Security terminal. Use Meridian's founding year, 1986, from the dedication plaque/log. |
| Exit | Use the gate motor left of the north exit to raise the shutter. |
| Escape | Return to the car's left driver side and interact. Entry, door closure and the drive are automatic; limited cockpit look and pause remain available. |

The siren, pressure valve, grille trap and evidence documents are optional. They do not replace the repair/exit chain. The same task records supply instructions, prerequisites, prompts, map destinations and hints. Reading the journal pauses the game; the screen stays quiet during exploration.

## How the Attendant now thinks

The opponent keeps a small notebook of observations rather than only one destination. Each clue has a kind, location, time, confidence and uncertainty. Sight, sound, visible beam patches, nearby locker movement and visible damp footprints can contribute. Clues fade; the notebook is capped at twelve entries.

1. **Notice and stalk.** An uncertain sighting can produce a slower, quieter approach before full pursuit. Low-confidence sounds are localized to an approximate area instead of a perfect coordinate.
2. **Commit to a decision.** A decision is held briefly so similar distractions do not make it change direction every frame. Fresh direct sight can interrupt immediately. The selector runs four times a second; visual sensing runs ten times a second.
3. **Pursue physically.** Acceleration, collision clearance, turns, blocked-edge avoidance and recovery use the actual movement controller. Failed routes lead to recovery and a finite search; the opponent is not teleported through a wall.
4. **Check likely cover.** Search locations come from remembered evidence, reachable cover, junctions and shelter entrances. It can pause to peek or crouch and inspect a location, then move on. Cleared places retain a short memory.
5. **Anticipate cautiously.** On Medium and Hard, a recently observed direction can support a route prediction and a short watch at that point. It does not know the player's next input. These opportunities have a cooldown and are conditional on its real position.
6. **Combine clues at lockers.** A witnessed entry can still lead to capture on every difficulty. On Medium and Hard, a nearby audible locker door plus a recent sighting or visible wet footprint near that locker can justify an inspection. A door noise alone, a random guess or an expired clue is insufficient. An uncorroborated inspection remains a near discovery.

The enemy must physically arrive and complete its inspection before checking the occupant. Hidden coordinates do not choose the search target. Easy deliberately omits footprint tracking and corroborated unwitnessed locker capture. Hard retains faster pursuit, stronger hearing, longer searches and shorter attack warnings. Difficulty changes pressure, not required objectives or access to hints.

**Practical hiding advice:** break sight, put solid cover between you and the Attendant, and make some distance before using a shelter. On Medium and Hard, entering a locker immediately after leaving a visible wet trail is riskier. You can always use the same interaction key to leave. A raised arm still gives a readable attack warning; move aside and use the recovery after a miss.

## Creature encounters and animation

The actual creature GLB now contains **21 clips**, adding Stalk, PeekLeft, PeekRight, DoorPush, CrouchSearch and StartRun to the fifteen existing actions. All fifteen older clips were preserved numerically. The creature remains 1,868 triangles with 38 deform joints; the editable Blender scene and generator are included.

| New motion | Purpose and timing |
|---|---|
| Stalk | A restrained low-speed gait; playback follows actual travel speed. |
| PeekLeft / PeekRight | Head movement leads the torso during stopped search attention. The root stays planted. |
| CrouchSearch | The creature lowers, scans and rises at a search point. |
| DoorPush | It approaches the trapped grille, reaches for the physical contact plane, and plays one strain sound at hand contact. |
| StartRun | A 0.6-second transition into pursuit. Its endpoint joins the first Run pose. |

One-shot poses follow gameplay time, including pauses. Walking contacts drive footsteps. Only the selected clip and fading transitions run; inactive clips pause. Turns and recovery poses retain their own phase, even when a pursuit transition is pending. The contact animations are baked into the asset; there is no runtime inverse-kinematics solver.

The three major authored events remain Security glass, the Workshop breach and restored-power surge. They include anticipation, directional sound, an animated impact and persistent aftermath. Quiet intervals separate authored major events, while ordinary pursuit can still occur. The service-passage close encounter, shelter inspection and left car-window strike depend on the real enemy position and the player's route.

The director now tracks time spent eligible for a queued Workshop or Electrical beat. If physical actor staging cannot produce the event, a readable environmental version can fire after twelve eligible seconds. This avoids waiting indefinitely for the enemy to reach a scene. It does not force the camera, stop a required task or spawn a second enemy. A player who immediately leaves the room can still miss an encounter; the game does not falsely mark an unseen impact as watched.

## More detailed rooms and properly supported props

Twenty-four original CC0 low-poly prop types are supplied, totaling 10,027 triangles and 576,208 bytes before repeated placements. They share a muted industrial palette and have no external texture requests. Their detailed source manifest records bounds, units, named anchors, materials, hashes and support planes.

| Area | Added dressing |
|---|---|
| Exit and parking | Ticket dispenser, safety bollards and wheel stops aligned with the shared parked-car records. |
| Security | Desk lamp, ticket stack, wall clock, extinguisher and conduit junction. The lamp uses its imported emitter anchor and an existing light slot. |
| Storage | Parts cabinet, coiled cable, warning stand and wall fan. |
| Workshop | Tool board, battery charger, tool tray, folded rag, maintenance trolley and service bucket. Bench items sit on the measured 0.925-metre work surface. |
| Electrical | Wall-mounted electrical box, junction, cable tray and pipe clamp. |
| Pump room | Pressure gauge connected to a supply pipe, hose reel, drain cover, bucket and warning stand. |
| Service passage | Cable tray, wall clamp and connected pipe/conduit details. |

Imported props are measured after glTF handedness conversion. The same bounds ground them and supply appropriate body collision. Larger objects block movement; low cables, wheel stops and drain detail do not create frustrating invisible trip barriers. Decorative objects do not acquire a Use prompt just because they resemble equipment.

Signs resolve against supporting geometry before batching. Wall labels receive a consistent plate offset and fasteners; suspended labels receive ceiling hangers. The gate label now fits its motor housing. Shelter labels have fixed structural headers instead of floating above the roof. The Electrical warning fits its cabinet face; the dedication plaque has a post and backing. The placement audit reports unsupported labels instead of silently treating them as aligned.

Damp wall growth now reaches the visible wall surface and uses irregular outlines. Existing moss, mold, rust and concrete maps remain local and credited. Added drain insets, pipe connections and bounded wet footprints give the detail a physical reason to be there. The new wall fan is a static asset; existing animated ventilation fixtures remain animated.

## New music, surface sound and wet traces

Twelve new Ogg files are included: two music excerpts and ten short effects. All source recordings carry CC0 notices. The game does not require self-recorded audio.

| Files | Source and use |
|---|---|
| `confined-ambience.ogg` | Tsorthan Grove, Confined Spaces: a prepared exploration/suspicion bed. |
| `nobody-aftermath.ogg` | aspiringcodemonkey, Nobody's Home: a quieter aftermath layer. |
| `concrete-step-1..3.ogg` | Three distinct recorded shoe contacts for concrete. |
| `debris-step-1..3.ogg` | Three gravel contacts used for loose debris near the room edges. |
| `grate-step-1..2.ogg` | Foley composites combining shoe contact and rubberduck metal recordings; not literal grate-field recordings. |
| `hinge-creak-1..2.ogg` | Joseph Sardin metallic-door excerpts for shelter movement. |

The new music replaces the corresponding decoded default beds; older bundled compositions remain available for editing. Dry steps vary without immediate repetition. Existing five recorded water contacts remain tied to the visible puddle ellipses. Feet leaving water retain wetness for several contacts, produce damp shoe sounds and leave fading prints. Medium/Hard AI can notice fresh forward-facing prints within a short visible range. Those prints fade and clear on checkpoint reset.

Positional sound can arrive through an actual clear doorway when a wall blocks the direct line. The game checks both route segments against current barriers; a closed opening muffles it. Obstruction checks remain spread across updates, and identical filter/gain ramps are not repeatedly restarted. This is a lightweight doorway approximation, not an acoustic simulation of every reflection.

The additions occupy 489,202 compressed bytes and approximately 8.07 MiB as decoded float32 sample data in the inspection tool. Audio is prepared before play with two decode jobs at a time and a bounded voice count. Waveform, decode and peak checks passed; subjective listening and browser mix balance still require playtesting. See `immersion-audio-inspection.json` and `source-assets/immersion-audio/` for exact provenance and processing.

## Settings, lighting and performance

The existing settings remain available: separate mouse axes/sensitivity, capture mode, remapping, hold/toggle choices, FOV, brightness, render scale, quality/shadows, glow/FXAA, fullscreen, frame cap, adaptive resolution, FPS/frametime/1% low displays, audio buses, loud-effects volume, Night dynamic range, captions, interface scales and reduced motion/flashes. Safe Apply → Keep/Revert protects display changes. Settings and saves export separately.

VSync and physical display mode are browser-managed; the game does not pretend to change the operating-system resolution. Its resolution setting changes the rendered canvas. An FPS limit is a cap, not a guarantee that a device can reach it.

Seven existing light objects remain stable: ambient fill, two flashlight/headlight spots and four reusable local-light slots. The new desk lamp uses one of those slots at its real emitter. Darkness, fog and constrained fixture ranges preserve a reason to use the flashlight. During the left-seat escape, the flashlight model stays put away and the two beams mount beyond the bumper, point along the car and exclude cockpit/car surfaces.

The navigation update precomputes grid point records, caches dynamic blocked-cell checks per query, avoids unused edge-key allocations and uses an eight-direction heuristic. On the recorded pre-update garage fixture, an interleaved Node CPU comparison reduced the driver-to-exit path-query p95 from 3.259 ms to 0.463 ms. This is a query measurement on the build host, not a browser FPS or freeze claim. Full results and their limitations are included under `source-assets/navigation-evaluation/`.

An actual pinned Recast/Detour WASM navmesh experiment was also completed. Expanded collision proxies worked on the representative paths and dynamic-grille experiment; a standard rounded-radius bake did not consistently match this game's square-expanded collision contract. The release retains the optimized grid because a production Recast adapter still needs full evidence-projection, partial-path, barrier and encounter integration. The optional research source/WASM is in the complete source ZIP only; the playable browser build does not load it.

New models load with bounded concurrency. Existing staged construction, material preparation, sector batching, conservative room culling, selective shadows and resource cleanup remain. Wet prints, ripples and droplets are preallocated. Flashlight updates reuse direction vectors. No new per-step meshes, live asset streaming, realtime water reflection, blanket high-resolution texture upgrade or unmeasured worker migration was added. Baked room lightmaps, model LOD authoring and broader engine replacements remain possible future work after browser profiling establishes a need.

## Learn and customize the release

| File | What it controls |
|---|---|
| `dist/js/tasks.js` | Shared objectives, prerequisites, journal text, prompts and hints. |
| `dist/js/evidence.js` | Bounded evidence memory, confidence decay and decision commitment. |
| `dist/js/threat.js` | Sensing, stalking, pursuit, search, hiding and attacks. |
| `dist/js/difficulty.js` | Pressure and stamina without changing the story gates. |
| `dist/js/navigation.js`, `locomotion.js` | Route queries, clearance, movement, turns and recovery. |
| `dist/js/details.js` | New prop placements, support heights, named utility connections and colliders. |
| `dist/js/anchors.js` | Sign mounting and development placement records. |
| `dist/js/surfaces.js` | Puddles, drain contacts, wet shoes and reused effect pools. |
| `dist/js/acoustics.js`, `audio.js` | Doorway routing, recordings, volume buses and tension mix. |
| `dist/js/creature-scenes.js` | Physical staging, readable contacts, cancellation and fallbacks. |
| `dist/js/visuals.js`, `presentation.js` | Clip blending, foot cues, intro and presentation. |
| `source-assets/industrial-details/` | Editable Blender scene, 24-model generator and validation. |
| `source-assets/attendant/` | Creature Blender source, generator, contact and preservation checks. |

For a first level edit, find a row in `DETAIL_LAYOUT`. Its fields are model ID, X, support-bottom Y, Z, yaw in radians, and optional support kind. One unit is one metre. Change one position at a time. Keep a wall object's back plane against the wall; keep bench items at their measured surface height. The loader derives the imported bounds and collider from that row.

For a first AI edit, change a single value in `difficulty.js`, such as Medium's search duration. Do not give the threat direct access to hidden player coordinates. Observe its decision reason and evidence through Pause → diagnostics, then run the tests before changing a second parameter.

For placement inspection, append `?inspect=1` to the game URL. In the browser console, `lastVehicleInspector.report()` returns the placement report; `lastVehicleInspector.show()` displays small anchor markers and `lastVehicleInspector.hide()` removes them. This facility is absent from the ordinary URL and allocates markers only when requested.

To replace music, keep your licensed Ogg file under `dist/assets/audio/` and change the explicit mapping in `AudioMixer.load()`. Preserve the source URL/license, processing notes and SHA256 in `assets-manifest.json`. Run the integrity check after updating the manifest. Audition at quiet and loud settings; a successful decoder check is not proof of a good mix.

Run `npm test` and `npm run check` with Node.js 20+. No `npm install` is required. Regenerate the illustrated HTML guide with `python tools/build-guide.py`. Rebuild both archives with `python tools/package.py --output releases`; this also refreshes `docs/Full_Code.md` with full commented code blocks. Read `BUILD_AND_EDIT_GUIDE.md` for the broader beginner walkthrough.

## Package contents and itch.io

`LastVehicle_Browser_Complete.zip` contains the local launchers, complete runtime/source, editable asset sources, tests, licenses, optional navigation research and teaching documents. Open `docs/LastVehicle_Guide.html` for the illustrated offline guide.

`LastVehicle_Itch_HTML5.zip` contains only playable files, with `index.html` at its root. Upload it to an itch.io HTML project, mark it playable in the browser, and enable fullscreen. Keep the supplied credits/notices. Test capture, audio, saves and fullscreen from the real hosted page; iframe permissions can differ from localhost. There is no desktop EXE in either ZIP.

## Verification and remaining playtest

Read `VERIFICATION.md` for the final automated results. The checks load actual imported geometry, validate all sign mounts and model bounds, traverse the real new obstacle layout at simulated 30/60/144 Hz, exercise evidence/hiding rules, and check the entire escape car footprint. Skeletal animations, task progression, save compatibility, journal consistency, capture states, settings and resource bounds are also exercised.

The managed browser preview service is unavailable in this environment. WebGL appearance, perceived scare quality, audible mixing, flashlight glare and real-device frame pacing have not been verified. The source build and automated results are supplied for your next playtest; they do not certify premium commercial quality, 60 FPS or an absence of crashes/freezes.

Use this practical acceptance route: cold-load the game; inspect the car and collect the battery; visit Security and Workshop; let the enemy see you and chase around a parked car; break sight and try a distant shelter; cross a puddle and compare a nearby shelter on Medium/Hard; restore power and finish the exit. Repeat from a checkpoint with Low and High graphics. Pause during an impact and during car entry; confirm each resumes once. Test the final drive with the flashlight previously on and off. Export diagnostics and a performance-route report if a stall or alignment problem remains.
