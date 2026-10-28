from pathlib import Path
from scipy.io import wavfile
from scipy.signal import butter,sosfiltfilt,find_peaks
from scipy.cluster.vq import kmeans2
from scipy.ndimage import uniform_filter1d
import numpy as np,json
p=Path(__file__).parent; src=p.parent/'.pocket-reconstruction-voice'
r,dr=wavfile.read(src/'drums-float.wav');dr=dr.astype(float)
x=dr.mean(1); hi=sosfiltfilt(butter(3,[5000,14000],btype='bandpass',fs=r,output='sos'),x)
env=np.sqrt(uniform_filter1d(hi*hi,int(r*.003)))
# Electronic hi-hat pulse also marks simultaneous kick/snare strikes.
pk,_=find_peaks(env,distance=int(.115*r),prominence=.0018,height=.002)
onsets=[]
for i in pk:
 lo=max(0,i-int(.040*r));a=np.where(env[lo:i]<env[i]*.13)[0];on=lo+a[-1] if len(a) else lo
 if on/r<.28 or on/r>296:continue
 if onsets and (on-onsets[-1])/r<.11:continue
 onsets.append(on)
N=int(.185*r);F=np.fft.rfftfreq(16384,1/r);edges=np.geomspace(25,15000,33)
features=[];energy=[];chunks=[]
for on in onsets:
 a=dr[on:on+N];a=np.pad(a,((0,max(0,N-len(a))),(0,0)));chunks.append(a)
 s=abs(np.fft.rfft(a.mean(1)*np.hanning(N),n=16384))**2
 feat=np.array([s[(F>=edges[k])&(F<edges[k+1])].sum() for k in range(32)])**.5
 energy.append(np.linalg.norm(feat));features.append(feat/(np.linalg.norm(feat)+1e-8))
features=np.array(features);energy=np.array(energy)
cent,labels=kmeans2(features,6,minit='++',iter=80,seed=42)
manifest=[];base_rms={};base_energy={}
for label in range(6):
 ids=np.where(labels==label)[0]; # choose representative nearest center, retaining sufficient amplitude
 dist=np.linalg.norm(features[ids]-cent[label],axis=1)
 valid=energy[ids]>np.quantile(energy[ids],.35)
 dist[~valid]=1e8
 ii=ids[np.argmin(dist)]
 a=chunks[ii].copy();peak=np.max(abs(a));scale=.78/peak
 a*=scale
 fade=np.minimum(1,np.arange(N)/(.0007*r))*np.minimum(1,np.arange(N)[::-1]/(.012*r));a*=fade[:,None]
 file=f'pc-kit-{label}.wav';wavfile.write(p/file,r,np.int16(np.clip(a,-1,1)*32767))
 base_energy[label]=energy[ii];base_rms[label]=float(np.sqrt(np.mean(a*a)))
 manifest.append({'name':f'pcKit{label}','file':file,'sourceTimeSeconds':onsets[ii]/r,'durationSeconds':N/r,'normalizationScale':scale,'normalizedRms':base_rms[label],'numEvents':len(ids),'sourceStem':'AI-separated drums.wav','role':'individual electronic kit strike, possibly simultaneous kick/snare/hat'})
# absolute native reconstructed gains ~ original rms rather than uniformly loud
kit=[]
for i,on in enumerate(onsets):
 lab=int(labels[i]);ii=manifest[lab];gain=float(np.clip(energy[i]/base_energy[lab]/ii['normalizationScale'],.008,1.5))
 kit.append({'time':round(on/r,6),'kit':lab,'gain':round(gain,5)})
(p/'kit-events.json').write_text(json.dumps(kit,indent=2));(p/'kit-manifest.json').write_text(json.dumps(manifest,indent=2))
print('kit events',len(kit),'first40',kit[:40]);print('kit manifest',json.dumps(manifest))
# Bass source is close to isolated; extract one Bb1 note and detect its absolute onsets.
r,ba=wavfile.read(src/'bass.wav');ba=ba.astype(float)/32768;x=ba.mean(1)
z=sosfiltfilt(butter(3,[35,800],btype='bandpass',fs=r,output='sos'),x)
en=np.sqrt(uniform_filter1d(z*z,int(r*.008)))
bp,_=find_peaks(en,distance=int(.115*r),prominence=.022,height=.04)
events=[]
for i in bp:
 lo=max(0,i-int(.13*r));a=np.where(en[lo:i]<en[i]*.12)[0];on=lo+a[-1] if len(a) else lo
 if on/r<.3 or on/r>296:continue
 if events and on/r-events[-1]['time']<.10:continue
 seg=x[on+int(.04*r):on+int(.16*r)];n=65536;ff=np.fft.rfftfreq(n,1/r);spec=abs(np.fft.rfft(seg*np.hanning(len(seg)),n=n))
 # Bass line roots lie in Bb1–Eb2; octave ghost plucks stand one octave higher.
 inds=find_peaks(spec)[0];inds=inds[(ff[inds]>45)&(ff[inds]<185)]
 winner=inds[np.argmax(spec[inds])];fund=ff[winner];midi=round(69+12*np.log2(fund/440))
 events.append({'time':round(on/r,6),'midi':midi,'peakEnvelope':round(float(en[i]),5),'freq':round(float(fund),3)})
start=.527;end=.743;a=ba[int(start*r):int(end*r)].copy();peak=np.max(abs(a));scale=.78/peak
fade=np.minimum(1,np.arange(len(a))/(.001*r))*np.minimum(1,np.arange(len(a))[::-1]/(.012*r));a*=scale*fade[:,None]
wavfile.write(p/'pc-bass-bb1.wav',r,np.int16(np.clip(a,-1,1)*32767))
rootpeak=events[0]['peakEnvelope']
for e in events:e['gain']=round(float(np.clip(e['peakEnvelope']/rootpeak/scale,.02,1.5)),5)

# Bass attacks are gently rising. Align detected envelope events to the nearest
# original drum-clock eighth, removing spurious inter-note envelope peaks.
kit_times=np.array([v['time'] for v in kit])
clean=[]
for e in events:
 nearest=int(np.argmin(abs(kit_times-e['time'])))
 delta=e['time']-kit_times[nearest]
 if abs(delta)>.075:continue
 e['detectedTime']=e['time'];e['time']=round(float(kit_times[nearest]-.0014),6)
 if clean and e['time']==clean[-1]['time']:continue
 clean.append(e)
events=clean
(p/'bass-events.json').write_text(json.dumps(events,indent=2));(p/'bass-manifest.json').write_text(json.dumps({'name':'pcBass','file':'pc-bass-bb1.wav','rootMidi':34,'rootNote':'Bb1','sourceTimeSeconds':start,'durationSeconds':end-start,'normalizationScale':scale,'sourceStem':'AI-separated bass.wav','note':'Single source note sampled and re-performed; no continuous bass stem in final music'},indent=2))
print('bass events',len(events),'first50',events[:50])
