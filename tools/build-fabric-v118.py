"""Rebuild the bundled fabric pair from supplied originals (no network needed).

Requires Pillow only for editing assets; the game needs no Python packages.
Original MD5s match Poly Haven's supplied files metadata. Runtime files are
deliberately small: two 512px RGB JPEGs, shared across all eligible materials.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'source-assets/surfaces-v118'
records = json.loads((SOURCE / 'manifest-fragment.json').read_text())
for row in records:
    original = SOURCE / 'originals' / row['download_url'].rsplit('/', 1)[-1]
    assert hashlib.md5(original.read_bytes()).hexdigest() == row['source_md5']
    target = ROOT / 'dist/assets' / row['file']
    Image.open(original).convert('RGB').resize((512, 512), Image.Resampling.LANCZOS).save(target, quality=88, optimize=True)
    row['bytes'] = target.stat().st_size
    row['sha256'] = hashlib.sha256(target.read_bytes()).hexdigest()
(SOURCE / 'manifest-fragment.json').write_text(json.dumps(records, indent=2) + '\n')
manifest_path = ROOT / 'dist/assets/assets-manifest.json'
manifest = json.loads(manifest_path.read_text())
replaced = {row['file'] for row in records}
manifest['assets'] = [row for row in manifest['assets'] if row['file'] not in replaced] + records
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
print('Rebuilt fabric maps and updated their manifest hashes.')
