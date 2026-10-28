import numpy as np
from scipy.io import wavfile
from scipy.signal import find_peaks
from pathlib import Path
p=Path(__file__).parent
sr,y=wavfile.read(p/'reference.wav');y=y.mean(axis=1)/32768
names=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
for a,b in [(0.28,0.45),(.5,.63),(.7,.82),(.92,1.05),(1.15,1.27),(1.37,1.49),(1.58,1.71),(1.8,1.93),(2.02,2.15),(2.25,2.37),(2.47,2.58),(2.7,2.8),(2.9,3.03),(3.15,3.25),(3.37,3.47),(3.58,3.7)]:
 z=y[int(a*sr):int(b*sr)];s=np.abs(np.fft.rfft(z*np.hanning(len(z)),65536));f=np.fft.rfftfreq(65536,1/sr);ps=find_peaks(s,distance=8)[0];ps=ps[(f[ps]>40)&(f[ps]<2000)];ps=ps[np.argsort(s[ps])[-9:][::-1]]
 vals=[]
 for i in ps:
  n=69+12*np.log2(f[i]/440);nn=round(n);vals.append(f'{names[nn%12]}{nn//12-1} {f[i]:.1f}Hz {s[i]:.1f}')
 print(f'{a:.2f}: '+', '.join(vals))
