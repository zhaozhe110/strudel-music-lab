import os, time, json, wave
from pathlib import Path
os.environ.setdefault('PYTORCH_ENABLE_MPS_FALLBACK', '1')
import numpy as np
import torch, torchaudio

torch.set_num_threads(4)
torch.set_num_interop_threads(2)
root=Path('<LEGACY_WORKSPACE>')
outdir=root/'.pocket-reconstruction-voice'
outdir.mkdir(exist_ok=True)
source=root/'.pocket-reconstruction-analysis/reference.wav'
with wave.open(str(source)) as f:
    rate=f.getframerate();channels=f.getnchannels();nframes=f.getnframes()
    assert f.getsampwidth()==2
    x=np.frombuffer(f.readframes(nframes),dtype='<i2').reshape(-1,channels).astype(np.float32).T/32768.
assert rate==44100 and channels==2
start_all=time.monotonic()
print('Loading official HDEMUCS_HIGH_MUSDB_PLUS model',flush=True)
model=torchaudio.pipelines.HDEMUCS_HIGH_MUSDB_PLUS.get_model().eval()
device='mps' if torch.backends.mps.is_available() else 'cpu'
if device=='mps':
    # Keep the unchanged spectral calculations on CPU because MPS does not support complex tensors.
    spec,mag,mask,ispec=model._spec,model._magnitude,model._mask,model._ispec
    model._spec=lambda z:spec(z.cpu())
    model._magnitude=lambda z:mag(z).to('mps')
    model._mask=lambda z:mask(z.cpu())
    model._ispec=lambda z,length=None:ispec(z,length).to('mps')
model.to(device)
print('Model loaded:', device, 'sources=',model.sources,flush=True)
chunk=8*rate;overlap=2*rate;hop=chunk-overlap
acc=np.memmap(outdir/'stems.accum.float32',mode='w+',dtype=np.float32,shape=(4,2,nframes))
acc[:]=0
weight=np.zeros(nframes,dtype=np.float32)
window=np.ones(chunk,dtype=np.float32)
window[:overlap]=np.linspace(0,1,overlap,dtype=np.float32)
window[-overlap:]=np.linspace(1,0,overlap,dtype=np.float32)

def save_wave(filename,data):
    with wave.open(str(filename),'wb') as f:
        f.setnchannels(2);f.setsampwidth(2);f.setframerate(rate)
        f.writeframes((np.clip(data.T,-1,1)*32767).astype('<i2').tobytes())

def write_partial(frames,label):
    for j,name in enumerate(model.sources):
        y=np.asarray(acc[j,:,:frames])/np.maximum(weight[:frames],1e-8)
        save_wave(outdir/f'{name}-{label}.wav',y)
    print('SAVED',label,'seconds=',frames/rate,flush=True)

written_early=False
with torch.inference_mode():
    for index,start in enumerate(range(0,nframes,hop)):
        stop=min(nframes,start+chunk)
        data=np.zeros((2,chunk),dtype=np.float32)
        data[:,:stop-start]=x[:,start:stop]
        t=time.monotonic()
        estimate=model(torch.from_numpy(data)[None].to(device))[0].cpu().numpy()
        w=window.copy()
        if start==0:w[:overlap]=1
        if stop==nframes:w[-overlap:]=1
        w=w[:stop-start]
        acc[:,:,start:stop]+=estimate[:,:,:stop-start]*w
        weight[start:stop]+=w
        print(f'CHUNK {index+1} through {stop/rate:.2f}s / {nframes/rate:.2f}s, elapsed {time.monotonic()-t:.2f}s',flush=True)
        if not written_early and stop>=32*rate:
            write_partial(start,'first30s');written_early=True
        if stop==nframes:break
        if device=='mps':torch.mps.empty_cache()

stats={}
for j,name in enumerate(model.sources):
    y=np.asarray(acc[j])/np.maximum(weight,1e-8)
    save_wave(outdir/f'{name}.wav',y)
    stats[name]={'peak':float(np.max(np.abs(y))),'rms':float(np.sqrt(np.mean(y*y)))}
report={'model':'torchaudio.pipelines.HDEMUCS_HIGH_MUSDB_PLUS','modelWeights':'models/hdemucs_high_trained.pt','source':str(source),'duration':nframes/rate,'sampleRate':rate,'device':device,'adapter':'CPU complex spectral transforms with MPS neural layers' if device=='mps' else 'CPU','chunkSeconds':chunk/rate,'overlapSeconds':overlap/rate,'elapsedSeconds':time.monotonic()-start_all,'stems':stats,'note':'AI-separated estimates, not official isolated stems; may contain bleed/artifacts.'}
(outdir/'separation-report.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2),flush=True)
