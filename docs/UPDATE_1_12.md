# Last Vehicle 1.12 — contact, light and sound

**A GingrSnaps Project** · Low-poly Babylon.js browser edition · 3 November 2026

This is the complete game and editable project. Version 1.12 fixes the reported battery-pickup audio exception and applies the lighting, contact animation, creature attention, return-trip encounter and optimization refinements. It keeps the low-poly art direction throughout. The existing 21 creature clips, 24 industrial prop types, music and 50 bundled Ogg files remain included with their license records.

## Start here

1. Extract `LastVehicle_Browser_Complete.zip` completely. Keep its subfolders together.
2. Install Python 3.10+ **or** Node.js 20+ if neither is installed. No packages, account, paid engine or build step are required.
3. Windows: double-click `START_WINDOWS.bat`. macOS/Linux: run `sh START_MAC_LINUX.sh`. Alternatively run `python START_GAME.py` or `node tools/serve.mjs --open` in the extracted folder.
4. Keep the terminal open. Your browser opens `http://127.0.0.1:8080/`. Click Enter the garage, choose a difficulty, and allow preparation to finish. The first run opens the journal's Controls page.
5. Click Resume game, then Enter game if requested. Successful capture gives ordinary mouse movement without dragging. Escape pauses and releases the pointer. If the host refuses capture, open the standalone game tab or explicitly choose drag controls.
6. Use WASD to move, E to interact, F for the flashlight, J for the journal, H for optional hints, C to crouch and Shift to sprint. Remapped keys appear in prompts. Look at the nearby object until its action badge appears.

Do not open `index.html` directly as a file. Browser security can block local model and audio requests. The small launcher supplies these files over localhost; it does not install a game engine. All runtime assets are bundled, so downloaded local play needs no internet connection.

The short studio intro still displays **A GingrSnaps Project** for approximately three seconds and can be replayed from Credits. Existing comfort, audio, controls, FPS and display settings remain available.

## Upgrade without losing progress

In the old version, use Pause → Export save and Settings → Export settings first. Extract the new ZIP into a separate folder. Close the old local server before starting the new one on the same port. Never mix individual files from two releases.

Browser saves belong to the browser profile and origin. Using the same browser and localhost port normally retains them; a different address, port, profile or hosting domain has separate storage. Import the exported save/settings if needed. Existing saves are accepted; new journal observations default to empty. Required task order, safe checkpoints, difficulty and previously committed scares remain compatible.

If an old cached page appears, reload the browser tab. The release updates every local module's version query together. Continue restores a safe task checkpoint, rather than placing you inside an interrupted animation. A new run is best for experiencing all one-time encounters.

## Why the battery crash happened

A Babylon `Vector3` exposes `x`, `y` and `z` through getters. Its enumerable storage fields are different. The old audio code copied an emitter with object spread. The immediate sound used valid coordinates, but the saved copy lost the public axes. The next obstruction update sent an undefined coordinate into Web Audio's `PannerNode.setPosition`.

The fix reads the public axes explicitly and snapshots them before the battery moves or disappears. It rejects NaN, infinity, missing X/Z, string values and float32 overflow. Zero is valid. Ground-plane sound events may omit Y; they use the documented one-metre default. An invalid emitter is skipped rather than moved to the world origin.

The implementation lives in `dist/js/spatial-audio.js`. For a new positional sound, use the mixer:

```javascript
// This accepts Babylon.Vector3 or a plain numeric position.
// The mixer copies public coordinates immediately, so the mesh can move later.
const point = batteryHandle.getAbsolutePosition();
audio.play("tool-handling", {
  volume: 0.4,
  position: point,
  refDistance: 2,
});
```

Modern browsers use the panner's position AudioParams; older implementations retain a guarded `setPosition` fallback. Bad source data or node creation errors release the affected sound and leave gameplay running. A bad moving-emitter update retains its previous valid position. Diagnostics now include an audio-fault count and at most twelve recent unique entries. Sounds still share the existing 24-voice maximum.

The regression suite uses actual Babylon vectors and a strict Web Audio facade that throws on invalid numeric inputs. The full progression test now uses the real mixer for pickup, repair and escape. This verifies the data path; it does not audition the mix or emulate every browser audio driver.

## Lighting and readable signs

The old fixture selector waited for more than two metres of movement and only considered the current room. A player could cross a doorway, stop, and wait for the wrong fixtures to fade out before the new ones appeared.

The selector now prepares neighbouring fixtures near actual openings, reselects immediately when the room changes, and transfers a light slot without a fade-to-black wait. Brightness settles quickly while standing still. Solid walls do not qualify as portals. Four reusable point lights, one ambient light and the two flashlight/headlight slots remain the complete seven-light budget.

Essential labels have a separate emissive **letter mask**, with a dark background. Lettering is excluded from bloom even after static batching; ordinary light fixtures retain their authored bloom. This improves orientation without making every wall or prop bright. The flashlight remains useful in bays and recesses.

A cabinet work tube, suspended work lamp and clipped engine inspection lamp use the same fixture pool. Their local pools reveal task surfaces without increasing ambient fill. Brightness, glow, shadows, FXAA, resolution scale and reduced-flash settings still apply. Actual readability and glare need a browser playtest on your display.

## Physical interaction timelines

| Action | New behavior | Commit and pause behavior |
|---|---|---|
| Battery | 1.2-second reach, handle grip, weighted lift, then full-size transfer below the frame | Inventory commits once at completion; pausing freezes the action |
| Repair | Battery seats on its tray; raised cable/clamp; visible wrench turns around the clamp contact | One tool cue during tightening; E still cancels repair |
| Shelter | Exterior handle, reach/open, short entry or exit, then door closure | Hiding changes after the door opens; pause freezes the transition |
| Breaker | Reach and lever travel precede the switch click and circuit state | Repeated submissions are disabled during the 0.48-second motion; final completion waits |
| Driver door | Interaction targets the exterior handle face; hand follows the rotating handle | Left-side entry and the continuous escape remain intact |

Hand positions use real mesh/socket transforms rather than clamping every reach to an arbitrary 1.1-metre sphere. The battery handle includes its actual depth offset. The installed battery's bottom meets the tray top; cable hardware sits above the battery lid. There is no tiny shrinking battery at the end of pickup.

Animation uses the game's paused clock. A new run clears pending channels and invalidates old callbacks. The journal remains the place for tasks and hints; tools are used automatically, and this update introduces no new key combinations.

## Creature encounters and animation

The Attendant retains its evidence memory, deliberate searches, route prediction, cover choices, wet-track clues, difficulty differences, warned attacks and collision-safe recovery.

Its head now reacts toward known evidence before the shoulders settle toward it. Hearing and attention use the same uncertain remembered position. Hiding somewhere else does not give the creature your new coordinates. Search attention points at its current search location; authorized shelter inspection uses the actual inspection approach.

The overlay is additive to freshly sampled skeletal poses. It restores the base before the next animation sample, prevents cumulative rotation drift, and suppresses the look offset during contact clips such as Strike and DoorPush. This preserves authored contact poses.

Planted turns now take approximately 0.86 seconds and cover at most one quarter turn. An about-face uses successive steps. The creature brakes toward final route destinations and accelerates again after a stop rather than retaining running speed while listening or turning. These changes reduce abrupt transitions; they are not a claim of perfect procedural foot locking.

The new **return-to-car encounter** is conditional. After opening the exit, a real nearby Attendant can approach the hatchback beside the return route, scrape metal when visible, and physically withdraw behind it. The same monster, collisions and route follower perform the scene. There is no duplicate, teleport, forced camera cut or progression lock. If the player, route, timing or spacing is unsuitable, the encounter can be deferred or missed. It does not replace the three main story encounters.

The existing Security glass damage, workshop hatch damage and Electrical cover remain. A committed return encounter also leaves a persistent floor scrape. Saves remember the event once. The journal adds an observation only after it occurs.

## More detailed rooms and properly supported props

The original industrial pack is retained. The maintenance trolley now sits beside the workshop leak/work area, with measured floor support and collision. An additional existing hatchback model occupies the centre of its marked bay and supplies real cover for the return scene.

Terminal corrosion, cable clamps, workbench bolt marks and supported work lamps focus detail around places where the player stops. Runoff starts under actual pipe/junction positions and follows gravity toward damp wall edges. Labels and controls retain clear space. Existing textured moss, mold, rust and flaking paint remain local assets.

A frayed cable and a loose vent slat move subtly nearby. CCTV, fan and drip transform work is also limited by proximity; distant decorative details stop consuming animation updates. Reduced motion suppresses the new cable/vent motion. These small details are created during loading and use shared materials rather than spawning geometry during play.

## Sound, water and quiet guidance

The existing confined exploration bed, aftermath music, creature effects and varied concrete, debris, grate and water contacts remain bundled. Their CC0/source notices and processing records are in `dist/assets/CREDITS.md` and the source folders. No new music recording is claimed for this patch.

Foot contacts continue to drive the same surface query for audible material, splash/ripple strength, wetness and AI hearing. Footprints, rings and droplets reuse fixed pools. Doorway audio routes through real openings; walls muffle sound. Music follows actual pursuit and relief, leaving quieter exploration intervals. Volume preferences never change enemy hearing rules.

New journal observations describe wet shoes only after they leave wet prints on dry ground, a shelter check only when it happens to your locker, and the return encounter only after its impact. They appear inside the journal's existing garage observations instead of adding another permanent task banner.

## Task guidance and settings

The task chain is unchanged and comes from the shared `tasks.js` definitions:

| Order | Required action |
|---|---|
| 1 | Inspect your car at bay 042 |
| 2 | Recover the battery from the floor beside it |
| 3 | Collect the maintenance key in Security |
| 4 | Get the replacement cable and fuse from the Workshop cabinet |
| 5 | Install the battery and cable at the open engine bay |
| 6 | Restore Electrical power: Ventilation, Lighting, Access |
| 7 | Authorize the exit at the Security computer using the collected clue |
| 8 | Operate the gate release |
| 9 | Return to the driver's door on the left side of your repaired car and escape |

The journal explains the current action and why it matters. Hints reveal a nudge, clearer direction and solution only when requested. The map and temporary direction marker remain optional. Evidence documents, the siren and pressure valve remain optional.

Sensitivity and separate axes, audio buses and loud-effect level, Easy/Medium/Hard, remappable controls, subtitles, motion comfort, prompt size, frame caps, FPS/frametime statistics, graphics presets and safe Apply/Keep/Revert remain available. Browser rendering follows the browser/display's synchronization; this package does not claim to force a desktop-driver VSync setting. Window size follows the browser or fullscreen viewport, with internal resolution scale for performance.

## Optimization and editing

The game keeps its bounded voices, pooled surfaces, shared materials, sector batches, staged preparation and fixed light topology. New signs create their masks once during construction. New props use existing model/material assets. Decorative motion does no distant transform work; attention uses cached vectors/quaternions. The frame profiler now distinguishes enemy work, encounters, ambient cues, surface/decorative effects, audio, lighting/guidance, animation and render submission.

| File | What to change |
|---|---|
| `dist/js/spatial-audio.js`, `audio.js` | Spatial validation, voice lifetime, mix and obstruction |
| `dist/js/lighting.js`, `world.js` | Real doorway links, fixture selection, letter masks |
| `dist/js/staging.js`, `visuals.js` | Battery, repair, socket placement and contact animation |
| `dist/js/attention.js`, `threat.js`, `locomotion.js` | Evidence attention, restart acceleration and planted turns |
| `dist/js/creature-scenes.js`, `encounters.js` | Return scene eligibility, physical route and saved event IDs |
| `dist/js/atmosphere.js`, `decay.js`, `details.js` | Local motion, deterioration and supported room dressing |
| `dist/js/journal.js`, `state.js` | Observations and compatible save validation |
| `tests/audio-regression.test.js`, `tests/startup.test.js` | Strict audio boundary and actual action progression |

All runtime files are commented and editable directly. `Full_Code.md` contains complete code blocks, including tests and launchers. The broader beginner guide, source Blender assets, floor plan, asset credits and historical update notes remain in the complete ZIP.

Run checks and rebuild from the project folder:

```bash
npm test
npm run check
python tools/build-guide.py
python tools/package.py --output releases
```

Only Node is needed for the tests; the packaging/guide scripts use Python's standard library. The browser runtime itself needs neither npm dependencies nor a build tool.

## Packages and itch.io

`LastVehicle_Browser_Complete.zip` includes launchers, `dist/`, commented source, tests, asset sources, licenses and guides. Open `docs/LastVehicle_Guide.html` for this offline illustrated guide.

`LastVehicle_Itch_HTML5.zip` contains the complete playable `dist/` contents with `index.html` at its root. Upload it as an itch.io HTML project, mark it playable in the browser, and enable fullscreen. Test mouse capture, fullscreen, sound and saves on the actual hosted page because iframe permissions differ. Neither package is a Windows EXE.

## Verification and remaining playtest

Read `VERIFICATION.md` for final test results. Automated checks cover the original battery failure path, modern and legacy audio, pause/resume, breaker commit timing, complete escape, actual imported geometry, route clearance, contact anchors, saves and pooled resources. They use Babylon's NullEngine and strict facades, not a GPU-rendered playthrough.

The managed browser preview service was unavailable for this release. Live WebGL appearance, sign contrast on your display, audible mixing, perceived scares, actual frame pacing and hardware memory behavior remain unverified. No measured FPS increase, absence of freezes, commercial certification or measured 15–30-minute playtime is claimed.

For your acceptance playtest: start cold with sound enabled; inspect and pick up the battery; pause halfway through a second run's pickup; stop immediately inside each doorway with the flashlight off; compare Low/High and reduced motion; collect supplies and inspect repair contact; let the creature chase around cars, break sight and enter a shelter; pause entry; restore the three circuits; open the exit and return to the driver's left door. Finish the drive with the flashlight previously on and off. Export diagnostics if anything stalls; the report now includes bounded audio faults and more specific frame-time categories.
