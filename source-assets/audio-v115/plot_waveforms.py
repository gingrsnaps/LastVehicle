"""Numerical waveform contact/level inspection sheet, not a listening test."""
from pathlib import Path
import json
import subprocess
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
rows=json.loads((HERE/'manifest-fragment.json').read_text())
fig, axes=plt.subplots(6,2,figsize=(12,13),facecolor='#111a1b')
for ax,item in zip(axes.flat,rows):
    raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(ROOT/'dist/assets'/item['file']),'-ac','1','-ar','24000','-f','f32le','-'])
    x=np.frombuffer(raw,dtype='<f4'); step=max(1,len(x)//1000)
    count=len(x)//step
    data=x[:count*step].reshape(count,step)
    time=np.arange(count)*step/24000
    ax.fill_between(time,data.min(1),data.max(1),color='#e5ae68',linewidth=.25)
    ax.set_facecolor('#192729');ax.set_ylim(-.4,.4)
    ax.tick_params(colors='#bfcac5',labelsize=8)
    ax.set_title(item['name']+' · '+str(item['peak_dbfs'])+' dBFS',color='#e8e9df',fontsize=10,loc='left')
    ax.set_xlabel('seconds',color='#bfcac5',fontsize=8)
    ax.spines[['top','right']].set_visible(False)
    for spine in ax.spines.values():spine.set_color('#3e5354')
fig.suptitle('LAST VEHICLE 1.15 · Exterior audio inspection\nFixed amplitude scale ±0.4 · Numerical waveform inspection only',color='#e8e9df',fontsize=14)
fig.tight_layout(rect=(0,0,1,.95))
fig.savefig(HERE/'waveform-inspection.png',dpi=130,facecolor=fig.get_facecolor())
