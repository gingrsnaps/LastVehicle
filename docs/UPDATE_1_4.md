# Last Vehicle 1.4 — mouse-look, comfort, and performance

> Historical release notes. For current controls, journal behavior, and loading, start with UPDATE_1_5.md.

**A GingrSnaps Project** · Low-poly Babylon.js browser game · 2 November 2026

This is the complete game and editable source, including the existing garage, story, four authored encounters, three difficulties, checkpoint system, public CC0 assets, music, and sound effects. Version 1.4 concentrates on controls, settings, presentation, and frame pacing. It keeps the low-poly style; no pixel/32-bit filter is added.

## Install the update safely

1. Export your story save from the old game’s Pause menu. Keep the JSON backup.
2. Extract `LastVehicle_Browser_Complete.zip` into a new folder. Avoid mixing releases.
3. Close the previous local server. Run `START_WINDOWS.bat` on Windows, or `sh START_MAC_LINUX.sh` on macOS/Linux. Install Python 3.10+ **or** Node.js 20+ if neither is available. No package installation is needed.
4. Open `http://127.0.0.1:8080/`. The title should show **v1.4**. Keep the terminal open while playing. Refresh the tab if it still shows the previous release.
5. Use the same browser/profile and address to keep local saves. The hosted Site, localhost, and itch.io each have separate storage; transfer a story save with Export/Import when switching.
6. Begin with Medium graphics, 60 FPS, and free mouse-look. Use Low if necessary. These are starting configurations, not a hardware performance guarantee.

Story saves retain schema version 1. Existing remaps, progress, difficulty, discovered rooms, notes, and encounters remain compatible. Old “Show FPS” preferences become the Basic FPS overlay. Old graphics presets produce matching shadow/glow settings. The old interface volume is migrated from the effects volume.

## Free mouse movement

Start a new game or Continue. Sound preparation completes before the **Enter game** prompt; Continue without sound remains available. Click **Enter game · free mouse-look** once. Once the browser grants capture, the cursor disappears and moving the mouse turns the view without holding any button. A brief status message confirms the mode.

Escape releases capture and pauses. **Resume** makes a new capture request directly from that click. Switching tabs pauses play and clears held/toggled controls. F raises and switches on the flashlight; its model stays hidden when it is off. E interacts with the object identified by the nearby prompt. H provides increasingly direct guidance; J opens your journal and map.

**If capture is refused:** the prompt stays visible, explains the failure, and highlights **open the game in its own tab**. Open that link and start there. Browsers do not let a game grant itself permissions withheld by an embedding page. The game no longer silently switches you to drag controls. Choose **Choose drag controls** only if you want the hold-left-button alternative. It remains usable when capture is unavailable.

Settings → Controls saves one preferred mode: standard free mouse-look, optional raw free mouse-look, or drag. Raw mode needs browser support; a separate standard button remains available after a raw request fails. Mouse capture success still requires a real browser test; simulated input tests cannot grant browser permissions.

## Expanded settings

| Category | Options and behavior |
|---|---|
| Gameplay | Easy/Medium/Hard, skip the studio intro after its first viewing, objective directions, quiet-time hint reminders, first-use guidance |
| Graphics | Low/Medium/High/Custom, independent shadows and glow, optional FXAA, maximum render height, render scale, adaptive resolution and floor, live brightness |
| Performance | Gameplay cap of 30/60/90/120/144 or display rate; separate menu cap of 15/30/60; overlay Off/Basic/Detailed/Graph; corner and size |
| Audio | Master, music, environment, effects, interface volume, loud-effects level, Full/Night dynamic range, a gentle click/footstep test |
| Comfort | Reduced-motion preset, FOV, interaction focus, head bob, hand sway, interface/subtitle/prompt sizes, crosshair size/contrast, captions, reduced light changes, interaction highlights |
| Controls | Saved look mode, sensitivity, optional independent vertical sensitivity, invert Y, smoothing, a mouse-movement preview, hold/toggle sprint and crouch, remappable keys |

Volume and sensitivity change immediately. Settings are saved locally. Category reset affects that category; Restore all defaults resets the preferences, including default difficulty. Changing difficulty also changes the current run, but does not erase its objectives.

The reduced-motion preset overrides bob, sway, and interaction FOV motion without deleting the individual slider values. Turning the preset off restores those values. Menus use a simple fade. Light changes have a separate option. On a first launch, an operating-system reduced-motion preference enables the preset.

UI scale includes menus and the HUD. Additional subtitle, prompt, crosshair, and FPS scales let you tune those elements separately. Panels remain scrollable. Controls support keyboard focus and Escape; Escape is reserved for pause.

### Applying graphics without getting stuck

1. Choose a preset or edit an individual graphics option. Individual shadow/glow/FXAA changes select Custom.
2. Click **Apply graphics**. The backdrop becomes easier to see and a 15-second confirmation appears.
3. Click **Keep** to save, or **Revert** to restore the previous graphics.
4. If you do nothing, close settings, or hide the tab, the previous graphics return. Reload also restores the last confirmed graphics.

Unconfirmed graphics are never written to storage. If you adjust music while previewing graphics, Revert keeps the music change. Sliders with expensive effects are staged, avoiding repeated shadow-map recreation while dragging them.

FXAA is an optional image post-process; browser canvas antialiasing remains enabled. Render height and scale change the game canvas, not the operating system’s monitor resolution. Fullscreen depends on browser/embed permission. **VSync is managed by the browser and display**; the game exposes a frame limit, not a misleading VSync toggle.

### Settings export and import

Settings → Export settings downloads `LastVehicle-settings.json`. Import settings validates its type and bounds; choose Apply and Keep for imported graphics. This file is separate from a story save. Exports contain the last confirmed graphics, never a pending draft.

Save files remain objective checkpoints rather than arbitrary snapshots during a chase. Continue restores a safe position. Export a story save before clearing browser storage. Audio/video settings do not transfer with a story-save import.

## Reading the performance overlay

- **FPS** is calculated from roughly the last second of gameplay frame intervals. It is the rate of rendered game updates, not a separate browser benchmark.
- **Frame ms** is the mean interval for that same recent window. At 60 FPS, the interval is approximately 16.7 ms.
- **1% low** equals 1000 divided by the average duration of the slowest 1% of frames in the rolling window. The window contains up to 30 seconds of active gameplay, with a fixed 6,000-sample maximum. Very high refresh rates can shorten it.
- **CPU work** measures the JavaScript update and render-submission section; it is not total operating-system CPU usage.
- **GPU ms** uses Babylon’s asynchronous GPU timer where the browser supports it. Otherwise it says unavailable. It is a frame-time measurement, not GPU utilization or VRAM usage.
- **Graph** shows up to 120 recent frame intervals; its labelled ceiling expands for spikes. The horizontal line marks the selected frame budget; an uncapped game uses a 60 FPS reference line.
- **Resolution** is the actual canvas width × height. Adaptive percent is relative to the render scale you selected.

The display updates four times per second. Loading, intro, title, pauses, and time spent in settings are not recorded. The first frame after Resume is excluded so recapture does not create a false spike. New Game/Continue starts a fresh measurement window. Export diagnostics from Pause to retain the current summary and recent capture events; nothing is uploaded automatically.

### Adaptive resolution

Adaptive resolution is **off by default**. It lowers resolution by five percentage points after three seconds of sustained GPU pressure, with a lower CPU-work requirement to avoid responding to obvious CPU stalls. It recovers by 2.5 points after six seconds of spare GPU time. A configurable floor prevents unlimited degradation.

If GPU timing is unavailable, the chosen scale stays fixed. The overlay explains that it is waiting for a GPU timer. This is intentional: guessing from total frame time could blur the scene when the actual problem is logic, asset loading, or another application. The uncapped mode uses 60 FPS as the adaptive target; choose a numeric cap for a different target.

## Smooth presentation and animation

The studio mark displays **A GingrSnaps Project** for three seconds: 0.45-second fade in, 2.1-second hold, and 0.45-second fade out. Loading and bounded material preparation finish before it starts. The animation’s completion advances to the title. Skip is always available. With Skip after first viewing enabled, later visits go straight to the title. Credits → Replay studio intro shows it again.

The intro uses a completion promise rather than an unrelated timer racing the animation. The reduced-motion version removes translation while retaining the readable fade. A minimal three-second fallback supports environments without the animation API.

The ending fades over the last scene, quiets world effects and the music bed, and presents the result. Credits enter gently and stay scrollable; there is no forced lengthy credit roll. Public asset sources and license files remain linked from the credits.

Doors, switches, hands, equipment, and the gate use elapsed-time animation. Pausing freezes gameplay animation. Resume resets the scene animation clock to avoid a large elapsed-time jump. The contractor’s Walk/Run crossfade remains gradual; its footstep cues now follow half-cycle contacts in the visible clip instead of an independent AI distance counter. Contact timing is authored approximately and still needs an audiovisual playtest.

## Optimization changes

- Representative flashlight-off/on material variants, including the hidden hands and skinned actor, are prepared behind the loading screen. Readiness checks have both a time bound and an iteration limit, so preparation cannot retry forever.
- Opaque menus freeze the 3D backdrop after its required update. The title uses a lower, separate frame limit. UI confirmation timers continue independently of render throttling.
- Frame statistics use fixed typed-array buffers instead of shifting a growing array every frame. Detailed sorting/graph work runs at 4 Hz and only when needed for the overlay or diagnostics.
- Interaction projection reuses vector and matrix buffers; repeated prompt/location text is written only when changed.
- Ambient fans and drops stop advancing while gameplay is paused. Existing material/sector batching, cached navigation, nearby-light selection, and dynamic-object exclusions remain intact.
- Changing volume or sensitivity does not resize the render buffer or recreate shadow textures. FXAA is created/disposed only when its setting changes.

These changes address specific sources of unnecessary work. They are not a measured FPS improvement on your computer. The prior navigation CPU benchmark is retained as historical evidence; the new overlay supports actual hardware testing.

## Where to learn from the code

| File | What to study |
|---|---|
| `dist/js/capture.js` | Browser permission events, promise/legacy API support, cancellation and timeout |
| `dist/js/player.js` | Mouse delta angles, smoothing, hold/toggle actions, heading-relative movement |
| `dist/js/state.js` | Defaults, validated migration, save schema and storage fallback |
| `dist/js/preferences.js` | Staged graphics, safe persistence, rollback, category reset, settings imports |
| `dist/js/settings-ui.js` | Accessible form controls, live versus staged edits, sensitivity preview |
| `dist/js/performance.js` | Bounded frame samples, defined metrics, conservative adaptive scaling |
| `dist/js/presentation.js` | Intro completion, skip, reduced motion, clip-phase foot contacts |
| `dist/js/game.js` | Startup, scene clock, render limits, update loop and progression |
| `dist/js/world.js` | Actual graphics settings, FXAA lifecycle, bounded warmup |
| `dist/js/visuals.js` | Equipment animation, clip blending, pause behavior and interaction motion |
| `dist/js/audio.js` | Independent buses, loud-effect gain, compression, positional sound and ending fade |

Read `BUILD_AND_EDIT_GUIDE.md` for the full story, floor plan, walkthrough, asset replacement and beginner editing instructions. `Full_Code.md` contains complete code blocks for every original runtime/launcher/tool/test file; the same files are directly editable in the project. `LastVehicle_Guide.html` combines this update and the complete guide for comfortable offline reading.

## Verification and remaining playtest

The automated suite exercises the actual settings buttons and Game/Player/UI path with a bounded DOM facade and Babylon NullEngine. It covers capture success/denial, explicit drag choice, saving, full scripted progression, graphics Keep/Revert/timeout, setting migrations, telemetry, adaptive behavior, intro completion/skip, foot-contact phase, and animation tween timing at 30/60/120/144 FPS.

The browser-control runtime was unavailable in this workspace. Consequently actual Firefox/Chromium permission prompts, final WebGL appearance, audible mixing/contact timing, fullscreen, UI scaling at small window sizes, first-player pacing, and hardware performance still require a real browser playtest. A deployment and passing code tests do not establish those results.

Before publishing to players, check this short route:

1. Start in a standalone tab. Capture, freely look in every direction, walk, Escape, Resume, Alt+Tab, and repeat. Try raw mode only if desired.
2. Toggle F at a plain wall. Check the hidden/off state, raising/lowering, beam direction, shadows, and rapid reversals.
3. Visit Settings. Try each overlay, both control toggles, UI sizes, Night audio, and reduced motion. Apply High, let it time out, then apply and Keep Low. Confirm the previous graphics survive a reload during a preview.
4. Play several minutes at 30/60/120/144 where your display supports those rates. Inspect the graph while moving and during a scare. Check door, hand and contractor animation speed; listen for foot contacts.
5. Complete the entire route on Medium; use H when unsure. Save/Continue during exploration and after the trap. Verify intro skip/replay, ending fade, credits scroll, and all evidence variants.
6. Test the actual itch embed separately; it can have different capture/fullscreen/storage permissions. Keep the separate standalone link available.

The game targets a first-play session of 15–30 minutes; human playtime has not been measured. Nothing deliberately waits just to reach that length.

## Technical references

- Pointer Lock API: https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API
- Browser animation timing: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
- Animation completion: https://developer.mozilla.org/en-US/docs/Web/API/Animation/finished
- Babylon scene optimization/instrumentation: https://doc.babylonjs.com/features/featuresDeepDive/scene/optimize_your_scene
- itch.io HTML5 packaging: https://itch.io/docs/creators/html5
