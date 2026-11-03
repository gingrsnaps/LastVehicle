# Last Vehicle

**A GingrSnaps Project** · Version 1.14 candidate · Low-poly browser horror · Babylon.js 9.33.1

You are Erin Cole, leaving a late shift at Meridian. Your car will not start. The stairwell has been sealed, the exit is dead, and something wearing the old night attendant’s workwear is waiting behind the Security glass.

Recover your battery, collect a replacement cable and fuse, repair the car, restore the exit, and return to bay 042 for a cinematic vehicle escape. The Attendant hunts from the Security-key event onward. Break its sight, use five marked hiding lockers, and choose optional distractions. Three task-linked encounters build toward the final return; three evidence documents affect the ending text.

**Playtime target:** 15–30 minutes for a first exploration. This is a design target, not a measured playtest result. There are no artificial wait timers to pad the runtime.

Version 1.14 fixes denied-controller exceptions, bounds model loading and render size, and adds clean graphics recovery. It also adds compact optional objectives, three throwable bolts, shared story lighting/stealth, more decisive pursuit, faster movement, visible stamina, a real maintenance key, four wall marks and six weather/contact/exertion sounds. The full story, earlier assets and saves are retained. Read `docs/UPDATE_1_14.md` for detailed instructions.

**Release candidate:** the managed browser preview was unavailable, so WebGL appearance, real-device controls, audible mix and a full browser playthrough remain unverified. The live browser site stays on version 1.12. The packages are complete downloadable candidates, not a claim of a tested public release.

## Run it

No Unreal, Godot, Blender, package installation, database, API key, or account is needed to run the downloaded game.

1. Extract this entire ZIP into a normal folder. Keep all subfolders together.
2. Have **Python 3.10 or newer OR Node.js 20 or newer** installed. You only need one. No `pip install` or `npm install` is required.
3. On Windows, double-click **START_WINDOWS.bat**. It chooses an installed runtime, starts the server, and opens your browser. On macOS/Linux, run `sh START_MAC_LINUX.sh`.
4. If you prefer a terminal, run either command from the extracted project folder:

   ```bash
   python START_GAME.py
   ```

   ```bash
   node tools/serve.mjs --open
   ```

5. The address is **http://127.0.0.1:8080/**. Keep the terminal open. Click **Enter the garage**, select Easy/Medium/Hard, then start. After sound preparation, read the one-time Controls page and click **Resume game**; later visits show **Enter game**. After capture succeeds, move the mouse freely without holding a button. If capture is blocked, use the standalone-tab link or explicitly choose drag controls. Escape pauses; Resume requests your saved input mode.
6. Press **F** to raise and switch on the flashlight. It starts off and put away. Nearby usable objects show an **E** badge and their action; the badge follows remapped controls.
7. In drag mode, hold the left mouse button and drag to look. **Choose drag controls** starts this mode immediately. Use **Open the game in its own tab** or Pause → Mouse controls to retry free mouse-look.
8. Press **J** for your current task, its purpose, collected notes, and completed history. **H** opens the journal’s Hints page without revealing an answer; click to reveal help in three stages. J → Map shows you, visited rooms, the current destination, and unlocked shortcuts. Reading pauses play. Revealed hints and read notes persist in saves. Read [what changed in 1.13](docs/UPDATE_1_14.md) for details and safe upgrade steps.

Do not double-click `index.html`: browsers restrict model/audio loading from `file://` URLs. “Self-run” here means a complete local browser game with a small launcher; it is not a Windows EXE. No paid software or game engine is needed. If port 8080 is already occupied, close an earlier game server or use its existing tab. The launcher never stops another process.

Everything needed at runtime is bundled in `dist/`, including Babylon.js, the glTF loader, textures, music, and sounds. The game makes no runtime requests to an external CDN, analytics service, or game server. Internet access is needed for the initial download; local play can then work offline.

Fresh installs start on Low graphics. Existing graphics preferences are retained. The update targets walking stalls, but no zero-freeze or measured FPS improvement is claimed without a real browser playtest. See [the performance route](docs/UPDATE_1_14.md#verification-and-remaining-playtest) if a hitch remains. The comparison procedure is described in the update guide.

## Controls

| Action | Default |
|---|---|
| Move | W A S D |
| Look | Mouse; choose drag controls if capture is blocked |
| Interact / enter or leave a shelter | E |
| Sprint | Left Shift; stamina regenerates |
| Crouch | C; toggle by default, hold available in Settings |
| Flashlight | F |
| Journal / tasks / map | J |
| Journal Hints page; reveal help explicitly | H |
| Pause / release mouse | Escape |

Controls are remappable in Settings → Controls. Conflicting remaps swap the two actions. Escape remains reserved for pause. Touch devices get separate movement and looking areas with Run, Light, and Use buttons; desktop keyboard/mouse is the primary target.

Optional controller support is in Settings → Controls. Standard pads use left/right sticks, A to use, X for the flashlight, Y for the journal, B to crouch, L3 to sprint and Menu to pause. A disconnected pad pauses play. The settings search and guided performance setup are described in the current update guide.

## What is included

- A flashlight that is hidden while off, with smooth equip/holster, an animated switch, center beam, wider spill, and sway control.
- Accurate action/requirement prompts with complete sight checks, readable key badges, adjustable prompt size, and remapped-key support.
- One shared task definition for journal text, hints, map destinations, prerequisites and prompt labels. The hood and both car sides inspect the car at the beginning.
- Explicit Missing / Carrying / Installed parts, so completed repairs never appear to lose an item.
- A quiet journal with Task, Hints, Notes & evidence, Map, and Controls pages; saved progressive hints, unread dots, completed history, optional direction markers, west service shortcuts, and explicit interaction requirements.
- Non-pausing pickups that add documents to the journal; cancellable repair and valve actions; free movement while the exit shutter rises.
- Free mouse-look by default, saved standard/raw/drag modes, clear capture errors and a standalone-tab link; drag is an explicit choice. Local diagnostic exports and runtime recovery remain available.
- Easy, Medium, and Hard modes, selectable before starting or in Settings → Gameplay and preserved in your checkpoint.
- A functional original low-poly car, recoverable battery, replacement cable kit, hood repair animation, rotating wheels, cockpit and continuous in-car exit.
- Five animated SHELTER lockers with witnessed-entry and evidence-based search rules.
- An original low-poly creature with 38 deform joints and 21 authored clips, including new Stalk, PeekLeft, PeekRight, DoorPush, CrouchSearch and StartRun actions. Editable Blender source and generator are included.
- Animated pickups, cabinet and locker doors, breaker switches, valve, exit shutter, and workshop grille.
- Thirty-six additional original CC0 industrial/worn-detail prop types, explicit support/anchor records, physically mounted signs, plus the Security window/blind, camera movement, panel cover, tyre stacks, cable junctions, drains and wear marks. Prebuilt flashlight dust is off on Low.
- Positional sound with doorway routing, wall muffling, room reverb, water drops, varied concrete/debris/grate contacts and environmental clues. Fifty-eight bundled Ogg files include music layers, creature recordings, five distinct shoe splashes and timed metal-contact effects. Tension follows actual pursuit.
- Hinged car doors and glazing; the driver door latches with a recorded car-door sound before the engine and drive begin.
- Multiple evidence memories, committed decisions, stalking, wet-track observations, corroborated shelter inspection, short directional prediction, cover/locker searches, cleared-location memory, visible-beam clues, and diminishing repeated distractions. Attacks have a warning, committed lunge and recovery after a miss.
- A real 3D first-person level, with collision, low-poly public models, dynamic flashlight shadows, fog, emissive fixtures, four stable reusable ceiling lights, and a live rendered title screen.
- A three-second studio intro with the exact credit **A GingrSnaps Project**, skip-after-first-viewing, replay from Credits, and fading ending/credit presentation.
- Start, Continue, Pause, Settings, Journal, Credits, failure recovery, and an ending.
- Quick setup plus six detailed settings categories: separate mouse axes, hold/toggle controls, reduced motion, interface scales, independent audio buses and loud-effect levels, sound test, shadow/glow/FXAA controls, and safe Apply/Keep/Revert graphics changes.
- FPS/frametime/1% low overlay with a graph, position/size controls, menu frame cap, and optional GPU-driven adaptive resolution. Category resets and separate settings import/export are included.
- Browser checkpoint saves, settings persistence, import/export, save validation, and an explicit fallback when browser storage is blocked.
- Three main story encounters: the Security window reveal, Workshop grille strike and Electrical surge. Service-passage, close shelter-inspection and return-to-car scenes, plus a possible left-window strike, depend on pacing and actual proximity. Journal observations reflect completed events.
- Staged scene/navigation preparation, seven-view material warmup, truthful loading failure/retry, selective shadow casters, spread audio obstruction work, and local performance-route reports.
- Complete commented source and editable level coordinates; no build step is required.

## Difficulty

| Mode | The Attendant | Player stamina |
|---|---|---|
| Easy | Slower; shorter searches; only witnessed locker entries are checked | Longer sprints; faster recovery |
| Medium | Balanced pursuit; nearby door sound plus recent sight/track evidence can justify a locker inspection | Balanced drain/recovery |
| Hard | Faster; longer searches and a wider locker-check radius | Shorter sprints; slower recovery |

Every mode keeps the same authored encounter opportunities, the same story/puzzle clues, and checkpoint saving. You can change difficulty in Settings → Gameplay. Saves without a difficulty field load as Medium; saves that already contain a choice retain it.

## Important platform limits

- **VSync is browser-managed.** A fake VSync switch would mislead players, so Settings explains this instead. The frame limit is an application cap, not a guarantee that the device can reach it.
- Render resolution changes the canvas, not Windows display resolution. Fullscreen depends on browser and iframe permission.
- Saves belong to the current browser and origin. Private browsing, clearing site data, or switching between local/hosted/itch URLs can remove or separate saves. Export a JSON backup to transfer progress.
- Local saves are checkpoints, not arbitrary mid-chase snapshots. Reloading or retrying restores a safe authored position. Temporary lures, traps, hiding and the drive reset safely; completed repairs remain complete. Version-1 saves migrate to schema 2 with an original local backup when storage is available.
- Audio unlock and mouse capture require a user gesture. Browser tab changes pause play.
- This is an original playable source implementation, not a certified Steam release. The automated verification report covers progression, imported geometry, the escape route, AI, recovery, sound-node cleanup and interaction timing. Browser visual/audio/playthrough checks remain outstanding because the managed preview service is unavailable. See the verification report before release.

## Upload to itch.io

Use the separate `LastVehicle_Itch_HTML5.zip` supplied with this project, or zip **the contents of `dist/`** yourself. `index.html` must be at the ZIP root.

1. Create a project on <https://itch.io/game/new>.
2. Set **Kind of project → HTML**.
3. Upload the HTML5 ZIP and enable **This file will be played in the browser**.
4. Use a resizable embed (1280×720 is a useful starting size) and enable fullscreen.
5. Test from the actual itch page: start, mouse capture, audio, saving, imports, and fullscreen can behave differently inside an iframe.
6. Keep the license/credits files in the ZIP. Publish the page only when your playtests pass.

Official upload guide: <https://itch.io/docs/creators/html5>.

## Learn and edit

Open **docs/LastVehicle_Guide.html** for the illustrated offline guide, or read [the version 1.14 update guide](docs/UPDATE_1_14.md) for every new control and setting. **docs/Full_Code.md** contains the complete commented code blocks. Start with [the detailed guide](docs/BUILD_AND_EDIT_GUIDE.md). It explains the story, walkthrough, each source module, level coordinates, lighting, public assets, save design, settings, optimization, and a release checklist. [Verification](docs/VERIFICATION.md) distinguishes automated checks from unverified browser behavior.

Run the included non-browser checks with Node.js 20 or later:

```bash
npm test
npm run check
```

These commands need no `npm install`: the project uses Node's built-in test runner and bundled Babylon.js.

## Credits and rights

The selected Kenney models, optional legacy Quaternius human and listed music/sound recordings carry explicit CC0 declarations. The new original Attendant has its own CC0 dedication. See [full credits](dist/assets/CREDITS.md), the provenance manifest, and `dist/assets/licenses/`. Babylon.js and its loader are Apache-2.0; their notices are in `dist/vendor/`. Original game source is supplied for you to modify and publish. No public open-source license has been selected for that original code; see `PROJECT_NOTICES.txt`. Third-party licenses remain attached to their respective files.

New default controls: **Q** throws a bolt (three per run); **Tab** shows the current task in On request mode. **RB** and **D-pad Up** provide the same controller actions. New players see a compact objective by default. Existing Journal only preferences are preserved; choose Settings → Gameplay → Objective display → Always if desired.
