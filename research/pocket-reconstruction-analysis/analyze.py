import numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly, stft, find_peaks, butter, sosfiltfilt
import json
from pathlib import Path
import matplotlib;matplotlib.use('Agg')
import matplotlib.pyplot as plt
p=Path(__file__).parent
sr,y=wavfile.read(p/'reference.wav');y=y.astype(float)/32768
x=resample_poly(y.mean(axis=1),1,4);fs=sr/4
f,t,Z=stft(x,fs=fs,nperseg=4096,noverlap=4096-128)
S=np.abs(Z)
# spectral onset energy and bands
onsets=np.maximum(np.diff(np.log1p(S*100),axis=1),0)
bands={}
for name,lo,hi in [('low',40,150),('mid',150,1200),('high',2000,5000),('full',40,5000)]:
 env=onsets[(f>=lo)&(f<=hi)].sum(axis=0);env-=env.mean()
 dt=t[1]-t[0]
 ac=np.correlate(env[:10000],env[:10000],mode='full')[9999:]
 inds=find_peaks(ac)[0]; inds=inds[(inds*dt>.3)&(inds*dt<.8)]
 best=inds[np.argsort(ac[inds])[-5:][::-1]]
 bands[name]={'bpm_candidates':[[round(60/(i*dt),3),round(float(ac[i]/ac[0]),3)] for i in best]}
print(json.dumps({'duration':len(y)/sr,'bands':bands},indent=2))
np.savez_compressed(p/'spectra.npz',f=f,t=t,S=S)
for start,end in [(0,20),(20,40),(40,60),(60,80),(160,180)]:
 mask=(t>=start)&(t<=end)
 fig,ax=plt.subplots(figsize=(20,7))
 sel=(f>=60)&(f<=2500)
 im=ax.pcolormesh(t[mask],f[sel],20*np.log10(S[sel][:,mask]+1e-7),vmin=-65,vmax=-20,cmap='magma',shading='auto')
 ax.set_yscale('log'); notes=np.arange(36,88);freq=440*2**((notes-69)/12)
 labels=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
 show=(notes%12==0)|(notes%12==4)|(notes%12==7)
 ax.set_yticks(freq[show]);ax.set_yticklabels([labels[n%12]+str(n//12-1) for n in notes[show]])
 ax.set_ylim(60,2500);ax.set_xticks(np.arange(start,end,.5));ax.grid(alpha=.2);fig.tight_layout();fig.savefig(p/f'spec-{start}-{end}.png');plt.close(fig)
