"""Download verified CC0 material maps and make small local game textures.

This is a reproducible delivery conversion, not an AI-generated texture pass.
The source texture colors are preserved; level lighting/material tint handles mood.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib,json,urllib.request
from PIL import Image

ROOT=Path(__file__).resolve().parent
SOURCES=ROOT/'originals'
SOURCES.mkdir(exist_ok=True)
ASSETS=[('concrete_moss','moss'),('rusty_metal_sheet','rust'),('peeling_painted_wall','peeling')]
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def convert(task):
    asset,short,channel,suffix=task
    data=json.loads((ROOT/f'{asset}-files.json').read_text())
    info=json.loads((ROOT/f'{asset}-info.json').read_text())
    entry=data[channel]['1k']['jpg']
    original=SOURCES/entry['url'].rsplit('/',1)[1]
    previous=ROOT/original.name
    if previous.exists() and not original.exists():previous.rename(original)
    if not original.exists():
        req=urllib.request.Request(entry['url'],headers={'User-Agent':'LastVehicle-AssetPreparation/1.9'})
        original.write_bytes(urllib.request.urlopen(req,timeout=30).read())
    assert hashlib.md5(original.read_bytes()).hexdigest()==entry['md5'],f'Source MD5 mismatch: {asset} {channel}'
    image=Image.open(original).convert('RGB')
    original_dimensions=list(image.size)
    # Filtered reduction and mipmapping preserve low-poly art without pixel dithering.
    image=image.resize((512,512),Image.Resampling.LANCZOS)
    target=ROOT/f'{short}-{suffix}.jpg'
    image.save(target,quality=84,optimize=True,progressive=False,subsampling=0)
    with Image.open(target) as verify:
        verify.load()
        assert verify.size==(512,512) and verify.mode=='RGB'
    return dict(file='textures/'+target.name,bytes=target.stat().st_size,sha256=sha(target),author=', '.join(info['authors']),title=info['name']+' — '+channel,license='CC0-1.0',license_url='https://creativecommons.org/publicdomain/zero/1.0/',source_license_page='https://polyhaven.com/license',source_page='https://polyhaven.com/a/'+asset,download_url=entry['url'],original_file=original.name,source_sha256=sha(original),source_md5=entry['md5'],source_dimensions=original_dimensions,dimensions=[512,512],processing='Official 1K JPG map resized to 512×512 with Lanczos filtering; RGB JPEG quality 84, no chroma subsampling. Source colors retained. No generated content.',role=suffix,verified_on='2026-11-02')
tasks=[(asset,short,channel,suffix) for asset,short in ASSETS for channel,suffix in [('Diffuse','albedo'),('Rough','roughness')]]
with ThreadPoolExecutor(max_workers=3) as pool:manifest=list(pool.map(convert,tasks))
(ROOT/'manifest-snippet.json').write_text(json.dumps({'assets':manifest},indent=2)+'\n')
print(json.dumps({'files':[{'file':x['file'],'bytes':x['bytes'],'sha256':x['sha256']} for x in manifest],'total_bytes':sum(x['bytes'] for x in manifest)},indent=2))
