import numpy as np,json
from scipy.io import wavfile
from scipy.signal import resample_poly,stft,find_peaks
from scipy.ndimage import gaussian_filter1d
from pathlib import Path
p=Path(__file__).parent
sr,y=wavfile.read(p.parent/'.pocket-reconstruction-voice'/'other.wav');y=y.astype(float).mean(axis=1)/32768;x=resample_poly(y,1,2);fs=sr/2
f,t,Z=stft(x,fs=fs,nperseg=2048,noverlap=2048-220,nfft=4096);S=abs(Z)
notes=np.arange(76,97);scores=[];data=[]
for n in notes:
 fr=440*2**((n-69)/12)
 def amp(h):
  ix=abs(f-fr*h)<max(12,fr*h*.015)
  if not ix.any():return np.zeros(len(t))
  return S[ix].max(axis=0)
 a1=amp(1);a3=amp(3);a5=amp(5);sub=amp(.5)+amp(1/3)
 purity=a1/(sub+a1+1e-6)
 # All true square notes need fundamental and thirdharmonic.
 score=np.sqrt(a1*a3)*purity
 scores.append(score)
 for k in find_peaks(gaussian_filter1d(score,.65),height=.009,prominence=.006,distance=12)[0]:
  if a1[k]<.025 or a3[k]<.003 or purity[k]<.73:continue
  act=gaussian_filter1d(score,.65);level=act[k]*.28;l=k;r=k
  while l>0 and act[l-1]>level and k-l<100:l-=1
  while r<len(t)-1 and act[r+1]>level and r-k<100:r+=1
  if t[r]-t[l]<.045:continue
  data.append(dict(startSeconds=round(float(t[l]),4),durationSeconds=round(float(t[r]-t[l]),4),midi=int(n),velocity=round(float(min(1.1,np.sqrt(a1[k]/.08))),3),pan=.6,confidence='high' if purity[k]>.9 else'medium',purity=round(float(purity[k]),3),strength=round(float(score[k]),4)))
data.sort(key=lambda e:(e['startSeconds'],e['midi']))
clean=[]
for e in data:
 peers=[v for v in data if abs(v['startSeconds']-e['startSeconds'])<.15 and abs(v['midi']-e['midi'])<=1]
 if e['strength']<max(v['strength'] for v in peers):continue
 if clean and e['midi']==clean[-1]['midi'] and e['startSeconds']<clean[-1]['startSeconds']+clean[-1]['durationSeconds']-.02:continue
 clean.append(e)
(p/'calculator-events-pure.json').write_text(json.dumps(clean,indent=2));print('total',len(clean));print(json.dumps(clean[:30],indent=2))
