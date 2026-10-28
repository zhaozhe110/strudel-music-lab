import numpy as np,json
from pathlib import Path
p=Path(__file__).parent
raw=json.loads((p/'lead-events-raw.json').read_text())
thresholds={56:.055,58:.060,60:.045,62:.045,63:.048,65:.035,67:.065,68:.05,70:.06,72:.055,74:.055,75:.055,77:.06,78:.06,79:.06,80:.055,82:.06,84:.065,86:.07,87:.07,88:.07}
candidates=[]
for e in raw:
 n=e['midi']
 if n not in thresholds:continue
 th=thresholds[n]
 if e['time']>282: th*=max(.3,1-(e['time']-282)/20)
 if e['strength']<th or e['duration']<.055 or e['prominence']/e['strength']<.35:continue
 candidates.append(e)
# Remove overtone-only simultaneous detections and pitch-neighbor leakage.
clean=[]
for e in candidates:
 peers=[o for o in candidates if abs(o['time']-e['time'])<.07 and o is not e]
 if any(e['midi']-o['midi'] in [12,19,24,28,31] and o['strength']>e['strength']*1.5 for o in peers):continue
 if any(abs(e['midi']-o['midi'])==1 and o['strength']>e['strength']*1.6 for o in peers):continue
 if e['midi']==58 and any(o['midi'] in [56,60,62,63,65] and o['strength']>e['strength']*.45 for o in peers):continue
 if e['midi']==65 and any(o['midi']==63 and o['strength']>e['strength']*1.3 for o in peers):continue
 clean.append(e)
# Merge repeat detections inside a sustained event.
merged=[]
for e in clean:
 prev=next((o for o in reversed(merged) if o['midi']==e['midi'] and e['time']-o['time']<.16),None)
 if prev:
  prev['duration']=max(prev['duration'],e['time']+e['duration']-prev['time']);prev['strength']=max(prev['strength'],e['strength'])
 else:merged.append(e.copy())
out=[]
for e in merged:
 out.append({'startSeconds':e['time'],'durationSeconds':round(min(.8,max(.07,e['duration'])),4),'midi':e['midi'],'velocity':round(float(np.clip((e['strength']/.17)**.5,.35,1.1)),3),'pan':.34 if e['midi']<72 else .63,'confidence':'high' if (e['midi'] in [56,60,62,63] and e['strength']>.08) else 'medium','spectralStrength':e['strength']})
core=[e for e in out if e['midi']<72];bleep=[e for e in out if e['midi']>=72]
(p/'lead-events.json').write_text(json.dumps(core,indent=2));(p/'calculator-events.json').write_text(json.dumps(bleep,indent=2))
print('core',len(core),'bleep',len(bleep))
print('first8s',[(e['startSeconds'],e['midi'],e['velocity']) for e in core if e['startSeconds']<8])
for a in range(0,296,14):
 print(a,[(e['startSeconds'],e['midi']) for e in bleep if a<=e['startSeconds']<a+14])
