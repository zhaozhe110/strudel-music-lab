from pathlib import Path
from scipy.io import wavfile
from scipy.signal import stft,find_peaks, butter, sosfiltfilt
import numpy as np,json
import matplotlib;matplotlib.use('Agg')
import matplotlib.pyplot as plt
p=Path(__file__).parent
for name in ['drums','bass','other']:
 src=p.parent/'.pocket-reconstruction-voice'/f'{name}-first30s.wav'
 if not src.exists():continue
 r,y=wavfile.read(src);y=y.astype(float)/(32768 if y.dtype==np.int16 else 1);x=y[:int(9*r)].mean(1)
 f,t,Z=stft(x,r,nperseg=1024,noverlap=896);S=abs(Z)
 fig,axs=plt.subplots(2,1,figsize=(22,8));axs[0].plot(np.arange(len(x))/r,x,lw=.4);axs[0].set_xticks(np.arange(0,9,.22));axs[0].grid(alpha=.25)
 axs[1].pcolormesh(t,f,20*np.log10(S+1e-8),vmin=-80,vmax=-25,shading='auto');axs[1].set_ylim(0,8000);axs[1].set_xticks(np.arange(0,9,.22));axs[1].grid(alpha=.25);fig.tight_layout();fig.savefig(p/f'{name}-first9.png')
 for band,lo,hi in [('low',30,180),('mid',500,2000),('high',5000,12000)]:
  z=sosfiltfilt(butter(3,[lo,hi],fs=r,btype='bandpass',output='sos'),x)
  win=int(.01*r);e=np.sqrt(np.convolve(z*z,np.ones(win)/win,'same'))
  ids=find_peaks(e,distance=int(.15*r),prominence=e.max()*.15)[0]
  print(name,band,[(round(i/r,4),round(e[i],3)) for i in ids[:40]])
