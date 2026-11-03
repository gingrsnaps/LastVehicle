"""Rebuild the eight Last Vehicle v1.13 audio additions, entirely offline.

Authoring dependencies: Python 3, NumPy, SciPy, FFmpeg with libvorbis.
Run from anywhere: python source-assets/audio-v113/prepare_audio.py
Playback needs only the generated Ogg files, not these authoring tools.

Existing CC0 recordings are hash-locked before any processing. The musical
theme, cloth brush, low thumps and air/wind layers are original DSP synthesis,
not microphone recordings. All source/derivative relationships are explicit.
The generated manifest fragment is for integration; no shared manifest or
runtime JavaScript is modified by this script.
"""

from pathlib import Path
import hashlib
import json
import subprocess

import numpy as np
from scipy import signal

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
OUT = REPO / "dist/assets/audio"
SR = 32000
MUSIC_SR = 24000
SEED = 113042
LICENSE_URL = "https://creativecommons.org/publicdomain/zero/1.0/"
SOURCES = json.loads((HERE / "source-lock.json").read_text())["sources"]
LOCK = {s["id"]: s for s in SOURCES}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify_sources():
    # Refuse a silently replaced recording, even if it has the expected name.
    for item in SOURCES:
        path = REPO / item["immediate_file"]
        if sha(path) != item["immediate_sha256"]:
            raise RuntimeError("Audio source has changed: " + str(path))


def decode(path, rate):
    data = subprocess.check_output([
        "ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar",
        str(rate), "-f", "f32le", "-",
    ])
    result = np.frombuffer(data, dtype="<f4").astype(np.float64)
    if not len(result) or not np.isfinite(result).all():
        raise RuntimeError("Empty or non-finite source: " + str(path))
    return result


def source(name, rate=SR):
    return decode(REPO / LOCK[name]["immediate_file"], rate)


def zeros(seconds, rate=SR):
    return np.zeros(round(seconds * rate), dtype=np.float64)


def band(samples, rate, low, high):
    # SOS filtering avoids unstable high-order direct-form coefficients.
    sos = signal.butter(2, [low, high], fs=rate, btype="band", output="sos")
    return signal.sosfiltfilt(sos, samples)


def unit(samples):
    x = samples - np.mean(samples)
    return x / max(np.max(np.abs(x)), 1e-12)


def fade(samples, rate, attack=.003, release=.06):
    x = samples.copy()
    a, b = min(round(attack * rate), len(x)//2), min(round(release * rate), len(x)//2)
    if a:
        x[:a] *= np.sin(np.linspace(0, np.pi/2, a))**2
    if b:
        x[-b:] *= np.cos(np.linspace(0, np.pi/2, b))**2
    return x


def trim_contact(samples, rate, threshold=.035):
    # Retain 2 ms before the first meaningful onset. A high peak threshold
    # would remove softer pre-contact details and make animation sync wrong.
    above = np.flatnonzero(np.abs(samples) >= np.max(np.abs(samples)) * threshold)
    start = max(0, int(above[0]) - round(.002 * rate)) if len(above) else 0
    return samples[start:]


def add(dest, layer, at=0., gain=1., rate=SR):
    start = round(at * rate)
    count = min(len(layer), len(dest) - start)
    if count > 0:
        dest[start:start+count] += layer[:count] * gain


def add_circular(dest, layer, at, rate):
    # An event may ring through the loop seam without a hard truncation.
    indices = (np.arange(len(layer)) + round(at * rate)) % len(dest)
    np.add.at(dest, indices, layer)


def shaped_noise(n, rate, rng, low=80, high=7000, tilt=.5):
    # Frequency-domain shaping creates one periodic noise buffer. This is
    # ideal for loop beds: no filter startup discontinuity is introduced.
    spectrum = np.fft.rfft(rng.normal(size=n))
    freq = np.fft.rfftfreq(n, 1 / rate)
    amplitude = 1 / np.maximum(freq, low)**tilt
    amplitude *= np.minimum(1, (freq / low)**2)
    amplitude *= 1 / (1 + (freq / high)**6)
    amplitude[0] = 0
    return unit(np.fft.irfft(spectrum * amplitude, n=n))


def fit_peak(samples, peak_db, rms_db=None):
    x = samples - np.mean(samples)
    gain = 10**(peak_db / 20) / max(np.max(np.abs(x)), 1e-12)
    if rms_db is not None:
        gain = min(gain, 10**(rms_db / 20) / max(np.sqrt(np.mean(x*x)), 1e-12))
    return x * gain


def loop_edges(samples, rate):
    # A short cosine ramp survives Vorbis end padding better than a raw
    # arbitrary phase cut. It is only 8 ms on these quiet texture/music beds.
    return fade(samples, rate, .008, .012)


def circular_reverb(x, rate, amount):
    result = x.copy()
    for delay, gain in [(.143, .44), (.287, .31), (.503, .23), (.811, .16), (1.213, .1)]:
        result += np.roll(x, round(delay * rate)) * gain * amount
    return result


def music(returning=False):
    """One original D / A / E-flat phrase, not an excerpt from another score."""
    rate, seconds = MUSIC_SR, 14.4
    n = round(rate * seconds)
    rng = np.random.default_rng(SEED + int(returning))
    t = np.arange(n) / rate
    out = np.zeros(n)
    # Each note combines a muted struck resonator and a quiet bowed texture.
    # No massive bass hit: horror comes from the unresolved final interval.
    for index, frequency in enumerate([293.6648, 220., 311.127]):
        duration = 5.8 if returning else 5.0
        local = np.arange(round(duration * rate)) / rate
        envelope = (1 - np.exp(-local / .045)) * np.exp(-local / (1.8 if returning else 1.35))
        tone = np.zeros(len(local))
        for ratio, gain, decay in [(1., 1., 1.), (2.007, .24, 1.4), (2.97, .11, 2.3), (4.013, .035, 3.)]:
            tone += gain * np.sin(2*np.pi*frequency*ratio*local) * np.exp(-local*decay*.14)
        bow = shaped_noise(len(local), rate, rng, 180, 2700, .8)
        tone = fade((tone + bow*.038) * envelope, rate, .018, .35)
        add_circular(out, tone*(.75 if index == 2 else 1.), .24 + index*4.8, rate)
    # D2 pedal. Frequencies snap to whole cycles in the loop to preserve phase.
    pedal = round(73.4162*seconds)/seconds
    out += np.sin(2*np.pi*pedal*t) * .045 * (.75+.25*np.cos(2*np.pi*t/seconds))
    if returning:
        # A beating semitone and restrained pulse give the same identity a
        # more anxious contour. This layer should be crossfaded, not stacked.
        beat = round(77.7817*seconds)/seconds
        out += np.sin(2*np.pi*beat*t) * .025
        pulse = (.5 + .5*np.cos(2*np.pi*t/1.2))**5
        out += shaped_noise(n, rate, rng, 80, 1700, .8) * pulse * .11
    out = circular_reverb(out, rate, .8 if returning else .55)
    return loop_edges(fit_peak(out, -17, -29 if not returning else -27), rate)


def cloth():
    rng = np.random.default_rng(SEED + 11)
    out = zeros(.72)
    t = np.arange(len(out))/SR
    # Cloth is an explicitly synthetic brush, not mislabeled recorded Foley.
    rub = shaped_noise(len(out), SR, rng, 160, 4400, .58)
    envelope = (1-np.exp(-t/.004)) * np.exp(-t/ .19)
    envelope += .55*np.exp(-((t-.28)/.085)**2)
    rub *= envelope * (.78+.22*np.sin(2*np.pi*47*t))
    shift = np.sin(2*np.pi*71*t) * np.exp(-t/ .065) * .11
    return fade(fit_peak(rub + shift, -21), SR, .002, .14)


def cart_wheel():
    out = zeros(1.5)
    creak = trim_contact(source("hinge-creak-1"), SR)
    # Slow the existing door squeak to form a wheel-contact Foley composite.
    # This is transparently a repurposed metallic creak, not a cart recording.
    slowed = np.interp(np.arange(round(len(creak)/.85))*.85, np.arange(len(creak)), creak)
    add(out, unit(slowed)*.6)
    spring = trim_contact(source("handle-strain"), SR)
    add(out, unit(spring), .22, .12)
    add(out, unit(spring), .77, .08)
    return fade(fit_peak(out, -17), SR, .003, .22)


def cart_impact():
    out = zeros(.82)
    # The source clank has a softer pre-rattle before its main collision.
    # Keep only 8 ms before that collision: its loudest peak must land at the
    # animated cart contact, not 150 ms after it. The separate wheel clip
    # already supplies the audible pre-contact motion.
    metal, strike = source("metal"), source("door-strike")
    metal = metal[max(0, int(np.argmax(np.abs(metal)))-round(.008*SR)):]
    strike = strike[max(0, int(np.argmax(np.abs(strike)))-round(.008*SR)):]
    add(out, unit(metal), 0, .65)
    add(out, unit(strike), .008, .32)
    t = np.arange(len(out)) / SR
    out += np.sin(2*np.pi*(89*t-16*t*t)) * np.exp(-t/.052) * .2
    return fade(fit_peak(out, -11), SR, .0015, .16)


def pressure():
    rng = np.random.default_rng(SEED + 12)
    out = zeros(2.7)
    rattle = trim_contact(source("rattle"), SR)
    add(out, unit(rattle), 0, .3)
    # Physical timing: first vibration at t=0, pressurized release at t=.18 s.
    hiss = shaped_noise(round(2.52*SR), SR, rng, 380, 7800, .2)
    t = np.arange(len(hiss))/SR
    hiss *= (1-np.exp(-t/.009))*np.exp(-t/.68)
    hiss *= .8 + .2*np.sin(2*np.pi*12*t)*np.exp(-t/ .45)
    add(out, hiss, .18, .78)
    return fade(fit_peak(out, -13, -29), SR, .002, .3)


def fan_stop():
    out = zeros(3.05)
    fan = unit(source("ambience"))
    t = np.arange(len(out))/SR
    # Integrate falling speed; using phase position (rather than an abruptly
    # changed sample rate) keeps the fan's coast-down continuous.
    speed = np.clip(1-.28*t, .15, 1)
    positions = np.cumsum(speed) % (len(fan)-1)
    coast = np.interp(positions, np.arange(len(fan)), fan)
    coast *= np.maximum(0, 1-t/2.9)**1.2
    out += coast*.36
    relay = trim_contact(source("switch"), SR)
    add(out, unit(relay), 0, .43)
    add(out, unit(relay), .075, .13)
    return fade(fit_peak(out, -16, -29), SR, .002, .25)


def exit_rain():
    rate, seconds = MUSIC_SR, 16
    n = round(seconds*rate)
    rng = np.random.default_rng(SEED + 14)
    t = np.arange(n)/rate
    # Synthesized broad rain / wind and the existing genuine water recording
    # are described separately in the manifest. No fictional rain provenance.
    wind = shaped_noise(n, rate, rng, 65, 2100, .85)
    wind *= .7+.2*np.sin(2*np.pi*t/seconds)+.1*np.sin(2*np.pi*t/(seconds/3))
    rain = shaped_noise(n, rate, rng, 850, 8900, .1)
    rain *= .34 + .055*np.cos(2*np.pi*t/(seconds/2))
    recorded = source("drip", rate)
    overlap = round(.8*rate)
    raw = recorded[:n+overlap]
    alpha = np.linspace(0, 1, overlap, endpoint=False)
    seam = raw[-overlap:]*(1-alpha)+raw[:overlap]*alpha
    water = np.concatenate([raw[overlap:-overlap], seam])
    if len(water) != n:
        raise RuntimeError("Recorded water source is too short")
    out = wind*.43 + rain + unit(water)*.11
    return loop_edges(fit_peak(out, -17, -28), rate)


def inspect(path, rate, loop):
    data = decode(path, rate)
    magnitude = np.abs(data)
    peak = float(np.max(magnitude))
    active = np.flatnonzero(magnitude >= peak*.035)
    delta = np.abs(np.diff(data))
    probe = json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration:stream=sample_rate,channels,codec_name", "-of", "json", str(path)
    ]))
    report = {
        "file": "audio/" + path.name,
        "bytes": path.stat().st_size, "sha256": sha(path),
        "codec": probe["streams"][0]["codec_name"], "sample_rate": rate,
        "channels": 1, "duration_seconds": len(data)/rate,
        "container_duration_seconds": float(probe["format"]["duration"]),
        "decoded_float32_bytes": len(data)*4,
        "nonfinite_sample_count": int(np.sum(~np.isfinite(data))),
        "clipped_sample_count": int(np.sum(magnitude >= 1)),
        "peak_dbfs": round(20*np.log10(max(peak, 1e-12)), 3),
        "rms_dbfs": round(20*np.log10(max(float(np.sqrt(np.mean(data*data))), 1e-12)), 3),
        "onset_seconds_at_3_5_percent_peak": round(int(active[0])/rate, 6) if len(active) else None,
        "peak_time_seconds": round(int(np.argmax(magnitude))/rate, 6),
        "loop": loop,
        "loop_boundary_jump": float(abs(data[0]-data[-1])) if loop else None,
        "adjacent_sample_p99_delta": float(np.quantile(delta, .99)),
    }
    if report["nonfinite_sample_count"] or report["clipped_sample_count"] or peak > .45:
        raise RuntimeError("Audio level/sample validation failed: " + path.name)
    if loop and report["loop_boundary_jump"] > report["adjacent_sample_p99_delta"]:
        raise RuntimeError("Loop seam exceeds ordinary adjacent movement: " + path.name)
    return report


def write_asset(name, samples, rate, loop):
    if not np.isfinite(samples).all():
        raise RuntimeError("Non-finite synthesis: " + name)
    path = OUT/(name+".ogg")
    subprocess.run([
        "ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(rate),
        "-ac", "1", "-i", "-", "-c:a", "libvorbis", "-q:a", "4",
        "-fflags", "+bitexact", "-flags:a", "+bitexact", "-map_metadata", "-1", str(path)
    ], input=np.asarray(samples, dtype="<f4").tobytes(), check=True)
    return inspect(path, rate, loop)


def main():
    verify_sources()
    OUT.mkdir(parents=True, exist_ok=True)
    definitions = [
        ("lv113-motif", music(False), MUSIC_SR, True, [],
         "Original 3-note D4/A3/E-flat4 muted-resonator theme with D2 pedal and circular delay tail.",
         "Exploration identity; crossfade 1.8 s; suggested starting pre-bus music gain .40."),
        ("lv113-return", music(True), MUSIC_SR, True, [],
         "Original variation of the same theme, beating low pedal and subtle 1.2 s noise pulse.",
         "Tense return or aftermath of a sighting; replace motif with a 1.8 s crossfade; pre-bus gain .35."),
        ("lv113-cloth-shift", cloth(), SR, False, [],
         "Original filtered-noise cloth brush and damped weight-shift tone; two soft gestures.",
         "Player crouch/hide entry or first movement after stillness; gain .24; not every render frame."),
        ("lv113-cart-wheel", cart_wheel(), SR, False, ["hinge-creak-1", "handle-strain"],
         "Existing CC0 metal-door creak slowed 0.85x with two spring-strain layers; repurposed Foley composite.",
         "Cart rolling buildup; sound begins with wheel motion; positional gain .45."),
        ("lv113-cart-impact", cart_impact(), SR, False, ["metal", "door-strike"],
         "CC0 clank and slam cut 8 ms before their main peaks, plus an original short low thump.",
         "Cart collision exactly at contact frame; positional gain .55; maximum one instance per event."),
        ("lv113-pressure-burst", pressure(), SR, False, ["rattle"],
         "CC0 mechanical rattle at start; original filtered pressure-air synthesis releases at .18 s.",
         "Pipe shiver starts at zero; release/particle animation at .18 s; positional gain .45."),
        ("lv113-fan-stop", fan_stop(), SR, False, ["ambience", "switch"],
         "CC0 fan processed with integrated falling sample speed, decaying amplitude and CC0 switch relay clicks.",
         "Isolation relay click at zero, fan coasts for 2.9 s; positional gain .42; stop existing fan loop first."),
        ("lv113-exit-rain", exit_rain(), MUSIC_SR, True, ["drip"],
         "Original synthetic rain/wind noise combined with a circular-crossfaded CC0 water excerpt; 8/12 ms edge ramps.",
         "Exit exterior bed; fade in 2 s and lower music; gain .28; loop until ending transition."),
    ]
    manifest, reports = [], []
    for name, data, rate, loop, origins, processing, cue in definitions:
        report = write_asset(name, data, rate, loop)
        reports.append(report)
        manifest.append({
            **report, "kind": "audio", "name": name,
            "title": name.replace("lv113-", "").replace("-", " ").title(),
            "author": "Last Vehicle original synthesis/arrangement; source recording credits below",
            "license": "CC0-1.0", "license_url": LICENSE_URL,
            "license_proof": "source-assets/audio-v113/LICENSE.txt",
            "processing": processing + f" Mono {rate} Hz, peak/RMS constrained, edge fades, Ogg Vorbis quality 4.",
            "source_type": "Original procedural synthesis" if not origins else "CC0-recording derivative with documented original synthesis/arrangement",
            "source_files": [LOCK[key] for key in origins],
            "integration_cue": cue,
            "verification": "Complete FFmpeg decoding and numerical validation. No subjective listening, browser mix or device-performance validation claimed.",
        })
    summary = {
        "files": reports,
        "total_compressed_bytes": sum(r["bytes"] for r in reports),
        "total_decoded_float32_bytes": sum(r["decoded_float32_bytes"] for r in reports),
        "total_duration_seconds": sum(r["duration_seconds"] for r in reports),
        "all_samples_finite": all(r["nonfinite_sample_count"] == 0 for r in reports),
        "total_clipped_samples": sum(r["clipped_sample_count"] for r in reports),
        "ffmpeg": subprocess.check_output(["ffmpeg", "-version"]).decode().splitlines()[0],
        "numpy_version": np.__version__, "random_seed": SEED,
        "limitation": "Numerical verification only; headphone/speaker audition and browser animation/mix checks remain necessary.",
    }
    (HERE/"manifest-snippet.json").write_text(json.dumps(manifest, indent=2)+"\n")
    (HERE/"audio-inspection.json").write_text(json.dumps(summary, indent=2)+"\n")
    print(json.dumps({k: v for k, v in summary.items() if k != "files"}, indent=2))


if __name__ == "__main__":
    main()
