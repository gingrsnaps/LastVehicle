# Last Vehicle 1.7 — immersion and reliable guidance

**A GingrSnaps Project · Low-poly browser edition · 2 November 2026**

This is the complete game package: local browser launchers, commented source, public assets, music/effects, settings, checkpoint saves, beginning-to-ending progression, and an itch.io HTML5 build. It remains one consistent low-poly style.

## Start or upgrade

1. Export your checkpoint and settings from the old build’s pause/settings menus if you want an extra backup.
2. Extract the new complete ZIP into its own folder. Do not merge only a few JavaScript files into the old release.
3. On Windows, double-click `START_WINDOWS.bat`. On macOS/Linux run `sh START_MAC_LINUX.sh`. Python 3.10+ or Node.js 20+ is needed; either one is sufficient, with no packages to install.
4. Keep the server terminal open. Use `http://127.0.0.1:8080/`, choose Continue or a new game, and click Enter game/Resume from the input dialog. Move the mouse without holding a button after capture succeeds.
5. Press **J** for the task, map, notes and optional hints. **H** opens Hints without revealing a solution. Key labels follow your remaps.

The two ZIPs are full builds. The complete ZIP includes this guide and editable source; the itch ZIP places `index.html` at its root for a browser-game upload. The downloadable game works offline after extraction and local launch. It is not an EXE. The hosted browser version is updated separately.

Your local saves belong to the browser’s origin, including its port. Keep that address unchanged to retain them automatically, or import your exported save. Version 1.7 retains the existing schema-2 flags and validates older checkpoints through the existing migration. It does not clear preferences or restart a completed objective. Previously recorded encounters stay recorded; start a separate fresh run if you want to experience all new staging.

## The instruction fix

The first task really is **Inspect your car**. Aim at the driver handle, passenger side, or front hood of the teal car in bay 042 and use the displayed interaction key. All three resolve to the same inspection; no workshop item is required. Once inspection completes, the floor battery becomes the next task. Later, the hood is used to repair and the driver door is used to escape.

| Order | Journal task | Required action | What changes |
|---:|---|---|---|
| 1 | Inspect your car | Use any initial car inspection target | Hood opens; sabotage notice is collected |
| 2 | Recover your battery | Take the floor battery beside the hood | Battery becomes Carrying |
| 3 | Find the maintenance key | Take the key in Security | Key works automatically; west passage unlocks; threat activates |
| 4 | Collect the repair supplies | Use the labelled Workshop cabinet | One pickup collects cable and exit-control fuse |
| 5 | Repair your car | Use the open hood | Battery/cable become Installed; hood closes |
| 6 | Restore exit power | Electrical panel: Ventilation → Lighting → Access | Fuse becomes Installed |
| 7 | Authorize the exit | Enter 1986 at the Security terminal | Gate motor is authorized |
| 8 | Raise the shutter | Use the north exit motor | Shutter rises while you can move |
| 9 | Return to your car | Use the repaired car’s driver door | Door/engine/automatic drive sequence ends the game |

`dist/js/tasks.js` is the shared contract. Journal text, interaction labels and prerequisites, map destinations and hint stages use those records. A future locked action points back to the current task. Remapped interaction keys appear in hints. The inventory reports **Missing**, **Carrying** and **Installed**; installing a part no longer makes it look lost. The siren, pressure valve, temporary grille and extra evidence are optional.

## Graphics and room identity

- Security has office furniture, tickets, coffee and a shift rota.
- Storage has measured public packages and covered equipment without obstructing its route.
- Workshop has machinery, tools, cloth, a visible service duct/hatch and clearer repair staging.
- Electrical and Pump room have industrial dressing and subdued local ambience.
- The contractor retains his real skeletal animation, with muted workwear and a hard hat attached to the animated head.
- The car has hinged doors, restrained glazing and a driver-side cockpit aligned with its entry point.

Seven new GLBs and four Ogg files total **939,754 bytes** before ZIP compression. Source attribution, CC0 notices, exact hashes and edits are included. The imported GLBs have embedded textures and measured ground pivots. They are original low-poly public art, not photorealistic assets under a retro filter. Tiny dust instances are built before play, visible only around the flashlight in relevant rooms, and disabled on Low.

## Scares and audio

Four main encounters are staged: a real walking figure around a parked car; a hinged service hatch near the supplies; recognition of the actual chasing contractor; and a swinging work lamp on the final return. They use eligibility checks and a cooldown. The hatch/lamp sounds occur on their contact frames. Looking away can defer a visual encounter rather than causing a full-screen flash.

The contractor’s reveal walks around collision and retreats behind cover. If missed, it is not falsely counted or replaced by a fabricated idle footstep. Locker handling occurs when he physically reaches the inspected door. A final side-window beat requires the actual chasing contractor beside the closed window during entry; being at the bonnet, distant or behind a wall is insufficient. These extra beats are situational, not compulsory repeated jumpscares.

Room beds crossfade, Security stays relatively quiet, real chase state raises the suspense layer, and ambient/music levels dip briefly before a contact cue. Footsteps remain tied to the rig’s real movement and position. The car door uses a recorded close; the engine begins after it latches. Master, Music, Ambience, SFX, Loud effects and Night range remain available. Reduced light changes and reduced motion remain supported.

## Performance and verification

The new assets load before play. No model or sound is fetched when an encounter fires. Static scenery joins the existing batching pass, measured colliders preserve the routes, and dynamic doors/hatch/lamp remain outside static merging. The existing stable light pool, selective shadows, Low default, render-scale options, FPS/frametime overlay, frame cap and GPU-dependent adaptive scaling remain.

**97 automated tests pass.** They exercise production progression, journal behavior, capture state handling with DOM facades, settings, save migration, animation transforms, real imported skeletal clips and prop dimensions, obstacle routes, chase/hiding rules and the entire car escape. Syntax and recorded asset hashes are checked separately.

These checks do not establish real-browser visual polish, audible mixing, permission behavior, GPU frame pacing or a measured 15–30-minute playtime. Browser QA is unavailable in this environment. The target duration is a first-play design goal; players who know the route can finish faster. A human browser playtest remains necessary before a commercial release.

For a useful performance comparison, run **Pause → Performance test route** on the same browser/device, graphics settings and route for two passes. Export both reports. Start with Low, then test Medium/High. A Node/NullEngine timing is not a browser FPS measurement. Browser refresh scheduling provides synchronization; a static browser game cannot force a driver-level VSync mode or a Windows-exclusive display mode.

## Where to learn and edit

Open `docs/LastVehicle_Guide.html` for the formatted guide, `docs/BUILD_AND_EDIT_GUIDE.md` for the Markdown version, and `docs/Full_Code.md` for complete authored code blocks with comments. Edit actual files in `dist/`; the Full Code document is a reading copy. `docs/IMMERSION_ASSETS.md` records added prop dimensions and audio processing, and `dist/assets/assets-manifest.json` records provenance.

For a first change, edit one task’s wording in `tasks.js`, refresh, and check the journal plus its locked/ready prompts. For a room edit, adjust a `PROP_LAYOUT` record in `props.js`; its collider derives from the recorded size. For a sound change, preserve the runtime filename, document its license/edits, and update its SHA256. Run `npm test` and `npm run check` after gameplay/layout changes.

## Manual release pass

Play a fresh run on Easy, Medium and Hard. Check initial inspection from each car side; floor battery pickup; prompt alignment near walls; saved/resumed repairs; optional hints and remapped keys; broken-sight hiding versus a witnessed entry; the four staged scares; car entry/door closure and paused/resumed escape. Listen at low volume first and test all volume buses. Inspect furniture placement, shadows, headwear and translucent car windows in WebGL. Test fullscreen, capture refusal/retry, low/medium/high graphics and both cold and warmed routes before a public commercial release.
