from pathlib import Path
from scipy.io import wavfile
from scipy.signal import butter,sosfiltfilt,find_peaks
import numpy as np,json
p=Path(__file__).parent
notes=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
for name in ['bass','other','drums']:
 src=p.parent/'.pocket-reconstruction-voice'/f'{name}.wav'
 if not src.exists():src=p.parent/'.pocket-reconstruction-voice'/f'{name}-first30s.wav'
 r,y=wavfile.read(src);y=y.astype(float)/32768;x=y.mean(1)
 print(name)
 for k in range(32):
  t=.304+k*60/136.034/2;a=int((t+.035)*r);b=int((t+.15)*r)
  xx=x[a:b];spec=abs(np.fft.rfft(xx*np.hanning(len(xx)),n=65536));freq=np.fft.rfftfreq(65536,1/r);sel=(freq>45)&(freq<190)
  i=np.argmax(spec[sel]);ff=freq[sel][i];mm=69+12*np.log2(ff/440);mn=round(mm)
  print(k,round(t,3),round(np.sqrt(np.mean(xx*xx)),3),round(ff,1),notes[mn%12]+str(mn//12-1),round(mm-mn,2))
