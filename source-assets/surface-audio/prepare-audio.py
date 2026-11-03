"""Prepare CC0 recorded puddle contacts and metal foley for Last Vehicle 1.10.

Optional authoring tool only: Python + NumPy + FFmpeg/ffprobe. The game loads
bundled .ogg files and makes no network requests to these asset providers.

Five disjoint intervals come from real shoes walking in water. They are NOT
pitch-shifted duplicates. The contact onset is trimmed with a short envelope
threshold and retains a 6 ms lead; full exact source bounds are in the manifest.
"""
from pathlib import Path
import hashlib, json, math, shutil, subprocess, urllib.request, zipfile
import numpy as np

ROOT = Path(__file__).resolve().parent
ORIGINALS = ROOT / 'originals'
OUT = ROOT / 'audio'
LICENSES = ROOT / 'licenses'
for p in (ORIGINALS, OUT, LICENSES): p.mkdir(exist_ok=True)
RATE = 32000
LICENSE = 'https://creativecommons.org/publicdomain/zero/1.0/'
WATER_PAGE = 'https://bigsoundbank.com/shoes-in-the-water-s0690.html'
WATER_URL = 'https://bigsoundbank.com/UPLOAD/bwf-en/0690.wav'
METAL_PAGE = 'https://opengameart.org/content/100-cc0-metal-and-wood-sfx'
METAL_URL = 'https://opengameart.org/sites/default/files/100-CC0-wood-metal-SFX.zip'


def download(filename, url):
    path = ORIGINALS / filename
    if not path.exists():
        request = urllib.request.Request(url, headers={'User-Agent':'LastVehicle-AssetPreparation/1.10'})
        with urllib.request.urlopen(request, timeout=60) as response:
            path.write_bytes(response.read())
    return path


def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def db(value): return round(20 * math.log10(max(float(value), 1e-12)), 3)


def decode(path, filters=None):
    cmd = ['ffmpeg','-v','error','-xerror','-i',str(path)]
    if filters: cmd += ['-af',filters]
    cmd += ['-ac','1','-ar',str(RATE),'-f','f32le','pipe:1']
    return np.frombuffer(subprocess.check_output(cmd), dtype='<f4').copy()


def make(name, x, ceiling, provenance):
    # Brief edge fades prevent a discontinuity; they do not remove the transient.
    x = x.copy()
    start = min(round(.003 * RATE), len(x)//12)
    end = min(round(.025 * RATE), len(x)//8)
    x[:start] *= np.linspace(0, 1, start)
    x[-end:] *= np.linspace(1, 0, end)
    gain = ceiling - db(np.max(np.abs(x)))
    x *= 10 ** (gain / 20)
    path = OUT / (name + '.ogg')
    subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(RATE),'-ac','1',
      '-i','pipe:0','-c:a','libvorbis','-q:a','4',str(path)],input=x.astype('<f4').tobytes(),check=True)
    y = decode(path)
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries',
      'format=duration:stream=channels,sample_rate,codec_name','-of','json',str(path)]))
    assert np.all(np.isfinite(y)) and np.max(np.abs(y)) < 1
    result={'file':'audio/'+path.name,'name':name,'kind':'audio','bytes':path.stat().st_size,
      'sha256':sha(path),'duration_seconds':float(probe['format']['duration']),
      'decoded_duration_seconds':len(y)/RATE,'channels':1,'sample_rate':RATE,'codec':'vorbis','loop':False,
      'peak_dbfs':db(np.max(np.abs(y))),'rms_dbfs':db(np.sqrt(np.mean(y.astype(np.float64)**2))),
      'clipped_sample_count':int(np.count_nonzero(np.abs(y)>=1)),
      'nonfinite_sample_count':int(np.count_nonzero(~np.isfinite(y))),
      'license':'CC0-1.0','license_url':LICENSE,'gain_db':round(gain,3),
      'processing':f'Mono 32000 Hz; 90 Hz high-pass, 9500 Hz low-pass; 3 ms onset / 25 ms end fades; gain {gain:.3f} dB to peak target {ceiling} dBFS; Vorbis quality 4.',
      'verification':'Complete FFmpeg decode, finite-sample and clipping checks, waveform inspection and documented source provenance. No subjective listening or browser playback claimed.'}
    result.update(provenance)
    return result


water = download('0690.wav', WATER_URL)
water_page = download('water-source.html', WATER_PAGE)
water_license = download('water-license.html', 'https://bigsoundbank.com/licenses.html')
# Pin bytes so a silently changed source cannot generate a different pack.
assert sha(water) == '69b9672d3d4a62d930c404383c41112310be461b4ec0ee58fc1550a79ac2239b', 'Water recording changed; review its license and waveform before rebuilding.'
water_samples = decode(water,'highpass=f=90,lowpass=f=9500')
assets=[]
# Manually selected isolated steps, each with its complete splash decay and no
# following contact. Exact onset crop below is deterministic at this sample rate.
for index, (start, end) in enumerate([(5.25,5.93),(7.03,7.78),(8.00,8.72),(13.77,14.45),(27.90,28.63)],1):
    segment=water_samples[round(start*RATE):round(end*RATE)]
    # Detect the onset using 2 ms RMS. Keep quiet detail; never align only to peak.
    n=64; blocks=segment[:len(segment)//n*n].reshape(-1,n)
    energy=np.sqrt(np.mean(blocks**2,axis=1))
    hits=np.flatnonzero(energy > max(.002, float(np.max(energy)) * .08))
    crop=max(0,int(hits[0])*n-round(.006*RATE)) if len(hits) else 0
    exact_start=start+crop/RATE
    assets.append(make(f'water-step-{index}',segment[crop:],-10,{
      'author':'Joseph Sardin / BigSoundBank','title':'Shoes in the Water (sound 0690)',
      'source_page':WATER_PAGE,'download_url':WATER_URL,'original_file':'0690.wav',
      'original_sha256':sha(water),'source_archive_sha256':sha(water),
      'source_page_sha256':sha(water_page),'license_proof':'licenses/Water-Shoes-Sardin.txt',
      'source_window_seconds':[round(exact_start,6),end],
      'integration_role':'Distinct recorded shoe splash; trigger at actual puddle foot contact. Shuffle without immediate repeats.',
      'contact_lead_seconds':.006}))

archive=download('metal-wood.zip',METAL_URL)
assert sha(archive)=='be6eba63b03409ac0c77787a956b1503a7c186403d04aef9725c52644a4b7878', 'Metal archive changed; verify before rebuilding.'
page=download('effects-page.html',METAL_PAGE)
for name, member, ceiling, role in [
 ('panel-scrape','metal_sheet_04.ogg',-14,'Brief metal sheet rub/flex for nearby creature contact; one-shot, not an ambience loop.'),
 ('handle-strain','metal_spring_02.ogg',-15,'Short spring strain synced to locker or hatch handle deflection.'),
 ('door-strike','metal_slam_01.ogg',-10,'Solid metal slam at the exact creature hand or shoulder contact frame.')]:
    source=ORIGINALS/member
    with zipfile.ZipFile(archive) as z: source.write_bytes(z.read(member))
    assets.append(make(name,decode(source,'highpass=f=90,lowpass=f=9500'),ceiling,{
      'author':'rubberduck','title':'100 CC0 metal and wood SFX','source_page':METAL_PAGE,
      'download_url':METAL_URL,'original_file':member,'original_sha256':sha(source),
      'source_archive_sha256':sha(archive),'source_page_sha256':sha(page),
      'license_proof':'licenses/Surface-Metal-Foley.txt','integration_role':role}))

(LICENSES/'Water-Shoes-Sardin.txt').write_text('''Shoes in the Water (sound 0690)
Author: Joseph Sardin / BigSoundBank (LaSonotheque)
Source: https://bigsoundbank.com/shoes-in-the-water-s0690.html
Download: https://bigsoundbank.com/UPLOAD/bwf-en/0690.wav
License: CC0 1.0 Universal, https://creativecommons.org/publicdomain/zero/1.0/
Author licensing page: https://bigsoundbank.com/licenses.html
Verified 2026-11-02: the individual recording page explicitly states CC0 and
permits copying, editing, redistributing, and commercial game use. Credit is
retained voluntarily. Five separate recorded steps were extracted; see
assets-manifest.json for exact source windows, hashes and processing.
''')
(LICENSES/'Surface-Metal-Foley.txt').write_text('''100 CC0 metal and wood SFX
Author: rubberduck
Source: https://opengameart.org/content/100-cc0-metal-and-wood-sfx
Download: https://opengameart.org/sites/default/files/100-CC0-wood-metal-SFX.zip
License: CC0 1.0 Universal, https://creativecommons.org/publicdomain/zero/1.0/
Source declaration verified 2026-11-02. Courtesy attribution retained.
Additional source members: metal_sheet_04.ogg, metal_spring_02.ogg,
metal_slam_01.ogg. Downmixed, filtered, faded and level adjusted for game use.
See assets-manifest.json for each source/output hash and processing.
''')
(ROOT/'manifest-snippet.json').write_text(json.dumps({'verified_on':'2026-11-02','assets':assets},indent=2)+'\n')
(ROOT/'audio-inspection.json').write_text(json.dumps({'subjective_listening':False,'browser_playback_tested':False,
  'waveform_inspection':True,'distinct_water_intervals':5,'total_bytes':sum(a['bytes'] for a in assets),
  'decoded_float32_bytes_at_32000hz':sum(round(a['decoded_duration_seconds']*RATE*4) for a in assets),
  'assets':assets},indent=2)+'\n')
for a in assets:print(a['file'],a['duration_seconds'],a['peak_dbfs'],a['bytes'])
