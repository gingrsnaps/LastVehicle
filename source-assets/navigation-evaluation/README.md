# Last Vehicle 1.11 navigation review

**Follow-up:** an actual pinned Recast/Detour WASM bake/query evaluation is now complete. Read [RECAST_EVALUATION.md](RECAST_EVALUATION.md) for clearance findings, dynamic-door/serialized-mesh checks and the adoption recommendation. The earlier corner graph below remains a separate experiment.

This is a **Node CPU research result**, captured from the delivered 1.10 source (commit `482c83ec1eeeb3871184b16ae8290e8f84454a86`). It does not measure browser frame times, GPU performance, material warmup, actual audio mixing, or the reported crash/stutter on the player's machine.

## Recommendation

Retain the collision-aware grid for this release and integrate the small measured cache/heuristic improvements, followed by the existing game/geometry tests. The follow-up actual Recast evaluation is documented separately in RECAST_EVALUATION.md. There is no Recast dependency in the delivered game runtime; the pinned package is confined to this research folder. The alternative prototype is an **expanded-corner visibility graph**, not a navmesh and not evidence about Recast performance.

The graph prepares 292 visible candidate nodes and validates all dynamic crossing edges during queries. It improved the long driver-to-exit query but was slower on most short/local routes and on a clearly unreachable goal. It also does not implement the production evidence-to-free-floor projection. Replacing the proven movement pipeline with this graph therefore has no demonstrated overall benefit.

## Important source correction

`RouteFollower.step()` calls `reachableGoal()` before its own direct-visibility check, but `reachableGoal()` already returns immediately for a clear straight route. The current controller does **not** perform an A* search on each straightforward visible chase. Combining the duplicate visibility/blockage checks could save small repeated work, but it must not be described as removing an existing A* query from those frames.

## Captured geometry and cases

`garage-fixture.json` contains 101 collision rectangles from the actual World plus the delivered imported car/prop GLBs. Babylon's NullEngine loaded the real geometry while skipping image/material decoding. The fixture represents the current level after the service connections and exit are unlocked; the workshop grille is toggled separately for its case. Vehicle movement itself is not simulated in the query comparison.

Cases cover the central clear lane, Security alcove, west passage, Workshop-to-Electrical, the repaired car, the north exit, blocked evidence inside a car, outside-world evidence, and a closed workshop grille. Every path in the comparison was checked segment by segment with the production body radius. All six physical RouteFollower journeys reached the target at simulated update rates of 30, 60 and 144 FPS; this is not a rendered-FPS claim.

## Measured cached-grid prototype

Four bounded changes in `baseline-js/navigation-cached-prototype.js`:

1. Prepare shared immutable coordinate objects rather than allocating a new point for each inner-loop request.
2. Cache dynamic endpoint blockage once per node per query.
3. Avoid constructing failed-edge string keys when the avoid set is empty.
4. Use the octile grid heuristic for eight-direction edges instead of Euclidean distance.

The prototype retains the same public API, path return convention, dynamic-door checking and evidence projection. `compare-cached.mjs` alternates baseline/prototype order and retains 70 samples per case after ten warmup queries. All cases had equal found/unfound outcomes and collision-clear returned segments.

| Query | Baseline median / p95 ms | Cached median / p95 ms |
|---|---:|---:|
| Clear central lane | 0.0038 / 0.0120 | 0.0037 / 0.0064 |
| Security alcove | 0.0774 / 0.3919 | 0.0563 / 0.2048 |
| West service passage | 0.7195 / 1.0848 | 0.3242 / 0.7020 |
| Workshop → Electrical | 0.5820 / 1.0404 | 0.1676 / 0.3827 |
| Around repaired vehicle | 0.0321 / 0.1104 | 0.0276 / 0.0557 |
| Driver side → north exit | 2.1172 / 3.2587 | 0.2276 / 0.4632 |
| Closed workshop grille | 0.8825 / 1.4006 | 0.6175 / 0.9802 |

Blocked/invalid evidence paths are already cheap. They became slightly slower in this measured run (below 0.2 ms p95); the prototype is not uniformly faster in every case. Timings depend on JIT warmup and shared-host contention. The earlier graph-comparison run produced larger absolute values, including 22.73 ms production p95 for the driver-to-exit route. Use the interleaved comparison for relative interpretation; do not combine values from different runs into one before/after claim.

The actual bounded report is `cached-grid-comparison.json`. `navigation-comparison.json` retains the original graph comparison and physical-following measurements for transparency.

## Integration cautions

- Retain the existing clearance, line-check and dynamic-door tests when merging.
- Precomputed point records are shared: never mutate a point returned by the internal coordinate helper. Returned routes already copy their point values.
- Scratch buffers are per-grid in the current synchronous design. If path queries are later time-sliced or moved into asynchronous jobs, give each active query its own working state or permit only one query at a time. Sharing those scratch arrays across interleaved jobs corrupts search.
- Failed-edge penalties affect optimality; the prototype preserves the existing penalty semantics and only avoids empty lookups.
- The current early-goal rule may accept a nearby visible endpoint before the exact rounded goal cell. This review verifies reachability and collision, not globally shortest routes.
- New obstacles in 1.11 require fresh geometry checks; these measurements describe the recorded 1.10 fixture.
- Consider a bounded query work budget and stale-result rejection only if the full browser trace still shows path-related frame spikes. A worker is not automatically useful for one enemy and small query costs.
- Collision/visibility broadphase, UI percentile calculation and first-use GPU work remain independent profile candidates. These measurements cannot attribute the user's stutter to any one subsystem.

## Reproduce

The supplied baseline JavaScript snapshot makes the CPU comparison independent of later game edits. No npm packages are required.

```bash
node benchmark.mjs
node compare-cached.mjs
```

The supplied fixture is the preserved v1.10 geometry baseline. The current release tests load and validate the new v1.11 world separately. To measure a changed level, capture a fresh fixture under a distinct version label rather than overwriting this baseline.

## Primary design reference

Babylon's own navigation documentation describes pre-baked navigation data and worker-assisted baking: https://github.com/BabylonJS/Documentation/blob/master/content/features/featuresDeepDive/crowdNavigation/createNavMesh.md . Those supported facilities were subsequently exercised in actual-recast.mjs; they are separate from the initial corner-graph experiment.

## Shipped integration note

The four cached-grid improvements were integrated into `dist/js/navigation.js` for v1.11. The reports above retain their original experiment wording and measurements. The Recast files here are optional research tools only; the browser build neither imports nor downloads them.
