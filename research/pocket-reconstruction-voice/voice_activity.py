import wave,json
from pathlib import Path
import numpy as np
root=Path('<LEGACY_WORKSPACE>/.pocket-reconstruction-voice')
with wave.open(str(root/'vocals.wav')) as f:
 sr=f.getframerate(); x=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').reshape(-1,2).astype(np.float32)/32768
hop=int(sr*.02)
frames=len(x)//hop
a=x[:frames*hop].reshape(frames,hop,2)
rms=np.sqrt(np.mean(a*a,axis=(1,2)))
threshold=max(.007,float(np.quantile(rms,.65)*.45))
active=rms>threshold
# Fill speech gaps up to 320 ms.
for i in range(1,len(active)-1):
 if active[i-1] and not active[i]:
  after=np.flatnonzero(active[i:i+17])
  if len(after):active[i:i+after[0]]=True
changes=np.diff(np.r_[False,active,False].astype(int))
segments=[]
for start,end in zip(np.flatnonzero(changes==1),np.flatnonzero(changes==-1)):
 if (end-start)*.02<.25:continue
 s=max(0,start*.02-.06);e=min(len(x)/sr,end*.02+.09)
 segments.append({'startSeconds':round(s,3),'endSeconds':round(e,3),'durationSeconds':round(e-s,3),'rms':round(float(np.sqrt(np.mean(x[int(s*sr):int(e*sr)]**2))),5)})
(root/'voice-activity.json').write_text(json.dumps({'note':'Energy-based candidates only; may include instrument leakage. Listen before choosing vocal slices.','rmsThreshold':threshold,'segments':segments},indent=2))
print(json.dumps(segments,indent=2))
