# Last Vehicle 1.13 — restrained music and contact sound

Eight new mono Ogg files live in `dist/assets/audio/`. These are additions, not
replacements for earlier recordings. No microphone recording or download is
needed to rebuild them. Existing CC0 recordings supply the material contacts,
fan and water; original procedural synthesis supplies the musical theme, cloth,
pressure air, rain and wind. A synthesized or repurposed sound is explicitly
identified rather than represented as a documentary recording.

## Integration cues

Gain values below are **starting points before category/master buses**, not a
verified final mix. Music and ambience should leave nearby monster movement and
player contacts audible. Do not play the motif and return theme at full level
together: replace one with a 1.8-second equal-power crossfade.

| File stem (`.ogg`) | Duration | Starting gain | Animation or state cue |
|---|---:|---:|---|
| `lv113-motif` | 14.4 s, loop | 0.40 | Sparse original D4 / A3 / E-flat4 exploration theme over a D2 pedal. Fade in over 1.8 s. Keep existing ambience as a separate quieter layer. |
| `lv113-return` | 14.4 s, loop | 0.35 | Same motif with a beating pedal and restrained pulse after a sighting, on the return route, or in late-game tension. Crossfade from motif; neither is a synchronized stem of the earlier CC0 music. |
| `lv113-cloth-shift` | 0.716 s | 0.24 | Crouch/hide entry or a deliberate body shift; first rustle begins immediately, second brush around 0.28 s. Cooldown at least 0.6 s. This is original synthetic cloth/weight Foley. |
| `lv113-cart-wheel` | 1.5 s | 0.45 | One cart movement buildup, beginning with visible wheel motion. Metallic door creak/spring strain repurposed as cart Foley. Stop or fade if the motion is cancelled. |
| `lv113-cart-impact` | 0.816 s | 0.55 | Trigger at the cart's contact frame; strongest collision peak is 5 ms after start. One voice per event. The wheel sound provides the preceding movement. |
| `lv113-pressure-burst` | 2.7 s | 0.45 | Rattle/pipe shiver starts at time zero; air release starts at **0.18 s**. Trigger particles and pipe recoil on that marker. If the event is cancelled, fade the sound. |
| `lv113-fan-stop` | 3.05 s | 0.42 | Relay/isolation switch at time zero, then the existing CC0 fan winds down over 2.9 s. Stop the steady fan ambience first, or its continuing loop will contradict the animation. This clip describes fan cutoff, not startup. |
| `lv113-exit-rain` | 16 s, loop | 0.28 | Exterior escape rain/wind bed. Fade in over 2 s and lower music as the driver exits into open air. Continuous sound; no sudden extra peak. |

The exact Ogg-decoded durations are recorded in `audio-inspection.json`. Vorbis
container duration can differ by a few milliseconds from FFmpeg-decoded length.
Use the `AudioBuffer.duration` reported by the browser for playback scheduling.

## Loading, voices and player settings

- Decode during the existing loading screen, before starting gameplay. Do not
  decode or fetch a file at its contact frame.
- Route motif/return through **Music**, rain through **Ambience**, and the five
  short contacts through **SFX**. Preserve the user's master/category settings.
- Use mono spatial playback for cart, pressure and fan contacts. Player cloth
  may remain centered. Music and exit rain may be centered or passed through a
  quiet stereo room bus. No artificial spatial coordinates are required.
- Validate all emitter coordinates and player orientation as finite numbers
  before calling a Web Audio panner. Volume must not affect AI hearing.
- Keep at most two music sources during a transition and one instance of each
  scripted contact. Reuse decoded buffers; disconnect finished one-shot nodes.
- The three loops have small smoothed seam ramps and verified decoded wrap
  differences. Do not create a fresh source on every render update.
- Duck music by approximately 3–5 dB for important physical tells; avoid using
  overall loudness alone to create fear. Do not normalize each voice at runtime.

## Provenance and license

The eight output files and this folder's original composition/synthesis/edits
are dedicated under **CC0-1.0**; see `LICENSE.txt`. This does not change other
project code or asset licenses. `source-lock.json` preserves each exact immediate
input hash **and its entire original manifest entry**, including original pages,
recording/archive hashes, authors and existing license-notice paths. The immediate
inputs are previously processed Oggs already shipped with Last Vehicle; these
files are derived from those Oggs, not falsely labeled as untouched originals.

| Existing input | Original author / work | New use |
|---|---|---|
| `ambience.ogg` | qubodup, `(defect) motor loop`, `fan_interval.wav` | Fan coast-down |
| `rattle.ogg`, `metal.ogg` | Brian MacIntosh / BMacZero, Mechanical Sounds | Pressure rattle and cart collision |
| `switch.ogg` | Kenney, Interface Sounds, `switch_002.ogg` | Relay clicks |
| `drip.ogg` | Independent.nu, uploaded by qubodup, Dripping water loop | Quiet real-water component in otherwise synthetic exterior weather |
| `hinge-creak-1.ogg` | Joseph Sardin / BigSoundBank, Creaking metallic door (0616) | Wheel squeak Foley |
| `handle-strain.ogg`, `door-strike.ogg` | rubberduck, 100 CC0 metal and wood SFX | Cart squeak and impact details |

The eight entries in `manifest-snippet.json` are integrated into the runtime
`dist/assets/assets-manifest.json`. They include authoring paths, hashes, loop
flags, decoded bytes and integration cues. The browser-only package retains
`Audio-v113.txt`, `Audio-v113-source-lock.json` and `Audio-v113-provenance.json`
under `assets/licenses/`; the complete source project also retains the full
authoring folder. Rebuilding these files does not automatically update the
shared manifest: review and copy the new hashes if the toolchain changes.

Runtime integration uses the motif near the car, the return theme after gate
authorization, and exterior rain near the exit. Cart wheel sound follows the
physical movement; the contact plays once. The pressure scene releases water
at 0.18 seconds, and the power surge stops the fan layer while its blades coast
down. Creature listening/search poses trigger the cloth cue. These transitions
have automated state coverage; the gains above remain authoring references,
and the browser mix still requires listening review.

## Rebuild and inspect

Authoring dependencies: Python 3, NumPy, SciPy, FFmpeg with libvorbis. Optional
waveform output additionally uses Matplotlib. From the project root:

```sh
python source-assets/audio-v113/prepare_audio.py
python source-assets/audio-v113/plot_waveforms.py
```

The generation script refuses changed input hashes, creates only `lv113-*` audio
and its own manifest/inspection files, then completely decodes every generated
file. A fixed random seed makes synthesized noise repeatable. Two consecutive
builds here produced identical encoded SHA256 values. Different FFmpeg or
numerical-library versions may change encoded bytes; regenerate the hash report
after rebuilding with another toolchain.

Open `audition.html` directly in a browser to listen to each individual cue and
check the loop transitions, or serve the project with its existing local server.
Each player begins at a moderate volume and requires a user click. This listening
sheet is an authoring convenience, not a runtime game dependency.

## Verification and budget

- 8 encoded files: **262,780 bytes** total (256.6 KiB).
- 53.582 seconds total decoded duration; mono at 24 or 32 kHz.
- **5,424,896 bytes / 5.17 MiB** float32 PCM at the encoded sample rates.
- A browser AudioContext can resample all buffers to its output rate. At 48 kHz,
  the corresponding sample data is about **9.81 MiB**, plus browser/node overhead.
- All complete decodes are finite; no samples reach full scale. Peaks range from
  approximately −21.6 to −10.6 dBFS. The three loop-wrap differences are below
  their respective 99th-percentile adjacent-sample change.
- The decoded waveform sheet was inspected for overall envelopes, silence and
  visible clipping. Precise levels, onset, peak positions and seam metrics are in
  `audio-inspection.json`.

These checks are numerical and visual. No subjective headphone/speaker audition,
browser spatial mix, animation synchronization or hardware performance test is
claimed. Those remain part of the integrated gameplay review.
