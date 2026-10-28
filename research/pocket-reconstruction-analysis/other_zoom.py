import numpy as np
from scipy.io import wavfile
from scipy.signal import stft,resample_poly
import matplotlib;matplotlib.use('Agg')
import matplotlib.pyplot as plt
from pathlib import Path
p=Path(__file__).parent
sr,y=wavfile.read(p.parent/'.pocket-reconstruction-voice'/'other.wav');y=y[:int(7.5*sr)].astype(float)/32768
y=y[:,0]
x=resample_poly(y,1,4);fs=sr/4
f,t,Z=stft(x,fs=fs,nperseg=2048,noverlap=2048-32,nfft=8192)
S=np.abs(Z)
fig,ax=plt.subplots(figsize=(22,12));sel=(f>180)&(f<1700)
ax.pcolormesh(t,f[sel],20*np.log10(S[sel]+1e-7),vmin=-62,vmax=-22,cmap='magma',shading='auto');ax.set_yscale('log')
notes=np.arange(55,92);freq=440*2**((notes-69)/12);labels=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];ax.set_yticks(freq);ax.set_yticklabels([labels[n%12]+str(n//12-1) for n in notes]);ax.set_ylim(180,1700)
ax.set_xticks(.3025+np.arange(34)*60/136/2);ax.set_xticklabels([str(k) for k in range(34)]);ax.grid(alpha=.5);fig.tight_layout();fig.savefig(p/'other-zoom.png')
