import numpy as np
from scipy.io import wavfile
from scipy.signal import find_peaks
from pathlib import Path
p=Path(__file__).parent
sr,y=wavfile.read(p/'reference.wav'); y=(y[:,0].astype(float)-y[:,1].astype(float))/32768
names=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
notes=np.arange(43,85)
freqs=440*2**((notes-69)/12)
for k in range(64):
 a=.275+k*60/136/2+.025;b=a+.12
 z=y[int(a*sr):int(b*sr)];sp=np.abs(np.fft.rfft(z*np.hanning(len(z)),65536));f=np.fft.rfftfreq(65536,1/sr)
 scores=[]
 for nu,fr in zip(notes,freqs):
  hs=[]
  for h in [1,2,3,4,5,6]:
   sel=(f>fr*h*.994)&(f<fr*h*1.006);near=(f>fr*h*.97)&(f<fr*h*1.03)
   hs.append(sp[sel].max() if sel.sum() else 0)
  score=hs[0]*(hs[1]+hs[2]+hs[3])/3
  scores.append(score)
 inds=np.argsort(scores)[-5:][::-1]
 print(f'{k:2d} {a-.025:6.3f}: '+', '.join(f'{names[notes[i]%12]}{notes[i]//12-1} {scores[i]:.0f}' for i in inds))
