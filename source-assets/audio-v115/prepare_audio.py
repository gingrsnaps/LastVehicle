"""Deterministic Last Vehicle 1.15 exterior/interaction audio authoring.

Run from any directory: python source-assets/audio-v115/prepare_audio.py
Authoring dependencies: Python, NumPy, SciPy, FFmpeg with libvorbis.
Runtime uses only the small Oggs; no DSP or network decoding is done per frame.
Input recordings are previously bundled CC0 recordings, verified by SHA256.
This script writes only lv115-* Oggs, this folder, and its isolated license data.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import numpy as np
from scipy import signal

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = ROOT / 'dist/assets/audio'
SR = 24000
SEED = 115042
LOCK = {s['id']: s for s in json.loads((HERE/'source-lock.json').read_text())['sources']}

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def decode(path):
    raw = subprocess.check_output(['ffmpeg','-v','error','-xerror','-i',str(path),'-ac','1','-ar',str(SR),'-f','f32le','-'])
    x = np.frombuffer(raw, dtype='<f4').astype(np.float64)
    if not len(x) or not np.isfinite(x).all():
        raise RuntimeError('Invalid input: '+str(path))
    return x

def source(name):
    spec = LOCK[name]
    path = ROOT/spec['immediate_file']
    if sha(path) != spec['immediate_sha256']:
        raise RuntimeError('Source hash changed: '+name)
    return decode(path)

def unit(x):
    x=x-np.mean(x)
    return x/max(1e-12,float(np.max(np.abs(x))))

def band(x, lo, hi):
    return signal.sosfiltfilt(signal.butter(2,[lo,hi],fs=SR,btype='band',output='sos'),x)

def noise(n, seed, lo=70, hi=6500, tilt=.5):
    # Frequency-domain synthesis is periodic: no filter-start transient at wrap.
    f=np.fft.rfftfreq(n,1/SR)
    env=np.minimum(1,(f/lo)**2)/(1+(f/hi)**6)/np.maximum(lo,f)**tilt
    env[0]=0
    return unit(np.fft.irfft(np.fft.rfft(np.random.default_rng(seed).normal(size=n))*env,n=n))

def fade(x, attack=.002, release=.08):
    x=x.copy()
    a=min(round(attack*SR),len(x)//2); b=min(round(release*SR),len(x)//2)
    if a: x[:a]*=np.sin(np.linspace(0,np.pi/2,a))**2
    if b: x[-b:]*=np.cos(np.linspace(0,np.pi/2,b))**2
    return x

def level(x, peak, rms):
    x=x-np.mean(x)
    gain=min(10**(peak/20)/max(np.max(np.abs(x)),1e-12),10**(rms/20)/max(np.sqrt(np.mean(x*x)),1e-12))
    return x*gain

def add(out,x,at=0,gain=1):
    start=round(at*SR); count=min(len(out)-start,len(x))
    if count>0: out[start:start+count]+=x[:count]*gain

def stretch(x, ratio):
    return np.interp(np.arange(round(len(x)/ratio))*ratio,np.arange(len(x)),x)

def contact(x):
    # Keep a short pre-contact lead; strike cues begin on the visible collision.
    active=np.flatnonzero(np.abs(x)>np.max(np.abs(x))*.08)
    return x[max(0,int(active[0])-round(.001*SR)):]

def tile(x,n,overlap=.1):
    a=min(round(overlap*SR),len(x)//4)
    ramp=.5-.5*np.cos(np.linspace(0,np.pi,a))
    seam=x[-a:]*(1-ramp)+x[:a]*ramp
    return np.resize(np.concatenate([x[a:-a],seam]),n)

def finish_loop(x,peak,rms):
    # A short wrap crossfade replaces (not appends) the tail and shortens the loop.
    # This avoids repeating a hard boundary in sampled textures.
    a=round(.12*SR)
    ramp=.5-.5*np.cos(np.linspace(0,np.pi,a))
    seam=x[-a:]*(1-ramp)+x[:a]*ramp
    result=np.concatenate([x[a:-a],seam])
    # Small codec-safe edge ramps are below a fraction of a typical raindrop.
    return fade(level(result,peak,rms),.0015,.0015)

def roof_rain():
    n=round(12.12*SR); t=np.arange(n)/SR
    out=noise(n,SEED,700,8500,.18)*(.8+.12*np.cos(2*np.pi*t/6.06))
    out+=tile(unit(band(source('drip'),200,4200)),n,.22)*.23
    rng=np.random.default_rng(SEED+1)
    # Close roof ticks differ from the softer existing entrance rain bed.
    for _ in range(100):
        d=np.arange(round(.07*SR))/SR
        f=float(rng.uniform(650,2100))
        ping=(np.sin(2*np.pi*f*d)*.35+noise(len(d),int(rng.integers(1,99999)),1200,8000,.1))*np.exp(-d/.012)
        add(out,fade(ping,.0005,.02),float(rng.uniform(.1,11.9)),float(rng.uniform(.08,.25)))
    return finish_loop(out,-19,-32)

def yard_wind():
    n=round(12.12*SR); t=np.arange(n)/SR
    wind=noise(n,SEED+2,95,2400,.8)*(.45+.23*np.cos(2*np.pi*t/12.12))
    motor=tile(unit(band(source('ambience'),70,480)),n,.13)
    distant=np.exp(-((t-6.1)/2.8)**2)
    out=wind+motor*.12*distant
    # Soft tensioned-wire harmonics; not an attack or hidden proximity cue.
    out+=(np.sin(2*np.pi*310*t)+.35*np.sin(2*np.pi*466*t))*.025*(.5+.5*np.sin(2*np.pi*t/6.06))
    return finish_loop(out,-24,-38)

def gravel_step(variant):
    n=round(.62*SR); t=np.arange(n)/SR; out=np.zeros(n)
    x=unit(band(contact(source('debris-step-'+str(variant))),100,8500))
    add(out,stretch(x,1.03 if variant==1 else .96),gain=.85)
    # A soft heel and delayed grit drag give each foot a distinct readable contact.
    out+=np.sin(2*np.pi*(95*t-28*t*t))*np.exp(-t/.028)*.15
    rng=np.random.default_rng(SEED+10+variant)
    for at in [.035,.08,.14,.205]:
        grit=noise(round(.055*SR),int(rng.integers(1,99999)),1500,9500,.05)
        grit*=np.exp(-np.arange(len(grit))/SR/.009)
        add(out,grit,at,float(rng.uniform(.08,.17)))
    return fade(level(out,-16,-32),.001,.1)

def bolt_metal():
    n=round(.72*SR); t=np.arange(n)/SR; out=np.zeros(n)
    x=fade(stretch(unit(band(contact(source('metal')),600,9500)),1.65),.0005,.07)
    for at,gain in [(0,1),(.13,.3),(.235,.12)]: add(out,x,at,gain)
    out+=(np.sin(2*np.pi*1780*t)*.1+np.sin(2*np.pi*3320*t)*.04)*np.exp(-t/.09)
    return fade(level(out,-13,-31),.0005,.12)

def bolt_glass():
    # A bolt striking a pane, not breaking it: sharp tick with high glass modes.
    n=round(.85*SR); t=np.arange(n)/SR
    modes=[(1230,.16,.11),(2140,.24,.20),(3481,.13,.12),(4920,.06,.07)]
    out=sum(g*np.sin(2*np.pi*f*t)*np.exp(-t/tau) for f,g,tau in modes)
    out+=noise(n,SEED+20,2200,9500,.1)*np.exp(-t/.004)*.8
    return fade(level(out,-15,-35),.0006,.14)

def bolt_water():
    n=round(.74*SR); t=np.arange(n)/SR
    out=np.zeros(n)
    wet=stretch(unit(band(contact(source('footstep-wet')),350,8000)),1.8)
    add(out,wet,gain=.35)
    splash=noise(n,SEED+21,550,8500,.1)*(1-np.exp(-t/.003))*np.exp(-t/.065)
    # Rapid falling pitch conveys a small plop rather than a heavy footstep.
    bubble=np.sin(2*np.pi*(750*t-1200*t*t))*np.exp(-t/.018)
    out+=splash*.7+bubble*.13
    for at in [.14,.23]: add(out,fade(stretch(wet,1.4),.001,.08),at,.07)
    return fade(level(out,-17,-35),.001,.15)

def fence_strike():
    n=round(1.7*SR); t=np.arange(n)/SR; out=np.zeros(n)
    hit=unit(band(contact(source('door-strike')),80,8500))
    add(out,stretch(hit,.86),gain=.8)
    chain=unit(band(contact(source('metal')),700,9500))
    for at,g,rate in [(.018,.27,1.4),(.16,.22,1.7),(.31,.14,1.9),(.51,.07,1.6)]:
        add(out,fade(stretch(chain,rate),.001,.07),at,g)
    out+=(np.sin(2*np.pi*92*t)*.18+np.sin(2*np.pi*188*t)*.1)*np.exp(-t/.19)
    return fade(level(out,-11,-29),.0008,.24)

def door_breach():
    n=round(1.95*SR); t=np.arange(n)/SR; out=np.zeros(n)
    add(out,stretch(unit(contact(source('door-strike'))),.82),gain=.8)
    add(out,unit(contact(source('wood-crack'))),.035,.35)
    scrape=unit(band(source('metal'),180,4300))
    add(out,fade(stretch(scrape,.64),.025,.35),.18,.14)
    out+=noise(n,SEED+30,45,400,.8)*np.exp(-t/.11)*.23
    # One impact plus falling latch, not a full scripted multi-hit cutscene.
    add(out,fade(stretch(unit(contact(source('metal'))),1.7),.001,.08),.62,.1)
    return fade(level(out,-11,-29),.001,.3)

def road_gravel():
    n=round(4.12*SR); t=np.arange(n)/SR
    grit=tile(unit(band(source('debris-step-1'),500,9000)),n,.12)
    out=noise(n,SEED+31,100,5400,.45)*.45+grit*.18
    out*=.85+.08*np.sin(2*np.pi*t/1.03)+.05*np.sin(2*np.pi*t/.515)
    return finish_loop(out,-23,-36)

def engine_idle():
    n=round(4.12*SR); t=np.arange(n)/SR
    # Soft four-cylinder idle base. Playback-rate modulation can follow throttle.
    phase=2*np.pi*(47*t+.06*np.sin(2*np.pi*t/2.06))
    out=np.sin(phase)*.5+np.sin(phase*2)*.24+np.sin(phase*3)*.12
    motor=tile(unit(band(source('ambience'),65,1400)),n,.15)
    out+=motor*.3+noise(n,SEED+32,70,850,.6)*.1
    return finish_loop(out,-23,-32)

def yard_tension():
    n=round(12.12*SR); t=np.arange(n)/SR
    out=noise(n,SEED+40,45,600,.85)*.18
    # Sparse low-register original texture, no borrowed tune or constant stinger.
    out+=np.sin(2*np.pi*55*t)*.12*(.65+.35*np.cos(2*np.pi*t/6.06))
    out+=(np.sin(2*np.pi*82.4*t)+np.sin(2*np.pi*84.2*t))*.035*np.sin(np.pi*t/12.12)**2
    out+=noise(n,SEED+41,600,2600,.65)*.035*(1+np.cos(2*np.pi*t/12.12))
    return finish_loop(out,-27,-40)

def inspect(path,loop):
    x=decode(path); mag=np.abs(x); peak=float(mag.max())
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration:stream=sample_rate,channels,codec_name','-of','json',str(path)]))
    p99=float(np.quantile(np.abs(np.diff(x)),.99))
    seam=float(abs(x[0]-x[-1])) if loop else None
    active=np.flatnonzero(mag>peak*.035)
    report={'file':'audio/'+path.name,'bytes':path.stat().st_size,'sha256':sha(path),'codec':'vorbis','sample_rate':SR,'channels':1,
        'duration_seconds':len(x)/SR,'container_duration_seconds':float(probe['format']['duration']),
        'decoded_float32_bytes':len(x)*4,'decoded_float32_bytes_at_48000_hz':round(len(x)/SR*48000)*4,
        'nonfinite_sample_count':int(np.sum(~np.isfinite(x))),'clipped_sample_count':int(np.sum(mag>=1)),
        'peak_dbfs':round(20*np.log10(peak),3),'rms_dbfs':round(20*np.log10(np.sqrt(np.mean(x*x))),3),
        'onset_seconds_at_3_5_percent_peak':round(int(active[0])/SR,6),'peak_time_seconds':round(int(np.argmax(mag))/SR,6),
        'loop':loop,'loop_boundary_jump':seam,'adjacent_sample_p99_delta':p99,'loop_seam_check':None if not loop else seam<=p99}
    if report['nonfinite_sample_count'] or report['clipped_sample_count'] or peak>.4:
        raise RuntimeError('Invalid or over-level audio: '+path.name)
    if loop and not report['loop_seam_check']:
        raise RuntimeError('Decoded seam mismatch: '+path.name)
    return report

def write(name,x,loop):
    path=OUT/(name+'.ogg')
    if not np.isfinite(x).all(): raise RuntimeError('Invalid synthesis: '+name)
    subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','1','-i','-',
        '-c:a','libvorbis','-q:a','3','-fflags','+bitexact','-flags:a','+bitexact','-map_metadata','-1',str(path)],
        input=np.asarray(x,dtype='<f4').tobytes(),check=True)
    return inspect(path,loop)

def main():
    for name in LOCK: source(name)  # Validate every input before any output changes.
    definitions=[
      ('roof-rain',roof_rain,True,['drip'],.30,'Rain on corrugated awning with a gutter-water texture. Fade by shelter/exterior position.'),
      ('yard-wind',yard_wind,True,['ambience'],.25,'Exterior wind, distant motor wash and quiet fence wire tone. Do not encode enemy proximity.'),
      ('gravel-step-1',lambda:gravel_step(1),False,['debris-step-1'],.45,'Left gravel shoe contact. Play only at a foot contact; alternate variants.'),
      ('gravel-step-2',lambda:gravel_step(2),False,['debris-step-2'],.45,'Right gravel shoe contact. Reuses a different real CC0 gravel recording window.'),
      ('bolt-metal',bolt_metal,False,['metal'],.40,'Small steel contact with diminishing bounces. One event at first physical bolt contact.'),
      ('bolt-glass',bolt_glass,False,[],.40,'Original pane tick and glass resonance; does not imply glass shattering.'),
      ('bolt-water',bolt_water,False,['footstep-wet'],.45,'Small shallow-water plop and splash. One event at physical bolt water contact.'),
      ('fence-strike',fence_strike,False,['door-strike','metal'],.55,'Fence impact and settling links. Synchronize first contact with creature hand collision.'),
      ('door-breach',door_breach,False,['door-strike','wood-crack','metal'],.55,'Door shoulder impact, latch crack and dragging tail. Sync initial hit with door movement.'),
      ('road-gravel',road_gravel,True,['debris-step-1'],.30,'Rolling rough road texture. Fade from zero with vehicle speed; stop when parked.'),
      ('engine-idle',engine_idle,True,['ambience'],.34,'Four-cylinder low engine texture. Suggested playbackRate .85–1.65 with throttle/RPM; fade on enter/exit.'),
      ('yard-tension',yard_tension,True,[],.35,'Original low-register exterior tension texture. Music bus; crossfade with existing score, never stack at full gain.'),
    ]
    manifest=[]
    for short,build,loop,origins,gain,cue in definitions:
        name='lv115-'+short; report=write(name,build(),loop)
        manifest.append({**report,'kind':'audio','name':name,'title':short.replace('-',' ').title(),
            'author':'Last Vehicle original synthesis and edits; source recording authors preserved below',
            'license':'CC0-1.0','license_url':'https://creativecommons.org/publicdomain/zero/1.0/','license_proof':'licenses/Audio-v115.txt',
            'source_type':'CC0-recording derivative plus original synthesis' if origins else 'Original procedural synthesis',
            'source_files':[LOCK[k] for k in origins],'authoring_source':'source-assets/audio-v115/prepare_audio.py',
            'processing':'Mono 24 kHz, bounded peak/RMS, source hash check, contact onset alignment, source/loop wrap crossfades where applicable, Vorbis quality 3.',
            'recommended_gain':gain,'integration_cue':cue,
            'verification':'Complete decode and numerical finite/clipping/loop-seam inspection. No subjective listening or browser mix approval claimed.'})
    total=sum(x['bytes'] for x in manifest); memory=sum(x['decoded_float32_bytes_at_48000_hz'] for x in manifest)
    if total>400000 or memory>12*1024*1024: raise RuntimeError('Audio pack budget exceeded')
    summary={'assets':len(manifest),'total_compressed_bytes':total,'decoded_float32_bytes_at_48000_hz':memory,
        'all_samples_finite':True,'clipped_samples':0,'loop_checks_passed':sum(bool(x['loop_seam_check']) for x in manifest),
        'random_seed':SEED,'numpy_version':np.__version__,'ffmpeg':subprocess.check_output(['ffmpeg','-version']).decode().splitlines()[0],
        'limitation':'Numerical inspection only; subjective headphone and browser mix review remains required.','files':manifest}
    (HERE/'manifest-fragment.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (HERE/'audio-inspection.json').write_text(json.dumps(summary,indent=2)+'\n')
    print(json.dumps({k:v for k,v in summary.items() if k!='files'},indent=2))

if __name__=='__main__': main()
