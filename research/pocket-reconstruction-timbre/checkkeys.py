from pathlib import Path
from scipy.io import wavfile
from scipy.signal import find_peaks
import numpy as np
p=Path(__file__).parent;r,y=wavfile.read(p.parent/'.pocket-reconstruction-voice/other-float.wav');x=y.mean(1)
for t in [32.4463,32.9451,34.2821,39.5701,40.049,41.366,46.654,47.133,48.450,116.874,118.690]:
 a=x[int((t+.03)*r):int((t+.16)*r)];f=np.fft.rfftfreq(131072,1/r);s=abs(np.fft.rfft(a*np.hanning(len(a)),131072));ix=find_peaks(s)[0];ix=ix[(f[ix]>180)&(f[ix]<12000)];ix=ix[np.argsort(s[ix])[-12:][::-1]]
 print(t,[(round(f[i],1),round(69+12*np.log2(f[i]/440),1),round(s[i],2)) for i in ix])
