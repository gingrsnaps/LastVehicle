# Last Vehicle 1.14 — exterior weather and physical contacts

Six local mono Ogg files add an exterior city/weather layer and two physical contacts, plus quiet player exertion. These are **designed sound effects**: original synthesis plus documented processing of recordings already bundled under CC0. No microphone recording, external download or runtime service is needed.

## Integration

Suggested gains are pre-category starting values, not an approved browser mix. Keep creature footsteps and attack cues readable. Music remains separate from weather.

| File | Role | Cue and starting gain |
|---|---|---|
| `lv114-city-night.ogg` | 24-second loop | Distant traffic and motor wash; fade toward .20 within 18 m of the north exit. Keep very quiet deeper inside. Its two soft pass-bys should not be mistaken for enemy movement. |
| `lv114-entrance-rain.ogg` | 18-second loop | Rain at the exit gate and drain/puddle; fade toward .35 near the entrance. This can establish weather before the gate opens. Avoid full-volume overlap with the existing `lv113-exit-rain` layer; crossfade between them for the drive. |
| `lv114-distant-thunder.ogg` | 6-second one-shot | Broad distant rumble, approximately .30 gain; at least 45 seconds between cues, and no thunder during pursuit, attacks or story impacts. No lightning flash is required. |
| `lv114-bolt-impact.ogg` | Approximately .73-second one-shot | Trigger at the projectile's **first actual collision**, approximately .40 gain, from the finite collision coordinates. It already contains three diminishing small bounces; do not trigger a fresh cue on every physics step. Main decoded peak is within 1 ms of onset. |
| `lv114-electric-cutoff.ogg` | Approximately .88-second one-shot | Trigger once at the initial electrical cut, approximately .38 gain, at a real relay/source position. Main decoded contact is within 2 ms of onset. The light state can change at time zero. |
| `lv114-player-breath.ogg` | 6-second loop | Quiet original unvoiced breathing, three inhale/exhale pairs. Centered SFX, approximately .20–.45 gain according to **player sprint/stamina only**; fade out when recovered and mute on pause. No heartbeat or hidden-enemy proximity cue. |

Runtime scheduling should use each decoded AudioBuffer's duration. Vorbis/container duration and actual decoded sample count can differ slightly; `audio-inspection.json` records both. The original authored signal durations for the last two cues are .74 and .86 seconds.

- Decode with the existing bounded preparation workers, before gameplay.
- Weather goes to the Environment/ambience bus; bolt, cutoff and player breathing go to SFX. Keep breathing centered and distinct from the spatial creature voice.
- Reuse buffers and loop voices. The six files require three persistent loop voices and short one-shots only, within the existing global voice limit.
- Spatialize weather at the entrance or use a quiet centered bed whose gain follows proximity. Do not reposition audio with invalid/disposed mesh coordinates.
- Do not change AI hearing when a user changes audio volume. An actual bolt collision generates a separate gameplay noise event; this recorded sound is presentation.
- Caption meaningful cutoff/weather events without making sound captions reveal the hidden enemy's position.
- Thunder must stay below sudden enemy contacts. This is background weather, not another jump scare.

## Provenance and distribution

`source-lock.json` retains all four exact immediate input hashes and their complete original provenance entries, including authors, source pages, original file/archive hashes and available license notices. The generator refuses changed source bytes. It does not need those websites during rebuilding.

The original synthesis/edits and outputs are CC0; see `LICENSE.txt`. Runtime distribution retains these four files under `assets/licenses/`:

- `Audio-v114.txt`
- `Audio-v114-source-lock.json`
- `Audio-v114-provenance.json`
- The existing `CC0-1.0.txt` and referenced source notices.

`manifest-fragment.json` supplies the six entries for the shared manifest. It uses runtime-relative `file` and `license_proof` paths. The asset task does not append it automatically; the project integration owns that merge.

## Rebuild

Authoring dependencies: Python 3, NumPy, SciPy and FFmpeg with libvorbis. Waveform output also uses Matplotlib. These dependencies are not needed to play.

```sh
python source-assets/audio-v114/prepare_audio.py
python source-assets/audio-v114/plot_waveforms.py
```

The generator modifies only its six `lv114-*` Ogg files and this folder's inspection/manifest JSON files. It does not modify the game or shared manifest. Changing the toolchain may change encoded bytes; review the regenerated hashes before redistribution.

`audition.html` is an individual listening sheet. Open it locally or serve the project root; each audio player requires a click and starts at a moderate volume. It is not part of the runtime game's loading path.

## Verification and resource budget

- Six outputs total **247,779 encoded bytes**.
- Source-rate decoded float32 data: **5,338,496 bytes**, approximately **5.09 MiB**.
- At 48 kHz resampling: **10,676,992 bytes**, approximately **10.18 MiB**, excluding browser overhead.
- Complete decodes contain finite samples and zero clipped samples.
- All three loop wrap jumps are below the measured 99th-percentile ordinary adjacent-sample delta.
- Two identical-toolchain rebuilds produce the same encoded hashes; see `rebuild-verification.json`.
- The generator enforces an encoded pack limit of 500,000 bytes and a decoded-at-48k limit of 15 MiB.

These are numerical/asset checks. No browser audio playback, headphone/speaker audition, subjective realism or device-performance validation is claimed. Listen in context before final publication.
