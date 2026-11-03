> Historical 1.3 notes. For current mouse behavior and expanded settings, read `UPDATE_1_4.md`. Version 1.4 removes the automatic drag fallback described below.

> Historical release notes. For current controls, journal behavior, and loading, start with UPDATE_1_5.md.

# Last Vehicle 1.3 — responsiveness and guidance

This update keeps the low-poly visual style, existing story, four scares, licensed assets, difficulty modes and three-second **A GingrSnaps Project** introduction. It changes how the player enters, moves through, and understands the game.

## Install without losing progress

1. In the old game, open Pause → Export save. Keep that JSON file as a backup.
2. Extract the new complete ZIP into a **new folder**, preserving the old project until you have checked the update. Do not mix old and new JavaScript files.
3. Close the old local game server, then double-click `START_WINDOWS.bat` in the new folder. On macOS/Linux use `sh START_MAC_LINUX.sh`.
4. Use the same address, `http://127.0.0.1:8080/`, and the same browser profile to retain local progress and settings. If needed, use Pause → Import save. A hosted game and a local game have separate saves; use export/import to transfer between them.
5. Check the title screen says **v1.3**. Refresh if it does not. Avoid clearing site data, which also removes saves.

Version-1 story saves remain compatible. Old saves receive empty visited-room/tutorial lists. Existing keybindings are retained, even when H was already assigned to another action: the new Hint action receives an unused key. Check Settings → Controls for its actual binding.

## Entering and controlling the game

Choose a difficulty and start. The game prepares audio before presenting **Enter game**. If sound preparation is blocked, **Continue without sound** remains available; after eight seconds the game also proceeds to the entry screen automatically.

Click **Enter game**. Standard mouse-look is requested directly from this click. The button stays visible while the browser responds. When capture is granted, the menu closes and the canvas receives keyboard focus. If the browser rejects capture, or supplies no response within five seconds, the same entry action starts **drag controls** and explains them on screen. A separate **Play with drag controls** button starts that mode immediately.

With drag controls, hold the **left mouse button** and move the mouse to look. Release it before repositioning the cursor for another drag. WASD movement, E interaction, F flashlight, J journal, H hints, Shift sprint, Ctrl crouch, and Escape pause otherwise work normally. Capture can be retried through Pause → Mouse controls, or from the link that opens the game in its own tab. A restricted iframe cannot grant itself pointer-lock permission.

The optional raw-input button remains separate. A failed advanced request leaves the ordinary entry and drag choices available. Opening a journal or puzzle intentionally pauses play; the menu explains that state. Closing or resuming uses the selected input mode.

## Reading an interaction prompt

| Display | Meaning |
|---|---|
| **E — Take maintenance key** | Aim and reach are valid, and the action is currently available. |
| **Move closer** | You are looking at the correct object, but it is outside reach. |
| **! Locked — maintenance key required** | The object is nearby, but the required tool has not been collected. |
| **! Power offline** | Restore the electrical supply before using this equipment. |
| No marker on an already collected item | That pickup is complete. |

Both the prompt and E handler use `availability()` in `guidance.js`. Changing a prerequisite in one place therefore changes both. The key handler also rechecks the current aim at the instant of activation, preventing an old rendered prompt from activating a different object.

`interaction.js` selects a small, forgiving volume around each visible handle or item. It tests the whole sight segment against 3D blockers. A low desk can support a visible paper without acting like a ceiling-high wall; a wall near the far end of the sight segment still blocks the prompt. The selection has a small stability bias, but that bias cannot keep a target through a wall or outside its aim volume. Reach is measured from the camera to the interaction volume; the usual usable surface distance is 2.35 metres.

Settings → Comfort includes **Interaction prompt size** and world-highlight controls. Remapped keys appear in prompts, first-use guidance, and hint instructions, including distinct arrow-key symbols.

## Clearer objectives and optional help

The HUD shows one immediate task, its destination, and why it matters. Use **H** for three levels of assistance:

1. A destination or general reminder.
2. The relevant object or clue.
3. An explicit action or puzzle solution.

Requesting a hint does not solve anything, advance progress, or change difficulty. It briefly displays a destination ring at the appropriate doorway or object. The ring is an ordinary scene object and is occluded by geometry. Guidance favours the unlocked west passage when the player is already in that corridor. After ten seconds the ring disappears. The written hint lasts fourteen seconds and can be requested again.

After a quiet minute without an objective completion or discovering a room, an optional reminder offers a hint. Reading, paused menus, timed interactions, active scares and immediate pursuit do not spend that timer. Disable reminder messages independently in Settings → Comfort. Explicit hints remain available on Easy, Medium and Hard.

The opening teaches looking, walking, using the flashlight, and interacting one step at a time. Stealth advice appears when the contractor becomes active. These messages use your current keybindings. The journal lists your current task and carried tools; keys and tools are used automatically.

## Easier navigation

Room entrances are numbered: **01 Security, 02 Storage, 03 Workshop, 04 Electrical, 05 Pump Room**. Room names remain visible so colour is never the only identifier.

Taking the maintenance key automatically opens the west service passage, linking Security, Storage and Workshop. Its two doors animate upward. This provides a more direct route to the fuse and a quieter connection between rooms. The workshop rear fire door closes when the coolant valve is isolated, before the final encounter; the main workshop doorway remains available for the siren lure. The map shows which passage is currently open.

Open J → Floor plan to see your position, visited rooms, and the current destination. The handover log also contains Meridian's founding year, so the security override has a second readable clue. The terminal can show the clue already collected, and the breaker panel can display its restart procedure without opening another menu. Story notes remain optional reading once their relevant information has been collected.

## Movement and animation

Ordinary pickups, checking the car, operating the siren and raising the exit shutter no longer lock movement. Pickup feedback appears without automatically opening a full-screen document. Full notes remain in the journal; interacting with a previously collected document opens its reading view intentionally.

The coolant valve briefly requires standing still, with visible progress. Mouse-look remains active. Press the interaction key again to cancel it. Cancellation restores movement and resets the prop without recording the objective. An action watchdog also clears a stalled action after its expected duration plus half a second of active gameplay time. Pausing stops this timer along with the action.

The exit shutter continues moving after its control is pressed. The reaching hand lowers early; the player can move while the machine completes its travel. Only the valve can apply the optional two-degree cinematic FOV adjustment. All object and skeletal animation remains independent of that comfort setting.

## The final trap

Activate the yellow siren control **outside** the workshop, then move to the red handle beside the entrance. Stay out of the contractor's path. The HUD asks you to wait outside. When the figure is fully inside the workshop, the objective changes to **He is inside — close the grille** and the interaction key becomes available on the handle.

Both the room's depth and the actor's position are checked; being west of the entrance somewhere else in the building is insufficient. The player must also be outside. If you try early, the reason is shown and nothing is consumed. A completed trap remains saved. Dying during an unfinished lure restores the safe pre-alarm checkpoint so the attempt can be repeated.

## Performance changes and honest limits

Long sight tests now use exact rectangle intersections instead of samples every 20 centimetres. Navigation compiles static walkability and safe neighbouring edges during loading. A priority queue replaces sorting the entire search list repeatedly. Moving doors are checked separately, so opening a door does not rebuild the whole grid during play. The contractor reuses a valid route and skips pathfinding when it can move directly to its destination.

Nearby lighting selection is reused until the player moves far enough to need another selection. The frame cap retains its timing schedule instead of restarting the interval after every render. FPS reporting uses the actual elapsed interval. The last 600 active frame intervals can be included in a diagnostic report; that report stays on your machine unless you choose to share it.

`navigation-benchmark.json` records a build-host comparison using 100 warmed route calls for each implementation. In that run, median route time changed from **0.962 ms to 0.585 ms**, and the 95th percentile changed from **4.660 ms to 1.966 ms**. Static-grid preparation took about **125 ms during loading**. These are Node CPU measurements for the selected route sample, not browser FPS or a guarantee that every device will be smooth.

## If something still goes wrong

Pause → **Download diagnostic report** saves a small JSON report with the build version, input mode, capture-event history, current objective, graphics preset, browser identifier, and recent frame timing. The capture dialog offers the same button under Troubleshooting details. No network telemetry is sent.

If a gameplay exception stops rendering, a recovery screen offers a low-graphics retry using drag controls, an exported save, and a diagnostic report. Keep the save before experimenting with browser settings. For a performance report, mention whether the image froze, only walking stopped, or the mouse stopped turning; those correspond to different systems.

The automated suite has **50 passing checks**, including a real application-state simulation from entry to the ending, with DOM/audio facades and Babylon's NullEngine. Actual Firefox/Chromium permissions, WebGL rendering, audible mixing, hardware frame pacing and first-time-player completion still need browser testing. The browser-control environment could not launch here. A successful deployment is not a substitute for that playtest.
