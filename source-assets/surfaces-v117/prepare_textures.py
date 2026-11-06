"""Prepare the six public CC0 materials used by Last Vehicle 1.17.

Run with Python 3.10+ and Pillow: python prepare_textures.py
The official 1K source files are cached in originals/. Each is checked against
the MD5 in Poly Haven's supplied files metadata before any output is written.
Only size/encoding changes are applied: no painted detail or AI generation.
The runtime loads the resulting local JPEGs, never the upstream URLs.
"""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import urllib.request

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent.parent
OUTPUT = PROJECT / "dist/assets/textures"
ORIGINALS = HERE / "originals"
ASSETS = [
    ("asphalt_01", "asphalt"),
    ("rough_concrete", "concrete"),
    ("brick_wall_001", "brick"),
    ("weathered_brown_planks", "wood"),
    ("painted_metal_shutter", "metal"),
    ("forest_leaves_02", "leaf-litter"),
]
CHANNELS = [("Diffuse", "albedo"), ("Rough", "roughness")]


def digest(data, algorithm="sha256"):
    return hashlib.new(algorithm, data).hexdigest()


def prepare(task):
    asset, short, channel, suffix = task
    metadata = json.loads((HERE / f"{asset}-files.json").read_text())
    info = json.loads((HERE / f"{asset}-info.json").read_text())
    upstream = metadata[channel]["1k"]["jpg"]
    source = ORIGINALS / upstream["url"].rsplit("/", 1)[-1]
    if not source.exists():
        request = urllib.request.Request(
            upstream["url"], headers={"User-Agent": "LastVehicle-AssetPreparation/1.17"}
        )
        with urllib.request.urlopen(request, timeout=45) as response:
            source.write_bytes(response.read())
    data = source.read_bytes()
    assert digest(data, "md5") == upstream["md5"], f"Source changed: {asset} {channel}"
    with Image.open(source) as image:
        source_dimensions = list(image.size)
        image = image.convert("RGB").resize((512, 512), Image.Resampling.LANCZOS)
        target = OUTPUT / f"v117-{short}-{suffix}.jpg"
        # Resampling is a delivery conversion. Colors and roughness values are
        # left neutral; the game material/lighting controls their final tone.
        image.save(target, quality=84, optimize=True, progressive=False, subsampling=0)
    with Image.open(target) as verify:
        verify.load()
        assert verify.size == (512, 512) and verify.mode == "RGB"
    return {
        "file": "textures/" + target.name,
        "bytes": target.stat().st_size,
        "sha256": digest(target.read_bytes()),
        "title": info["name"] + " — " + channel,
        "author": ", ".join(info["authors"]),
        "license": "CC0-1.0",
        "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
        "license_proof": "licenses/Surfaces-v117.txt",
        "source_license_page": "https://polyhaven.com/license",
        "source_page": "https://polyhaven.com/a/" + asset,
        "source_metadata_url": "https://api.polyhaven.com/info/" + asset,
        "source_files_url": "https://api.polyhaven.com/files/" + asset,
        "download_url": upstream["url"],
        "source_file": "originals/" + source.name,
        "source_sha256": digest(data),
        "source_md5": upstream["md5"],
        "source_bytes": len(data),
        "source_dimensions": source_dimensions,
        "dimensions": [512, 512],
        "tile_metres": [round(x / 1000, 4) for x in info["dimensions"]],
        "role": suffix,
        "processing": "Official 1K map resized to 512×512 with Lanczos, RGB JPEG quality 84 with no chroma subsampling. No color edits or generated imagery.",
        "verified_on": "2026-11-05",
    }


def contact_sheet():
    # This is a technical QA montage of the actual source-derived assets. Each
    # cell repeats a 256px thumbnail four times to expose a conspicuous seam.
    canvas = Image.new("RGB", (1584, 1176), (23, 29, 29))
    draw = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype("DejaVuSans.ttf", 20)
    except OSError:
        font = ImageFont.load_default()
    for i, (_, short) in enumerate(ASSETS):
        x, y = 8 + (i % 3) * 528, 8 + (i // 3) * 588
        tile = Image.open(OUTPUT / f"v117-{short}-albedo.jpg").resize((256, 256), Image.Resampling.LANCZOS)
        for dx, dy in [(0, 0), (256, 0), (0, 256), (256, 256)]:
            canvas.paste(tile, (x + dx, y + dy))
        draw.text((x, y + 519), short.upper() + " · 2 × 2 repeat", fill=(223, 226, 212), font=font)
    canvas.save(HERE / "Surface_Contact_Sheet.jpg", quality=90, subsampling=0)


def main():
    ORIGINALS.mkdir(exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    jobs = [(asset, short, channel, suffix) for asset, short in ASSETS for channel, suffix in CHANNELS]
    with ThreadPoolExecutor(max_workers=3) as pool:
        manifest = list(pool.map(prepare, jobs))
    (HERE / "manifest-fragment.json").write_text(json.dumps({"assets": manifest}, indent=2) + "\n")
    summary = {
        "maps": len(manifest),
        "materials": len(ASSETS),
        "size": [512, 512],
        "runtime_encoded_bytes": sum(item["bytes"] for item in manifest),
        "rgba8_base_bytes": len(manifest) * 512 * 512 * 4,
        "rgba8_with_mips_estimate_bytes": len(manifest) * 512 * 512 * 4 * 4 // 3,
        "upstream_md5": "all matched official files metadata",
        "runtime_hashes": "recorded in manifest-fragment.json",
        "normal_maps": 0,
        "displacement_maps": 0,
        "runtime_external_requests": 0,
        "color_processing": "none beyond RGB encoding and filtered resize",
        "contact_sheet": "Surface_Contact_Sheet.jpg",
        "in_game_render_verified": False,
    }
    (HERE / "qa-summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    contact_sheet()
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
