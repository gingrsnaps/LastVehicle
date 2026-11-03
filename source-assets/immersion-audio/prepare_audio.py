"""Build Last Vehicle 1.11 audio from real CC0 recordings.

Authoring only: Python 3, NumPy and FFmpeg. Playback needs none of these.
Run `python prepare_audio.py --download` to fetch source recordings first.
7z extraction uses system libarchive; alternatively extract the named Ogg
member into sources/ with 7-Zip. No microphone recording or generated tones.
"""
from pathlib import Path
import argparse, ctypes, ctypes.util, hashlib, json, subprocess, urllib.request, zipfile
import numpy as np

ROOT=Path(__file__).resolve().parent
SRC=ROOT/'sources'; OUT=ROOT/'runtime'
SR=32000
SOURCES={
 'confined':dict(file='confined_spaces_ogg_0.7z', url='https://opengameart.org/sites/default/files/confined_spaces_ogg_0.7z',
   page='https://opengameart.org/content/confined-spaces', title='Confined Spaces', author='Tsorthan Grove', member='Confined Spaces A (Loop).ogg', notice='Music-Confined-Spaces.txt'),
 'nobody':dict(file='nobodys_home.wav',url='https://opengameart.org/sites/default/files/nobodys_home.wav',
   page='https://opengameart.org/content/nobodys-home',title="Nobody's Home",author='aspiringcodemonkey',notice='Music-Nobodys-Home.txt'),
 'concrete':dict(file='0514.wav',url='https://bigsoundbank.com/UPLOAD/bwf-en/0514.wav',
   page='https://bigsoundbank.com/footsteps-shoe-on-concrete-s0514.html',title='Footsteps, Shoe on Concrete (0514)',author='Joseph Sardin / BigSoundBank',notice='Contact-Foley-Sardin.txt'),
 'gravel':dict(file='0510.wav',url='https://bigsoundbank.com/UPLOAD/bwf-en/0510.wav',
   page='https://bigsoundbank.com/steps-on-gravels-s0510.html',title='Footsteps on gravels #1 (0510)',author='Joseph Sardin / BigSoundBank',notice='Contact-Foley-Sardin.txt'),
 'door':dict(file='0616.wav',url='https://bigsoundbank.com/UPLOAD/bwf-en/0616.wav',
   page='https://bigsoundbank.com/grincement-porte-metalique-s0616.html',title='Creaking metallic door (0616)',author='Joseph Sardin / BigSoundBank',notice='Contact-Foley-Sardin.txt'),
 'metal':dict(file='100-CC0-wood-metal-SFX.zip',url='https://opengameart.org/sites/default/files/100-CC0-wood-metal-SFX.zip',
   page='https://opengameart.org/content/100-cc0-metal-and-wood-sfx',title='100 CC0 metal and wood SFX',author='rubberduck',notice='Grate-Contact-Composite.txt'),
}

EXPECTED_SOURCE_SHA256 = {'confined_spaces_ogg_0.7z': 'd39018a25a656ef719936bcd30a02e19eab33394fd3d5b2449805e4c7571a6a8', 'nobodys_home.wav': 'b1df5ce6e1e9a177354f1d84e7d494192a157b052ece873cba84edede9308a2f', '0514.wav': 'e424c7d07c7197f0d9aa5e3570de72d2572c1930984a92254013fa5e8fa76397', '0510.wav': '346f52d1529a960a849d480aba5de9fb0819936aeb85238c58cdb90a504bdbb8', '0616.wav': '7095712d8a36ad71890eeac768ddc6dabcfd8894bef70dba20d430e8745c2bdd', '100-CC0-wood-metal-SFX.zip': 'be6eba63b03409ac0c77787a956b1503a7c186403d04aef9725c52644a4b7878'}

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()

def extract_7z_member(path,member,target):
    # Read only the explicitly named member; archive paths never become output paths.
    lib=ctypes.util.find_library('archive')
    if not lib:raise RuntimeError('Extract '+member+' from '+str(path)+' into sources/ using 7-Zip, then rerun.')
    a=ctypes.CDLL(lib); a.archive_read_new.restype=ctypes.c_void_p
    for f in ['archive_read_support_filter_all','archive_read_support_format_all','archive_read_free']:getattr(a,f).argtypes=[ctypes.c_void_p]
    a.archive_read_open_filename.argtypes=[ctypes.c_void_p,ctypes.c_char_p,ctypes.c_size_t]
    a.archive_read_next_header.argtypes=[ctypes.c_void_p,ctypes.POINTER(ctypes.c_void_p)]
    a.archive_entry_pathname.argtypes=[ctypes.c_void_p];a.archive_entry_pathname.restype=ctypes.c_char_p
    a.archive_read_data.argtypes=[ctypes.c_void_p,ctypes.c_void_p,ctypes.c_size_t];a.archive_read_data.restype=ctypes.c_ssize_t
    arc=a.archive_read_new();a.archive_read_support_filter_all(arc);a.archive_read_support_format_all(arc)
    entry=ctypes.c_void_p();buf=ctypes.create_string_buffer(65536);found=False
    try:
        if a.archive_read_open_filename(arc,str(path).encode(),10240)!=0:raise RuntimeError('Cannot read 7z archive')
        while a.archive_read_next_header(arc,ctypes.byref(entry))==0:
            if a.archive_entry_pathname(entry).decode()!=member:continue
            with target.open('wb') as output:
                while True:
                    n=a.archive_read_data(arc,buf,65536)
                    if n<0:raise RuntimeError('Archive decompression failed')
                    if not n:break
                    output.write(buf.raw[:n])
            found=True;break
    finally:a.archive_read_free(arc)
    if not found:raise RuntimeError('Missing archive member '+member)

def prepare_sources(download):
    SRC.mkdir(exist_ok=True);OUT.mkdir(exist_ok=True)
    for record in SOURCES.values():
        path=SRC/record['file']
        if not path.exists():
            if not download:raise RuntimeError('Missing '+str(path)+'; use --download')
            with urllib.request.urlopen(record['url'],timeout=60) as response:path.write_bytes(response.read())
        if sha(path)!=EXPECTED_SOURCE_SHA256[record['file']]:raise RuntimeError('Source hash changed: '+record['file'])
    confined=SRC/SOURCES['confined']['member']
    if not confined.exists():extract_7z_member(SRC/SOURCES['confined']['file'],confined.name,confined)
    with zipfile.ZipFile(SRC/SOURCES['metal']['file']) as archive:
        for member in ['metal_hit_03.ogg','metal_hit_04.ogg']:(SRC/member).write_bytes(archive.read(member))

def decode(path,rate=SR,filters=None):
    args=['ffmpeg','-v','error','-i',str(path),'-ac','1','-ar',str(rate)]
    if filters:args+=['-af',filters]
    return np.frombuffer(subprocess.check_output(args+['-f','f32le','-']),dtype='<f4').copy()

def crop(path,start,duration,rate=SR,music=False):
    # Filtering precedes the cut, so filter initialization cannot blunt the hit.
    samples=decode(path,rate,'highpass=f=35,lowpass=f=10000' if music else 'highpass=f=70,lowpass=f=11000')
    return samples[round(start*rate):round((start+duration)*rate)].copy()

def normalize(samples,peak=.251189,rms=None):
    samples=samples-np.mean(samples)
    scale=peak/max(float(np.max(np.abs(samples))),1e-9)
    if rms:scale=min(scale,rms/max(float(np.sqrt(np.mean(samples**2))),1e-9))
    return samples*scale

def fades(samples,rate=SR,fadein=.003,fadeout=.045):
    a=min(round(fadein*rate),len(samples)//2);b=min(round(fadeout*rate),len(samples)//2)
    samples[:a]*=np.linspace(0,1,a);samples[-b:]*=np.linspace(1,0,b)
    return samples

def save(name,samples,rate=SR):
    path=OUT/name
    subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(rate),'-ac','1','-i','-','-c:a','libvorbis','-q:a','4','-fflags','+bitexact','-flags:a','+bitexact','-map_metadata','-1',str(path)],input=np.asarray(samples,dtype='<f4').tobytes(),check=True)
    return path

def origin(key,member=None):
    r=SOURCES[key];p=SRC/r['file']; m=member or r.get('member')
    return dict(title=r['title'],author=r['author'],source_url=r['page'],download_url=r['url'],
      original_file=m or r['file'],original_archive=r['file'] if m else None,
      source_sha256=sha(SRC/m) if m else sha(p),download_sha256=sha(p),license='CC0-1.0',
      license_url='https://creativecommons.org/publicdomain/zero/1.0/',license_proof='licenses/'+r['notice'])

def inspect(path,rate,loop=False):
    decoded=decode(path,rate); peak=float(np.max(np.abs(decoded)))
    return dict(file=path.name,duration_seconds=len(decoded)/rate,sample_rate=rate,channels=1,
       decoded_float32_bytes=len(decoded)*4,finite=bool(np.isfinite(decoded).all()),peak=peak,
       peak_time_seconds=int(np.argmax(np.abs(decoded)))/rate,peak_dbfs=float(20*np.log10(max(peak,1e-12))),rms_dbfs=float(20*np.log10(max(float(np.sqrt(np.mean(decoded**2))),1e-12))),
       clipped_samples=int(np.sum(np.abs(decoded)>=1)),loop=loop,
       loop_boundary_jump=float(abs(decoded[0]-decoded[-1])) if loop else None,
       adjacent_sample_p99_delta=float(np.quantile(np.abs(np.diff(decoded)),.99)),
       bytes=path.stat().st_size,sha256=sha(path))

def build():
    manifest=[];inspection=[]
    def record(name,data,rate,meta,processing,window,loop=False,additional=None):
        path=save(name,data,rate);report=inspect(path,rate,loop)
        manifest.append(dict(file='audio/'+name,**meta,bytes=report['bytes'],sha256=report['sha256'],
          format='Ogg Vorbis; mono',sample_rate=rate,duration_seconds=report['duration_seconds'],
          source_window_seconds=window,processing=processing,additional_sources=additional or []))
        inspection.append(report)
    # Long ambience excerpts use a circular overlap. The tail is crossfaded to
    # the head; rotating the buffer makes its wrap follow the source waveform.
    for key,name,start,length,overlap in [('confined','confined-ambience.ogg',19.2,40.8,2.4),('nobody','nobody-aftermath.ogg',12.,43.,3.)]:
        rate=24000;r=SOURCES[key];source=SRC/r.get('member',r['file'])
        samples=crop(source,start,length,rate,True);n=round(overlap*rate)
        t=np.linspace(0,1,n,endpoint=False);blend=samples[-n:]*(1-t)+samples[:n]*t
        result=normalize(np.concatenate([samples[n:-n],blend]),peak=.446684,rms=.065)
        record(name,result,rate,origin(key),
          f'Mono {rate} Hz; 35 Hz high-pass / 10000 Hz low-pass; circular linear crossfade {overlap} s; DC removal; RMS target -23.74 dBFS constrained by -7 dBFS sample peak; Vorbis quality 4.',
          [start,start+length],True)
    # These are genuinely different recorded shoe contacts, not pitch copies.
    feet={}
    for key,prefix,events in [('concrete','concrete-step',[(.385,.545),(1.085,.545),(2.485,.545)]),('gravel','debris-step',[(.385,.645),(3.295,.645),(7.625,.645)])]:
        for i,(start,length) in enumerate(events,1):
            data=fades(normalize(crop(SRC/SOURCES[key]['file'],start,length),peak=.251189))
            feet[prefix+str(i)]=data
            record(f'{prefix}-{i}.ogg',data,SR,origin(key),
              'Mono 32000 Hz; 70 Hz high-pass / 11000 Hz low-pass; DC removal; -12 dBFS sample peak before 3 ms onset / 45 ms tail fades; Vorbis quality 4.',[start,start+length])
    for i,(start,length) in enumerate([(.18,1.15),(30.4,1.55)],1):
        data=fades(normalize(crop(SRC/'0616.wav',start,length),peak=.199526),fadein=.012,fadeout=.09)
        record(f'hinge-creak-{i}.ogg',data,SR,origin('door'),
          'Mono 32000 Hz; 70 Hz high-pass / 11000 Hz low-pass; DC removal; -14 dBFS sample peak before 12 ms onset / 90 ms tail fades; Vorbis quality 4.',[start,start+length])
    # Shoe-on-grate is an explicitly documented Foley composite: new concrete
    # shoe recordings + unused recorded metal impact members. It is not claimed
    # to be a location recording of a person walking on a real grate.
    for i,member in enumerate(['metal_hit_03.ogg','metal_hit_04.ogg'],1):
        shoe=feet['concrete-step'+str(i)].copy();metal=decode(SRC/member,SR,'highpass=f=110,lowpass=f=6000')
        metal=normalize(metal,peak=.251189)*.46
        # Align the metal transient with the visible shoe impact, ~25 ms in.
        peak_index=int(np.argmax(np.abs(metal)));offset=max(0,round(.025*SR)-peak_index)
        count=min(len(metal),len(shoe)-offset);shoe[offset:offset+count]+=metal[:count]
        data=fades(normalize(shoe,peak=.281838),fadein=.003,fadeout=.06)
        record(f'grate-step-{i}.ogg',data,SR,origin('concrete'),
          f'Foley composite of concrete shoe event and {member}, metal relative gain 0.46, metal peak aligned near 0.025 s; DC removal; -11 dBFS sample peak, 3 ms onset / 60 ms tail fades; mono 32000 Hz Vorbis quality 4.',
          [.385,.93] if i==1 else [1.085,1.63],additional=[origin('metal',member)])
    (ROOT/'manifest-snippet.json').write_text(json.dumps(manifest,indent=2)+'\n')
    summary=dict(files=inspection,total_compressed_bytes=sum(r['bytes'] for r in inspection),
       total_decoded_float32_bytes=sum(r['decoded_float32_bytes'] for r in inspection),
       verification='Complete FFmpeg decoding; sample finite/peak/loop-boundary analysis. Browser playback, headphone/speaker listening and subjective mixing were not performed.',
       source_files={r['file']:dict(bytes=(SRC/r['file']).stat().st_size,sha256=sha(SRC/r['file']),url=r['url']) for r in SOURCES.values()})
    (ROOT/'audio-inspection.json').write_text(json.dumps(summary,indent=2)+'\n')
    assert all(r['finite'] and r['clipped_samples']==0 for r in inspection)
    print(json.dumps({k:summary[k] for k in ['total_compressed_bytes','total_decoded_float32_bytes']},indent=2))
    for r in inspection:print(r['file'],r['duration_seconds'],r['peak_dbfs'],r['bytes'])

if __name__=='__main__':
    args=argparse.ArgumentParser(description=__doc__);args.add_argument('--download',action='store_true');options=args.parse_args()
    prepare_sources(options.download);build()
