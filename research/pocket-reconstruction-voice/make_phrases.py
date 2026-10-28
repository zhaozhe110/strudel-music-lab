import wave, json, struct
from pathlib import Path
import numpy as np
root=Path('<LEGACY_WORKSPACE>')
out=root/'.pocket-reconstruction-voice'

def readwav(p):
 with wave.open(str(p)) as f:
  return f.getframerate(),np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').reshape(-1,f.getnchannels()).astype(np.float32)/32768
sr,voice=readwav(out/'vocals.wav')
_,mix=readwav(root/'.pocket-reconstruction-analysis/reference.wav')
length=len(voice)
# Write unbounded float WAV for the two instrument stems with >1 peak.
acc=np.memmap(out/'stems.accum.float32',mode='r',dtype=np.float32,shape=(4,2,length))
chunk=8*sr;overlap=2*sr;hop=chunk-overlap
win=np.ones(chunk,dtype=np.float32);win[:overlap]=np.linspace(0,1,overlap,dtype=np.float32);win[-overlap:]=np.linspace(1,0,overlap,dtype=np.float32)
weights=np.zeros(length,dtype=np.float32)
for start in range(0,length,hop):
 stop=min(length,start+chunk);w=win.copy()
 if start==0:w[:overlap]=1
 if stop==length:w[-overlap:]=1
 weights[start:stop]+=w[:stop-start]
 if stop==length:break
for stemidx,name in [(0,'drums'),(2,'other')]:
 y=np.asarray(acc[stemidx])/np.maximum(weights,1e-8)
 data=y.T.astype('<f4').tobytes()
 with open(out/f'{name}-float.wav','wb') as f:
  f.write(b'RIFF'+struct.pack('<I',36+len(data))+b'WAVEfmt '+struct.pack('<IHHIIHH',16,3,2,sr,sr*8,8,32)+b'data'+struct.pack('<I',len(data))+data)

frame=int(.01*sr);n=length//frame
v=voice[:n*frame].reshape(n,frame,2);r=(mix-voice)[:n*frame].reshape(n,frame,2)
vr=np.sqrt(np.mean(v*v,axis=(1,2)));rr=np.sqrt(np.mean(r*r,axis=(1,2)))
ratio=vr/np.maximum(rr,.001)
# Ratio gate selects confident voice; bridging preserves quiet consonants and intra-clause pauses.
active=(vr>.007)
def close_gaps(a,maxgap):
 a=a.copy();chg=np.diff(np.r_[False,~a,False].astype(int))
 for b,e in zip(np.flatnonzero(chg==1),np.flatnonzero(chg==-1)):
  if b>0 and e<len(a) and e-b<=maxgap:a[b:e]=True
 return a
active=close_gaps(active,40)
chg=np.diff(np.r_[False,active,False].astype(int))
regions=[]
for b,e in zip(np.flatnonzero(chg==1),np.flatnonzero(chg==-1)):
 if (e-b)*.01<.2:continue
 if np.max(vr[b:e])<.025 or np.mean(ratio[b:e]>.055)<.05:continue
 # Expand to retain phrase attack and room/effect tails; do not normalize the audio.
 start=max(0,b*.01-.10);end=min(length/sr,e*.01+.18)
 if regions and start-regions[-1][1]<.35:regions[-1][1]=end
 else:regions.append([start,end])
# Split long clauses at natural low-energy gaps only where both sides remain >=0.6s.
segments=[]
for start,end in regions:
 if end-start>3:
  a=int((start+.7)/.01);b=int((end-.7)/.01)
  smooth=np.convolve(vr,np.ones(10)/10,mode='same')
  if b>a:
   j=a+int(np.argmin(smooth[a:b]))
   if smooth[j]<.012:
    point=j*.01
    segments.extend([[start,point],[point,end]])
    continue
 segments.append([start,end])

phrases=out/'phrases';phrases.mkdir(exist_ok=True)
manifest=[]
for i,(start,end) in enumerate(segments):
 b=int(round(start*sr));e=int(round(end*sr));y=voice[b:e].copy()
 fade=min(int(.007*sr),len(y)//2)
 y[:fade]*=np.linspace(0,1,fade,dtype=np.float32)[:,None]
 y[-fade:]*=np.linspace(1,0,fade,dtype=np.float32)[:,None]
 name=f'pc-voice-{i:02d}.wav'
 with wave.open(str(phrases/name),'wb') as f:
  f.setnchannels(2);f.setsampwidth(2);f.setframerate(sr);f.writeframes((y*32767).astype('<i2').tobytes())
 manifest.append({'index':i,'sample':f'pcVoice{i:02d}','file':name,'absoluteStartSeconds':b/sr,'absoluteEndSeconds':e/sr,'durationSeconds':(e-b)/sr,'gain':1,'peak':float(np.max(np.abs(y))),'rms':float(np.sqrt(np.mean(y*y))),'ratioMedianVoiceToRemainder':float(np.median(ratio[int(start/.01):int(end/.01)]))})
report={'source':'vocals.wav','sourceOriginalFile':'<USER_HOME>/Downloads/Kraftwerk - Pocket Calculator (2009 Remaster).mp3','model':'torchaudio.pipelines.HDEMUCS_HIGH_MUSDB_PLUS','sampleRate':sr,'channels':2,'processing':'Model-separated vocal estimates; 10ms RMS + voice/remainder ratio selection; adjacent gaps bridged; original amplitude retained; 7ms edge fades; no time stretch or pitch shift. Some long clauses split at low-energy gaps without overlap.','limitations':'AI-estimated vocal stems can retain instrumentation and separation artifacts; these are not official isolated multitracks. Inside each clip no speech/noise gate is applied, preserving consonants and natural gaps.','clips':manifest}
(out/'phrases-manifest.json').write_text(json.dumps(report,indent=2))
print(json.dumps(manifest,indent=2))
