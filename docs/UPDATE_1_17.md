# Last Vehicle 1.17 — Weathered Meridian

**A GingrSnaps Project** · Low-poly browser horror · 5 November 2026

This update polishes surfaces and outdoor layout, adds vegetation and damp detail, repairs the winch cable and utility conduit, and makes bolts useful for both distraction and brief direct-hit staggers. The entire game, commented source, original assets, launchers, walkthrough and tests are included. It is a downloadable release candidate: the available test browser still cannot initialize WebGL. Final lighting, audible mix, mouse/controller feel and hardware performance require a rendered playtest; live 1.12 remains unchanged until that accepted gate passes.

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

Retained exterior controls are **Rain and steam: Off / Reduced / Full**, **Night sky brightness**, and **Gentle wind animation**. Fresh settings use Reduced weather. Off removes exterior rain and steam meshes, while existing audio bus controls remain independent. Gentle wind animation controls nearby chain/tarp movement and cloud drift; Reduced motion also stops that decorative movement. Sky brightness changes the unlit background only. It does not brighten the ground, weaken the flashlight or change the hunter's perception.

Start on Low graphics if performance is uncertain. Preserve a comfortable sensitivity rather than trying to correct low FPS with faster mouse input. Stable horizon defaults on. Disable bob, shake and sway separately if needed. Keep the compact objective visible with Gameplay → Objective display → Always, or select Journal only for a quieter screen. Existing choices survive an upgrade.

## 3. Outdoor guidance that reaches the object

The first exterior objective is the **01 BARRIER CONTROL** cabinet, before the cargo dolly and left of the central driving lane. Leave the garage shutter and follow the paved strip on your LEFT; the control is on the right side of the west loading structure. The remaining landmarks read **02 UTILITY SELECTOR**, **03 GATEHOUSE**, then **04 DOCK WINCH**. The map repeats that order. Its usable face now has an amber panel, handle, status indicator and matching label. The journal no longer describes a different color or leads to an empty doorway.

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
12. **Use DOCK WINCH.** Go to the west loading dock. Find the **04 DOCK WINCH** sign and follow the steel cable to the winch, approach from the clear east side, and move the cargo dolly out of the driving lane. Cancel if the hunter forces you to move.
13. **Return and drive.** Return to bay 042 and enter the LEFT driver door. Wait for the short entry/latch animation, drive west out of the bay, then north along the main lane. Pass through the open garage shutter and street barrier. Go LEFT around the service-road container and follow the amber lights to the end of the road. Walking to the road end does not complete the vehicle escape.

Three optional evidence documents change the ending report; reading every lore note is not required. The game retains its three-second **A GingrSnaps Project** intro, failure/retry flow, credits and ending. The 25–35 minute first-exploration target remains a design goal, not a measured playthrough time. Knowledgeable players can finish faster; no wait timers were added to pad it.

## 5. Materials, decay and outdoor scenery

The art direction remains **low-poly**, with clean silhouettes and properly scaled real surface detail. This is not a pixel-filter/32-bit hybrid. Six public CC0 materials from Poly Haven supply twelve 512×512 JPEGs: color plus roughness. Their exact sources, authors, hashes and licenses are included in `assets/assets-manifest.json`, `assets/licenses/Surfaces-v117.txt` and `source-assets/surfaces-v117/`.

| Material | Repeat width | Main use |
|---|---|---|
| Asphalt | 2.08 m | Yard and road surface |
| Rough concrete | 1.23 m | Interior floor, columns, plain structural concrete |
| Brick | 3 m | Exterior building-wall palette |
| Weathered planks | 1.8 m | Gatehouse desktop and wood surfaces; darker tint on trunks |
| Painted metal | 2 m | Eligible steel/teal industrial palettes |
| Leaf litter | 3 m | Ground beyond fences and shaded border patches |

The maps are shared across eligible materials. UVs are projected using actual world dimensions before batching, including glTF transforms, so a whole floor no longer stretches one tile over its entire length. Paper, signs, icons, glass, rubber, cloth and existing Kenney color-map assets retain their deliberately readable surfaces. Existing moss, rust and peeling-paint images are reused and physically scaled; this does not fetch duplicate copies.

The twelve new runtime images total **643,916 bytes** (about 629 KiB). A conservative RGBA8 allocation with mipmaps is around **16 MiB**, before browser/engine overhead. They are local files and load in pairs behind the preparation screen. No normal/displacement maps or extra shadow-casting lights are added by this pack. The complete source ZIP includes the original 1K files, official metadata, commented conversion script and a repeated-texture contact sheet.

There are **24 new low-poly shrubs** and **eight background trees** around the yard and road, with leaf litter beneath them. Their leaves use opaque geometry, avoiding layers of transparent forest cards. They share materials, merge into static sectors and have no gameplay colliders. The retained industrial skyline and night sky prevent the map edge from ending in empty blackness. The main walking strip and vehicle route stay clear.

Irregular moss and mold follow shaded wall bases and drainage. Gatehouse paint is mounted against the rear wall. Puddles gain softer vertex-alpha edges and restrained roughness, while preserving the existing footstep/splash contact regions and wet-track evidence. The existing 55 imported exterior placements, six-model yard pack, worn garage models, roof details, paper and utility clutter remain included.

Two physical presentation faults were corrected: the yard floor now meets the garage floor without a duplicate coplanar apron, and the utility conduit has roof hangers with drops meeting its cabinets. The winch uses three continuous non-emissive steel segments through a floor fairlead; its final hook follows the cargo dolly throughout the animation. Fence wire spacing/thickness is less prone to fine-line shimmer. These geometric checks do not substitute for judging final image quality on a display.

The three-mesh unlit night sky, independent sky brightness, nearby chain/tarp motion and sheltered pooled rain/steam remain. Reduced motion stops decorative wind movement; weather can be Off, Reduced or Full. Water sounds, city ambience and the layered music remain among the **76 bundled Ogg files**. No additional audio pack is claimed in 1.17.

## 6. A hunter you can misdirect, not defeat

Hold **Q** to aim and release to throw. The optional trajectory dots show the arc. Ammunition is finite and saved when consumed; the labelled bolt trays are once-only refills. A throw is not an unlimited attack.

**Surface distraction:** hit metal for a clear ringing clatter, or use glass, concrete or water for their distinct existing sounds. The sound is positional and keeps a short audible tail. It has higher voice priority than ordinary footsteps within the same 24-voice limit, so a walking sound cannot immediately evict the explanation for the distraction. Subtitles confirm the contact when enabled. Volume controls and distance still apply.

**Direct hit:** hit the creature's actual swept body volume to interrupt its attack windup or movement. It turns toward the incoming impact and plays the authored recovery motion. Bolts cannot stun through walls, and a bouncing bolt cannot repeatedly trigger hits. After a stagger there is four seconds of extra resistance; a repeat impact still sounds but does not extend the immobilization.

| Difficulty | Direct-hit stagger | Lost-sight delay before a chase may follow a bolt |
|---|---|---|
| Easy | 2.10 s | 0.40 s |
| Medium | 1.55 s | 0.70 s |
| Hard | 1.05 s | 1.00 s |

A fresh visible chase ignores a surface distraction. First break sight behind solid cover, then throw away from your route. A genuinely lost-sight hunter can now change from chase to investigation; its previous visual memory no longer immediately overwrites the heard target. Investigation is committed for a distance-based bounded interval. Fresh sight still wins. Repeating the same regional trick makes it less convincing and can prompt a nearby cover check.

When it reaches the last witnessed corner, the hunter may complete one short continuation along your **observed** motion, then listen and search. That destination freezes; it does not follow your hidden coordinates. Recent searches keep patrol choices near the last evidence before expanding again. Nearby route corners blend only if the whole body clears the shortcut, reducing stop-turn motion without clipping through cover. Existing backstep/repath recovery remains physical.

Easy checks shelters after witnessed entry. Medium and Hard can combine a nearby door sound with recent sight/track evidence. Hide after breaking sight. A successful bolt stagger cannot be cancelled merely because you entered a locker during that escape window.

The key-window, workshop, power, yard-fence and gatehouse-door encounters retain their task/contact timing. This release fixes the hunter's responses and recovery-pose priority; it does not claim a new scare pack or human-verified scare intensity. The enemy is still the single rigged Attendant, with its 38 deform joints and 21 authored clips.

## 7. What changed for performance

| Change | Purpose and limit |
|---|---|
| Shared bounded surface maps | Twelve 512 px images load during preparation; world-scale UVs avoid per-object texture clones. |
| Compatible static batches | Vertex attribute layouts and alpha flags are part of batching. This fixes a preparation exception caused by merging incompatible foliage/water meshes. |
| Static border vegetation | Opaque leaves, no added AI collisions, no per-frame bush simulation and no added shadow casters. |
| Swept bolt contacts | Earliest physical impact is resolved before the enemy attack tick; impacts reuse meshes and loaded audio. |
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
| `dist/js/surface-library.js` | Shared material loading, color/data channels and physical UV projection. |
| `dist/js/landscape.js` | Native low-poly shrubs, trees, leaf litter, mounted decay and water-edge treatment. |
| `dist/js/distractions.js`, `audio.js` | Swept bolt contact, direct-hit events and bounded impact voice priority. |
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
| `source-assets/surfaces-v117/` | Original maps, official metadata, conversion script, hashes and visual tiling reference. |
| `tests/release117.test.js` | Direct hits, stun, lost-sight distraction, audio priority, real UVs, supported cable and hunter routes. |
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

Read `VERIFICATION.md` for the exact results: **197 automated tests pass**. Geometry import, nine guided approaches, grounded supports, outdoor overlaps, full vehicle route, progress handlers, settings, save migration and recovery are covered. NullEngine does not render the final game or play audio. The twelve new images have dimension/hash checks and an inspected tiling sheet. Earlier models retain their Blender renders and geometry reports. Neither is in-game lighting approval.

For a meaningful device comparison, use the same browser, window size, graphics, frame cap and save. Run the guided performance test from Settings. After normal startup preparation, walk from the garage shutter to BARRIER CONTROL, UTILITY SELECTOR, BARRIER BRAKE, DOCK WINCH and back. Repeat the same route. Test the drive separately. Export diagnostics so area-level long frames and CPU/GPU data can be compared; average FPS alone can hide a hitch. A first pass after warmup is not a cold-shader benchmark.

Before publishing, complete one uninterrupted new-game-to-ending run. Check each sign from its natural approach, readable darkness with the flashlight on/off, mouse capture after pause, rain shelter, the three contact encounters, pursuit through both gatehouse openings, safe hiding, metal/water bolt hearing, direct-hit stagger on each difficulty, saving/continuing and the left-side driving escape. Test Low on a modest device and your intended quality on the target machine. Check listening volume and controller/iframe behavior on the actual platforms you will offer.

The managed browser currently reports WebGL unavailable, including after the Low-graphics retry. No measured GPU gain, guaranteed frame rate, zero-freeze claim or final visual approval is supplied. The downloadable candidate is ready for that hardware review; the live 1.12 site is deliberately unchanged.

## 11. Browser upload package

`LastVehicle_Itch_HTML5.zip` contains the playable `dist` files with `index.html` at its root. The complete ZIP additionally contains launchers, source assets, tests and documentation. For itch.io, create an HTML project, upload the HTML5 ZIP, enable browser play and fullscreen, and test mouse capture, audio and saving in the actual embed before making it public. Keep all bundled license files.

The original game code and GingrSnaps branding retain their separate terms in `PROJECT_NOTICES.txt`. Third-party notices remain attached. The new six-material pack is CC0; its sources and runtime copies include provenance and notices. No paid assets or engine are required to run this package.
