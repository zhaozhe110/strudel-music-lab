from pathlib import Path
from scipy.io import wavfile
from scipy.signal import find_peaks,butter,sosfiltfilt
import numpy as np,json
p=Path(__file__).parent;r,y=wavfile.read(p.parent/'.pocket-reconstruction-voice/other-float.wav');y=y.astype(float)
events=json.loads((p.parent/'.pocket-reconstruction-analysis/lead-events-raw.json').read_text())
for midi in [65]:
 cand=[e for e in events if e['midi']==midi and e['time']<30 and e['strength']>.05]
 out=[]
 for e in cand:
  t=e['time'];a=y[int((t+.04)*r):int((t+.17)*r),0];s=abs(np.fft.rfft(a*np.hanning(len(a)),65536));f=np.fft.rfftfreq(65536,1/r);f0=440*2**((midi-69)/12)
  score=s[abs(f-f0)<8].max()/(s[(f>180)&(f<300)].max()+1e-8)
  out.append((score,t))
 print(midi,sorted(out,reverse=True)[:10])
# Further F#6 square buzzer and G5 square buzzer are one-shot effects with original tuning retained.
manifest=[]
for name,midi,t,dur,cut in [('fs6',90,116.874,.28,1100),('g5',79,118.69,.26,650)]:
 a=y[int(t*r):int((t+dur)*r)]
 a=sosfiltfilt(butter(4,cut,fs=r,btype='highpass',output='sos'),a,axis=0)
 # Keep spatial character; edge fades avoid sample clicks.
 peak=max(abs(a).ravel());scale=.8/peak
 fade=np.minimum(1,np.arange(len(a))/(.001*r))*np.minimum(1,np.arange(len(a))[::-1]/(.015*r));a*=scale*fade[:,None]
 file=f'pc-buzz-{name}.wav';wavfile.write(p/file,r,np.int16(np.clip(a,-1,1)*32767))
 manifest.append({'file':file,'rootMidi':midi,'rootNote':name,'sourceTimeSeconds':t,'durationSeconds':dur,'normalizationScale':scale,'processing':f'AI-separated other stem, highpass {cut}Hz, edge fades','confidence':'F#6 spectrum1490/4471/7452; G5 spectrum780/2340/3900; oddharmonics confirm square-like carrier','limitation':'Residual accompaniment and pitch modulation may remain; these are sampled FX, not clean studio stems'})
(p/'buzz-manifest.json').write_text(json.dumps(manifest,indent=2))
