# Last Vehicle 1.14 — stability and pursuit update

**A GingrSnaps Project** · Low-poly Babylon.js browser horror · Complete downloadable candidate

This package applies the accepted playtester feedback to the complete game. It contains the beginning, all required tasks, the Attendant, hiding and distractions, settings, saves, failure recovery and the left-driver-door vehicle ending. All runtime models, textures, music, sound effects and engine files are bundled. No microphone recording, paid asset or external service is needed to play.

The browser preview service was unavailable during this update. Automated checks can verify game rules, imported geometry and API failures, but they cannot approve the audible mix, WebGL lighting or how frightening a chase feels. This is version 1.14 **candidate**. The existing live site remains on 1.12 until the agreed complete browser playthrough is performed. Nothing here claims every possible crash has been eliminated.

## Start the complete package

1. Extract **LastVehicle_Browser_Complete.zip**. Keep its folders together.
2. Install Python 3.10+ or Node.js 20+ if neither is already available. Only one is needed; there are no package-install commands.
3. Windows: double-click **START_WINDOWS.bat**. macOS/Linux: run `sh START_MAC_LINUX.sh` in the extracted folder.
4. Alternatively run one of the following commands from that folder:

```bash
python START_GAME.py
```

```bash
node tools/serve.mjs --open
```

5. Keep the terminal open. The launcher opens **http://127.0.0.1:8080/**; paste that address if it does not open automatically. Choose Enter the garage, select a difficulty, and allow preparation to finish.
6. The controls journal appears on the first run. Resume, then click **Enter game** once. Standard mouse capture lets you look by moving the mouse without holding a button. Escape releases it and pauses.

Do not double-click `dist/index.html`. Browser file-URL restrictions can prevent local models and audio from loading. Python or Node only serves these files; the game remains JavaScript. This package is not a Windows executable. Close the terminal with Ctrl+C when finished. If the port is occupied, close the earlier server or use its existing tab; the launcher never terminates another process.

The separate **LastVehicle_Itch_HTML5.zip** has `index.html` at its root and is ready to upload to an itch HTML game project. Keep the assets, js, vendor and style files beside it. Test the actual embedded itch page before publication because mouse capture, audio permission, fullscreen and storage can differ from local play. Prefer a desktop browser and an open-in-new-tab option for mouse capture.

## Controls and uncomplicated guidance

| Action | Keyboard default | Standard controller |
|---|---|---|
| Move / look | W A S D / mouse | Left / right stick |
| Use, enter or leave shelter | E | A |
| Flashlight | F | X |
| Sprint | Left Shift | L3 |
| Crouch | C | B |
| Journal | J | Y |
| Optional hints | H | View / Select |
| Throw one bolt | Q | RB |
| Show current task | Tab | D-pad Up |
| Pause | Escape | Menu / Start |

Keyboard actions can be remapped. Prompts and journal instructions show the actual selected keys. Existing remaps survive the update; a new action takes another unused key if its default was already assigned.

**Objective display** in Gameplay settings has three choices. Always shows one compact task and destination. On request reveals it for eight active seconds after Tab; menus do not consume the timer. Journal only keeps tasks in the journal. New players default to Always. Existing explicit quiet-HUD preferences are retained; switch to Always if you want the playtester's corner reminder.

The journal contains the next required action, why it matters, collected notes, the map and inventory status. H opens hints without revealing an answer automatically. You choose a nudge, a clearer direction or the solution. An optional inactivity reminder offers the hint key; it does not advance the hint level and is suppressed during pursuit, hiding and interactions. Reading pauses the game. Tools are used automatically when you interact with the matching mechanism.

Enable controller support in Settings or select Use controller on the capture panel. A standard-mapped pad is required; menus support D-pad navigation, A to choose and B to go back. Release held buttons after connecting so a held A cannot accidentally activate a menu. Disconnecting pauses and clears movement. If the host blocks controller access, mouse/keyboard still works; the game reports the restriction once instead of repeatedly calling a failing API.

## Complete story and walkthrough

You are Erin Cole, returning from a late shift to Meridian's B2 garage. Your car in bay 042 has been sabotaged. An old attendant's workwear hangs on something with the wrong proportions. It has made this route for other drivers before you.

1. **Inspect your car.** The teal car's left driver handle or front hood both perform this inspection. The battery and cable sabotage become clear; the overhead lights cut out. F raises the flashlight.
2. **Recover the battery.** Take the actual battery from the floor beside the hood. It lifts by its handle and becomes inventory, rather than remaining a useless prop.
3. **Find the maintenance key in Security.** Room 01 has a desk with a brass key, steel ring and MAINTENANCE tag. Aim at the key until the E prompt appears. The handover log joins the journal. This starts the Attendant's involvement and unlocks service passage shortcuts.
4. **Collect repair supplies in Workshop.** Use the maintenance key at the marked repair cabinet. Take the replacement cable and fuse. The workshop encounter leaves time to read its action and choose cover.
5. **Repair the car.** Return to the hood. Battery, cable and tool actions are automatic; their animations complete the repair task.
6. **Restore exit power in Electrical.** Use the panel and activate VENTILATION, LIGHTING, then ACCESS. The next encounter can lead into a real chase if the creature sees you. Restored drive lanes expose crossings; darker edges and solid cover remain useful.
7. **Authorize the exit in Security.** The terminal uses Meridian's founding year, **1986**, recorded in the handover log and the north-exit plaque. The terminal authorizes the gate directly; no extra pump, siren or locker-key errand is required.
8. **Open the north gate.** Use its release control. The car must already be repaired and the terminal authorized.
9. **Return to bay 042 and enter the left driver door.** This starts the vehicle escape. Walking through the open gate does not finish the story. The door latches, the flashlight is replaced by bumper-mounted headlights, and the car drives out. The three-second GingrSnaps introduction and closing credits remain skippable/smoothly timed.

Notes add context and affect ending text; the required route does not depend on reading every lore document. The pump valve, workshop siren, evidence and throwable bolts are optional. The first-time duration remains a **15–30 minute design target**, not a newly measured playtest result. Faster walking reduces repeated traversal instead of adding artificial delays.

## A more credible hunt

The Attendant is still one physical actor. It investigates evidence, travels along collision-checked routes and searches near its last supported clue. A noise does not spawn another enemy behind the player. It does not read a hidden player's position to pick the correct locker.

Walking now uses **2.6 m/s**, sprinting **4.5 m/s**, crouching **1.3 m/s**. The values below are tuning, not guarantees of how an individual chase will feel:

| Difficulty | Pursuit speed | Investigation speed | Main distinction |
|---|---|---|---|
| Easy | 3.05 m/s | 1.50 m/s | More sprint endurance, gentler hearing and more recovery time |
| Medium | 3.70 m/s | 1.85 m/s | Sprint buys space; walking in open sight does not |
| Hard | 4.25 m/s | 2.10 m/s | Stronger perception, shorter attack warning and longer searches |

Hearing follows the same doorway-route attenuation used by positional audio. Puddles amplify footsteps, sprinting is louder, and crouching is quieter. The enemy briefly turns/listens before investigating. A solid wall attenuates a sound; an actual nearby opening can carry it around the wall. Audio volume settings never make the player quieter to the AI.

Patrol visits vary between runs, with brief pauses. During pursuit it uses observed direction and short-lived car-loop evidence where difficulty permits, then approaches the last seen corner and searches when sight is lost. Fresh sight takes priority over a distant bolt. Route work remains sliced; normal path searches do not get an unlimited per-frame budget. Obstruction recovery and real contact poses remain in place.

A visible Security, Workshop or Electrical encounter can hand off into pursuit with a short escape grace period. If sight is blocked, it investigates instead. Break sight behind a solid object before using a marked SHELTER locker. It can catch a witnessed entry; on Medium/Hard a recent sighting plus a nearby door sound or visible wet tracks can justify checking a locker. It must physically reach it. A raised attack arm is a warning to move; the recovery creates an escape opportunity.

## Three bolts, useful stamina and fair scares

You carry three bolts, saved with the run. Aim away from your intended path and press Q. A small hand animation accompanies the throw. Three reusable models follow swept wall/floor collision, fall after a wall strike and settle on the ground. Only the first contact produces the impact sound and hearing event; the audio file already contains its short bounce tail. Visual bolts expire after six seconds so clutter and object counts cannot grow indefinitely.

Throwing into the same five-metre area repeatedly reduces effectiveness, more quickly on harder modes. On a third convincing impact the enemy can check plausible nearby cover rather than trusting the exact impact again. It never uses hidden player coordinates for this. Direct visual pursuit overrides distraction. Bolts are not needed for any objective, cannot damage the creature, and do not break lights. Destructible lights remain intentionally outside this stability update.

The stamina bar appears while sprinting or recovering and changes at low stamina. Settings allow Auto, Always or Off. Quiet centered breathing follows **your exertion**, never secret enemy distance, and mutes on pause. Easy's optional adrenaline reserve adds 20 percentage points when a visible chase finds you low on stamina, with a 35-second cooldown and an explicit notification. It is off by default and has no effect on Medium/Hard.

The three core encounter beats, optional cart shove, pressure burst and return-to-car event are retained. The cart physically changes its small obstruction and leaves marks; the pressure burst leaves a shared visible/walkable puddle. Encounter spacing reserves recovery time after chases and repeated failures. No additional flashing layer is needed for thunder. Loud-effects volume, reduced flashes, camera shake and scare-edge effects remain separate from gameplay difficulty. Scare timing and subjective impact still need a human browser pass.

## Lighting, key art and weather

Lighting has three authored phases: readable arrival, an outage after car inspection, and restored task/drive-lane lighting. Rendered fixture intensity, fixture glow and persistent stealth visibility derive from those phases. Brightness and comfort settings change presentation, not enemy rules. The flashlight remains useful in the outage and dark peripheral cover. Essential sign letters keep restrained local readability; labels do not illuminate the whole garage.

The old yellow key block is replaced by a modeled brass key, steel ring and tagged identity. Its bottom rests on the measured Security desktop at **Y = 0.925 m**. Pickup preserves full scale, follows the exported ring-grip anchor and resets to the grounded position after checkpoint restoration. It remains present at every quality level.

Four original wall marks add restrained graffiti and inspection stamps. They are lit, one-sided 2:1 planes positioned four millimetres off known perimeter faces, away from required controls. Existing corroded cabinets, plaster, moss, mold, grounded cars, worn props and original creature animations remain. The exit runoff puddle shares its ellipse with splash/hearing classification. These additions do not introduce a dense new obstacle course.

Six new local sounds supply city-night ambience, entrance rain, distant thunder, bolt contact, electrical cutoff and player exertion. Rain builds toward the north exit and crossfades to the existing exterior layer during escape. Thunder is spaced out and held during pursuit or scare anticipation. The existing score, return motif, creature audio and material footsteps remain. Weather uses Environment volume, music uses Music, and personal/contact sounds use SFX. The final audible balance needs headphones and speaker testing.

The key has **882 triangles**. The GLB is **51,828 bytes**, and the four SVGs total **8,864 bytes**. The six new Ogg files total **247,779 bytes**; their decoded samples require approximately **10.18 MiB at 48 kHz**, plus browser overhead. Sources, notices, exact hashes and authoring scripts are supplied. See `assets/CREDITS.md`, the runtime license folder and `source-assets/`. Their CC0 asset terms do not change the code/story/brand terms.

## What changed for stability

The review reproduced a controller failure: evaluating `getGamepads()` outside a guarded call could throw even when controller input was disabled. The call is now lazy and inside a catch boundary. Disabled controls never call it. A denied API is latched until an explicit retry or re-enable, while neutral input lets the ordinary game frame continue.

Base model loading now runs two jobs at a time instead of starting the entire set together. Audio preparation retains two decode workers. Startup still yields between construction batches and warms material views before announcing readiness. No new asset fetch is performed when a bolt lands or a scare begins.

The framebuffer is bounded before scene construction and after resizing. A maximum 8,294,400-pixel budget and hardware texture limits constrain supersampling and ultrawide windows; CSS UI stays at native size. Engine multisample antialiasing is off, with the existing optional FXAA control. This reduces one source of allocation pressure, but 4K can still be too costly for some devices: try Low and 720p/1080p first.

Identical gain targets no longer append automation repeatedly to audio nodes. The global voice cap remains 24, finite panner protection stays enabled, and particle/bolt pools are fixed. Existing room batching, detail tiers, stable light identities and bounded navigation remain.

A graphics-context loss stops play and presents recovery instead of silently continuing. Reload checkpoint or Reload with Low graphics rebuilds a clean scene; browser restoration alone does not resume it. The last recorded error is retained for diagnostics when storage is available. A whole-tab/browser-process crash may prevent JavaScript from recording anything, so no recovery mechanism can promise to catch every GPU or operating-system failure.

## Saves, settings and troubleshooting

Story format remains version 2, with earlier migration retained. New bolt fields are bounded and default safely when absent; difficulty, notes, flags and checkpoints survive. Continue restores a safe checkpoint rather than an arbitrary mid-chase position. Use Export save before changing host or port, then Import save on the new origin. Local saves cannot automatically cross browser origins. Settings exports are separate from story saves.

Display options include resolution, scale, quality, shadows, glow, optional FXAA, brightness and fullscreen. Graphics changes use Apply → Keep, with timed Revert. Performance options include frame cap, menu frame cap, FPS/1% low/frame-time views and optional GPU-driven adaptive scale. **VSync is managed by the browser/display through requestAnimationFrame**; a web page cannot promise an exclusive-desktop VSync toggle. Refresh synchronization and an application FPS cap are different controls.

Audio has master/music/environment/SFX/interface and loud-effect controls, mono and dynamic-range options. Mouse axes, sensitivity, hold/toggle actions, controller deadzone/look curve, FOV, motion, subtitle contrast/size and interface scaling remain adjustable. Search settings by the problem, such as drift, subtitles or FPS. The menu now uses restrained parking-ticket identity and static wear without a full-screen animated background.

If the game reports an error, keep the original message and export **Pause → Advanced diagnostics → Download diagnostic report**, or the report button on the recovery screen. It includes the version, controller status, render size, missing assets/audio, last error and bounded recent performance events. If the entire tab closes, reopen on the same address and try Continue with Low graphics. Report your browser/device and the action immediately before the failure. These details help distinguish a logic exception from GPU/process failure.

## Editing and rebuilding as a beginner

`dist/` is the actual playable source, not generated output. Edit its `.js`, HTML or CSS files, then refresh the local game. Do not edit the `docs/Full_Code.md` reading copy; the packaging tool regenerates it from the real files. That document contains the full original code in commented code blocks. Vendor libraries are bundled separately with their notices.

| Change | Main files | Why |
|---|---|---|
| Required task text or prerequisites | `tasks.js`, `guidance.js` | Keep journal, prompts and action gates in agreement |
| Movement/difficulty | `player.js`, `difficulty.js` | Player traversal and enemy pressure are distinct |
| Hearing and pursuit | `threat.js`, `acoustics.js`, `evidence.js` | Only supported evidence should influence a hidden search |
| Lighting phases | `lighting.js`, `world.js`, `staging.js` | Keep rendered circuits and stealth synchronized |
| Bolts | `distractions.js`, `game.js`, `state.js` | Geometry, actual impact events and saved supply |
| Key and hand animation | `visuals.js`, key GLB | Use actual anchors instead of guessing grip coordinates |
| Weather and breathing | `audio.js`, `assets/audio/` | Preload buffers and keep categories consistent |
| Wall paint | `decay.js`, `assets/textures/v114-*.svg` | Match wall normal, support face and aspect ratio |
| Controls/recovery | `controller.js`, `capture.js`, `game.js`, `ui.js` | Optional device/API failures must stay isolated |

For code changes, run these from the extracted project root:

```bash
node tools/check.mjs
node --test tests/*.test.js
python tools/build-guide.py
python tools/package.py --output releases
```

The first command verifies runtime syntax and asset hashes. Tests use actual code/geometry with NullEngine and DOM/audio facades; they do not render or audition. The last commands regenerate the offline HTML guide, full code reading copy and both ZIPs. Their verification JSON includes archive sizes and SHA-256 hashes. The existing BUILD_AND_EDIT_GUIDE.md supplies the longer tutorial, map conventions and source walkthrough; older UPDATE files are historical.

Blender and audio-authoring dependencies are only needed to regenerate the source assets, not to play or edit game logic. Read the source-folder README before doing that. Update provenance hashes deliberately after an asset change; never bypass a failed integrity check without understanding why bytes changed.

## Remaining browser acceptance route

Before replacing the live build, perform one cold launch and one full playthrough on the actual target host. Verify mouse capture without dragging, the arrival/outage contrast, sign and key readability, battery pickup, all three core encounters, puddle hearing, bolt contacts, losing sight and hiding, the left driver entry and a clearly visible exit during driving. Try a restart/Continue and an imported save.

Also check Low at 720p, the selected normal preset, repeated menu open/close, fullscreen/resize, controller connection/disconnection where available, volume-zero behavior, headphones/speakers and reduced-motion settings. Export comparable diagnostic samples before and after the same route if measuring performance. A simulated 30-minute mixer check is useful for bounds but is not a hardware soak or human playtest.

Read VERIFICATION.md for the recorded automated result. The complete downloads are provided now; live publication waits for that browser acceptance gate.
