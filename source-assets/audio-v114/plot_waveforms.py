"""Create a compact numerical QA plot; this is not an audio audition."""
from pathlib import Path
import json
import subprocess
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
report=json.loads((HERE/'audio-inspection.json').read_text())
fig,axes=plt.subplots(len(report['files']),1,figsize=(13,13),constrained_layout=True)
for ax,item in zip(axes,report['files']):
    data=subprocess.check_output(['ffmpeg','-v','error','-i',str(ROOT/'dist/assets'/item['file']),'-ac','1','-ar','24000','-f','f32le','-'])
    x=np.frombuffer(data,dtype='<f4')
    stride=max(1,len(x)//5000)
    ax.plot(np.arange(0,len(x),stride)/24000,x[::stride],color='#2e6e66',linewidth=.7)
    ax.set_xlim(0,len(x)/24000)
    ax.set_ylim(-.3,.3)
    ax.set_title(item['name']+' — peak '+str(item['peak_dbfs'])+' dBFS; RMS '+str(item['rms_dbfs'])+' dBFS',loc='left')
    ax.set_xlabel('Seconds');ax.set_ylabel('Amplitude');ax.grid(alpha=.15)
fig.suptitle('Last Vehicle 1.14 — decoded sound waveforms\nNumerical QA only; browser listening remains required',fontsize=15)
fig.savefig(HERE/'audio-waveforms.png',dpi=130)
print('Wrote audio-waveforms.png')
