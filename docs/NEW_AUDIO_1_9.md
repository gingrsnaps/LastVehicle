# New audio for Last Vehicle 1.9

The initial addition includes **one new 60-second music/ambience loop and six new short effects**, all from CC0 sources. None are renamed copies of the game's existing 21 audio files.

| Runtime name | Suggested role | Original |
|---|---|---|
| `dream-ambience.ogg` | Sparse exploration music; slowly fade with the existing layers | Dream 2 Ambience by TokyoGeisha |
| `door-open.ogg` | Rusty metal opening; cabinet or shelter | rubberduck `metal_open_01.ogg` |
| `lock-turn.ogg` | Maintenance key / latch release | rubberduck `lock_open_01.ogg` |
| `tool-handling.ogg` | Battery cable repair handling | rubberduck `tools_03.ogg` |
| `metal-stress.ogg` | Brief mechanical spring/flex | rubberduck `metal_spring_01.ogg` |
| `wood-crack.ogg` | Short crack in wooden storage material | rubberduck `wood_cracking_02.ogg` |
| `wood-creak.ogg` | A quiet shelving/timber squeak | rubberduck `wood_squeak_01.ogg` |

These seven files are already integrated. To repeat the integration, copy the `.ogg` files into `dist/assets/audio/`, the two notice files into `dist/assets/licenses/`, and merge `manifest-snippet.json`'s `assets` array into the main manifest. Keep filenames as listed above. The source archives/HTML are evidence and rebuilding inputs, not runtime dependencies.

`source-assets/new-audio/prepare-audio.py` contains the complete reproducible processing pipeline. It downloads the originals when missing and extracts only selected members. Every output is 32 kHz Vorbis. Effects are mono; the music is stereo. The music uses a four-second circular crossfade with no silent gap at the loop boundary.

Validation: full FFmpeg decoding, finite samples, clipping checks, sample/true peak measurements, source licensing verification, numerical loop-boundary check and comparison against existing output hashes. **Subjective listening and real browser playback were not performed.** Effect roles are based on the original file names and categories; they should be auditioned in the actual room mix before final acoustic sign-off.

Keep every effect spatially attached to its physical source. The opening clip is approximately 1.15 seconds; schedule it at the start of the opening action, not continuously each frame. Short mechanical effects are not intended as music stingers. A random-room-creak scheduler should use long cooldowns and a global voice cap. Prefer a single exploration music layer with deliberate transitions to chase audio over stacking all layers at once.

Credits: Music — TokyoGeisha (Marcus Davies), Dream 2 Ambience. Additional effects — rubberduck, 100 CC0 metal and wood SFX. Both submissions list CC0 1.0 Universal; see the notice files and manifest for exact links and edits.

Two additional CC0 recordings are integrated: rubberduck wet footsteps and Thimras metal-foot-on-concrete for the creature. See footstep-audio-inspection.json and the main asset manifest. Total additions: one music loop and eight effects.
