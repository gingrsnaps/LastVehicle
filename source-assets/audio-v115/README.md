# Last Vehicle 1.15 exterior audio

Twelve new mono Ogg files for the yard, gatehouse, material-sensitive bolt impacts, and the driving finale. They use original procedural sound design and existing hash-locked CC0 recordings. The code is fully offline and deterministic with the same Python/NumPy/SciPy/FFmpeg versions.

Run from the project root:

```sh
python source-assets/audio-v115/prepare_audio.py
```

Authoring dependencies are Python 3, NumPy, SciPy, and FFmpeg with libvorbis. None are required by the browser game. The generator checks every input hash before writing its own files, and never changes game code or the shared manifest. To integrate, merge `manifest-fragment.json` into `dist/assets/assets-manifest.json`; register the sound names in the audio loader and use the cues below.

| Name (all prefixed `lv115-`) | Approx. duration | Loop | Suggested gain | Integration |
| --- | ---: | :---: | ---: | --- |
| roof-rain | 12 s | Yes | .30 | Fade in near awnings/gutters; reduce other rain layers |
| yard-wind | 12 s | Yes | .25 | Exterior ambience bus; fade across shelter boundaries |
| gravel-step-1 / gravel-step-2 | .62 s each | No | .45 | Alternate on actual shoe contacts over gravel |
| bolt-metal | .72 s | No | .40 | First bolt contact with metal, one event |
| bolt-glass | .85 s | No | .40 | Pane tick; this is not a shatter sound |
| bolt-water | .74 s | No | .45 | Small puddle contact, one event |
| fence-strike | 1.70 s | No | .55 | First transient must coincide with hand/fence contact |
| door-breach | 1.95 s | No | .55 | Initial shoulder/door contact, then visible latch release |
| road-gravel | 4 s | Yes | .30 | Fade with car speed; zero while parked |
| engine-idle | 4 s | Yes | .34 | Fade on engine state; playback rate .85–1.65 with RPM |
| yard-tension | 12 s | Yes | .35 | Music bus, crossfade away from current score |

The gains are starting values before the user's bus/master volume, not a guarantee of a finished mix. Keep the existing voice limit, spatial-coordinate validation, and audio category settings. Preload/decode before entering the yard so a strike never starts a download or decode. Keep long ambience centered or spatialized to actual fixed locations; never encode hidden enemy position. For a major strike briefly lower ambient layers rather than increasing the strike to an unsafe level.

`audio-inspection.json` records codec, levels, all decoded sample checks, loop wrap deltas, exact durations, compressed bytes and decoded memory. The same Ogg built twice should have the same hash with the documented tools. `rebuild-verification.json` records that comparison. `audition.html` presents local playback controls when served from the project root; it is an authoring tool and is not shipped in the game runtime.

Quality limit: checks establish finite, unclipped data, bounded levels and no abnormal numerical loop boundary. They do not establish subjective realism, speaker balance, browser playback or a final sound mix. Those require headphone/speaker playtesting in a WebGL-capable browser.

All license/source details are in `LICENSE.txt`, `source-lock.json` and each manifest entry. Existing source recordings keep their listed author credits. No additional microphone recording is required.
