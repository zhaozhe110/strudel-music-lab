from pathlib import Path
from scipy.io import wavfile
from scipy.signal import find_peaks, stft
import numpy as np
import matplotlib;matplotlib.use('Agg')
import matplotlib.pyplot as plt
p=Path(__file__).parent
sr,y=wavfile.read(p.parent/'.pocket-reconstruction-analysis/reference.wav');y=y/32768.
notes=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
def peaks(a,b):
 x=y[int(a*sr):int(b*sr)].mean(1);n=131072
 f=np.fft.rfftfreq(n,1/sr);s=abs(np.fft.rfft(x*np.hanning(len(x)),n=n));
 ids=find_peaks(s)[0];ids=ids[(f[ids]>60)&(f[ids]<9000)];ids=ids[np.argsort(s[ids])[-25:][::-1]]
 out=[]
 for i in ids:
  midi=69+12*np.log2(f[i]/440);mn=round(midi);out.append((round(f[i],1),notes[mn%12]+str(mn//12-1),round((midi-mn)*100),round(float(s[i]),2)))
 print(a,b,out)
for a,b in [(.3,.44),(.51,.63),(.65,.76),(.81,.95),(1.07,1.2),(1.3,1.41),(1.5,1.62),(1.72,1.85),(2.13,2.27),(2.8,2.92),(3,3.12)]:peaks(a,b)
fig,axs=plt.subplots(4,1,figsize=(20,12))
for i in range(2):
 x=y[:int(4*sr),i];t=np.arange(len(x))/sr
 axs[i].plot(t,x,lw=.3);axs[i].set_xticks(np.arange(0,4,.1));axs[i].grid(alpha=.3)
 f,t,Z=stft(x,fs=sr,nperseg=1024,noverlap=896)
 axs[i+2].pcolormesh(t,f,20*np.log10(abs(Z)+1e-8),vmin=-65,vmax=-20,shading='auto');axs[i+2].set_ylim(0,9000);axs[i+2].set_xticks(np.arange(0,4,.1));axs[i+2].grid(alpha=.3)
fig.tight_layout();fig.savefig(p/'first-four.png')
