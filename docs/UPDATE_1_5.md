# Last Vehicle 1.5 — quieter guidance and preparation before play

**A GingrSnaps Project** · Low-poly Babylon.js browser game · 2 November 2026

This update puts tasks and help in a pauseable journal, replaces light switching during walking with a fixed light pool, and prepares the scene in smaller loading stages. The complete story, four authored scares, three difficulties, public CC0 assets, sound, save system, settings, and three-second studio intro remain included. The art direction is low-poly throughout.

The changes address identifiable sources of work during gameplay. They do **not** establish that all freezing is fixed: 72 automated tests pass, but a real WebGL playtest and measurements on your computer remain outstanding. The available browser test environment could not launch. The included performance route makes a first/second-pass comparison possible without changing story progress.

## Download, update, and start

1. In the previous version, use **Pause → Export save**. You can also export settings separately in Settings.
2. Extract **LastVehicle_Browser_Complete.zip** into a new folder. Keep its subfolders together. Do not merge it into an older release.
3. Close the old local server. Windows: double-click **START_WINDOWS.bat**. macOS/Linux: run `sh START_MAC_LINUX.sh`. One installed runtime is required: Python 3.10+ **or** Node.js 20+. No package installation is required.
4. Open **http://127.0.0.1:8080/** and keep the terminal open. The title footer should say **v1.5**. Refresh if an older tab is still open.
5. Loading now names each preparation stage. After the title screen, select a difficulty or Continue. Audio is prepared before entering gameplay.
6. On your first visit to this version's controls, a short **Journal → Controls** page appears. Click **Resume game**. Free mouse-look requests capture from that click; if the browser refuses, the capture dialog explains the result and offers **Enter game**, an own-tab link, and an explicit drag alternative.
7. Once capture succeeds, move the mouse to look without holding a button. **WASD** walks, **F** equips or puts away the flashlight, **E** interacts, **J** opens the journal, **H** opens its Hints page, and **Escape** pauses.

Opening `dist/index.html` directly as a `file://` URL is unsupported. Use the launcher or a real web host. The downloaded game includes its dependencies and assets and works offline through the local server after download. It is not an EXE.

Use **LastVehicle_Itch_HTML5.zip** for itch.io's HTML game upload. Its `index.html` is at the archive root. The Complete ZIP adds launchers, tests, code blocks, and guides; its game is inside `dist/`.

## A journal that stays out of the way

The normal HUD shows a small **J Journal** control and an unread dot. It does not continuously show the task paragraph, hint cards, pickup document previews, or automatic tutorial reminders. Interaction prompts, action feedback, subtitles, and threat feedback remain available where needed.

| Page | What it contains | What the player controls |
|---|---|---|
| Task | Current next action, its location in the task directions, why it matters, carried tools, relevant collected notes, completed task history | Open a note, visit Hints, or open the map |
| Hints | Only hints explicitly revealed for the current task | Reveal a nudge, then a clearer direction, then the solution |
| Notes & evidence | Every collected document; unread entries have a dot | Read at your own pace and return to the same journal tab |
| Map | Player position, discovered rooms, current destination, unlocked shortcuts | Request an optional temporary world marker |
| Controls | A brief first-minute guide using your current keybindings | Revisit it at any time |

**J** opens Task. **H** opens Hints; pressing H does not automatically spend a hint or show a solution. Click the reveal button only when you want more help. Revealed levels and read documents persist in checkpoint saves and exported saves.

Reading pauses movement, the contractor, and active interaction animations. **Resume game** returns using your chosen mouse mode. Escape from the journal opens Pause, keeping the game stopped until you deliberately resume.

The direction marker is optional. Request it in Hints or Map; it lasts **20 seconds of active play** after resuming. Journal reading does not consume those seconds. It points toward a room entrance when you are outside, then the destination inside. It is a direction cue, not an automatically walked route.

For players who prefer visible guidance, Settings → Gameplay can enable the objective HUD or brief “Journal updated” notifications. Both are off by default. Difficulty changes contractor/stamina tuning; it does not hide puzzle clues or reduce journal help.

## What changed in loading

The preparation sequence is now:

1. Construct architecture and rooms in batches that yield to the browser.
2. Load and place the bundled vehicle models, then import the animated contractor.
3. Batch static geometry and prepare navigation before movement begins.
4. Visit seven camera positions behind the loading overlay, preparing visible materials, textures, lighting, and the selected shadow/post-process settings. Prepare the first-person and skinned character paths too.
5. Sample the loaded animation clips, restore the camera and hidden hand models, and report **Ready** only after preparation succeeds.

Progress percentages describe stages, not predicted seconds remaining. A slow GPU operation can still block a single frame; yielding between batches cannot interrupt a browser's internal shader compilation. There is no assertion of a zero-stall guarantee.

If readiness does not complete within a stage's time limit, loading stays stopped with **Retry** and **Use simpler graphics**. Retry reloads. Simpler graphics saves the Low preset with 80% render scale and adaptive resolution off, then reloads. Neither option clears story saves. The game no longer reaches Ready just because a readiness timeout expired.

Audio still needs a user gesture. It is fetched and decoded before gameplay entry; a **Continue without sound** option remains available. All puzzle information has text. Missing optional models retain fallback geometry and produce a warning, so a download problem is not silently mistaken for the complete art set.

## What changed while walking

**Stable light objects.** The old implementation enabled and disabled many ceiling lights as you moved. Version 1.5 keeps four reusable ceiling PointLights attached, alongside the fill and two flashlight lights. Ceiling slots fade out, relocate to selected fixtures, and fade back in. Switching the flashlight changes intensity and its visible model, rather than adding/removing a light from material influence. This avoids that particular source of light-layout changes; it is not a claim that a browser never compiles another shader.

**Selective shadow work.** Structural blockers, cars, relevant doors, and the contractor cast flashlight shadows. Small decorative details are excluded. Static batches separate shadow-casting and non-casting geometry, so one tiny caster does not force every decorative mesh in a batch into the shadow pass. Low turns off dynamic shadows and glow and is the fresh-install default. Existing saved graphics choices are retained.

**Smaller recurring tasks.** Wall obstruction for positional sound is checked one voice at a time, every 80 ms, instead of checking all voices together. The audio listener updates at 30 Hz with smoothed parameters, and unchanged obstruction filters are not rescheduled. Exact collision tests avoid temporary per-axis arrays, and path searches reuse their typed scratch buffers. Small printed signs use smaller textures.

**Less interface work.** Guidance and UI timer updates are limited to 10 Hz; movement, mouse-look, and animation still follow gameplay frames. Prompt projection reuses buffers and cached canvas dimensions. Stamina and danger feedback use transform/opacity changes. Large hidden task text is updated on progression, not rewritten every frame.

**Frame pacing and saves.** The frame cap preserves its timing phase through small refresh jitter and discards missed render debt after a stall. Routine 30-second saves prefer a browser idle callback, with a timeout/fallback. Objective saves remain immediate; pause and page exit also save. Browser local storage is synchronous, so this reduces avoidable timing overlap without pretending storage has become asynchronous.

The full level remains resident. Walking does not stream rooms in and out. Do not introduce aggressive streaming into this small garage without measuring: creation, upload, and disposal during movement could introduce the very stalls this update targets.

## Compare a first and second pass on your machine

This is a manual measurement tool, not a benchmark result already obtained for your computer.

1. Use the same browser, window size, graphics preset, render scale, and FPS cap for both passes. Keep adaptive resolution off for this comparison.
2. Before activating the pursuit, stand near bay 042. Open **Pause → Performance test route → Begin first pass** and resume.
3. Walk north to the exit and back south. Visit Security, Storage, Workshop, Electrical, and Pump Room; toggle the flashlight in each. Open and close the journal once. Do not solve new objectives during one pass only.
4. Return to **Performance test route → Finish pass & export**.
5. Choose **Begin second pass** and repeat the same route without reloading. Finish and export again. The second JSON contains both retained pass reports.

The report includes graphics/input settings, preparation status, CPU section maxima, up to 40 recent slow-frame/save events, available GPU timing, current draw calls, shadow-caster count, and a rolling frame summary. FPS, 1% low, p95, worst frame, and the over-100-ms count describe the most recent **30 seconds**; they are not whole-route averages. Section maxima and retained hitch events cover the pass since reset. Keep route timing comparable, and compare the event sections as well as the rolling summary.

Shader timing is cumulative engine instrumentation from this load; compare its difference between pass reports. CPU work measures JavaScript/render submission, not when the GPU finishes. A missing GPU timer is reported as unavailable. A large frame interval with little measured CPU work suggests something outside these sections, but does not by itself identify a cause.

Reports are downloaded locally. They contain browser, settings, position/timing, and capture-event information; nothing is uploaded automatically. To investigate a remaining freeze, provide this JSON plus the room/action and whether it happened on the first or both passes.

## Existing saves and preferences

Story saves still use **schema version 1**. Older saves receive an empty journal record. Existing objective order, checkpoint locations, notes, difficulty, visited rooms, and scare IDs remain valid. An unfinished lure still restores the safe pre-alarm checkpoint.

Journal metadata is validated: hint levels are bounded to 0–3 for reached tasks, and read-note IDs must correspond to collected notes. Reading cannot complete an objective. The first-minute controls page is remembered separately for the browser and in the story's journal metadata.

Existing graphics, audio, sensitivity, and remaps remain yours. The old automatic guidance preferences migrate to the quieter journal behavior. HUD task directions and brief journal notifications remain explicit opt-ins. Hosted, local, and itch origins have separate browser saves; use Export/Import to transfer progress.

## Learn from the code

- **journal.js** builds the five journal pages from authoritative game state and stores only reading/reveal metadata.
- **preparation.js** supplies task-boundary yields and a readiness wait that treats timeout as failure.
- **world.js** contains batched builders, the light pool, camera warmup, static batching, and shadow-caster selection.
- **game.js** coordinates preparation, input entry, checkpoint saves, and measured gameplay sections.
- **audio.js** spreads obstruction work; **navigation.js** holds collision-safe paths and reusable scratch memory.
- **performance.js** contains frame metrics, deadline scheduling, and bounded local hitch records.

Use **LastVehicle_Guide.html** for the offline guide and **Full_Code.md** for complete commented code blocks. Edit the actual source in `dist/js/`, not the reading copy. Run `npm test` and `npm run check` after code edits; neither needs `npm install`. Tests exercise real game handlers and Babylon NullEngine, but cannot certify WebGL appearance, audio quality, browser permissions, or hardware smoothness. See **VERIFICATION.md** for the exact coverage.
