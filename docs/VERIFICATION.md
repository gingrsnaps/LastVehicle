# Last Vehicle 1.14 — verification report

Recorded for the 3 November 2026 candidate. **173 automated tests passed, with zero failures, cancellations or skips.** The integrity check passed runtime JavaScript syntax, entry points, required audio/texture dependencies and **129 recorded asset hashes**. This verifies the supplied code and data within the test scope; it is not a real-browser acceptance certificate.

## Environment and reproducibility

Tests use Node's built-in runner, Babylon.js 9.33.1 NullEngine, actual imported GLB geometry, a bounded DOM facade and strict Web Audio facades. The production Game, Player and UI handlers complete all required tasks and the vehicle ending. NullEngine does not render WebGL images or play sound.

```bash
node tools/check.mjs
node --test tests/*.test.js
```

The placement audit is regenerated with POSIX shell syntax:

```bash
LV_PLACEMENT_REPORT=docs/placement-audit.json node --test tests/world.test.js
```

Windows users can set LV_PLACEMENT_REPORT in their terminal before invoking Node, or inspect the supplied audit. It contains **131 registered placements and zero unresolved entries**. It covers registered supports, not a visual approval of every triangle from every viewpoint.

## New stability coverage

- A throwing `getGamepads()` is never evaluated while controls are disabled. When enabled, a SecurityError is caught once until explicit retry/re-enable. A real moving Game.frame sequence remains playable under this denial.
- Graphics-context loss pauses the real game, preserves the checkpoint and records the error. Context restoration alone does not resume it. These are simulated engine notifications; physical GPU loss is not reproduced.
- Fourteen model jobs never exceed two simultaneous jobs, and failure is returned only after workers have settled.
- Render sizing respects hardware limits and an 8,294,400-pixel cap for oversized/supersampled windows, including a hidden/zero-sized fallback.
- Thirty simulated minutes of scene mixing keep constant gain automation bounded and voice counts within the cap. Player exertion and rain mute on pause; stopping releases voices. This is a deterministic audio-facade simulation, not a hardware/memory soak or audible test.
- The earlier battery-pickup non-finite panner regression remains covered for modern AudioParams and compatibility setPosition calls, including float32 overflow, moving emitters and repeated voice cleanup.

## New game and asset coverage

- Car inspection changes arrival lighting to outage; restored lanes increase the same authored visibility calculation used by the enemy. Display brightness remains separate from AI perception.
- Wet footsteps are heard at a distance where dry walking is not, and a solid wall attenuates the route. The enemy performs its bounded listening turn.
- Story pursuit requires actual sight, keeps the sole actor at its current position, and cannot chase a hidden player from unseen coordinates.
- Swept bolt collision stops wall tunneling at simulated 30, 60 and 144 Hz. Bolts fall after wall strikes and settle at floor height; each produces only one contact event.
- Three-bolt supply and bounded regional habituation survive validated saves. Old saves receive defaults. A third repeated impact checks plausible cover while direct visual pursuit retains priority.
- Compact objective modes respond through the real Game action path. New default guidance and existing explicit journal preferences/remaps survive validation. Throwing consumes and saves ammunition.
- The actual key GLB imports with a ring-grip anchor, correct full-size bounds and a desktop support plane at Y=.925. Pickup retains scale across simulated 30/60/144 Hz and resets to its grounded transform.
- Four non-interactive wall marks sit off the actual perimeter faces; flaking plaster uses a separate plane to avoid coplanar overlap. They add no navigation blockers.

## Retained checks

The complete suite still covers progression prerequisites, task/journal consistency, remapped interaction prompts, imported saves, difficulty, optional hints, safe checkpoint placement, settings import/export and Apply/Keep/Revert. Battery recovery, repair, breaker sequence, Security terminal, gate and left driver door all complete through production handlers.

Pointer capture waits for confirmation, supports legacy void-return requests, handles raw-input rejection and retains an explicit drag fallback. Optional controllers cover neutral arming, button edges, deadzones, reconnection and disconnect pause. These API-state fixtures do not replace real browser permission or physical gamepad tests.

AI evidence expires; locker checks require supported evidence and physical arrival. Routes cross actual imported car/prop footprints, service doorways, U-shaped obstacles, shutters and moving-cart conditions without intersecting the tested solids. Last-seen pursuit and observed car-loop cutoffs remain bounded. Contact poses, the 21 imported creature clips, full-size battery grip, pauseable intro/actions, and once-only encounters remain checked.

Surface effects use shared puddle geometry and fixed pools. The entire escaping car clears its route; cockpit/headlight attachment and exclusions remain tested. No new runtime effect allocates an unbounded stream of meshes.

## Asset records

The runtime manifest contains **129 entries** and the audio folder contains **64 Ogg files**. Existing external asset bytes are retained. The new key is 882 triangles and 51,828 GLB bytes; four SVGs total 8,864 bytes. Actual exported geometry, normals, anchors and hashes are validated in the source pack. Blender model renders/contact sheets are supplied separately from in-game visual approval.

The six new audio files total **247,779 encoded bytes**. Recorded inspection reports finite full decodes, no clipping, loop-seam checks for all three loops, and matching hashes from two same-toolchain rebuilds. They contain 5,338,496 source-rate float32 bytes, or 10,676,992 bytes (10.18 MiB) at 48 kHz before browser overhead. These are additions, not the entire game's audio-memory total. Exact source authors, input hashes and CC0 provenance remain in both packages.

## Browser gate and limits

The managed preview service returned `preview relay unavailable: No such file or directory`. Consequently no current browser screenshot, real-device input/audio review, complete human playthrough, cold-load GPU/memory measurement or before/after FPS comparison was possible.

Unverified areas include final light/key/sign readability, flashlight/headlight glare, audible balance, subjective scare quality, physical controller compatibility, embedded pointer-lock/fullscreen behavior and first-time completion duration. The implementation addresses a reproduced controller exception and known allocation/automation risks; it does not establish that every reported crash or stutter is gone.

**1.14 is delivered as complete downloadable candidate packages and a saved source version. Live 1.12 remains unchanged pending the accepted complete browser playthrough.** UPDATE_1_14.md supplies the acceptance route and diagnostic-export instructions. No 60-FPS guarantee, zero-freeze claim or premium-quality certification is made.
