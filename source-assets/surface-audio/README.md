# Surface and close-contact recordings — Last Vehicle 1.10

This pack adds eight recorded, CC0 sound effects. Five water footsteps are
separate moments from Joseph Sardin's **Shoes in the Water** (BigSoundBank sound
0690). They are real shoe splashes, not generated noise or pitch duplicates.
The other three effects are previously unused members of rubberduck's
**100 CC0 metal and wood SFX** collection.

## Runtime integration

Copy `audio/*.ogg` to `dist/assets/audio/` and both notices from `licenses/` to
`dist/assets/licenses/`. Merge `manifest-snippet.json` entries into the game's
asset manifest. Keep this README, `prepare-audio.py`, and `audio-inspection.json`
with the editable source package. The full original WAV/ZIP are optional editing
inputs and are not runtime dependencies.

| Sound | Intended trigger |
| --- | --- |
| water-step-1 … water-step-5 | A player or creature foot actually lands inside a visible puddle. Shuffle without an immediate repeat. |
| panel-scrape | A limb brushes or flexes a metal panel during the corridor close pass. |
| handle-strain | Locker handle or hatch flexes during an evidence-based inspection. |
| door-strike | Visible hand or shoulder contacts a metal door; synchronize the animation impact frame. |

The step onset crops retain approximately 6 ms of low-level lead before the
first detected contact. The later water displacement is part of the recorded
step and must not be time-stretched to the animation's entire gait cycle.

At a master SFX gain of 1, use approximately 0.25–0.35 for player walking water
contacts, 0.12–0.18 crouched and 0.4–0.55 running; tune against the existing dry
steps. Water should replace the dry footstep at that contact, rather than double
its volume. For a creature, use distance attenuation and the existing occlusion
filter; any low foot thud layer should remain quieter than the water contact.
The water sound should generate the same AI hearing event as the matching
physical footstep, never a second extra noise event.

Preload/decode all clips during loading. They are mono, 32 kHz Vorbis quality 4,
so a bounded set of reusable audio nodes is sufficient. No external network
request is needed during gameplay.

## Rebuilding

Install Python, NumPy, FFmpeg and ffprobe, then run:

```sh
python prepare-audio.py
```

The script downloads the two licensed sources only if absent, checks their
pinned SHA-256 hashes, makes the selected edits, writes all runtime files and
regenerates the inspection/manifest JSON. Editing or redistributing this script
is separate from the asset licenses; the sound recordings themselves are CC0.

## Verification limits

All eight files passed full FFmpeg decoding, finite-sample checks, and zero
clipped decoded samples. Waveforms were visually inspected to retain complete
contacts and short decays. Source intervals and encoded SHA-256 hashes are
recorded per file. Five distinct source windows establish distinct takes.
Subjective listening and browser playback were not available for this asset
pass, so those are explicitly not claimed. Final in-game balance and contact
alignment still need to be evaluated in the playable build.
