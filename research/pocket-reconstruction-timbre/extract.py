from pathlib import Path
from scipy.io import wavfile
from scipy.signal import butter,sosfiltfilt
import numpy as np,json
p=Path(__file__).parent
sr,y=wavfile.read(p.parent/'.pocket-reconstruction-analysis/reference.wav');y=y/32768.
x=y[int(.31*sr):int(.50*sr)]
beta=np.sum(x[:,0]*x[:,1])/np.sum(x[:,0]**2)
print('first note R/L',beta, 'residual RMS', np.sqrt(np.mean((x[:,1]-beta*x[:,0])**2)), 'L RMS',np.sqrt(np.mean(x[:,0]**2)))
# strongest initial tone; remove tiny original noise below 130 Hz, retain natural timbre+envelope
start=.3025; end=.527
out=y[int(start*sr):int(end*sr),0]
out=sosfiltfilt(butter(3,130,fs=sr,btype='highpass',output='sos'),out)
out*=np.minimum(1,np.arange(len(out))/(.001*sr))*np.minimum(1,np.arange(len(out))[::-1]/(.008*sr))
peak=max(abs(out));out*=.85/peak
wavfile.write(p/'pc-lead-ab3.wav',sr,np.int16(np.clip(out,-1,1)*32767))
# separate stereo lead-dominant side signal and center-dominant bass information
x=y[:int(4*sr)]
lead=x[:,0]-x[:,1]
center=x[:,1]-beta*x[:,0]
for name,z in [('lead-side',lead),('center-minus-lead',center)]:
 wavfile.write(p/f'{name}-first4.wav',sr,np.int16(z/max(abs(z))*.85*32767))
print(json.dumps({'sample':'pc-lead-ab3.wav','rootMidi':56,'rootNote':'Ab3','sourceStart':start,'sourceEnd':end,'processing':'left channel; 3rd-order highpass 130 Hz; 1 ms fade-in / 8 ms fade-out; peak normalization .85','duration':len(out)/sr,'note':'isolated first lead note, no full-mix loop'},indent=2))
