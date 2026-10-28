from pathlib import Path
import json, shutil, base64, plistlib, math
root=Path('<LEGACY_WORKSPACE>')
work=root/'.pocket-reconstruction'
public=root/'strudel/website/public/pocket-calculator-remake'
public.mkdir(exist_ok=True)
A=root/'.pocket-reconstruction-analysis'
T=root/'.pocket-reconstruction-timbre'
V=root/'.pocket-reconstruction-voice'
def read(p): return json.loads(p.read_text())
def install(p):
    shutil.copy2(p, public/p.name)
    return p.name
kit=read(T/'kit-manifest.json')
bassmanifest=read(T/'bass-manifest.json')
voices=read(V/'phrases-manifest.json')['clips']
samples={}
for k in kit:samples[k['name']]=[install(T/k['file'])]
samples['pc_bass']={'bb1':[install(T/bassmanifest['file'])]}
samples['pc_lead']={'ab3':[install(T/'pc-lead-ab3.wav')]}
leadbank=read(T/'lead-multisamples.json')
samples['pc_lead']={m['rootNote'].lower():[install(T/m['file'])] for m in leadbank}
buzzbank=read(T/'buzz-manifest.json')
if (T/'midkeys-manifest.json').exists():buzzbank+=read(T/'midkeys-manifest.json')
samples['pc_keys']={m['rootNote'].lower():[install(T/m['file'])] for m in buzzbank}
samples['pc_voice']=[install(V/'phrases'/v['file']) for v in voices]
# Multi-sample bank and reference events are added after the transcription audit.
data={'samples':samples,'duration':296.8294,'bpm':135.85,
'drums':[[e['time'],.185,'pcKit'+str(e['kit']),e['gain'],.5] for e in read(T/'kit-events.json')],
'bass':[[e['time'],.216,e['midi'],e['gain'],.5] for e in read(T/'bass-events.json')],
'lead':[], 'keys':[],
'voice':[[v['absoluteStartSeconds'],v['durationSeconds'],v['index'],1,.5] for v in voices],
'provenance':{'source':'Kraftwerk - Pocket Calculator (2009 Remaster).mp3, supplied by user','method':'Short instrument notes and individual kit-strike samples re-performed by timed Strudel events; AI-separated vocal phrases. No continuous full-mix or accompaniment stem playback.'}}
leadfile=A/'lead-events-snapped.json'
if leadfile.exists():
    lead=read(leadfile)
    if isinstance(lead,dict): lead=lead['events']
    anchors={}
    for m in leadbank:
        mid=m['rootMidi'];t=m.get('sourceTimeSeconds',m.get('source',{}).get('decodedStartSeconds',0))
        candidates=[e for e in lead if e['midi']==mid]
        anchor=min(candidates,key=lambda e:abs(e['startSeconds']-t))
        scale=m.get('normalizationScale',2.320833)
        anchors[mid]=(anchor['spectralStrength'],scale)
    for e in lead:
        if e['midi']>65:continue
        nearest=min(anchors,key=lambda n:abs(n-e['midi']))
        strength,scale=anchors[nearest]
        v=min(1.7,e['spectralStrength']/strength/scale/math.cos(.2*math.pi/2))
        data['lead'].append([e['startSeconds'],max(.23,e['durationSeconds']),e['midi'],round(v,5),.2])
    # A second square-wave keyboard voice occupies Ab4/Bb4.
    mids=[e for e in lead if e['midi']>65]
    mids=[e for e in mids if not (e['midi']==70 and any(
        low['midi']==58 and abs(low['startSeconds']-e['startSeconds'])<.16
        and low['spectralStrength']>e['spectralStrength'] for low in lead))]
    high=read(A/'calculator-events-confirmed.json')
    for m in buzzbank:
        candidates=[e for e in mids+high if e['midi']==m['rootMidi']]
        if not candidates:continue
        anchor=min(candidates,key=lambda e:abs(e['startSeconds']-m['sourceTimeSeconds']))
        strength=anchor.get('spectralStrength',anchor.get('strength'))
        for e in candidates:
            v=min(1.5,e.get('spectralStrength',e.get('strength'))/strength/m['normalizationScale'])
            pan=.65 if e['midi']>=79 else .76
            data['keys'].append([e['startSeconds'],max(.1,e['durationSeconds']),e['midi'],round(v,5),pan])
    data['keys'].sort()
    # Correct a few octave/tuning tracker outliers; retain the repeated Ab/F/Eb modulation.
    correction={53:41,33:34,35:34,45:46,47:46}
    data['bass']=[r for r in data['bass'] if r[2]!=30]
    for r in data['bass']:r[2]=correction.get(r[2],r[2])
else:
    # Temporary accurate intro pattern, while the full measured table is refined.
    motif=[56,58,65,None,65,None,None,63,56,65,63,None,63,62,None,None]
    for k in range(128):
        n=motif[k%16]
        if k%32==31:n=60
        if n is not None:data['lead'].append([round(.3025+k*60/136/2,6),.22,n,.5,.25])
(public/'score.json').write_text(json.dumps(data,separators=(',',':')))
code=(work/'full-score.template').read_text()
for track in ['LEAD','BASS','DRUMS','VOICE','KEYS']:
    code=code.replace(f'.gain({track})',f'.gain({track}*MASTER)')
score=root/'Pocket Calculator-复刻版.strudel'
score.write_text(code)
url='http://127.0.0.1:3009/#'+base64.b64encode(code.encode()).decode()
with (root/'打开Pocket Calculator复刻版.webloc').open('wb') as f:plistlib.dump({'URL':url},f)
# Astro preview serves the production dist; also keep public/ for next build.
dist=root/'strudel/website/dist/pocket-calculator-remake'
shutil.copytree(public,dist,dirs_exist_ok=True)
print(json.dumps({'score':str(score),'assets':str(public),'counts':{k:len(data[k]) for k in ['lead','bass','drums','voice','keys']},'urlLength':len(url)},ensure_ascii=False))
