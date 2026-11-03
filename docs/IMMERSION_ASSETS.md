# Last Vehicle v17 asset integration

Seven props plus four sounds; runtime addition is **0.940 MB** (decimal). Copy only `models/`, `audio/`, `licenses/`, and the manifest/credits. Leave `downloads/` out of the build.

## Models

All GLBs are standalone with baked mesh transforms and embedded palettes. Origin is ground center: min Y = 0, footprint centered on X/Z. No scale normalization was applied. Factory props are approximately meter scale; the three office pieces can start at uniform scale 2. Bounds below are in glTF coordinates (+Y up); preserve Babylon's imported root conversion. Use a parent TransformNode for world placement/scaling.

| Runtime file | Width X | Height Y | Depth Z | Triangles |
|---|---:|---:|---:|---:|
| models/storage-crate.glb | 0.595 | 0.55 | 1.0 | 70 |
| models/industrial-machine.glb | 1.2 | 1.299752 | 1.5 | 268 |
| models/control-console.glb | 0.6 | 0.991309 | 0.499245 | 126 |
| models/valve-pipe.glb | 1.0 | 1.0 | 1.015601 | 456 |
| models/office-chair.glb | 0.33495 | 0.6076 | 0.314299 | 588 |
| models/office-desk.glb | 0.734475 | 0.384408 | 0.3923 | 198 |
| models/office-monitor.glb | 0.392688 | 0.294285 | 0.104004 | 72 |

`storage-crate.glb` is source `box-wide.glb`: a taped cardboard package, not a slatted crate. `industrial-machine.glb`, `control-console.glb`, and `valve-pipe.glb` are the closest suitable factory dressing; this version of the kit has no pallet or tool cart. Office pieces show their front toward glTF +Z in the QA render.

## Audio

- `service.ogg`: original 31.318 s seamless loop, stereo 44.1 kHz. Use a low room-volume mix; source RMS is -13.761 dBFS.
- `tension.ogg`: edited 40 s loop, stereo 32 kHz, circular 2 s crossfade and -3 dB gain. RMS -23.700 dBFS.
- `hatch-impact.ogg`: 0.168 s Kenney heavy-metal impact, stereo 44.1 kHz. A feedback effect, not an authentic hatch recording.
- `door-close.ogg`: actual 0.713 s car-door close by looneybits, mono 44.1 kHz, -3 dB processing headroom.

Every audio file decodes completely; delivered sample peaks remain below 0 dBFS. No listening audition is claimed. `audio-inspection.json` records objective levels/durations. `asset-preview.png` is a visual QA contact sheet, not a runtime asset.

## Provenance

Source HTML snapshots, exact selected originals, full download archives and conversion scripts are retained only in `downloads/` for reproducibility. The compact runtime set contains no full pack. See `assets-manifest.json` for source URLs, archive SHA256 hashes, original asset names, output SHA256 hashes, license records and processing details.
