import numpy as np
from scipy.io import wavfile
from scipy.signal import stft,resample_poly,find_peaks
from scipy.ndimage import gaussian_filter1d,maximum_filter1d,median_filter
from scipy.optimize import nnls
from pathlib import Path
import json
p=Path(__file__).parent
sr,y=wavfile.read(p.parent/'.pocket-reconstruction-voice'/'other.wav');y=y.astype(float).mean(axis=1)/32768
fs=11025;x=resample_poly(y,1,4)
f,t,Z=stft(x,fs=fs,nperseg=2048,noverlap=2048-220,nfft=4096)
S=np.abs(Z);sel=(f>=170)&(f<4000);F=f[sel];S=S[sel]
# Emphasize harmonics over the powerful fundamentals.
w=np.sqrt(F/200)
notes=np.arange(55,89)
f0s=440*2**((notes-69)/12)
D=[]
for fr in f0s:
 spec=np.zeros(len(F))
 for h in range(1,int(4000/fr)+1):
  spec+=np.exp(-.5*((F-fr*h)/(5.5+.0015*fr*h))**2)/(h**1.75)
 D.append(spec)
# average bass-only short offbeat spectral template and snare leakage templates
for a,b in [(.99,1.09),(1.43,1.51),(.76,.80),(1.63,1.68)]:
 D.append(np.mean(S[:,(t>a)&(t<b)],axis=1))
D=np.array(D).T*w[:,None];D/=np.linalg.norm(D,axis=0)
Y=S*w[:,None]
# multiplicative nonnegative fit, efficiently BLAS via Gram matrix.
G=D.T@D;DY=D.T@Y;X=np.maximum(DY,1e-12)
for _ in range(180):X*=np.maximum(DY,1e-12)/(G@X+1e-12)
np.savez_compressed(p/'lead-activations.npz',t=t,notes=notes,X=X[:len(notes)])
# Find per-note attacks and durations.
events=[]
for i,n in enumerate(notes):
 act=gaussian_filter1d(X[i],.55)
 peaks,props=find_peaks(act,prominence=max(.007,act.max()*.035),distance=6)
 for k,pr in zip(peaks,props['prominences']):
  if act[k]<.012:continue
  level=max(act[k]*.22,act[k]-pr*.82)
  l=k;r=k
  while l>0 and act[l-1]>level and k-l<45:l-=1
  while r<len(t)-1 and act[r+1]>level and r-k<60:r+=1
  duration=t[r]-t[l]
  if duration<.035:continue
  events.append(dict(time=round(float(t[l]),4),duration=round(float(duration),4),midi=int(n),strength=round(float(act[k]),5),prominence=round(float(pr),5)))
events.sort(key=lambda e:(e['time'],e['midi']))
(p/'lead-events-raw.json').write_text(json.dumps(events,indent=2))
for e in events:
 if e['time']<14.5:print(e)
print('events total',len(events))
