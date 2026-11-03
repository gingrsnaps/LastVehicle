"""Build six small Last Vehicle 1.14 sound additions without network access.

Run: python source-assets/audio-v114/prepare_audio.py
Authoring only: Python, NumPy, SciPy, FFmpeg/libvorbis. Runtime needs the Oggs.

The weather/traffic are designed soundscapes, not claimed location recordings.
All reused samples come from hash-locked, previously bundled CC0 material.
The generator writes only its six lv114-* Oggs and this folder's reports.
It never modifies game JavaScript or the shared asset manifest.
"""
from pathlib import Path
import hashlib
import json
import subprocess

import numpy as np
from scipy import signal

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = ROOT / "dist/assets/audio"
SR = 24000
SEED = 114042
SOURCES = json.loads((HERE / "source-lock.json").read_text())["sources"]
LOCK = {item["id"]: item for item in SOURCES}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def decode(path, rate=SR):
    raw = subprocess.check_output([
        "ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(rate),
        "-f", "f32le", "-",
    ])
    samples = np.frombuffer(raw, dtype="<f4").astype(np.float64)
    if not len(samples) or not np.isfinite(samples).all():
        raise RuntimeError("Invalid decoded samples: " + str(path))
    return samples


def source(name):
    item = LOCK[name]
    path = ROOT / item["immediate_file"]
    if sha(path) != item["immediate_sha256"]:
        raise RuntimeError("Source changed; inspect provenance before rebuilding: " + name)
    return decode(path)


def unit(samples):
    x = samples - np.mean(samples)
    return x / max(np.max(np.abs(x)), 1e-12)


def filtered(samples, low, high):
    # Stable second-order sections rather than a high-order direct-form filter.
    return signal.sosfiltfilt(signal.butter(2, [low, high], fs=SR, btype="band", output="sos"), samples)


def noise(n, seed, low, high, tilt=.5):
    # A periodic frequency-domain bed has no zero-state filter startup at its seam.
    spectrum = np.fft.rfft(np.random.default_rng(seed).normal(size=n))
    frequency = np.fft.rfftfreq(n, 1/SR)
    envelope = (1/np.maximum(low, frequency)**tilt)
    envelope *= np.minimum(1, (frequency/low)**2) / (1+(frequency/high)**6)
    envelope[0] = 0
    return unit(np.fft.irfft(spectrum*envelope, n=n))


def fade(samples, attack=.005, release=.12):
    x = samples.copy()
    a = min(round(attack*SR), len(x)//2)
    b = min(round(release*SR), len(x)//2)
    if a:
        x[:a] *= np.sin(np.linspace(0, np.pi/2, a))**2
    if b:
        x[-b:] *= np.cos(np.linspace(0, np.pi/2, b))**2
    return x


def level(samples, peak_db, rms_db=None):
    x = samples-np.mean(samples)
    gain = 10**(peak_db/20)/max(np.max(np.abs(x)), 1e-12)
    if rms_db is not None:
        gain = min(gain, 10**(rms_db/20)/max(np.sqrt(np.mean(x*x)), 1e-12))
    return x*gain


def add(dest, samples, time=0, gain=1):
    start = round(time*SR)
    count = min(len(dest)-start, len(samples))
    if count > 0:
        dest[start:start+count] += samples[:count]*gain


def circular_source(samples, n, overlap=.1):
    # Form a seamless short source tile; repeated tiles are further modulated.
    a = min(round(overlap*SR), len(samples)//4)
    ramp = .5-.5*np.cos(np.linspace(0, np.pi, a))
    seam = samples[-a:]*(1-ramp)+samples[:a]*ramp
    tile = np.concatenate([samples[a:-a], seam])
    return np.resize(tile, n)


def city():
    """Two distant passing vehicles over a restrained, non-directional city bed."""
    n = round(24*SR)
    t = np.arange(n)/SR
    out = noise(n, SEED, 65, 1600, .9)*.12
    # A previously recorded CC0 motor supplies some mechanical roughness.
    motor = circular_source(unit(filtered(source("ambience"), 80, 700)), n)
    for at, width, pitch in [(6.3, 3.1, 123), (17.6, 4.0, 98)]:
        envelope = np.exp(-((t-at)/width)**2)
        # Integrating a declining frequency approximates a subtle pass-by shift.
        frequency = pitch-13*np.tanh((t-at)/1.1)
        phase = 2*np.pi*np.cumsum(frequency)/SR
        engine = np.sin(phase)+.19*np.sin(phase*2.003)
        tyre = noise(n, SEED+round(at), 180, 2900, .5)
        out += envelope*(engine*.075+tyre*.35+motor*.13)
    # Whole-cycle hum can cross the seam without a phase reset.
    out += np.sin(2*np.pi*60*t)*.018
    return fade(level(out, -22, -34), .008, .012)


def entrance_rain():
    """Rain meeting concrete and a shallow drain, not an indoor white-noise wash."""
    n = round(18*SR)
    t = np.arange(n)/SR
    rain = noise(n, SEED+1, 450, 8300, .13)
    wash = .72+.13*np.cos(2*np.pi*t/18)+.09*np.sin(2*np.pi*t/6)
    out = rain*wash
    runoff = circular_source(unit(filtered(source("drip"), 120, 4500)), n, .22)
    out += runoff*.22
    rng = np.random.default_rng(SEED+3)
    # Small stochastic ticks distinguish drops from featureless filtered noise.
    for _ in range(95):
        duration = .02+float(rng.uniform(0,.025))
        local = np.arange(round(duration*SR))/SR
        tick = rng.normal(size=len(local))*np.exp(-local/.004)
        tick += np.sin(2*np.pi*float(rng.uniform(650,1300))*local)*np.exp(-local/.012)*.3
        add(out, fade(tick,.0004,.012),float(rng.uniform(.15,17.7)),float(rng.uniform(.05,.14)))
    return fade(level(out, -19, -31), .008, .012)


def thunder():
    n = round(6*SR)
    t = np.arange(n)/SR
    low = noise(n, SEED+4, 37, 620, .8)
    high = noise(n, SEED+5, 180, 1500, .8)
    # No close lightning crack: distant weather must not compete with attack tells.
    envelope = (1-np.exp(-t/.19))*np.exp(-t/1.65)
    envelope += .27*np.exp(-((t-1.9)/.55)**2)
    out = low*envelope+high*np.exp(-((t-.45)/.4)**2)*.1
    out += np.sin(2*np.pi*(43*t-1.7*t*t))*envelope*.07
    return fade(level(out,-19,-33), .025, .7)


def bolt():
    n = round(.74*SR)
    out = np.zeros(n)
    metal = unit(filtered(source("metal"), 500, 8200))
    # The exact first contact must happen now, not after the source's pre-rattle.
    start = max(0, int(np.argmax(np.abs(metal)))-round(.0015*SR))
    metal = metal[start:]
    speed = 1.8
    contact = np.interp(np.arange(round(len(metal)/speed))*speed,np.arange(len(metal)),metal)
    contact = fade(contact, .0005, .06)
    for time,gain,ratio in [(0,1,1),(.145,.42,1.08),(.252,.23,1.15),(.33,.12,1.2)]:
        x = np.interp(np.arange(round(len(contact)/ratio))*ratio,np.arange(len(contact)),contact)
        add(out,x,time,gain)
    t = np.arange(n)/SR
    ring = sum(g*np.sin(2*np.pi*f*t)*np.exp(-t/tau) for f,g,tau in [(1740,.16,.11),(2815,.1,.055),(4097,.035,.03)])
    return fade(level(out+ring,-13,-30),.0004,.16)


def cutoff():
    n = round(.86*SR)
    out = np.zeros(n)
    relay = source("switch")
    active = np.flatnonzero(np.abs(relay)>np.max(np.abs(relay))*.05)
    relay = unit(relay[max(0,int(active[0])-round(.001*SR)):])
    add(out,relay,0,.6)
    t = np.arange(n)/SR
    # Original electrical fizz tails off; deliberately no explosion or bass drop.
    fizz = noise(n, SEED+6, 1000, 7800, .3)
    out += fizz*(1-np.exp(-t/.003))*np.exp(-t/.08)*.16
    out += np.sin(2*np.pi*120*t)*np.exp(-t/.055)*.07
    return fade(level(out,-17,-33),.0005,.2)


def player_breath():
    """Quiet unvoiced exertion, separate from the creature's pitched voice.

    Three soft inhale/exhale pairs form six seconds. No heartbeat, attack cue,
    spoken performance or hidden-enemy information is encoded in this layer.
    """
    n = round(6*SR)
    t = np.arange(n)/SR
    air = noise(n, SEED+7, 420, 5600, .35)
    body = noise(n, SEED+8, 150, 1050, .65)
    inhale = np.zeros(n)
    exhale = np.zeros(n)
    for start,gain in [(0,.9),(2,1),(4,.94)]:
        inhale += gain*np.exp(-((t-start-.35)/.16)**2)
        exhale += gain*np.exp(-((t-start-1.0)/.31)**2)
    # Mild turbulence instead of creature-style low resonances or growling.
    out = air*(inhale*.42+exhale*.68)+body*exhale*.12
    return fade(level(out,-25,-39),.008,.012)


def inspect(path, loop):
    x = decode(path)
    probe = json.loads(subprocess.check_output([
        "ffprobe","-v","error","-show_entries","format=duration:stream=sample_rate,channels,codec_name","-of","json",str(path)
    ]))
    magnitude = np.abs(x)
    peak = float(np.max(magnitude))
    delta = np.abs(np.diff(x))
    p99 = float(np.quantile(delta,.99))
    onset = np.flatnonzero(magnitude>peak*.035)
    seam = float(abs(x[0]-x[-1])) if loop else None
    report = {
        "file":"audio/"+path.name,"bytes":path.stat().st_size,"sha256":sha(path),
        "codec":probe["streams"][0]["codec_name"],"sample_rate":SR,"channels":1,
        "duration_seconds":len(x)/SR,"container_duration_seconds":float(probe["format"]["duration"]),
        "decoded_float32_bytes":len(x)*4,"decoded_float32_bytes_at_48000_hz":round(len(x)/SR*48000)*4,
        "nonfinite_sample_count":int(np.sum(~np.isfinite(x))),"clipped_sample_count":int(np.sum(magnitude>=1)),
        "peak_dbfs":round(20*np.log10(max(peak,1e-12)),3),"rms_dbfs":round(20*np.log10(max(float(np.sqrt(np.mean(x*x))),1e-12)),3),
        "onset_seconds_at_3_5_percent_peak":round(int(onset[0])/SR,6),"peak_time_seconds":round(int(np.argmax(magnitude))/SR,6),
        "loop":loop,"loop_boundary_jump":seam,"adjacent_sample_p99_delta":p99,
        "loop_seam_check":None if not loop else seam<=p99,
    }
    if report["nonfinite_sample_count"] or report["clipped_sample_count"] or peak>.4:
        raise RuntimeError("Unsafe or invalid samples: "+path.name)
    if loop and not report["loop_seam_check"]:
        raise RuntimeError("Loop wrap discontinuity: "+path.name)
    return report


def write(name,x,loop):
    if not np.isfinite(x).all():
        raise RuntimeError("Non-finite synthesis: "+name)
    path = OUT/(name+".ogg")
    subprocess.run([
        "ffmpeg","-v","error","-y","-f","f32le","-ar",str(SR),"-ac","1","-i","-",
        "-c:a","libvorbis","-q:a","3","-fflags","+bitexact","-flags:a","+bitexact","-map_metadata","-1",str(path)
    ],input=np.asarray(x,dtype="<f4").tobytes(),check=True)
    return inspect(path,loop)


def main():
    # Verify all four sources before writing any output.
    for item in SOURCES:
        if sha(ROOT/item["immediate_file"])!=item["immediate_sha256"]:
            raise RuntimeError("Source hash mismatch: "+item["id"])
    definitions = [
        ("lv114-city-night",city(),True,["ambience"],"Original tyre/wind/engine pass-by synthesis with filtered CC0 motor texture; distant city sound design, not a field recording.","24 s exterior loop; ambience bus; gain .20 before category volume; strongest within 18 m of exit, very quiet deeper inside."),
        ("lv114-entrance-rain",entrance_rain(),True,["drip"],"Original rain/drop synthesis mixed with CC0 flowing/dripping water using a source-loop seam crossfade.","18 s loop; fade to gain .35 near exit puddle; do not layer at full gain with lv113-exit-rain."),
        ("lv114-distant-thunder",thunder(),False,[],"Original low-frequency colored-noise weather rumble with soft attack and delayed rolling tail; no sampled thunder.","6 s occasional weather cue, gain .30; suppress during pursuit/attack/story impacts and allow >=45 s cooldown."),
        ("lv114-bolt-impact",bolt(),False,["metal"],"CC0 metal clank onset trimmed, pitched 1.8x, with three diminishing bounces and original resonant metal partials.","One .74 s cue at the projectile's first physical contact, positional gain .40; contains its own small bounce tail; do not retrigger every physics step."),
        ("lv114-electric-cutoff",cutoff(),False,["switch"],"CC0 switch contact plus original short electrical fizz and fading 120 Hz hum.","One .86 s positional relay cue at the initial power cut; gain .38; local light state should change at initial contact."),
        ("lv114-player-breath",player_breath(),True,[],"Original unvoiced filtered-noise inhale/exhale synthesis, three soft breath pairs; no sampled voice, heartbeat or creature cue.","6 s centered SFX loop; fade with player sprint/stamina only, suggested gain .20-.45; mute on pause and never infer hidden enemy proximity."),
    ]
    manifest=[]
    for name,samples,loop,origins,processing,cue in definitions:
        report=write(name,samples,loop)
        manifest.append({**report,"kind":"audio","name":name,"title":name.removeprefix('lv114-').replace('-',' ').title(),
            "author":"Last Vehicle original synthesis and edits; CC0 source recording authors recorded below",
            "license":"CC0-1.0","license_url":"https://creativecommons.org/publicdomain/zero/1.0/","license_proof":"licenses/Audio-v114.txt",
            "source_type":"CC0-recording derivative plus original synthesis" if origins else "Original procedural synthesis",
            "source_files":[LOCK[k] for k in origins],"authoring_source":"source-assets/audio-v114/prepare_audio.py",
            "processing":processing+" Mono 24 kHz, bounded peak/RMS, faded edges, Vorbis quality 3.","integration_cue":cue,
            "verification":"Full decoded sample/level/loop-seam inspection. Listening and browser mix review remain required."})
    total=sum(a['bytes'] for a in manifest)
    at48=sum(a['decoded_float32_bytes_at_48000_hz'] for a in manifest)
    if total>500000 or at48>15*1024*1024:
        raise RuntimeError("Sound pack exceeded its encoded/decoded budget")
    summary={"files":manifest,"total_compressed_bytes":total,"total_decoded_float32_bytes":sum(a['decoded_float32_bytes'] for a in manifest),
        "total_decoded_float32_bytes_at_48000_hz":at48,"all_samples_finite":True,"total_clipped_samples":0,
        "loop_checks_passed":sum(bool(a['loop_seam_check']) for a in manifest),"random_seed":SEED,"numpy_version":np.__version__,
        "ffmpeg":subprocess.check_output(['ffmpeg','-version']).decode().splitlines()[0],
        "limitation":"Numerical inspection only. No actual browser playback, headphone audition, subjective realism or device FPS claim."}
    (HERE/'manifest-fragment.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (HERE/'audio-inspection.json').write_text(json.dumps(summary,indent=2)+'\n')
    print(json.dumps({k:v for k,v in summary.items() if k!='files'},indent=2))


if __name__=='__main__':
    main()
