import numpy as np
from scipy.io import wavfile
from scipy.signal import butter,sosfiltfilt,resample_poly,find_peaks
from scipy.ndimage import gaussian_filter1d
from pathlib import Path
import json
p=Path(__file__).parent
sr,y=wavfile.read(p/'reference.wav');y=y.mean(axis=1)/32768
x=resample_poly(y,1,4);sr=sr/4
z=sosfiltfilt(butter(3,[1800,5000],btype='bandpass',fs=sr,output='sos'),x)
e=gaussian_filter1d(z*z,15)[::10];tt=np.arange(len(e))*10/sr
flux=np.maximum(e-np.roll(e,3),0)
peaks,_=find_peaks(flux,distance=8,prominence=.00005);times=tt[peaks];w=flux[peaks]
res=[]
for a,b in [(0,30),(30,60),(60,90),(90,120),(120,150),(150,180),(180,210),(210,240),(240,270),(270,295),(0,295)]:
 sel=(times>=a)&(times<b);t=times[sel];ww=w[sel]
 bpms=np.arange(134,138,.002);scores=np.array([abs(np.sum(ww*np.exp(2j*np.pi*t*bpm/30)))/ww.sum() for bpm in bpms]);i=np.argmax(scores);bpm=bpms[i];ph=np.angle(np.sum(ww*np.exp(2j*np.pi*t*bpm/30)));offset=ph/(2*np.pi)*30/bpm
 res.append(dict(start=a,end=b,bpm=round(bpm,4),phase=round(offset,5),strength=round(scores[i],4)))
print(json.dumps(res,indent=2));(p/'tempo.json').write_text(json.dumps(res,indent=2))
