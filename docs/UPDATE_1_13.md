# Last Vehicle 1.13 — pursuit, atmosphere and control

**A GingrSnaps Project** · Low-poly browser edition · Babylon.js 9.33.1

This package contains the complete game, commented source, asset sources, launchers, tests and editing instructions. Version 1.13 is a **release candidate**. Automated checks are documented in VERIFICATION.md. The managed browser preview service was unavailable during this update, so a real WebGL playthrough, visual review, controller-device test and listening pass remain outstanding. The live browser site remains on 1.12. Do not interpret the downloadable candidate as a tested public release or a measured performance improvement.

The art direction remains low-poly. There is no added pixel filter, resolution-jitter effect or separate 32-bit presentation. The original three-second “A GingrSnaps Project” intro, story, nine required tasks, three difficulty choices, left-side car escape, safe checkpoints and adjustable settings remain.

## Start here

1. Download and extract **LastVehicle_Browser_Complete.zip**. Keep its folders together. Use a fresh folder so old and new files cannot mix.
2. Install or use an existing Python 3.10+ **or** Node.js 20+. You need only one. Playing does not require Blender, Unreal Engine, npm packages, a microphone or an API key.
3. On Windows, double-click **START_WINDOWS.bat**. On macOS/Linux, run `sh START_MAC_LINUX.sh`. Alternatively run one of the commands below from the extracted project folder.
4. Keep the terminal open. Your browser should open `http://127.0.0.1:8080/`. If it does not, enter that address yourself.
5. Select Enter the garage, choose a difficulty, then start. The initial preparation screen loads the models and audio. The journal introduces the controls once.
6. Select Resume/Enter game. Move the mouse without holding a button. Escape pauses and releases it. If an embedded host blocks pointer lock, open the standalone-tab link; mouse fallback choices are under Mouse options & troubleshooting.
7. Press F to raise the flashlight and J for the journal. Nearby objects display the actual interaction key. The first task really is inspecting your teal car in bay 042.

```bash
python START_GAME.py
```

```bash
node tools/serve.mjs --open
```

Do not double-click `dist/index.html`: browser file-URL restrictions can prevent model and audio loading. Python is only a local file server; this is a JavaScript/Babylon.js game, not a Python game or a Windows executable. All runtime dependencies, models and sounds are bundled locally. Once downloaded, the local game needs no external service.

For an existing save, export it from the old version before changing host or port. Saves belong to the browser origin. Continue works on the same origin; Import story save transfers an exported checkpoint to another origin. The save format remains version 2, with migration for version-1 saves. Optional new metadata defaults safely when absent. A new software release does not require starting over.

## What changed in this candidate

| Area | Implemented behavior |
|---|---|
| Pursuit | Flowing running turns, brief route commitment, budgeted path-search slices, short observed-loop cutoff memory and a readable last-seen-corner/listen/search sequence |
| Interaction | A 120 ms small-handle aim grace and a short switch delay, with live reach, obstruction and prerequisite checks on every actual use |
| Input | Simpler capture screen; optional standard gamepad movement/look/actions, radial deadzone, response curve, menu input and disconnect pause |
| Settings | Search, explanations/defaults, comfort preset, separate impact sound/screen/motion controls, mono output, stereo test and subtitle contrast/labels |
| Guidance | Continue card; Where was I? recap; relevant collected notes; discovered blocked-mechanism map markers that disappear after completion |
| Environment | Twelve original CC0 worn-detail models, connected insulation, CRT corner cracks, rota corrections, tool outlines, passenger seats/bag, dashboard permit and roof-mounted visor |
| Encounters | Longer Security anticipation; physical grille contact; ordinary relay clicks and a doorway fixture for the Electrical reveal; optional cart shove and pressure burst with aftermath |
| Animation | Gait phase transfer, chest lean on running turns, target-facing cover searches, gradual fan coast-down, visor motion, wheel movement and pooled spray/rain |
| Audio | Eight new local Ogg layers: two related music cues, cloth, cart wheels/impact, pressure, fan cutoff and exterior weather |
| Performance | One 128-node navigation expansion slice per gameplay update, reusable per-follower search memory, static batching by room/material/detail tier, existing light/voice/effect limits and a guided sample that proposes a graphics draft |

These are implementation changes. Whether the atmosphere, difficulty, performance and scare timing meet the desired quality must still be judged in the browser.

## Play without a complicated control scheme

| Action | Keyboard/mouse | Standard controller |
|---|---|---|
| Move | W A S D | Left stick |
| Look | Mouse movement | Right stick |
| Use, hide, leave shelter | E | A / south button |
| Flashlight | F | X / west button |
| Journal | J | Y / north button |
| Journal hints | H | View / back button |
| Crouch | C | B / east button |
| Sprint | Left Shift | L3 / press left stick |
| Pause | Escape | Menu / start button |
| Menu selection | Mouse or keyboard focus | D-pad, A selects, B returns |
| Adjust focused slider/select | Mouse or keyboard arrows | D-pad left/right |

Keyboard actions remain remappable. Prompts use the current binding. Controller face labels use the standard A/B/X/Y convention even if the physical pad has different printed symbols. Only browser-standard mapped controllers are accepted; the game does not guess unknown button mappings.

Enable Controller under Settings → Controls, press a button on the connected pad, and choose Use controller. After changing screens, release held buttons before using them again. This prevents a held A from activating a second action on the new screen. Unplugging an active controller clears movement and pauses the game. Hardware compatibility still needs a real device test.

Mouse rotation uses the actual mouse delta, independent of render scale and frame time. Stick look uses angular speed multiplied by elapsed time. Walking acceleration is separate from both. The default mouse smoothing is zero.

The interaction grace helps when a small handle briefly slips off the exact aiming line. It does not extend reach through a wall or keep a collected item usable. Pressing E re-evaluates the current object and requirements. Longer valve and car-repair actions display the same interaction key to cancel. A paused action resumes its animation clock when you return.

## Journal and a trustworthy task sequence

The required route is unchanged: inspect the car → recover the battery → take the Security key → take the Workshop cable/fuse → repair the car → restore Electrical power → authorize the Security terminal → raise the exit gate → enter the car and escape.

Tasks, prerequisites, journal text, map destinations and interaction policy come from the same task records. Tools are used automatically. There is no new inventory-combination puzzle. The valve, siren, grille and extra evidence remain optional.

The title Continue card displays the saved chapter, next task, difficulty and checkpoint time. In J → Task, **Where was I?** names your last completed task, next instruction and a relevant document you have actually collected. It never invents a note you have not found. H opens Hints; the player still chooses how much help to reveal.

A blocked mechanism that you aim at nearby can be recorded on the map with a **!**. These records are limited to repair supplies, car repair, power, terminal and gate states. Finishing the associated task removes its marker. The map remains schematic; it does not reveal an enemy through walls or expose undiscovered future tasks. Aftermath descriptions appear only after the corresponding event fires.

The normal HUD stays quiet. Persistent objectives and brief journal update messages remain optional in Gameplay settings. Use/Requires wording identifies an action or a reason without turning every atmospheric prop into an interaction target.

## Settings and comfortable play

Use Find a setting to search the category names, option names and explanations. Selecting a result opens the relevant tab and focuses that control. Defaults appear beside controls. Individual categories can be reset, and settings have their own JSON export/import, separate from story saves.

**Comfort preset:** sets Reduced motion, reduced light changes, zero impact camera shake, zero scare edge effects and zero sprint FOV widening. Reduced motion also suppresses bob, hand sway and cinematic interaction focus while leaving their underlying custom slider values available. The three-second intro retains a restrained readable fade. Turning Reduced motion off does not automatically undo the explicit values applied by the preset; use the individual sliders or Reset Comfort.

**Scare intensity controls:** Loud effects reduces selected abrupt audio sources, including the new cart impact and pressure burst. Scare edge effects changes a brief darkening at an impact. Camera shake changes a small rotational impact response. Setting either visual slider to zero removes that presentation effect. These settings never change enemy perception, task requirements or difficulty. The escape camera does not receive the impact shake.

**Audio:** independent Music, Environment, Effects/footsteps and Interface buses remain. Mono combines the final channels; it does not remove sound captions. The stereo test plays a gentle click on the left and then the right. The existing interface/footstep test contains no scare. Night dynamic range compresses peaks. Subtitle background opacity and speaker/context labels improve legibility; sound captions can be disabled separately.

**Graphics:** the settings page shows both browser viewport dimensions and the actual 3D render buffer. Fullscreen changes the viewport. Render scale and maximum render height change 3D detail; the HTML interface remains at display resolution. VSync is controlled by the browser/display, not an independent native-game switch. The frame-limit control remains available.

Graphics use Apply → Keep, with a 15-second automatic Revert. Live audio/control changes are not lost when a graphics preview is reverted. Low is still the default for new installations; existing manual choices are preserved.

## Guided performance setup

Open Settings → Performance → Guided performance setup during a started game. Begin a sample, resume, walk through the garage and at least one room, travel 25 metres, turn a total of 180 degrees and use the flashlight for at least six seconds. The sample requires 30 seconds of active play. It does not move the character, advance the story, turn the light on automatically or send data anywhere.

Return to the same page to see coverage, 95th-percentile frame interval, average CPU submission time and GPU timing when the browser exposes it. If the sample suggests lower settings, **Stage suggested graphics** creates a draft. Apply and Keep are still required. CPU stalls do not automatically trigger a resolution reduction; lowering resolution mainly addresses GPU work. A single short sample cannot guarantee smooth play.

For a more comparable investigation, use Pause → Advanced diagnostics → Performance test route. Record the same first and second route passes with identical settings. The export contains bounded hitch records, path-search diagnostics and scene budget counts. Compare the same physical route after a cold load and after returning to the title. Browser testing and before/after hardware measurements were unavailable for this delivery, so there is no claimed FPS gain.

## How the enemy behaves

The Attendant is one physical character. Ordinary pursuit, scripted appearances, locker inspection and the optional cart encounter all use that character. A scare does not duplicate it at another location.

Vision and hearing create evidence. The enemy can remember a last-seen position, approximate sound location, visible beam patch and fresh nearby wet tracks. Hidden coordinates are not supplied as a fresh search destination. After losing sight, it first approaches the last witnessed corner, listens and then checks nearby cover. It faces the remembered cover during a crouched search or peek. Witnessed shelter entries and corroborated evidence remain dangerous; blind locker guesses do not automatically catch an unseen occupant.

A running turn keeps a reduced forward stride while the torso leans. A large reversal can still use a shorter planted turn. Slow investigation keeps the longer planted turns. A route briefly keeps its first corner instead of choosing left/right repeatedly; an actual obstruction can interrupt it. If actual progress stalls, the existing swept-body backstep and replan remain. Recently failed edges receive a temporary penalty. Recovery never teleports through a wall.

On Medium and Hard, visible positions sampled around a nearby parked vehicle can accumulate enough consistent angular travel to recognize a repeated circle. Medium requires more observed travel than Hard. The enemy can then commit to a short cutoff point. Gaps in sight do not manufacture unseen movement; the inference expires, and another cutoff has a cooldown. Easy does not use this tactic. Short-lived cleared-cover and patrol memory remain separate from this loop memory.

An attack still has a warning, fixed strike direction, short lunge and a recovery after a miss. Moving aside is meaningful. Raising the difficulty changes vision/hearing, stamina pressure, search coverage/persistence, attack timing and inference policy. It does not secretly increase jump-scare volume or remove clues.

Navigation is prepared during loading. A chase search resumes in 128-expanded-node slices, one slice per follower update, using that follower's reusable typed-array workspace. A synchronous scene reachability check cannot overwrite an unfinished chase search. Clear direct pursuit still updates between plans. The developer report records slice counts and observed maximum slice duration; these are diagnostics, not a universal timing bound.

## Creature encounters and animation

The Security reveal now gives the blind more time to expose the silhouette before one physical glass strike. The actor's Strike phase reaches contact on the same normalized beat as the glass cracks. The remaining blind movement settles after the hit. Pausing stops the visual timeline.

The Workshop event approaches the grille using real navigation, braces/strikes at the grille and lets the latch move before ordinary AI resumes. Electrical begins with ordinary relay clicks; a mounted amber doorway fixture gives the real actor a side-light source. The fan coast-down follows the cutoff and its local steady sound is faded out. These use the existing reusable fixture slots; no new point lights are allocated during the event.

Two optional events add variety. In Storage, the actual Attendant can approach and shove a prebuilt cart. The cart has rolling wheels, a dynamic collision footprint and a real final position. The sweep must be clear of the player before staging; movement will stop instead of pushing through a player who enters its path. The service route stays open. A scratch remains afterward, and a restored checkpoint uses the authored settled position.

In the Pump room, a damaged pressure joint rattles, releases air/water at the sound's 0.18-second marker and leaves a puddle below the connection. That same ellipse controls visible water, wet footstep sounds, AI hearing and splash effects. The valve temporarily changes the leak/drip state as well as acting as a distraction. It is not required for the escape.

Scares queue only once. Major impacts normally reserve 45 seconds of quiet. Chase duration adds recovery time; repeated failed attempts extend it, and a completed task allows a short settling interval. Attacks, inspections, hiding, vehicle entry and busy interactions take priority. Optional events may not occur on every route, and required-task scenes can be deferred if their view is unreadable. This is intentional pacing, not a guaranteed series of timed popups.

The delivered creature still has 38 deform joints and 21 authored clips. This update adds runtime gait-phase preservation and evidence-driven chest lean; it does not claim newly authored skeletal clips. Existing weighted clothes follow the skeleton. Small secondary environmental motion includes the roof-mounted passenger visor, fans, cart wheels, loose tickets, rain and pooled water. There is no cloth physics simulation.

## More detailed rooms and properly supported props

The new 12-model pack uses original numeric geometry and the existing subdued Meridian palette. Its total is 4,115 triangles and 264,280 GLB bytes. Actual exported geometry, normals, bounds, anchors and hashes were checked with the bundled Babylon loader. Actual Blender renders are included in the contact sheet. This verifies model data, not final in-game lighting.

Security gets a damaged intercom, key-hook board, ashtray, emergency diagram, shift corrections and cracks restricted to a CRT corner. The Workshop gets a terminal-cleaning brush, offcuts, glove and empty-tool outlines near the existing repair equipment. Pump details include split insulation, seals and weather stripping. New fittings have connected pipes instead of unexplained floating ends.

The escape car gets separate seats/headrests, a passenger bag, dashboard permit and a sagging passenger-side visor. The permit follows the cockpit's visibility. The visor attaches at its exported roof pivot and moves with the vehicle; it does not obstruct the driver's exit view. The original bumper-mounted headlights exclude the entire car, including the new details. The held flashlight remains put away during escape.

Cosmetic props do not add interaction prompts or invisible floor obstacles. Wall rear planes, desktop heights and bench support heights are explicit in `detail-layout.js`. The 12-model pack is split into detail tiers. Low retains the main intercom/diagram/pipe silhouettes; Medium adds the other medium details, and High adds small tabletop clutter. The actual cart, water, story objects and paths exist at every tier.

The loading pass groups static geometry by material, room, sector and detail tier. Car attachments and animated encounter objects stay out of those static merges. Dynamic geometry is prebuilt, and small effects have capped pools. Diagnostic budgets cover room batches/triangles, four fixture slots, 24 audio voices and path expansion slices. The numbers are engineering guardrails, not advertised minimum hardware requirements.

## New music, contacts and licenses

The eight new `lv113-*` sounds total 262,780 encoded bytes. They add a restrained D/A/E-flat three-note identity near bay 042 and a changed return version after the gate opens. Music follows proximity and actual chase state, with short transitions and quiet intervals. Exterior rain/wind grows near the open exit. Cart, pipe, cloth and fan contacts use their physical source positions.

Some layers are original synthesis/arrangement; material contacts use edited existing CC0 recordings. The new audio is not presented as untouched location recording. Its source authors, exact immediate inputs, original provenance chains, edits and output hashes are recorded in the runtime license folder and the full source folder. No self-recording or downloaded-at-runtime sound is required.

All eight files decoded completely with finite samples and no measured clipping. Their three looping files passed numerical seam checks. The measured unresampled float32 decode total is about 5.17 MiB; Web Audio resampling to 48 kHz can use about 9.81 MiB for these additions. Neither those measurements nor waveform inspection substitute for listening in the actual game. Mix levels remain subject to browser audition.

Read `dist/assets/CREDITS.md`, `assets-manifest.json` and `licenses/`. Model/audio dedications do not change the original story, code or GingrSnaps branding terms. The complete package includes the earlier asset sources and vendor notices too.

## Learn the new source modules

| Module | What to read first |
|---|---|
| `tactics.js` | How visible samples become a temporary car-loop inference |
| `locomotion.js` / `navigation.js` | Route commitment, body collision, bounded generator work and recovery |
| `controller.js` | Radial deadzones, button edges and neutral rearming |
| `interaction.js` | Brief target grace with live eligibility checks |
| `settings-help.js` / `settings-ui.js` | Search, help text and immediate versus staged preferences |
| `performance.js` | Representative sample coverage and a proposed graphics patch |
| `journal.js` / `map.js` | Recaps and markers derived from the same saved task state |
| `detail-layout.js` / `rich-details.js` | Explicit supports, model loading, wall planes and car parenting |
| `equipment-scenes.js` | One moving cart collider, shared water footprint and preallocated effects |
| `creature-scenes.js` / `encounters.js` | The physical actor's story routes and paced optional encounters |
| `audio.js` | Buses, safe spatial snapshots, mono output, scene layers and voice cleanup |
| `attention.js` / `visuals.js` | Animation overlays restored before each sample, gait transfer and motion |

The actual editable files are under `dist/`. `docs/Full_Code.md` supplies complete code blocks for the maintained runtime, launchers, tools and tests. It is a reading copy, not the file the browser executes. Vendor libraries remain whole files in `dist/vendor/`; do not paste millions of vendor lines into your game script.

For a first change, edit one caption in `tasks.js`, refresh and inspect it in the journal and at the matching object. Keep task IDs stable: they are save keys. For a visual change, adjust one detail record's position or support height, then run the placement tests. For AI tuning, start with one value in `difficulty.js`; test both losing sight and hiding before changing another value.

To regenerate optional source assets, read the source-folder instructions. The prop generator requires Blender. Audio generation requires Python, NumPy, SciPy and FFmpeg/libvorbis. Those are authoring dependencies only. They are not needed to play, host, edit JavaScript or rebuild the ZIPs. Re-generated binary assets must have their manifest hashes and license/source records reviewed before distribution.

## Rebuild and verify the project

From the full project folder:

```bash
node tools/check.mjs
node --test tests/*.test.js
python tools/build-guide.py
python tools/package.py --output releases
```

The first command checks JavaScript syntax and hashes of every enumerated runtime asset. Tests exercise real Babylon scene/model data through NullEngine, pure game rules and a bounded DOM/audio facade. They cover actions and save transitions but do not render WebGL images or audition sound. The guide generator refreshes the offline HTML instructions. The package tool regenerates Full_Code.md, creates both ZIPs, checks archive integrity and writes SHA-256 records. It excludes Git metadata, hosting credentials and local player saves.

**LastVehicle_Browser_Complete.zip** contains the editable project, source assets, launchers, documentation and tests. **LastVehicle_Itch_HTML5.zip** contains `index.html` at the archive root plus the complete `js/`, `assets/`, `vendor/` and styles needed by a static host. It retains runtime licenses. Both are the same candidate game; the second archive excludes editing sources and tests.

## Verification and remaining playtest

Read VERIFICATION.md for the final recorded test count and exact scope. The full browser release gate remains open because the managed preview relay returned “preview relay unavailable.” No alternative server or simulated DOM test has been called a browser playthrough.

Before public release, complete a cold-load playthrough on the intended desktop browser, from the studio intro through the left-door car escape and credits. Then reload a checkpoint, hide repeatedly, fail and retry, alt-tab, change graphics with Apply/Keep/Revert, test a real controller disconnect, and inspect every new prop support and sign face. Listen on headphones and speakers, including mono and Night mode. Verify the pressure puddle's actual visible boundary and the cart's route clearance. Compare the same first/second walking route while recording frame times. Test the uploaded itch embed and its standalone mouse-lock link before making the page public.

The target duration remains 15–30 minutes for a first exploration. Actual completion time, fear, chase balance, visual quality and device performance need human testing. This candidate includes the complete beginning, middle, failure recovery and ending; it is not a claim of finished premium-release certification.
