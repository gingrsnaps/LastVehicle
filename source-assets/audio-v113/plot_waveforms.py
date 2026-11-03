"""Optional visual inspection sheet, using the complete decoded Ogg outputs."""
from pathlib import Path
import importlib.util
import json

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("lv113_audio", ROOT/"prepare_audio.py")
audio = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audio)
records = json.loads((ROOT/"audio-inspection.json").read_text())["files"]
fig, axes = plt.subplots(len(records), 1, figsize=(12, 11.5))
fig.patch.set_facecolor("#f6f3ed")
for ax, row in zip(axes, records):
    x = audio.decode(audio.REPO/"dist/assets"/row["file"], row["sample_rate"])
    # Bin min/max, not plain decimation: every short contact peak is retained.
    width = max(1, len(x)//1500)
    n = len(x)//width
    frames = x[:n*width].reshape(n, width)
    time = np.arange(n)*width/row["sample_rate"]
    ax.fill_between(time, frames.min(axis=1), frames.max(axis=1), color="#335f61", linewidth=.25)
    ax.set_xlim(0, len(x)/row["sample_rate"])
    ax.set_ylim(-.3, .3)
    ax.set_title(f"{Path(row['file']).name}  |  {row['duration_seconds']:.3f} s  |  peak {row['peak_dbfs']:.1f} dBFS  |  RMS {row['rms_dbfs']:.1f} dBFS", loc="left", fontsize=9)
    ax.set_xlabel("seconds", fontsize=8)
    ax.tick_params(labelsize=8)
    ax.grid(alpha=.2)
fig.suptitle("Last Vehicle 1.13 — complete decoded waveforms\nNumerical and visual inspection; not a listening or browser-mix test", fontsize=13, y=.997)
fig.tight_layout(rect=(0, 0, 1, .965))
fig.savefig(ROOT/"audio-waveforms.png", dpi=140)
print(ROOT/"audio-waveforms.png")
