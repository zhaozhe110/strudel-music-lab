import fs from 'node:fs/promises';
import path from 'node:path';

const root = '<LEGACY_WORKSPACE>';
const work = path.join(root, '.tone-v2');
const guitar = JSON.parse(await fs.readFile(path.join(work, 'guitar/manifest.json'), 'utf8'));
const drums = JSON.parse(await fs.readFile(path.join(work, 'drums/manifest.json'), 'utf8'));
const drumMap = JSON.parse(await fs.readFile(path.join(work, 'drums/strudel-samples.json'), 'utf8'));
const noteName = midi => ['c','cs','d','ds','e','f','fs','g','gs','a','as','b'][midi % 12] + (Math.floor(midi / 12) - 1);
const filename = sample => `${sample.id.replaceAll('#', 's')}.flac`;
const map = { _base: 'http://127.0.0.1:3009/rooftop-v2/' };
for (const layer of ['normal', 'soft']) {
  const instrument = {};
  const selected = guitar.samples.filter(sample => sample.layer === layer || sample.layer === 'all');
  for (const midi of [...new Set(selected.map(sample => sample.rootMidi))].sort((a,b) => a-b)) {
    instrument[noteName(midi)] = selected.filter(sample => sample.rootMidi === midi)
      .sort((a,b) => a.rr - b.rr).map(sample => `guitar/${filename(sample)}`);
  }
  map[layer === 'normal' ? 'roof_clean' : 'roof_clean_soft'] = instrument;
}
for (const [name, files] of Object.entries(drumMap)) map[name] = files.map(file => `drums/${file}`);

const credits = `Rooftop v2 local sample selection\n\nGuitar: FreePats Electric Guitar FSBS (clean), 2026-08-07.\n${guitar.repository}\nCommit: ${guitar.sourceCommit}\nLicense: CC0 1.0. Original FLAC files, no sample processing. Nearest-root mapping in Strudel; four recorded variants per root.\n\nDrums: Virtuosity Drums by Versilian Studios and Karoryfer Samples, performed by Austin McMahon.\n${drums.source}\n${drums.repository}\nCommit: ${drums.revision}\nLicense: CC0 1.0. Original mid-microphone FLAC files; no sample normalization.\n\nComposition: original song 天台晚风. No audio from Chinese Football recordings is included.\n`;
for (const area of ['public', 'dist']) {
  const out = path.join(root, 'strudel/website', area, 'rooftop-v2');
  await fs.mkdir(path.join(out, 'guitar'), { recursive: true });
  await fs.mkdir(path.join(out, 'drums'), { recursive: true });
  for (const sample of guitar.samples) await fs.copyFile(sample.localPath, path.join(out, 'guitar', filename(sample)));
  for (const sample of drums.files) await fs.copyFile(path.join(work, 'drums', sample.relativeFile), path.join(out, 'drums', sample.filename));
  await fs.copyFile(path.join(work, 'guitar/LICENSE.txt'), path.join(out, 'guitar/LICENSE.txt'));
  await fs.copyFile(path.join(work, 'drums/LICENSE-CC0.txt'), path.join(out, 'drums/LICENSE-CC0.txt'));
  await fs.writeFile(path.join(out, 'samples.json'), JSON.stringify(map, null, 2));
  await fs.writeFile(path.join(out, 'CREDITS.txt'), credits);
}
await fs.writeFile(path.join(work, 'samples.json'), JSON.stringify(map, null, 2));
await fs.writeFile(path.join(work, 'CREDITS.txt'), credits);
console.log(JSON.stringify({ instruments: Object.keys(map).filter(key => !key.startsWith('_')), files: guitar.samples.length + drums.files.length, totalBytes: guitar.totalBytes + drums.files.reduce((sum, sample) => sum + sample.bytes, 0) }));
