# Last Vehicle 1.18 — Surfaces and pursuit

**A GingrSnaps Project** · Low-poly browser horror · 5 November 2026

This build repairs missing imported-material coverage, enemy interruptions and texture preparation failure handling. It includes the complete garage, service yard, controllable escape, original assets, commented source, tests and beginner instructions. It remains a downloadable candidate: rendered gameplay, audible balance and hardware performance have not been approved. The exact crash you reported has not been reproduced. Live 1.12 remains unchanged pending the accepted full rendered playthrough.

Start by extracting into a new folder. Do not overwrite a running older game. Existing saves and settings remain compatible; export a checkpoint before switching browser origins. The following sections explain both how to play and what this repair changes.

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

## 5. What the texture repair actually changes

Earlier surface assignment covered structural concrete, steel and selected imported colors, but missed other materials embedded in the prop files. A freight tarp could load successfully while still having no surface image. The prior geometry-only fixture skipped imported materials, which hid this gap.

The new fixture reads the actual PBR materials for GLBs without embedded images. The runtime now assigns shared textures and physical UV repeats to these additional roles:

| Surface | Objects and treatment |
|---|---|
| Woven cloth | Tarps, cloth props, chair upholstery, seat fabric and native gloves. A bundled 512px albedo/roughness pair repeats every 0.3 m. |
| Fine surface grain | Dark housings, rubber, painted car panels, flashlight body and ochre paint. Reuses the existing grayscale metal roughness map as subtle variation, avoiding another image allocation. |
| Concrete | Dust-colored imported surfaces use the existing fine concrete map. |
| Wood and metal | Imported wood, medium metal and dark metal palettes now join their native counterparts. |
| Original image atlases | Kenney props and the Attendant keep their authored images and UVs. Glass, readable labels, eye/mouth cavities and emissive accents remain intentionally separate. |

Book Pattern by Rob Tuytel / Poly Haven supplies the woven maps under CC0. `source-assets/surfaces-v118/` includes official metadata, original images, hashes and a tiling reference. `tools/build-fabric-v118.py` rebuilds the runtime pair from those originals with Pillow. Players need no Pillow installation. Source: https://polyhaven.com/a/book_pattern ; license: https://polyhaven.com/license .

Maps are shared across objects, not cloned per prop. UVs are projected once, before static batching, using dimensions in metres and the actual transformed face normal. Invalid vertex data or singular transforms are reported and excluded from projection. Existing image-bearing model atlases are protected from replacement.

Identical imported palettes are consolidated after projection. The comparison includes their serialized rendering settings, including alpha, metalness and culling. Only the material identity is ignored. This allows the static merger to group matching props across source files while retaining genuinely different appearances. It does not change collision geometry, object positions or animated transforms.

## 6. Enemy behavior and stability repairs

### Sound and search

A new audible event cancels an old peek/cover-search action. Previously that old action could finish a moment later and redirect the hunter away from the new noise. Accepted sounds now get a bounded investigation commitment, and old loop/cutoff intent is cleared. New visible evidence still takes priority. The AI uses observed and heard evidence; hidden player coordinates do not become a destination.

A witnessed locker entry retains priority over unrelated clatter. Break sight before hiding. Medium and Hard can use corroborated evidence to inspect a locker; this release does not turn every noise into an automatic discovery.

### Door pursuit

On Medium and Hard, a hunter outside the gatehouse can approach its damaged side door when its remembered evidence is inside. That approach now survives ordinary chase updates. It walks to the exterior contact point, performs the door action and releases into investigation. Fresh sight, a bolt hit, a witnessed locker entry or an already-open door can cancel the approach. It expires after eight seconds and has a retry cooldown, so a failed route does not become a permanent door loop. Easy keeps the ordinary doorway route.

### Bolts and scare interruptions

Hold Q, aim, then release. A nearby metal clatter is a distraction after sight is broken; a direct body hit briefly staggers the active hunter. Existing difficulty values remain 2.10 / 1.55 / 1.05 seconds on Easy / Medium / Hard. Rapid repeat hits are resisted. Bolts are finite; use marked spare trays carefully.

The encounter director, creature-scene selection and yard impacts now respect a stun. `Threat.stageRoute` also guards the mutation itself, so a scripted scare cannot silently cancel the recovery animation and steal the escape window. Existing surface-specific impact audio and voice priority remain in place. This release adds no new music or sound recordings.

### Loading and recovery

The texture handle is allocated before image/GPU work begins. If allocation throws or an error callback fires synchronously, cleanup waits until that call stack ends, then disposes the failed handle. This avoids an orphaned texture blocking scene readiness. Each load has at most two attempts, with a 4.5-second per-attempt timeout and a shared 20-second preparation deadline. Late callbacks cannot turn a failed request into a successful one.

Essential surface-color maps must be present before the game reports Ready. A missing required map stops loading with a list of failed surfaces, Retry and a diagnostic-download button. Optional paint and other roughness failures remain in the report and can use a matte fallback. The shared metal roughness image is required because it also supplies the fine-grain color surface. Extract the complete ZIP and use its local launcher before troubleshooting a partial upload.

A graphics-context loss during loading latches the preparation failure. Context restoration cannot silently continue an interrupted boot; reload to rebuild cleanly. The loading error and stage are saved locally. The diagnostic JSON adds per-file texture status, attempts, failures, material coverage and current AI intent. It is downloaded only on request and is not uploaded automatically.

Sign textures now obey a maximum allocation of 2048 × 1024 pixels and the device's lower texture limit. Long labels retain their aspect ratio. Room preparation follows each of the ten camera views through sector visibility, including the yard, road and cockpit. It restores the original visibility on either success or failure. This addresses a first-visit preparation gap; it is not a claim of measured FPS improvement.

The existing light pool, static sector batching, sliced route planning, pooled weather/splashes, frame cap, render scale, optional shadows and 24-voice audio cap remain. Low is the fresh-install default. Settings → Performance includes FPS/frametime display and a performance test route.

## 7. Safe updates and saves

Before replacing your old folder, export a save and settings from Pause. Extract the new ZIP separately. Stop only your own older launcher before starting the new one. Browser saves belong to the exact browser profile and origin; localhost, a different port, itch.io and the hosted site have separate saves. Use import/export to transfer them.

Save schema remains **3**, compatible with 1.15. Older schema 1 and 2 saves migrate and retain a local original backup when storage is available. Completed tasks and finite bolt refills persist. Continuing restores an authored checkpoint; it resets transient pursuit, hiding and vehicle motion instead of trusting arbitrary imported coordinates. A completed older ending remains completed. Start New Game to experience all changes from the beginning.

Graphics changes retain Apply/Keep/Revert. A lost graphics context pauses and preserves the checkpoint; restoration alone does not silently resume a potentially broken scene. A runtime error offers recovery. These mechanisms limit damage but do not prove the absence of future crashes.

## 8. Beginner editing map

Open the extracted project folder in VS Code. Change the actual files, save, and reload the local browser tab. `docs/Full_Code.md` is a reading copy of the complete runtime, launchers and tests with code blocks; it is regenerated by the packaging tool. No build step is required to edit gameplay JavaScript.

| File | What to edit |
|---|---|
| `dist/js/surface-library.js` | Named surface recipes, tint, physical repeat width, UV projection and safe palette sharing. Add explicit roles rather than blindly retexturing all materials. |
| `dist/js/texture-loader.js` | Loading attempts, deadline, cleanup and status records. Keep every failure finite. |
| `dist/js/threat.js` | Evidence-driven chasing, sound investigations, protected states, door approach and difficulty use. |
| `dist/js/encounters.js`, `creature-scenes.js` | Scare eligibility and the single actor's authored scenes. Preserve active chase/stun/inspection priorities. |
| `dist/js/yard.js` | Outdoor mechanisms, door contact, cable, weather and anchored props. |
| `dist/js/world.js` | Scene construction, batch preparation, room warmup and lights. |
| `dist/js/sign-sizing.js` | Bounded sign texture dimensions. |
| `dist/js/game.js`, `ui.js` | Startup, recovery, diagnostic export, progress and menus. |
| `dist/js/campaign.js`, `tasks.js` | Shared objective/control anchors and journal wording. Update the source of truth when moving an object. |
| `dist/js/state.js`, `preferences.js` | Validated saves and settings. |
| `dist/js/vehicle.js`, `staging.js` | Driving, left-side exit, hood, battery, cockpit and door animation. |
| `tests/release118.test.js`, `tests/startup.test.js` | Material-aware imports, cleanup faults, pursuit and actual UI-handler regressions. |

To add a texture, place it in `dist/assets/textures/`, record its license and hash, load it during preparation, add its role to the surface table, and verify its scale on a small prop and a large floor. Avoid downloads during gameplay. Preserve the existing intro text **A GingrSnaps Project** and its three-second presentation unless you intentionally change the branding.

Run these commands after editing:

```bash
npm test
node tools/check.mjs
python tools/build-guide.py
python tools/package.py --output releases
```

Node uses its built-in test runner, so `npm install` is unnecessary. The guide and package scripts use Python's standard library. Only editing the image assets requires Pillow; Blender is optional for rebuilding the supplied editable models.

## 9. Verification and remaining playtest

Read `VERIFICATION.md` for exact counts and limitations. Automated checks exercise actual geometry and imported non-image material identities, simulated movement, production state transitions, sound APIs, settings and saves. They cannot prove the visual result, audio mix or GPU stability. Ten image-bearing model imports in the material-aware fixture skip material decoding; the real browser loads their original embedded atlases. The Attendant's eight embedded image maps are unchanged.

For hardware review, start a new game and complete every objective in section 4. Check tarp/cloth/car/flashlight surfaces from normal viewing distances; use F to compare lighting. Pause/resume mouse capture, throw into metal and water, break sight, stagger the hunter, then hide. Test gatehouse pursuit with its side door closed and after it opens. Save/Continue, return to the car and drive left around the roadworks to the ending.

For a hitch comparison, keep browser, window size, settings, frame cap and save fixed. Walk from the shutter through all four outside controls, return, then repeat. Export diagnostics after each pass. Compare area-level long-frame counts and CPU/GPU data where available; average FPS alone can conceal stalls. Low on a modest machine and the intended quality on your main machine both need review.

If the game crashes again, download **LastVehicle-diagnostics.json** from the recovery screen, loading screen or Pause → Advanced diagnostics. Send that file with the action you were taking and whether the tab closed, the screen froze or the recovery menu appeared. A process/tab crash cannot be caught by page JavaScript, so use the report after restarting when possible. Do not delete saves or clear browser storage before exporting them.

The available QA browser reported WebGL unavailable. Rendered gameplay, audible sound, physical controls, GPU-memory measurements and a full human playthrough remain outstanding. The exact reported crash is not diagnosed from an error log, and no zero-crash/zero-stutter guarantee is made. Downloadable candidates are supplied; the accepted rendered-playthrough gate still prevents replacing live 1.12.

## 10. Browser upload package

`LastVehicle_Itch_HTML5.zip` contains the playable files with `index.html` at the ZIP root. The Complete ZIP additionally includes launchers, editable assets, source, tests and this guide. On itch.io, use an HTML project and test browser play, fullscreen, mouse capture, audio and saving in its actual embed before public release. Runtime assets are bundled and local play needs no CDN.

Keep all license files. Original game code and GingrSnaps branding retain the terms in `PROJECT_NOTICES.txt`; third-party files retain their notices. The new woven surface is CC0. No paid assets or engine license are required to run the package.
