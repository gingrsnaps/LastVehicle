# Last Vehicle — third-party asset credits

License verification date: **2 November 2026**.

These particular assets are released under **CC0 1.0 Universal**, a public-domain dedication. They may be used and adapted in personal and commercial games. Attribution is not a CC0 condition; the following credits are retained to acknowledge the creators. This is a statement about the listed files, not every asset on the source websites.

## Models

**Kenney — Car Kit 3.1**

- Author page: https://kenney.nl/assets/car-kit
- Author's OpenGameArt upload: https://opengameart.org/content/car-kit
- Original archive: https://opengameart.org/sites/default/files/kenney_car-kit_3.1.zip
- Included: sedan, hatchback-sports, van, suv, cone, box, wheel-default, debris-door, and the shared colormap texture.
- Files were extracted without geometry or texture changes. Some filenames were shortened. The original archive license is copied to `licenses/Kenney-Car-Kit.txt`.

## Music and sound

| Game file | Original work | Creator | Source |
|---|---|---|---|
| `audio/music.ogg` | EmptyCity: Background Music | yd | https://opengameart.org/content/emptycity-background-music |
| `audio/ambience.ogg` | (defect) motor loop — fan_interval.wav | qubodup | https://opengameart.org/content/defect-motor-loop |
| `audio/metal.ogg` | Mechanical Sounds — clank1.wav | Brian MacIntosh / BMacZero | https://opengameart.org/content/mechanical-sounds |
| `audio/rattle.ogg` | Mechanical Sounds — rattle1.wav | Brian MacIntosh / BMacZero | https://opengameart.org/content/mechanical-sounds |
| `audio/alarm.ogg` | Alarm — alarm.wav | Frenchyboy | https://opengameart.org/content/alarm-2 |
| `audio/footstep.ogg` | Different steps — stone01.ogg | TinyWorlds | https://opengameart.org/node/5701 |
| `audio/scare.ogg` | Horror SFX — horror_effect1.wav | TinyWorlds | https://opengameart.org/content/horror-sfx |

The music and stone step are unmodified apart from their runtime filenames. TinyWorlds describes the step pack as edits of public-domain pdsounds recordings. Other sounds were filtered, trimmed, faded, or repeated for the game, then encoded to Ogg Vorbis. The exact source files, download links, edits, file hashes, and durations are recorded in `assets-manifest.json`.

License: https://creativecommons.org/publicdomain/zero/1.0/

Legal text: https://creativecommons.org/publicdomain/zero/1.0/legalcode.en

## Short in-game credit

> Vehicles and props: Kenney. Music: yd. Sound effects: qubodup, Brian MacIntosh / BMacZero, TinyWorlds, and Frenchyboy. Listed assets: CC0 1.0. See CREDITS.md for sources and edits.

This credit applies only to third-party assets. Keep the separate game author credit, **A GingrSnaps Project**, and the Babylon.js software license in the complete game package.


# Last Vehicle — additional asset credits

These additions use **CC0 1.0 Universal (public-domain dedication)**. Commercial use and redistribution are permitted under CC0; attribution is not a condition. The acknowledgments below are retained as courtesy and provenance. This statement concerns these specific older source files, not every asset on an author's current website.

| Game file | Original work | Creator | Source | Processing |
|---|---|---|---|---|
| `models/contractor.glb` | Animated Human Low Poly (2017) | Quaternius | [Author's OpenGameArt upload](https://opengameart.org/content/animated-human-low-poly) | Original mesh, clothed palette and Idle/Walk/Run/Working actions converted from Blender to GLB; material converted to PBR; standing idle normalized to 1.85 m. |
| `audio/click.ogg` | Interface Sounds, `click_003.ogg` | Kenney | [Author's upload](https://opengameart.org/content/interface-sounds) · [Official pack page](https://kenney.nl/assets/interface-sounds) | Renamed; original OGG. |
| `audio/switch.ogg` | Interface Sounds, `switch_002.ogg` | Kenney | Same Interface Sounds pack | Renamed; original OGG. |
| `audio/ui-open.ogg` | Interface Sounds, `open_001.ogg` | Kenney | Same Interface Sounds pack | Renamed; original OGG. This is an interface cue, not a recorded door sound. |
| `audio/drip.ogg` | Dripping water loop | Independent.nu, uploaded by qubodup | [Source page](https://opengameart.org/content/dripping-water-loop) | Original FLAC downmixed to mono and converted to OGG Vorbis for positional playback. |

CC0 text: <https://creativecommons.org/publicdomain/zero/1.0/>.

The `licenses` directory contains the two original archive license files, the water-loop source declaration, and provenance notes. `additions-manifest.json` records exact source URLs, output hashes, original download hashes, durations and processing. License declarations were checked on November 2, 2026.

## Original additions in version 1.6

The repairable bay-042 car, hood, cockpit, battery, cable kit, shelter geometry and engine synthesis are original procedural work created for this project. They are defined in `js/staging.js` and `js/audio.js`; no extra downloaded model or sound is required. Existing public models remain in the other parking bays and on the contractor. This paragraph does not change the licenses of any third-party files or place the original project code under CC0.

# CC0 additions — Last Vehicle

- Props: **Kenney**, Factory Kit 3.0 and Furniture Kit — https://kenney.nl/assets/factory-kit · https://kenney.nl/assets/furniture-kit
- Hatch feedback impact: **Kenney**, Impact Sounds, `impactMetal_heavy_000.ogg` — https://kenney.nl/assets/impact-sounds
- Service ambience: **congusbongus**, *Abandoned passages (horror ambience loop)*, `freezer.ogg` — https://opengameart.org/content/abandoned-passages-horror-ambience-loop
- Suspense layer: **Juhani Junkala / SubspaceAudio**, *Horror Atmosphere*. Edited to a 40-second circular-crossfaded loop — https://opengameart.org/content/horror-atmosphere
- Car door closing: **looneybits**, *Car_door_SFX*, `door_closing.wav`. Re-encoded with -3 dB headroom — https://opengameart.org/content/cardoorsfx

All assets are released under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Credit is retained voluntarily. The source archive notices are in `licenses/`; exact filenames, hashes, edits, source URLs and model measurements are in `assets-manifest.json`.


# Last Vehicle v1.8 audio credits

All six additions use CC0 1.0 Universal sources. Edits and courtesy credits are documented in assets-manifest.json.

| Runtime file | Source | Author |
|---|---|---|
| `aftermath.ogg` | [Lost in a bad place (horror ambience loop)](https://opengameart.org/content/lost-in-a-bad-place-horror-ambience-loop) | congusbongus |
| `creature-attack.ogg` | [Monster Sound Pack, Volume 1](https://opengameart.org/content/monster-sound-pack-volume-1) | Ogrebane |
| `creature-breath.ogg` | [Ghost breath](https://opengameart.org/content/ghost-breath) | qubodup |
| `creature-recover.ogg` | [Monster Sound Pack, Volume 1](https://opengameart.org/content/monster-sound-pack-volume-1) | Ogrebane |
| `surge.ogg` | [Electricity Sound Effects](https://opengameart.org/content/electricity-sound-effects-0) | Brian MacIntosh / BMacZero |
| `unease.ogg` | [A lurking evil (horror ambience)](https://opengameart.org/content/a-lurking-evil-horror-ambience) | congusbongus |

[CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) — full legal code is retained in `licenses/CC0-1.0.txt`.

The Ogrebane source page is titled Volume 1, while its published archive is named `monster-sounds-volume-2.zip`; the exact linked archive was used. The breath is qubodup’s separate recorded-breath source, not a reused or renamed attack clip.


## The Attendant — v1.8

Original procedural creature, skeleton, textures and eight authored animation clips created for this project. Dedicated under CC0; see `licenses/Original-Attendant.txt`. Editable Blender source and generator are in the complete package. This replaces the older contractor in gameplay; its earlier model remains available as an optional historical asset.


## Version 1.9 — new public assets

All additions below declare CC0 1.0. Exact files, hashes, original downloads, authors and conversion settings are in `assets-manifest.json`. Source links are credits, not runtime dependencies.

- Concrete Moss — Rob Tuytel, Poly Haven: https://polyhaven.com/a/concrete_moss
- Rusty Metal Sheet — Amal Kumar, Poly Haven: https://polyhaven.com/a/rusty_metal_sheet
- Peeling Painted Wall — Dimitrios Savva, Poly Haven: https://polyhaven.com/a/peeling_painted_wall
- Texture license: https://polyhaven.com/license ; https://creativecommons.org/publicdomain/zero/1.0/
- Dream 2 Ambience — TokyoGeisha: https://opengameart.org/content/dream-2-ambience . A 60-second circular-crossfaded edit supplies the exploration music. The older EmptyCity file remains available as an optional replacement and is not decoded by the default mixer.
- 100 CC0 metal and wood SFX — rubberduck: https://opengameart.org/content/100-cc0-metal-and-wood-sfx . Selected recordings supply doors, locks, tools, mechanical strain, cracking and shelf creaks.
- 100 CC0 SFX #2 — rubberduck: https://opengameart.org/content/100-cc0-sfx-2 . The selected `footstep_wet_01` recording is used at the wet pump-room floor.
- Metal footsteps on concrete — Thimras: https://opengameart.org/content/metal-footsteps-on-concrete . A metallic foot on concrete supplies the creature's animation-synchronized step; it is not labelled as a shoe on metal flooring.

New damaged cabinets, broken vent covers, debris, surface placements and interaction presentation are original code-authored geometry for this project. Their code retains the project's source terms.

1.10 additions: five distinct shoe splashes from Joseph Sardin / BigSoundBank, Shoes in the Water (0690), CC0. Three new metal contact excerpts from rubberduck, 100 CC0 metal and wood SFX. See assets/licenses and assets-manifest.json for original URLs, trims and hashes. Seven original Attendant animation clips are CC0 with editable Blender source.

## Last Vehicle 1.11 additions

- **Confined Spaces** — Tsorthan Grove, CC0: https://opengameart.org/content/confined-spaces . Short circular-crossfaded mono excerpt for exploration/suspicion.
- **Nobody's Home** — aspiringcodemonkey, CC0: https://opengameart.org/content/nobodys-home . Short circular-crossfaded mono excerpt for aftermath/ending.
- **Footsteps, Shoe on Concrete (0514)**, **Footsteps on gravels #1 (0510)** and **Creaking metallic door (0616)** — Joseph Sardin / BigSoundBank, CC0. Source pages and exact edits are in the manifest and Contact-Foley-Sardin.txt.
- **metal_hit_03.ogg / metal_hit_04.ogg**, from **100 CC0 metal and wood SFX** — rubberduck, CC0: https://opengameart.org/content/100-cc0-metal-and-wood-sfx . New source members layered with Sardin's shoe recordings for two expressly documented grate-contact Foley composites.

These are licensed third-party recordings and edited derivatives. No new audio is represented as an original composition by GingrSnaps. All runtime audio is bundled locally.

## Meridian Industrial Details — version 1.11

24 original low-poly models, authored for Last Vehicle; CC0-1.0. Editable Blender source and exact per-model provenance are included in source-assets/industrial-details. Runtime additions total 576,208 bytes and 10,027 triangles before instancing.


## Version 1.13 additions

Twelve original low-poly Meridian worn-detail models (4,115 triangles; 264,280 bytes): damaged intercom, cigarette tray, key-hook board, cable offcuts, terminal brush, split pipe insulation, pump seal kit, parking permit, sagging visor, emergency diagram, torn weather strip, and discarded glove. CC0-1.0; see `licenses/Original-Garage-Details-v113.txt`. The full project includes editable Blender source, generator, mounting anchors and actual-render contact sheets.

Eight new `lv113-*` Ogg layers (262,780 bytes): two original arrangements of a three-note theme, cloth/weight movement, cart wheels and impact, pressure burst, fan coast-down/relay and exterior rain/wind. They combine original synthesis with derivatives of existing CC0 recordings. All authors, immediate source hashes and complete license chains are preserved in `licenses/Audio-v113-provenance.json` and `licenses/Audio-v113-source-lock.json`; see `licenses/Audio-v113.txt`. These dedications do not change the game code/story/branding terms. Runtime files are bundled locally.


## Version 1.14 additions

The modeled maintenance key, its ring and tag, and four wall-paint SVGs are original CC0 assets. Runtime notices are in `licenses/Key-Art-v114.txt`. The complete source package includes the editable Blender model, procedural generators, actual exported-geometry validation and Blender contact sheet under `source-assets/key-art-v114/`.

Six `lv114-*.ogg` additions provide distant city ambience, entrance rain, thunder, bolt contact, electrical cutoff and quiet player exertion. They combine original DSP with edits of already supplied CC0 recordings; no microphone recording or runtime download is required. Keep `licenses/Audio-v114.txt`, `Audio-v114-provenance.json`, and `Audio-v114-source-lock.json` with distributions. Those records retain the exact source authors, URLs and input hashes. These additions do not replace the existing music, creature voices or licensed effects.
