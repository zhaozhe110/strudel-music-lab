from pathlib import Path
from scipy.io import wavfile
from scipy.signal import find_peaks,butter,sosfiltfilt
import numpy as np,json
p=Path(__file__).parent;r,y=wavfile.read(p.parent/'.pocket-reconstruction-voice/other-float.wav');y=y.astype(float)
for t in [18.059,19.8349,42.6598,204.509,232.793]:
 a=y[int((t+.03)*r):int((t+.15)*r)].mean(1);f=np.fft.rfftfreq(131072,1/r);s=abs(np.fft.rfft(a*np.hanning(len(a)),131072));ix=find_peaks(s)[0];ix=ix[(f[ix]>180)&(f[ix]<4000)];ix=ix[np.argsort(s[ix])[-12:][::-1]]
 print(t,[(round(f[i],1),round(69+12*np.log2(f[i]/440),1),round(s[i],2)) for i in ix])
manifest=[]
for name,midi,t,dur,cut in [('ab4',68,42.653,.205,330),('bb4',70,204.501,.205,370)]:
 a=y[int(t*r):int((t+dur)*r)]
 a=sosfiltfilt(butter(4,cut,fs=r,btype='highpass',output='sos'),a,axis=0)
 peak=max(abs(a).ravel());scale=.8/peak
 fade=np.minimum(1,np.arange(len(a))/(.001*r))*np.minimum(1,np.arange(len(a))[::-1]/(.015*r));a*=scale*fade[:,None]
 file=f'pc-midkeys-{name}.wav';wavfile.write(p/file,r,np.int16(np.clip(a,-1,1)*32767))
 manifest.append({'file':file,'rootMidi':midi,'rootNote':name,'sourceTimeSeconds':t,'durationSeconds':dur,'normalizationScale':scale,'processing':f'AI-separated other stem, highpass {cut}Hz, edge fades','limitation':'Residual accompaniment and pitch modulation may remain; sampled individualnote, not studio isolated stem'})
(p/'midkeys-manifest.json').write_text(json.dumps(manifest,indent=2))
