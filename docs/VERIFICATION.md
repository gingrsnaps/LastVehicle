# Last Vehicle 1.19 — verification record

This record separates logic/geometry evidence from rendered gameplay. It covers the complete downloadable 1.19 candidate. The QA browser reports **WebGL unavailable**, so there is no GPU playthrough, monitor-based lighting approval, audible-mix approval, physical controller/mouse acceptance or hardware FPS claim. Live 1.12 remains unchanged pending the accepted full rendered playthrough.

## Reproduced defects and repairs

- **Outdoor hint aim:** all nine audited exterior approach scenarios failed when aiming at the displayed diamond, 0.62 m above the actual interaction anchor. The marker now surrounds that anchor, uses the same reach condition, and falls back incrementally from unreachable stand-off views. Tests follow the rendered marker coordinates rather than silently substituting the item coordinate. A production Game/Player/UI facade follows the exterior chapter and completes every normal E action and selector button sequence on Easy, Medium and Hard.
- **Pillar stall:** a hunter approaching the pillar at X=-5.8, Z=57 could stop near (-5.0226,55.9549) and repeatedly plan without recovery. A nearby path point was skipped before the next swept segment was clear, while replanning reset the progress timer. The corner is now traversed at simulated 30, 60 and 144 Hz. A separate no-progress watchdog survives replanning and uses physical recovery.
- **Patrol gaps:** the existing 11 sparse targets were reachable, but medium baseline simulations first entered the yard after 108–119 seconds and left it unattended for 160–180 seconds. The new 21-stop, five-section planner records arrivals, validates route costs, bounds age scores, cools failed goals and changes priorities from public chapter state. It does not track hidden player coordinates.
- **Misleading directions:** the outdoor left/right prose and sign arrows disagreed with the actual north-facing camera. Current instructions use landmarks; journal map projection, facing arrow, roadworks direction, handover note and sign glyphs are consistent. Three loading labels now face out from their shutters.
- **Physical supports and moving parts:** perimeter fence endpoints meet; 117 unique posts have matching footings; the gatehouse side-door label has a lintel; brake and selector plates have real supporting faces. Two six-metre booms replace an arm that rose 30.7 m. The diagonal tow rope and roof wires are removed. The covered channel and entire dolly sweep avoid stationary bodies.

## Automated suite

The final full suite result is **219 tests passed, zero failed**. Run `npm test` to reproduce. This includes the established progression, input/capture failure, saves, settings, puzzles, manual driving, ending, audio finite-value guards, pooled effects, animation contact, context-loss and preparation recovery checks.

The first integration run exposed two scenery-access mistakes: a hand truck blocked the dock bolt-tray standing point, and a pallet stack blocked a shelter approach despite not overlapping the locker body. Both placements were moved. The final suite retains those access checks instead of weakening them. This is why a clear mesh footprint alone is insufficient evidence that a scene is playable.

`node tools/check.mjs` validates syntax, runtime dependencies and hashes for **181 enumerated assets**. The game retains **76 Ogg audio files**. No new music, sound recordings or surface-image files were added in 1.19. The local launcher and complete browser packaging remain in the project.

## Patrol simulation results

`verification-v119.json` records actual imported colliders and real Threat movement logic. Six ten-minute quiet-patrol simulations cover two seeds per difficulty. The player is far away and hidden to isolate patrol coverage; these numbers are not pursuit balance measurements or human playtime.

| Difficulty | First exterior entry, two seeds | Longest later yard absence, two seeds |
|---|---|---|
| Easy | 42.9 / 43.5 seconds | 58.3 / 43.0 seconds |
| Medium | 31.6 / 32.1 seconds | 43.9 / 33.6 seconds |
| Hard | 27.7 / 28.2 seconds | 39.4 / 39.9 seconds |

Every exterior patrol stop receives an actual arrival in all six runs, with zero navigation recoveries and no body crossing an active collider. Two additional 15-minute medium simulations cover interior and return chapters, including actual Workshop/Pump entries and both car aisles. The closed chapter stays inside. Pursuit and heard evidence can legitimately interrupt these quiet patrol timings during real play.

The known pillar corner reaches its destination at three simulated tick rates without recovery or repeated planning. These are meaningful route samples, not proof of every possible player/enemy movement sequence. Existing direct bolt stun, lost-sight distraction, nearby sound, locker evidence and door-breach regression checks pass.

## Assets, placement and lighting evidence

The ten new GLBs total **314,888 bytes**, **4,136 prototype triangles**, and at most **864 triangles per prototype**. The source package includes actual Blender studio renders, a contact sheet, source `.blend`, commented generator, licenses, dimensions and hashes. Their independent validation uses the shipped Babylon loader in both handedness modes and checks finite geometry/UVs, normals, winding, anchors and dependencies.

The integration adds **90 placements**. Actual transformed ground bounds are checked; all large new playable-area props are clear of other authored bodies, all shelter approaches are clear, the dock bolt tray remains accessible, wall vents project out from their support faces, and the car/dolly routes remain usable. The tree band is separated from building footprints. Registered placement/support output is supplied in `placement-audit.json`; its generic support resolver alone is not proof of architectural mounting, hence the explicit gatehouse and fence tests.

The new star field contains **640 stars in a three-mesh sky system**. Its brightness changes neither the ambient light nor AI visibility. Sky/weather ticks allocate no new scene meshes or lights in the sampled run. Fog colour, global fill and fixture intensity/radius are reduced; control labels remain locally readable. These numerical/geometry assertions cannot verify final perceived darkness or texture appearance on a monitor.

## Material coverage and rendering cost

`materials-v119.json` uses the actual PBR materials for non-image GLBs, including the new pack. Ten existing image-bearing GLBs skip materials because NullEngine lacks a browser image decoder. Existing embedded atlases, including the creature's eight image maps, are retained at runtime. An injected-handle pass verifies assignments and UV projection; it does not decode or render JPEGs.

The pass assigns **202 eligible material objects**, projects **236,573 vertices across 3,026 meshes**, and reports zero invalid geometry or required-map omissions. Fourteen shared v117/v118 surface maps and the existing decay maps are reused; these counts are not new image allocations. **153 identical imported material objects** consolidate onto canonical render states, retaining differences in alpha/culling. New textured prop meshes are explicitly checked for an albedo assignment.

The material-aware fixture has **833 static material/sector batches**, with **458 enabled** at the restored deep-garage sample before frustum culling. The comparable 1.18 fixture had 686 total / 390 enabled. Added scenery therefore increases geometry and batch counts; this release does not claim a measured rendering speedup. It avoids runtime scenery streaming, per-prop lights, extra background shadow casters and unbounded path replanning. The four fixture slots, fixed effect/bolt pools, 24-voice audio cap, spatial collision buckets and 128-node A* slices remain bounded. All-materials-skipped fixture counts are not comparable to the material-aware ones.

## Reproduce reports and packages

```bash
npm test
node tools/check.mjs
```

On a POSIX shell, regenerate the current records with:

```bash
LV119_REPORT=docs/verification-v119.json LV118_REPORT=docs/materials-v119.json LV_PLACEMENT_REPORT=docs/placement-audit.json npm test
```

The LV118_REPORT variable names the retained material regression suite, not the current build version. On Windows, set those environment variables before running the command, or inspect the supplied JSON. Rebuild the guide and both ZIP files with:

```bash
python tools/build-guide.py
python tools/package.py --output releases
```

The packager verifies CRCs, safe archive paths and the correct `index.html` location. The full project includes launchers, instructions, complete commented code, tests and editable sources. The itch archive contains the same runtime with `index.html` at its root. Vendor and asset notices are preserved.

## Remaining release gate

The available browser cannot initialize WebGL. A full rendered run, audio balance review, physical mouse/controller and iframe acceptance, lighting/material placement inspection and real first/repeat frame-time measurements remain outstanding. The exact earlier user crash was not reproduced or diagnosed from a supplied log. Retained cleanup/recovery safeguards address known failure paths without establishing that they caused that report.

Use the full route and settings instructions in UPDATE_1_19.md. If a failure recurs, export the local diagnostic JSON from the loading/recovery screen or Pause → Advanced diagnostics and record the exact action and failure type. A game that passes logic tests can still have device-specific rendering failures.
