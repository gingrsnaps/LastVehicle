# Last Vehicle 1.11 — music and contact sound assets

This folder supplies **12 new runtime Ogg files**: two new music excerpts and ten
short effects. These use licensed recordings rather than microphone recordings
or generated replacement tones. All contributing recordings carry CC0 notices.

## Runtime mapping

| Name (without .ogg) | Intended use | Notes |
|---|---|---|
| confined-ambience | Low exploration/suspicion bed, particularly service passages | Confined Spaces A; 38.4-second circular-crossfaded excerpt; begin around 0.12–0.20 mixer gain and audition. |
| nobody-aftermath | Quiet aftermath / ending music alternative | Nobody's Home; 40-second circular-crossfaded excerpt; begin around 0.10–0.18 mixer gain and audition. |
| concrete-step-1/2/3 | Shoe contacts on dry concrete | Three distinct recorded contacts; shuffled bag recommended. |
| debris-step-1/2/3 | Loose grit/debris contact | Three actual gravel contacts, repurposed as loose floor debris. |
| grate-step-1/2 | Metal grate contact | Explicit Foley composites of new concrete shoes plus previously unused rubberduck metal hits. |
| hinge-creak-1/2 | Hinged door/locker movement | Two different recorded metallic door sections; trigger near hinge movement, not latch impact. |

A name denotes purpose, not proof that it sounds balanced in the current mix.
All contact transients were trimmed near the start for better foot-sync. Source
windows, source archive members, original hashes, gain/filter/crossfade treatment,
output hashes and complete decoding metrics are provided in the JSON records.
The shoe+metal composites are not claimed as documentary grate recordings.

## Integration

Copy `runtime/*.ogg` to `dist/assets/audio/` and the four `licenses/*.txt` files to
`dist/assets/licenses/`. Append `manifest-snippet.json` to the runtime manifest's
assets array. Keep this README, `prepare_audio.py`, the manifest fragment and
`audio-inspection.json` in source-assets, and optionally the waveform sheet in docs.
The large original downloads need not be copied into the playable ZIP: the script
contains exact download URLs and verifies original SHA256 before rebuilding.

Decode the short sounds during loading; keep a bounded voice count. Do not reload
or re-decode on contact. Crossfade music states and duck them before major contact
cues. Do not layer the two full compositions at high volume as though they were
musically synchronized stems. Changes in master/music volume should never change
AI hearing. Runtime playback requires no NumPy, FFmpeg, archive package or internet.

## Rebuild

Authoring dependencies: Python 3, NumPy and FFmpeg. Downloaded 7z extraction needs
system libarchive; alternatively extract `Confined Spaces A (Loop).ogg` from the
archive using 7-Zip into `sources/`. Then run:

```sh
python prepare_audio.py --download
```

Without `--download`, the script uses already supplied original source files.
The original source hash guard rejects changed upstream content. Ogg encoding
uses FFmpeg bitexact flags; a different FFmpeg/libvorbis version can still change
encoded bytes, so rerun asset hashes/decoding checks after an authoring rebuild.

## Verification limits

Every complete encoded output was decoded using FFmpeg and checked for finite
samples, peak, RMS, clipping, duration and decoded float32 storage. Both music
wrap differences are below their respective 99th-percentile adjacent-sample
change. The actual decoded waveform sheet was visually inspected for isolated
contacts, gross silence and clipping. This is a numerical/waveform review; no
subjective headphone/speaker listening, browser mixing, user-device playback or
hardware performance claim is made. A listening pass remains necessary.

Total compressed additions: 489,202 bytes.
Total decoded mono float32 sample data: 8,464,384 bytes (8.07 MiB).
