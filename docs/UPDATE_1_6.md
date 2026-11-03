# Last Vehicle 1.6 — repair, pursuit, and escape

**A GingrSnaps Project** · Babylon.js browser edition · 2 November 2026

This revision connects the car, battery, enemy and hiding into one complete escape. The visual direction remains **low-poly 3D**. It does not add pixelation or a second retro rendering style. The intended first-play length remains 15–30 minutes; that needs human playtesting, and a player who knows the answers can finish faster.

## Install or upgrade

Extract the complete ZIP to a fresh folder, then run `START_WINDOWS.bat`, `sh START_MAC_LINUX.sh`, `python START_GAME.py`, or `node tools/serve.mjs --open`. Python 3.10+ or Node 20+ is needed only for the local server. No dependency installation is needed. Keep the launcher open while playing. The browser address is `http://127.0.0.1:8080/`.

For itch.io, upload **LastVehicle_Itch_HTML5.zip** as an HTML game. Its `index.html` is already at the ZIP root. It includes every runtime asset and license. Test capture, fullscreen and audio on the actual itch embed; permission behavior can differ from a standalone tab.

Before replacing an older local folder, export your checkpoint from Pause. Keep the same browser and address if you want the existing local save to remain available. The hosted game, local server and itch page have separate browser storage; transfer between them using Export/Import.

Version-1 checkpoints migrate to schema 2. Completed old tasks retain their corresponding progress, and prerequisites newly introduced before that checkpoint are credited. For example, an old fuse checkpoint receives the battery and repair flags, so completed work is not taken away. An unfinished game never becomes a completed escape merely by migrating. The original local JSON is retained once as `lastvehicle.save.v1.backup` when readable storage is available. Existing mouse bindings, brightness and graphics preferences are preserved. New defaults affect fresh preferences; use Settings if an older preferred brightness is still too high.

Start a **new run** to experience the battery pickup, repair and encounters in their intended order. Continue is supported, but a migrated checkpoint can legitimately skip new early actions.

## What changed

| Reported problem | Implemented behavior |
|---|---|
| Battery has no purpose | Recover the visible battery beside the front of bay 042. It appears in carried items and is consumed by repair. |
| Car cannot escape | Find the workshop cable kit, install it and the battery at the open hood, restore and open the exit, then use the driver door. A roughly 14-second in-car sequence turns out of the bay and reaches the street. |
| No useful chase | The contractor activates after the Security key. He investigates, patrols, sees, hears, chases, loses sight, searches, and resumes patrol. |
| Hiding lacks rules | Five marked lockers have animated doors. Use the normal interaction key to enter and leave. A witnessed entry can be checked on every difficulty. |
| Permanent or mandatory trap | Siren and valve are optional nine-second distractions. The damaged grille lasts twelve seconds, warns before release and cannot be operated while you are inside. |
| Confusing controls | Quick setup collects common settings. Defaults are mouse look, WASD, E, F, Shift, C and J. Items apply automatically; no drag-and-drop inventory. |
| Slippery movement | Faster acceleration, immediate release of movement input, collision velocity clearing, restrained default head motion, and optional smoothing kept off. |
| Bright rooms make the beam pointless | Lower ambient fill, shorter room-local light pools, restrained sign emission, and a live flashlight-contrast view in Quick setup. |
| Signs and item graphics | Aspect-correct sign textures, wall/header mounting, corrected directional faces, and a coherent original low-poly car, battery, cable kit and lockers. |
| Scares happen at poor scales | Visual beats require clear sight, useful distance, sufficient angular size and an appropriate viewing direction. Audible beats cannot be blocked indefinitely by an unseen visual beat. |

These changes are implemented. Final visual appearance, mouse permissions, sound balance, subjective fear and frame pacing still need a browser playtest; see `VERIFICATION.md`.

## The three goals

### 1. Get the car running

Inspect the driver side of the teal car in bay 042. Its hood opens and a note explains the sabotage. Take the battery from the floor near its front. Walk north to Security, take the maintenance key, and read the shift log when convenient. Taking that key begins the threat after a short difficulty-specific grace period.

The key opens the west service shortcuts. Follow the workshop signs, open the repair-supplies cabinet, and take the replacement cable and exit-control fuse together. Return to the car's open hood. One interaction installs the recovered battery and cable and closes the hood. This takes 2.1 active seconds; the interaction key cancels it safely if you need to move. Progress is saved only after it finishes.

### 2. Open the vehicle exit

Go to Electrical. Use its panel to install the fuse and select **Ventilation → Lighting → Access**. The order is in the workshop note; a wrong selection resets only this small puzzle. Use the Security terminal next. The founding year in the shift log and north-exit plaque is **1986**. The terminal authorizes the motor directly. Use the motor to the left of the north exit to raise the shutter.

The journal presents one next step at a time. J opens Task, Hints, Notes, Map and Controls. H opens Hints without revealing an answer. Click to reveal a nudge, a direction, then the solution. Reading pauses the game. The screen does not constantly display instructions unless you enable the optional objective HUD.

### 3. Return to bay 042

Opening the exit makes noise and increases pursuit pressure. Return to the repaired car, using corners, rooms, the west passage and lockers to lose the contractor. Use the driver door to enter. The camera settles into the seat, the engine starts, wheels rotate with travel, and the car follows a continuous turn into the exit lane. You may look within the cockpit; driving is automatic so the ending does not introduce unfamiliar steering controls. Escape still pauses the sequence.

Walking through the north opening does not complete the game. The car must be repaired and the gate open before entry becomes available. A checkpoint taken during the drive restores the safe pre-escape state rather than a moving vehicle halfway through a wall.

## Learn the chase without adding controls

**Break sight, then hide.** A wall or corner blocks vision. Sprint creates more noise than walking; crouching is quieter. The flashlight makes you easier to spot in a clear sight line. Display brightness and speaker volume do not alter enemy perception.

Approach a locker labelled **SHELTER** and use the normal interaction key. The flashlight is put away automatically. You can look through genuine gaps in the door, but cannot walk out accidentally. Use the same key to leave. If the contractor saw the entry, a caption warns you and he approaches that locker. Leaving it before he finishes checking can save you if you find another route.

On Medium and Hard, an unwitnessed locker can be checked when it is near the last place he saw or heard you. He chooses from that evidence, not from your hidden position. Easy omits those speculative locker checks, but does not make a witnessed entry safe. The check has a visible door-opening animation and can catch the player only in the locker being inspected.

| Tuning | Easy | Medium | Hard |
|---|---:|---:|---:|
| Base chase speed | 2.65 m/s | 3.15 m/s | 3.75 m/s |
| Search clock | 6 s | 10 s | 16 s |
| Initial/retry grace | 12 s | 9 s | 7 s |
| Check a locker near last evidence | No | Within 3 m | Within 5 m |
| Door inspection duration | 2.2 s | 1.8 s | 1.35 s |

Player walk/sprint speeds are 2.2/4.1 m/s. Final exit pressure adds 4% to enemy movement. The search clock is followed by the duration of any already-started inspection. These are tuning values, not verified difficulty ratings. All modes retain the same clues and checkpoint access, and difficulty can be changed in Settings.

The optional workshop siren and pump valve direct investigation toward their sound for nine seconds, with an eighteen-second reset. A fresh visual chase takes priority; activating a sound is not a guaranteed escape. The workshop grille works only when the contractor is inside and you are outside. It holds for twelve seconds and warns during the last three. Neither tool adds a mandatory story objective or permanently removes the enemy.

## Scare pacing

1. **Another presence:** a distant figure and positional footsteps when you look down the lane; if that visual is missed, an audible presence cue accompanies the Security-key event.
2. **The repair cabinet:** a positional metal impact and short light dip after supplies are taken.
3. **Recognition:** the real contractor receives a restrained sting when the first chase is seen at a readable distance. He is not teleported into a scripted crossing.
4. **The exit responds:** the raised shutter echoes and draws attention before the final return to the car.

Three audible story beats are available even if the optional visual chase presentation is missed. Beats are saved when presented, not when merely queued. There is a cooldown between queued encounters. Hiding and unfinished interactions defer them; this avoids a sound cue interrupting a repair or immediately piling onto a locker inspection. They are not randomly repeated. Reduced light changes and Loud effects/Night mode remain independent settings.

## Settings and comfort

Quick setup has difficulty, sensitivity, master volume, brightness, quality, frame limit, reduced motion, and **Check flashlight contrast**. The contrast view temporarily looks at a nearby wall. Toggle its beam and adjust brightness; return to Settings restores the previous camera. On a suitable display, unlit shapes should remain faint and lit details should become clear.

The six detailed tabs remain: Gameplay, Graphics, Performance, Audio, Comfort and Controls. Expensive graphics changes still use Apply, then Keep/Revert. FPS overlay offers basic, detailed and graph views with position and size controls. There is no fake VSync switch: browser/display scheduling controls synchronization. Fullscreen and render size are available within browser permissions.

Fresh preferences use C to toggle crouch. Existing Ctrl or custom bindings survive. The action badge, journal and main contextual instructions use the current remapped key. The flashlight appears only when equipped, hides in shelters and menus, and becomes forward-facing headlights during the drive. Reduced motion removes the short camera-settling movement on car entry.

## Code tour for a beginner

Read `BUILD_AND_EDIT_GUIDE.md` for setup and the complete module map. `Full_Code.md` contains full code blocks, including the new module and test files. The source in `dist/js/` is the actual game; editing the reading copy does not change gameplay.

- **`state.js`:** the nine ordered objective flags, notebook text, checkpoint positions and version-1 migration. A flag is recorded only after its action completes.
- **`guidance.js` / `journal.js`:** what can be used, what the next goal means, and optional progressively explicit hints. A visible prompt and the Use action share the same checks.
- **`staging.js`:** original car, hood, battery, cable, lockers and cockpit. Moving roots are excluded from static batching. The exit curve is sampled once and traversed by distance, avoiding a sudden speed change at its join with the lane.
- **`threat.js`:** information-based pursuit. `lastKnown` is an observed/heard location. `inspectSpot` is a chosen locker. Neither continuously tracks the hidden player.
- **`player.js`:** translation, look bounds, responsive stopping, and shelter/vehicle modes. Inside a locker, movement is ignored but looking and interaction remain available.
- **`game.js`:** connects these systems, commits tasks, queues encounters, starts the drive and displays the ending only after the sequence finishes.
- **`audio.js`:** the existing licensed recordings plus a small original synthesized engine loop. Its three oscillators are created once per escape, updated at a bounded rate and stopped when leaving the sequence.

Original procedural geometry and engine audio add no new external asset dependency. Existing Kenney/Quaternius models, CC0 recordings and Babylon notices remain bundled. Public-domain assets and original project code have different notices; retain both when distributing.

## Performance and verification

The whole compact level, moving props, audio and navigation are prepared before gameplay. The cockpit is included in material preparation. Car motion, doors and repair use the existing animation clock rather than loading new scenes. The same seven light objects are reused. Hiding doors, hood and wheels remain dynamic; static dressing remains batched. No new CDN or runtime download was introduced.

Run `npm test` and `npm run check` from the complete package with Node 20+. Tests cover actual rules and Babylon scene construction, including every safe checkpoint, all interaction approach points, legacy save migration, witnessed/uncertain hiding, temporary distractions, complete repair/puzzle/drive flow and the swept car footprint through the exit. NullEngine checks cannot verify pixels, sound or hardware FPS.

For a performance comparison, start a fresh Easy run before collecting the key, use Pause → Performance test route, follow the route without completing objectives, and export first/second-pass reports. Keep browser, resolution, preset and route identical. Once the key has been taken, enemy pathfinding and encounters add variable work and no longer make a clean loading comparison.

Before calling a release premium quality, play it in an actual Chromium browser and Firefox on the intended hardware: validate dark/light contrast, both viewing directions of signs, mouse capture, observed hiding rules, chase balance, repairs cancelled and resumed, saves on each checkpoint, the cockpit view, the full exit, credits, and the audio mix. Time first-time players and record both frame pacing and comprehension. This package is a complete revised implementation with automated checks, not a claim that those unperformed playtests passed.
