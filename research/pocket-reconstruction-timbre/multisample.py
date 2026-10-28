from pathlib import Path
from scipy.io import wavfile
from scipy.signal import butter,sosfiltfilt
import numpy as np,json
p=Path(__file__).parent;r,y=wavfile.read(p.parent/'.pocket-reconstruction-voice/other-float.wav');y=y.astype(float)
manifest=[]
for note,midi,start, dur in [('bb3',58,.526,.217),('f4',65,11.766,.217),('eb4',63,2.951,.217),('d4',62,3.173,.218),('c4',60,7.143,.205)]:
 freq=440*2**((midi-69)/12)
 x=y[int(start*r):int((start+dur)*r),0]
 x=sosfiltfilt(butter(3,freq*.68,fs=r,btype='highpass',output='sos'),x)
 fade=np.minimum(1,np.arange(len(x))/(.001*r))*np.minimum(1,np.arange(len(x))[::-1]/(.009*r));x*=fade
 peak=max(abs(x));scale=.85/peak;x*=scale
 file=f'pc-lead-{note}.wav';wavfile.write(p/file,r,np.int16(np.clip(x,-1,1)*32767))
 manifest.append({'file':file,'rootNote':note,'rootMidi':midi,'sourceTimeSeconds':start,'durationSeconds':dur,'normalizationScale':scale,'processing':f'AI-separated other stem, left channel, highpass {freq*.68:.1f} Hz, edge fades; source bleed may remain'})
# First Ab3 note is more isolated in the source mix than in model estimate.
a=json.loads((p/'lead-manifest.json').read_text());a['file']=a.pop('sample');manifest.insert(0,a)
(p/'lead-multisamples.json').write_text(json.dumps(manifest,indent=2));print(json.dumps(manifest,indent=2))
