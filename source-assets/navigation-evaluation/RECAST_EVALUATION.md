# Actual Recast navigation-mesh evaluation

This follow-up is an actual **Recast/Detour 1.6.4 WebAssembly** bake and query through Babylon.js 9.33.1's supported `RecastJSPlugin`. It supersedes the earlier statement that no actual Recast experiment had been performed. The separate corner-visibility graph remains a different experiment.

## Dependency and reproducibility

Package: `recast-detour@1.6.4`, maintained/published under the BabylonJS npm account. Source package URL: https://registry.npmjs.org/recast-detour/-/recast-detour-1.6.4.tgz . The npm SHA-512 integrity value was verified before extraction. Verified source tarball SHA-256 (tarball not bundled): `518d2e7ffdcf3563c4cb36bdc24e5dc6ed2f5f8dd837839ef105d0bc67574088`.

The pinned WASM, wrapper and license are included only under this optional research folder. The browser runtime has no Recast dependency. The package's Zlib license is retained in `recast-1.6.4/package/License.txt`. The WASM binary is 370 KiB (rounded); the script loads it from local bytes without fetching a CDN during execution.

Run with Node and the matching delivered project:

```bash
node actual-recast.mjs /absolute/path/to/LastVehicle
```

`actual-recast-comparison.json` contains all timings, full path points and validity results. `recast-standard-radius.bin` and `recast-expanded-proxies.bin` are the serialized real navmesh data.

## Geometry and method

The same recorded 101-rectangle real garage fixture was used. Its car and prop bounds were measured from the actual imported GLBs. The ground is the flat 60 × 112 metre floor. Every enabled collision blocker is extruded to a 2.5-metre obstacle so the navigation model agrees with the game's 2D body-blocking behavior. This is a bake of real collision proxies, **not** all render triangles; the current gameplay does not allow climbing on chairs/car roofs.

The workshop grille starts open. It is then added as a Recast box obstacle, updated, removed and updated again. The legacy plugin exposes `update()` without a completion return; this bounded experiment executes 32 updates and validates the resulting path. It does not establish a general completion protocol for arbitrary large batches of moving obstacles.

The mesh is serialized, restored into a new plugin instance, queried, and the same closed-grille dynamic update is tested again. Restored tile-cache data successfully supported the expanded-proxy detour.

## Clearance finding

Two real Recast variants were compared:

- **Standard radius:** 0.1-metre cells, four-cell agent radius (0.4 m), original collision boxes. Its rounded/simplified navmesh corners caused collision incompatibility in the Security route, Workshop-to-Electrical route and closed-grille detour when checked against the game's square-expanded AABB collision. A valid Recast route alone is therefore not sufficient for this controller.
- **Expanded proxies:** expand every collision rectangle by the gameplay radius of 0.34 m, then bake with zero additional radius. This matched the conservative gameplay collision. All six valid representative routes reached their exact requested goals and every segment cleared the existing body-radius tests. The closed/reopened grille and the restored-and-closed grille also passed.

The expanded bake produced **4,245 navigation triangles** and **207,953 serialized bytes**. This is navigation data, not render geometry. The returned floor path Y values ranged from 0 to roughly 0.1 m due to rasterization; a future flat-floor adapter should preserve the game's grounded position rather than allowing the navmesh quantization to bob the character.

## CPU result and limits

Queries alternated between Recast and the already optimized cached grid. Each case retained 60 samples after ten warmups. The final run (which added restored-dynamic-door validation) produced:

| Query | Recast p95 ms | Optimized grid p95 ms | Exact target and clearance |
|---|---:|---:|---|
| clear central lane | 0.0182 | 0.0051 | yes |
| Security alcove to hall | 0.0172 | 0.1722 | yes |
| west service passage | 0.1076 | 4.5913 | yes |
| Workshop to Electrical | 0.0506 | 2.3819 | yes |
| around repaired vehicle | 0.0144 | 0.1272 | yes |
| driver side to north exit | 0.3088 | 4.4454 | yes |
| blocked evidence inside vehicle | 0.8945 | 0.3029 | partial/invalid |
| impossible beyond outer wall | 0.0018 | 0.0567 | partial/invalid |

The initial run measured expanded bake 189.6 ms and restore 22.2 ms. The final run measured bake 761.5 ms and restore 37.6 ms. This large absolute difference reflects shared-host contention/JIT context; timings are observations, not a stable hardware guarantee. In the initial run, the valid obstacle-route Recast p95 values were approximately 0.006–0.200 ms. Recast was consistently useful for the larger obstacle queries here, while a direct clear route remained cheapest in the existing grid's direct-return path.

Final dynamic grille update: close 0.355 ms, reopen 0.301 ms. Both serialized restoration and subsequent dynamic closing produced the expected detour in the expanded variant.

A blocked goal inside the car returned a **partial path** ending about 1.36 m from that requested point. The existing `reachableGoal()` deliberately projects blocked evidence to a reachable nearby point; raw Recast querying is not a drop-in replacement for that contract. The impossible outside-world goal returned an empty path. A production adapter must distinguish accepted evidence projection, failed queries and partial paths explicitly.

These are Node CPU results on a shared build host. They do not measure browser GPU time, memory pressure, subjective cornering, frame pacing or the user's stutter. The experiment has not run the full game, all door combinations, all evidence projections or the authored close-contact encounters through Recast.

## Recommendation for this release

**Retain the now optimized grid for 1.11, with this successful Recast prototype included as research evidence.** Recast is technically viable and can yield fewer waypoints and cheaper nontrivial queries on this fixture. However, immediate adoption would require integrating and checking expanded proxy geometry, serialized geometry versioning, mutable obstacle synchronization, stale/partial result handling, precise scene targets and the existing physical recovery contract. The existing grid already completes the real routes with measured sub-millisecond warm medians after the bounded changes.

A future migration can preserve the current physical movement controller and make Recast a route provider behind the same validated interface. Run the new 1.11 world fixture and full physical/movement/encounter suite through that adapter before enabling it. Recast's standard rounded-radius bake should not be enabled against the present square-expanded collision unchanged.

Primary API reference: https://github.com/BabylonJS/Documentation/blob/master/content/features/featuresDeepDive/crowdNavigation/createNavMesh.md . Native underlying implementation: https://github.com/BabylonJS/Extensions/blob/master/recastjs/src/recastjs.cpp . The source package's local `recast.d.ts` was used to confirm available obstacle/update methods.
