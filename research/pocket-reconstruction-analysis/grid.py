import numpy as np
from scipy.io import wavfile
from scipy.signal import butter,sosfiltfilt,find_peaks,resample_poly
from scipy.ndimage import gaussian_filter1d
from scipy.optimize import minimize_scalar
from pathlib import Path
import json
p=Path(__file__).parent
sr,y=wavfile.read(p/'reference.wav'); y=y.mean(axis=1)/32768
x=resample_poly(y,1,22);sr=sr/22
z=sosfiltfilt(butter(3,150,fs=sr,output='sos'),x)
env=gaussian_filter1d(z*z,3)
ons=np.maximum(env-gaussian_filter1d(env,30),0)
peaks,_=find_peaks(ons,prominence=.001,distance=int(sr*.15));times=peaks/sr
print('peaks first 10',times[times<10].round(4).tolist())
# periodic phase concentration over bass hits
for a,b in [(0,30),(0,100),(50,150),(150,250),(0,295)]:
 tt=times[(times>a)&(times<b)]; ww=ons[peaks[(times>a)&(times<b)]]
 def score(bpm):return -abs(np.sum(ww*np.exp(2j*np.pi*tt*bpm/60)))
 opt=minimize_scalar(score,bounds=(135,137),method='bounded');bpm=opt.x
 angle=np.angle(np.sum(ww*np.exp(2j*np.pi*tt*bpm/60)));offset=angle/(2*np.pi)*60/bpm
 print('fit',a,b,bpm,offset, 'score',-opt.fun/ww.sum())
# at eighth grid, show energy
print('peaks first 40',list(zip(times[times<40].round(4).tolist(),ons[peaks[times<40]].round(5).tolist())))
