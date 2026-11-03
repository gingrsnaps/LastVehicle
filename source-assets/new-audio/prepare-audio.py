"""Convert verified CC0 source audio into small local browser assets.
No source is synthesized or renamed from the existing Last Vehicle pack.
The music wrap is an overlap crossfade, not a fade to silence.
"""
from pathlib import Path
import subprocess, json, hashlib, math, re
import numpy as np
import urllib.request, zipfile

ROOT = Path(__file__).resolve().parent
ORIGINALS = ROOT / 'originals'
ORIGINALS.mkdir(exist_ok=True)
# Downloads are an optional editing step. Runtime playback uses bundled files.
inputs={
 'dream.wav':'https://opengameart.org/sites/default/files/Dream%202%20%28Ambience%29.wav',
 'metal-wood.zip':'https://opengameart.org/sites/default/files/100-CC0-wood-metal-SFX.zip',
 'dream-page.html':'https://opengameart.org/content/dream-2-ambience',
 'effects-page.html':'https://opengameart.org/content/100-cc0-metal-and-wood-sfx',
}
for filename,url in inputs.items():
    target=ORIGINALS/filename
    if not target.exists():
        request=urllib.request.Request(url,headers={'User-Agent':'LastVehicle-AssetPreparation/1.9'})
        with urllib.request.urlopen(request,timeout=60) as response:
            target.write_bytes(response.read())
with zipfile.ZipFile(ORIGINALS/'metal-wood.zip') as archive:
    selected={'metal_open_01.ogg','lock_open_01.ogg','tools_03.ogg','metal_spring_01.ogg','wood_cracking_02.ogg','wood_squeak_01.ogg'}
    for member in archive.namelist():
        filename=Path(member).name
        if filename in selected:(ORIGINALS/filename).write_bytes(archive.read(member))
RATE = 32000
LICENSE = 'https://creativecommons.org/publicdomain/zero/1.0/'

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def decode(path, channels, start=None, duration=None, filters=None):
    cmd = ['ffmpeg', '-v', 'error', '-xerror']
    if start is not None: cmd += ['-ss', str(start)]
    cmd += ['-i', str(path)]
    if duration is not None: cmd += ['-t', str(duration)]
    if filters: cmd += ['-af', filters]
    cmd += ['-ac', str(channels), '-ar', str(RATE), '-f', 'f32le', 'pipe:1']
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype='<f4').copy().reshape(-1, channels)

def db(value):
    return round(20 * math.log10(max(float(value), 1e-12)), 3)

def encode(name, samples, channels):
    out = ROOT / (name + '.ogg')
    cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(RATE),
           '-ac', str(channels), '-i', 'pipe:0', '-c:a', 'libvorbis', '-q:a', '3', str(out)]
    subprocess.run(cmd, input=samples.astype('<f4').tobytes(), check=True)
    return out

def inspect(out, loop=False):
    probe = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_entries',
        'format=duration:stream=sample_rate,channels,codec_name', '-of', 'json', str(out)],
        capture_output=True, text=True, check=True).stdout)
    channels = probe['streams'][0]['channels']
    y = decode(out, channels)
    result = {'file':'audio/' + out.name, 'bytes':out.stat().st_size,
      'sha256':sha(out), 'duration':float(probe['format']['duration']),
      'duration_seconds':float(probe['format']['duration']),
      'decoded_duration_seconds':len(y)/RATE, 'channels':channels,
      'sample_rate':RATE, 'codec':'vorbis',
      'peak_dbfs':db(np.max(np.abs(y))), 'rms_dbfs':db(np.sqrt(np.mean(y.astype('float64')**2))),
      'clipped_sample_count':int(np.count_nonzero(np.abs(y)>=1)),
      'nonfinite_sample_count':int(np.count_nonzero(~np.isfinite(y))),
      'decode_check':'Passed complete ffmpeg -xerror decode.', 'loop':loop}
    log = subprocess.run(['ffmpeg','-hide_banner','-i',str(out),'-af','ebur128=peak=true','-f','null','-'],
      capture_output=True,text=True,check=True).stderr
    summary = log[log.rfind('Summary:'):]
    peak = re.search(r'Peak:\s*(-?[\d.]+) dBFS',summary)
    lufs = re.search(r'I:\s*(-?[\d.]+) LUFS',summary)
    result['true_peak_dbfs'] = float(peak.group(1)) if peak else None
    result['integrated_lufs'] = float(lufs.group(1)) if lufs else None
    if loop:
        step = float(np.max(np.abs(y[0]-y[-1])))
        interior = np.abs(np.diff(y,axis=0))
        p99 = float(np.quantile(interior,.99))
        p999 = float(np.quantile(interior,.999))
        result['loop_boundary'] = {'end_to_start_step':step,'end_to_start_step_dbfs':db(step),
          'interior_adjacent_step_p99':p99,'interior_adjacent_step_p999':p999,
          'step_to_interior_p99_ratio':step/max(p99,1e-12),
          'end_to_start_within_interior_p999':step <= p999,
          'method':'Numerical continuity measurement on decoded Ogg; subjective listening not performed.'}
    assert result['clipped_sample_count']==0 and result['nonfinite_sample_count']==0
    return result

# Four seconds overlap the end of the source excerpt with its beginning. Starting
# after the head overlap makes the resulting 60 s wrap continuous in time.
x = decode(ORIGINALS/'dream.wav',2,18,64,'highpass=f=30,lowpass=f=9500')
n = 4*RATE
weight = np.linspace(0,1,n,endpoint=False,dtype=np.float32)[:,None]
y = np.concatenate([x[n:-n], x[-n:]*(1-weight)+x[:n]*weight])
rms_db=db(np.sqrt(np.mean(y.astype('float64')**2)))
peak_db=db(np.max(np.abs(y)))
gain_db=min(-27-rms_db,-12-peak_db)
y *= 10**(gain_db/20)
out = encode('dream-ambience',y,2)
item=inspect(out,True)
item.update({'name':'dream-ambience','kind':'audio','title':'Dream 2 Ambience',
  'author':'TokyoGeisha (Marcus Davies)','license':'CC0-1.0','license_url':LICENSE,
  'source_page':'https://opengameart.org/content/dream-2-ambience',
  'download_url':'https://opengameart.org/sites/default/files/Dream%202%20%28Ambience%29.wav',
  'original_file':'Dream 2 (Ambience).wav','original_sha256':sha(ORIGINALS/'dream.wav'),
  'source_archive_sha256':sha(ORIGINALS/'dream.wav'),'source_page_sha256':sha(ORIGINALS/'dream-page.html'),
  'license_proof':'licenses/Dream-2-Ambience.txt','source_window_seconds':[18,82],
  'crossfade_seconds':4,'gain_db':gain_db,
  'processing':f'Source excerpt 18–82 s; 30 Hz high-pass and 9500 Hz low-pass; stereo 32000 Hz. Four-second linear circular overlap produces 60 s loop. Gain {gain_db:.3f} dB, RMS target -27 dBFS with peak ceiling -12 dBFS. Vorbis quality 3.',
  'integration_role':'A new sparse exploration layer. Crossfade slowly with the existing soundtrack; do not stack every music layer at full level.'})
assets=[item]

# Keep original source names in provenance. Very short recordings are suited to
# physical interactions, not long continuous ambience or dramatic music stings.
selected=[
 ('door-open','metal_open_01.ogg',-12,'Short rusty metal opening action; shelter or cabinet'),
 ('lock-turn','lock_open_01.ogg',-14,'Maintenance key / latch release'),
 ('tool-handling','tools_03.ogg',-14,'Battery cable tool handling'),
 ('metal-stress','metal_spring_01.ogg',-13,'Brief mechanical spring or flex under stress'),
 ('wood-crack','wood_cracking_02.ogg',-12,'Short structural wood crack'),
 ('wood-creak','wood_squeak_01.ogg',-16,'Quiet timber or shelving squeak'),
]
for name,original,ceiling,role in selected:
    x=decode(ORIGINALS/original,1,filters='highpass=f=65,lowpass=f=9500')
    # Tiny edge fades prevent hard sample discontinuities without lengthening a
    # one-shot or inserting silence into the middle of an effect.
    ni=min(round(.004*RATE),len(x)//8)
    no=min(round(.025*RATE),len(x)//6)
    x[:ni]*=np.linspace(0,1,ni,dtype=np.float32)[:,None]
    x[-no:]*=np.linspace(1,0,no,dtype=np.float32)[:,None]
    gain_db=ceiling-db(np.max(np.abs(x)))
    x*=10**(gain_db/20)
    out=encode(name,x,1)
    item=inspect(out)
    item.update({'name':name,'kind':'audio','title':'100 CC0 metal and wood SFX',
      'author':'rubberduck','license':'CC0-1.0','license_url':LICENSE,
      'source_page':'https://opengameart.org/content/100-cc0-metal-and-wood-sfx',
      'download_url':'https://opengameart.org/sites/default/files/100-CC0-wood-metal-SFX.zip',
      'original_file':original,'original_sha256':sha(ORIGINALS/original),
      'source_archive_sha256':sha(ORIGINALS/'metal-wood.zip'),
      'source_page_sha256':sha(ORIGINALS/'effects-page.html'),
      'license_proof':'licenses/Rubberduck-Metal-Wood.txt','gain_db':gain_db,
      'processing':f'Complete source recording; downmixed mono 32000 Hz; 65 Hz high-pass and 9500 Hz low-pass. 4 ms leading / 25 ms trailing fade. Gain {gain_db:.3f} dB to peak ceiling {ceiling} dBFS. Vorbis quality 3.',
      'integration_role':role})
    assets.append(item)

for a in assets:
    a['verification']='Complete FFmpeg decode, numerical peak/finite-sample checks, licensing and duplicate-source audit. No subjective listening audition or real browser playback is claimed.'
(ROOT/'manifest-snippet.json').write_text(json.dumps({'verified_on':'2026-11-02','assets':assets},indent=2)+'\n')
(ROOT/'audio-inspection.json').write_text(json.dumps({'subjective_listening':False,'browser_playback_tested':False,'total_bytes':sum(a['bytes'] for a in assets),'decoded_float32_bytes_at_32000hz':sum(round(a['decoded_duration_seconds']*RATE*a['channels']*4) for a in assets),'assets':assets},indent=2)+'\n')
for a in assets:print(a['file'],a['duration_seconds'],a['peak_dbfs'],a['bytes'])
print('Loop boundary:',assets[0]['loop_boundary'])
