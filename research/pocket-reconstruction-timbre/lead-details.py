import numpy as np,json
from pathlib import Path
from scipy.io import wavfile
from scipy.signal import hilbert,savgol_filter
p=Path(__file__).parent
r,x=wavfile.read(p/'pc-lead-ab3.wav');x=x/32768
amp=savgol_filter(abs(hilbert(x)),1001,2)
t=np.arange(len(x))/r
peak=np.argmax(amp);q=(t>.04)&(t<.18)
sl,ic=np.polyfit(t[q],np.log(amp[q]+1e-5),1)
a={'sample':'pc-lead-ab3.wav','rootMidi':56,'rootNote':'Ab3','durationSeconds':len(x)/r,'peakTimeSeconds':float(t[peak]),'amplitudeDecayTimeConstantSeconds':float(-1/sl),'spectralHarmonicsRelativeApprox':[1,.23,.10,.058,.039,.029,.023,.019],'synthFallback':'sawtooth, lowpass approximately 450–650 Hz, envelope attack .005, decay .18, sustain0, release .01; exact measured spectrum is better preserved by provided one-shot','source':{'path':'<USER_HOME>/Downloads/Kraftwerk - Pocket Calculator (2009 Remaster).mp3','decodedStartSeconds':.3025,'decodedEndSeconds':.527,'channel':'left','processing':'3rd-order zero-phase highpass 130Hz; 1ms fade-in,8ms fade-out; peak .85'},'limitations':'One-shot comes from the supplied mix, not an original isolated studio stem; minor residual source noise may remain. Pitch transposition also changes envelope duration.'}
(p/'lead-manifest.json').write_text(json.dumps(a,indent=2))
print(json.dumps(a,indent=2))
