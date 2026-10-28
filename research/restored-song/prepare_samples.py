from pathlib import Path
import concurrent.futures
import hashlib
import json
import re
import shutil
import urllib.request

ROOT = Path('<LEGACY_WORKSPACE>')
WORK = ROOT / '.restored-song'
SHA = 'b3b3249d37dc977a1a297bd2dc053e6d9b6b805c'
REMOTE = f'https://raw.githubusercontent.com/sfzinstruments/karoryfer.black-and-green-guitars/{SHA}/'
score = json.loads((ROOT / '.tone-v2/events.json').read_text())
bank = {'_base': 'http://127.0.0.1:3009/rooftop-restored/'}
downloads = {}
note_names = ['c', 'cs', 'd', 'ds', 'e', 'f', 'fs', 'g', 'gs', 'a', 'as', 'b']

for color, orbits in [('green', [0, 3]), ('black', [1, 2])]:
    notes = sorted({e['midi'] for e in score['events'] if e['value'].get('orbit') in orbits})
    sfz = (WORK / 'sources' / f'{color}-ord.sfz').read_text()
    regions = []
    for block in sfz.split('<region>')[1:]:
        values = dict(re.findall(r'(\w+)=([^\s]+)', block))
        if values.get('lovel') == '43' and values.get('hivel') == '84':
            regions.append(values)
    mapped = {}
    for midi in notes:
        selected = [r for r in regions if int(r['lokey']) <= midi <= int(r['hikey'])]
        assert len(selected) in (2, 4), (color, midi, selected)
        assert all(int(r['pitch_keycenter']) == midi for r in selected), 'Use recorded root, never filename octave'
        selected.sort(key=lambda r: int(r.get('seq_position', '1')))
        entries = []
        for r in selected:
            remote_path = r['sample'].removeprefix('../')
            local_path = color + '/' + Path(remote_path).name
            downloads[local_path] = REMOTE + remote_path
            entries.append(local_path)
        mapped[note_names[midi % 12] + str(midi // 12 - 1)] = entries
    bank['restore_' + color] = mapped

def download(item):
    rel, url = item
    dest = WORK / 'audio' / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.exists():
        with urllib.request.urlopen(url, timeout=40) as response:
            data = response.read()
        assert data[:4] == b'RIFF' and data[8:12] == b'WAVE', url
        dest.write_bytes(data)
    data = dest.read_bytes()
    return {'path': rel, 'url': url, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}

with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    manifest = list(pool.map(download, downloads.items()))

hits = ROOT / '.reference-packs/sampleradar-emo/extracted/musicradar-emo-samples/Kit03 99bpm/Drums/Hits'
for name, suffix in [('kick', 'Kick'), ('snare', 'Snare'), ('hh', 'ClHat'), ('oh', 'OpHat'), ('crash', 'Crash'), ('tom', 'Tom')]:
    sources = sorted(hits.glob('EMOK3DHit-' + suffix + '*.wav'))
    assert sources
    bank['restore_' + name] = ['drums/' + p.name for p in sources]
    for p in sources:
        dest = WORK / 'audio/drums' / p.name
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(p, dest)

for area in ['public', 'dist']:
    dest = ROOT / 'strudel/website' / area / 'rooftop-restored'
    shutil.copytree(WORK / 'audio', dest, dirs_exist_ok=True)
    (dest / 'samples.json').write_text(json.dumps(bank, indent=2) + '\n')
    shutil.copy2(WORK / 'sources/LICENSE.txt', dest / 'guitar-LICENSE.txt')

(WORK / 'sources/sample-manifest.json').write_text(json.dumps({
    'repository': 'https://github.com/sfzinstruments/karoryfer.black-and-green-guitars',
    'commit': SHA, 'license': 'CC0-1.0', 'velocityLayer': 'mf',
    'rootMapping': 'Official SFZ numeric pitch_keycenter. Every required guitar note has its own recorded root.',
    'guitarFiles': manifest,
    'drums': 'Same approved SampleRadar Kit03; supplied single hits, unmodified. No redistribution of raw drums.',
}, indent=2) + '\n')
print(json.dumps({'guitarFiles': len(manifest), 'guitarBytes': sum(x['bytes'] for x in manifest), 'banks': list(bank)}, ensure_ascii=False))
