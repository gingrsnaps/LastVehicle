# Last Vehicle 1.16 — The Night Yard

**A GingrSnaps Project** · Low-poly browser horror · 4 November 2026

This update repairs the outdoor guidance, adds a readable night sky and more grounded scenery, and reduces unnecessary collision and scene work. It includes the entire game, editable code, original model sources, local assets, instructions and automated checks. It remains a downloadable release candidate: the available test browser cannot initialize WebGL, so final lighting, sound, physical controls and hardware performance still need a human playtest. The live browser site remains on 1.12 until that gate passes.

## 1. Start the complete game

1. Extract `LastVehicle_Browser_Complete.zip` into a new folder. Keep your older version as a backup.
2. Install either Python 3.10 or newer, or Node.js 20 or newer. No package installation is required.
3. Windows: double-click `START_WINDOWS.bat`. macOS/Linux: run `sh START_MAC_LINUX.sh` from the extracted folder.
4. The launcher serves the bundled files and opens `http://127.0.0.1:8080/`. Leave its terminal open while playing.
5. Choose a difficulty, start, and wait for scene and sound preparation. Click Resume game or Enter game to grant mouse capture. Move the mouse without holding a button. Escape pauses and releases capture.
6. If capture is denied by an embed or browser permission, use the standalone-tab link or explicitly select drag controls. A denied request does not silently pretend that capture succeeded.

The terminal alternatives are:

```bash
python START_GAME.py
```

```bash
node tools/serve.mjs --open
```

Do not open `dist/index.html` directly with `file://`: browser security can block its model and audio loads. This is a complete local browser game, not an EXE. Runtime files are bundled; local play needs no CDN, server account or API key. Blender is only needed if you want to rebuild the editable models.

## 2. Controls and comfortable settings

| Action | Keyboard and mouse |
|---|---|
| Walk / look | W A S D / move the mouse |
| Interact | E, shown only when the object is reachable and usable |
| Sprint / crouch | Left Shift / C |
| Flashlight | F; hidden while switched off |
| Journal / hints | J / H |
| Current task on request | Tab |
| Bolt distraction | Hold Q to aim; release to throw |
| Drive | W/S accelerate, brake and reverse; A/D steer |
| Leave stopped car | E, when the left driver side is clear |
| Pause | Escape |

Settings retain remapping, sensitivity on both axes, optional controller support, audio buses, loud-effect level, dynamic range, difficulty, objective display, FPS/frametime overlay, render scale, frame cap, fullscreen and safe graphics Apply/Keep/Revert. Browser VSync is managed by the browser; the game cannot change your operating-system display mode. Render resolution changes the game canvas.

New controls are **Rain and steam: Off / Reduced / Full**, **Night sky brightness**, and **Gentle wind animation**. Fresh settings use Reduced weather. Off removes exterior rain and steam meshes, while existing audio bus controls remain independent. Gentle wind animation controls nearby chain/tarp movement and cloud drift; Reduced motion also stops that decorative movement. Sky brightness changes the unlit background only. It does not brighten the ground, weaken the flashlight or change the hunter's perception.

Start on Low graphics if performance is uncertain. Preserve a comfortable sensitivity rather than trying to correct low FPS with faster mouse input. Stable horizon defaults on. Disable bob, shake and sway separately if needed. Keep the compact objective visible with Gameplay → Objective display → Always, or select Journal only for a quieter screen. Existing choices survive an upgrade.

## 3. Outdoor guidance that reaches the object

The first exterior objective is the **BARRIER CONTROL** cabinet, before the cargo dolly and left of the central driving lane. Its usable face now has an amber panel, handle, status indicator and matching label. The journal no longer describes a different color or leads to an empty doorway.

Open J → Task or Map and choose **Request a temporary direction marker**. Guidance lasts up to one minute of active play, or until the task completes. Reading the journal pauses its timer. You can request it again without penalty.

- A flat **floor arrow** follows a clear walking route. It is a direction cue, not a pickup or control.
- An upright **diamond** marks the actual object when its approach is close and visible.
- The **use key** appears only when the normal interaction test confirms reach, sight and prerequisites. A marker never lets you use something through a wall.
- The map includes your facing arrow. Its destination names and the physical signs use the same outdoor control definitions.
- Hints remain optional and reveal progressively. Requesting help does not advance a puzzle or consume an item.

The route planner is sliced across frames. It checks corners and doorway clearance instead of pointing straight through walls. A discovered gatehouse bug was corrected: an arrow can no longer skip the doorway turn before your body clears the opening. Tests follow the guide to a usable prompt from nine starting positions across the four exterior controls.

## 4. Full walkthrough — contains solutions

1. **Inspect bay 042.** Use the teal car's hood or door. The notice explains the sabotage and the overhead lights fail. Raise the flashlight with F.
2. **Recover the battery.** Take it from the floor in front of the car. The journal distinguishes carrying an item from installing it.
3. **Find the maintenance key.** Take the brass key ring from the raised tray in Security. The sudden glass contact is a story encounter; the window protects you from that contact. The hunter subsequently uses a physical route around the partition.
4. **Take repair supplies.** Open the labelled Workshop cabinet with the key. The pickup supplies a replacement cable and exit-control fuse. West service shortcuts become available.
5. **Repair the car.** Use the open hood to install the battery and cable. You can cancel a held action and flee without losing completed tasks.
6. **Restore exit power.** At Electrical, select VENTILATION, then LIGHTING, then ACCESS. An incorrect order resets the sequence without consuming the fuse.
7. **Authorize the shutter.** Enter 1986 at the Security terminal. The founding-year clue is also in the journal and dedication plaque.
8. **Raise the garage shutter.** Use its motor at the north exit. Continue on foot into the yard; the car becomes available after the outside route is cleared.
9. **Inspect BARRIER CONTROL.** From the shutter, follow the left pedestrian strip north. Stop at the amber front panel on the cabinet near the north fence, before the central dolly. Read its handover in the journal. Do not try to interact with the sign or fence itself.
10. **Use UTILITY SELECTOR.** Cross to the east awning, approach the selector from its open west side, then choose LOADING OFF followed by GATEHOUSE ON. Its plate and journal use those exact labels.
11. **Release BARRIER BRAKE.** Enter the gatehouse through its south opening. The yellow wheel is on the LEFT wall by the damaged side door, not beside the desk. Use it to crank the barrier open. The ordinary doorway remains an alternative to the breakable side opening.
12. **Use DOCK WINCH.** Go to the west loading dock. Follow the red cable to the winch, approach from the clear east side, and move the cargo dolly out of the driving lane. Cancel if the hunter forces you to move.
13. **Return and drive.** Return to bay 042 and enter the LEFT driver door. Wait for the short entry/latch animation, drive west out of the bay, then north along the main lane. Pass through the open garage shutter and street barrier. Go LEFT around the service-road container and follow the amber lights to the end of the road. Walking to the road end does not complete the vehicle escape.

Three optional evidence documents change the ending report; reading every lore note is not required. The game retains its three-second **A GingrSnaps Project** intro, failure/retry flow, credits and ending. The 25–35 minute first-exploration target remains a design goal, not a measured playthrough time. Knowledgeable players can finish faster; no wait timers were added to pad it.

## 5. Environment, sky and weather

The art direction stays low-poly. Six new original CC0 models add loading trolleys, linked bollards, strapped freight under a tarp, wall service pipes, gatehouse chairs, and a calendar/coat arrangement. The exterior now has **55 imported prop placements**, up from 30, alongside gutters, downpipes, drains, worn paving, small desk objects, broken concrete and a distant industrial skyline.

Clutter is grouped around loading bays, storage edges and the gatehouse. The left pedestrian strip and the main driving corridor remain clear. Actual imported bounds determine floor contact; rear mounting anchors place wall objects against their support plane. Two overlapping prop arrangements found during review were moved. Decorative weeds and paper do not become ankle-height collision traps. Solid freight supplies readable cover, and outdoor cover is no longer excluded by a garage-first hunter cache limit.

The sky is three lightweight, unlit meshes: a dark horizon gradient, stylized clouds, and moon/stars. It follows the camera as a background, without a giant illuminating dome or real-time cloud noise. Distant building silhouettes and a few window strips give the yard a horizon. The flashlight and fixture lighting still determine visibility in the playable space. Final contrast and silhouette readability need a rendered check on your machine.

Nearby chains and a tarp move slowly when comfort settings allow. Their update range is bounded. Rain checks the gatehouse roof, utility awning and loading overhang before drawing a drop. Reduced weather uses 10–14 rain drops and four steam pieces; Full uses 18/32/48 rain drops by graphics quality and four or twelve steam pieces. Pools are created during loading and reused. Walking through puddles retains the existing surface-specific splash sounds, ripples and wet-footprint evidence.

This release retains the 76 bundled Ogg files, including yard wind, roof rain, city ambience, layered music, gravel/metal/glass/water contacts and the earlier scare sounds. It does not add another audio pack. Audio volume remains independently adjustable. Existing public-asset credits and notices remain bundled; the six new model types have their own CC0 dedication and editable Blender source.

## 6. Pursuit and scares

The hunter still uses sight, audible footsteps and impacts, recent clues, wet tracks and last-known routes. It does not receive your live hidden position. Solid exterior freight and trolleys are included in its evidence-based cover search. Bolts retain swept collision, material-dependent impact sound and diminishing usefulness after repeated distractions; first-contact ordering is preserved by the new collision index.

Easy gives more room to recover and checks lockers only after witnessed entry. Medium and Hard can combine nearby locker sound with recent sight/track evidence. All modes retain the same clues and required actions. Break sight before entering a shelter. A thrown bolt may draw an investigating hunter, but does not override a fresh visual chase.

The key-window, fence and gatehouse contacts from 1.15 remain task-linked and share physical contact timing with their sounds. This update prioritizes reaching those encounters, clear geometry and stable work per frame. Their subjective scare quality has not been claimed as verified without a rendered and audible playthrough.

## 7. What changed for performance

| Change | Purpose and limit |
|---|---|
| Six-metre spatial buckets | Exact collision and sight tests examine nearby static bodies plus live moving bodies. Doors and the dolly remain dynamic. This reduces candidate work; it is not an FPS measurement. |
| Smaller exterior/entrance sectors | Material batches near the yard use 16 m depth sectors; deeper garage sectors retain 25 m grouping. The renderer can exclude more unseen geometry. |
| Position-aware visibility | Outdoor positions retain the garage facade and entrance, without enabling the deep garage. Completing a task keeps the current sector instead of briefly switching to the title-camera area. |
| Bounded guidance | Navigation expands in 128-node slices. Routes are cached and replanned when necessary rather than rebuilt continuously. |
| Pooled weather and effects | Rain, steam, splashes and bolt effects reuse prepared meshes. No asset download is triggered by a footstep or scare. |
| Deferred bolt-impact save | Inventory consumption is saved at throw time; the additional impact save uses the existing deferred queue. This avoids a redundant synchronous write at contact. |
| Local area timings | Diagnostic exports separate areas and record frame-time buckets, long frames, CPU submission and GPU timing when available. No analytics are uploaded. |

Existing two-worker model loading, prepared audio buffers, ten-view material warmup, stable fixture-light slots, selective shadow casters, frame limits, resolution controls and recovery screens remain. More scenery still costs resources: software checks cannot establish that every device now runs smoothly.

## 8. Safe updates and saves

Before replacing your old folder, export a save and settings from Pause. Extract the new ZIP separately. Stop only your own older launcher before starting the new one. Browser saves belong to the exact browser profile and origin; localhost, a different port, itch.io and the hosted site have separate saves. Use import/export to transfer them.

Save schema remains **3**, compatible with 1.15. Older schema 1 and 2 saves migrate and retain a local original backup when storage is available. Completed tasks and finite bolt refills persist. Continuing restores an authored checkpoint; it resets transient pursuit, hiding and vehicle motion instead of trusting arbitrary imported coordinates. A completed older ending remains completed. Start New Game to experience all changes from the beginning.

Graphics changes retain Apply/Keep/Revert. A lost graphics context pauses and preserves the checkpoint; restoration alone does not silently resume a potentially broken scene. A runtime error offers recovery. These mechanisms limit damage but do not prove the absence of future crashes.

## 9. Beginner editing map

JavaScript modules are individual files that export functions/classes. The browser imports them directly; there is no bundler or installation step. Edit the actual file, save it, then reload your local page. `Full_Code.md` is a generated reading copy with the full commented code blocks; it is not the runtime source.

| File or folder | What it controls |
|---|---|
| `dist/js/campaign.js` | Shared exterior IDs, names, object coordinates, usable approaches and hints. Start here when moving a control. |
| `dist/js/yard.js` | Yard geometry, prop transforms, supported labels, effects and barrier/dolly animation. |
| `dist/js/wayfinding.js` | Clear walking routes, doorway lookahead, object diamonds and bounded planning. |
| `dist/js/spatial.js` | Static broad-phase buckets and live moving-body checks. Exact collision remains in navigation.js. |
| `dist/js/visibility.js` | Conservative rules deciding which room/sector batches stay enabled. |
| `dist/js/night-sky.js` | Unlit sky, moon, clouds and comfort-aware drift. |
| `dist/js/game.js` | Production actions, progress, player/enemy coordination, saving and per-frame work. |
| `dist/js/performance.js`, `ui.js` | Area timings, local report export and the guided performance route. |
| `dist/js/state.js`, `preferences.js` | Validated settings, checkpoint schema, defaults and transactional graphics options. |
| `dist/js/map.js`, `journal.js` | Facing arrow, destination labels, optional hints and route requests. |
| `dist/js/threat.js` | Perception, evidence, chase/search and cover candidates. |
| `dist/js/vehicle.js`, `staging.js` | Driving/collision and the car's visible animation/cockpit. |
| `source-assets/yard-v116/` | Blender file, commented generator, geometry validation, contact sheet and CC0 dedication. |
| `tests/release116.test.js` | Actual outdoor route-following, placement, sky/weather and spatial regressions. |

World distances are metres; Y is height and north is negative Z. Keep the interactive position, labelled mesh and approach together. `YARD` in campaign.js is the outdoor source of truth. A route approach is the clear place to stand; it is intentionally outside the object's collision body.

When adding a prop, load its container during preparation, preserve the imported glTF conversion root, ground it using actual bounds, and add a simple collider only if it is solid. Wall models use their rear anchor. Keep dynamic models out of static batching. A moving collision body must be marked dynamic before spatial indexing; static positions are authored before that index is built. Do not move indexed static geometry at runtime without rebuilding its index. Test walking and the full vehicle footprint after any layout edit.

Run the checks from the project root:

```bash
npm test
node tools/check.mjs
```

Rebuild the offline guide and packages after editing:

```bash
python tools/build-guide.py
python tools/package.py --output releases
```

## 10. Verification and remaining playtest

Read `VERIFICATION.md` for the exact automated results. Geometry import, nine guided approaches, grounded supports, outdoor overlaps, full vehicle route, progress handlers, settings, save migration and recovery are covered. NullEngine does not render the final game or play audio. The six new models also have Blender renders and measured geometry reports; these are distinct from in-game lighting approval.

For a meaningful device comparison, use the same browser, window size, graphics, frame cap and save. Run the guided performance test from Settings. After normal startup preparation, walk from the garage shutter to BARRIER CONTROL, UTILITY SELECTOR, BARRIER BRAKE, DOCK WINCH and back. Repeat the same route. Test the drive separately. Export diagnostics so area-level long frames and CPU/GPU data can be compared; average FPS alone can hide a hitch. A first pass after warmup is not a cold-shader benchmark.

Before publishing, complete one uninterrupted new-game-to-ending run. Check each sign from its natural approach, readable darkness with the flashlight on/off, mouse capture after pause, rain shelter, the three contact encounters, pursuit through both gatehouse openings, safe hiding, bolt hearing, saving/continuing and the left-side driving escape. Test Low on a modest device and your intended quality on the target machine. Check listening volume and controller/iframe behavior on the actual platforms you will offer.

The managed browser currently reports WebGL unavailable, including after the Low-graphics retry. No measured GPU gain, guaranteed frame rate, zero-freeze claim or final visual approval is supplied. The downloadable candidate is ready for that hardware review; the live 1.12 site is deliberately unchanged.

## 11. Browser upload package

`LastVehicle_Itch_HTML5.zip` contains the playable `dist` files with `index.html` at its root. The complete ZIP additionally contains launchers, source assets, tests and documentation. For itch.io, create an HTML project, upload the HTML5 ZIP, enable browser play and fullscreen, and test mouse capture, audio and saving in the actual embed before making it public. Keep all bundled license files.

The original game code and GingrSnaps branding retain their separate terms in `PROJECT_NOTICES.txt`. Third-party notices remain attached. The new six-model pack is CC0; its source and runtime copies include the dedication. No paid assets or engine are required to run this package.
