import fs from 'node:fs/promises';
import path from 'node:path';
import * as core from '../strudel/packages/core/index.mjs';
import * as mini from '../strudel/packages/mini/index.mjs';
import * as tonal from '../strudel/packages/tonal/index.mjs';
import { transpiler } from '../strudel/packages/transpiler/index.mjs';
import { getCommonSampleInfo } from '../strudel/packages/superdough/util.mjs';

const root = '<LEGACY_WORKSPACE>';
const directory = path.join(root, '.tone-v2');
const code = await fs.readFile(path.join(root, '天台晚风-v2.strudel'), 'utf8');
const map = JSON.parse(await fs.readFile(path.join(directory, 'samples.json'), 'utf8'));
let sampleMapFetched = false;
await core.evalScope(core, mini, tonal, {
  getAudioContext: () => null,
  loadBuffer: async url => {
    const parsed = new URL(url);
    if (parsed.origin !== 'http://127.0.0.1:3009' || !parsed.pathname.startsWith('/rooftop-v2/')) throw new Error('Unexpected preload URL');
    await fs.access(path.join(root, 'strudel/website/public', decodeURIComponent(parsed.pathname)));
  },
  samples: async url => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Sample map HTTP ${response.status}`);
    const served = await response.json();
    if (JSON.stringify(served) !== JSON.stringify(map)) throw new Error('Served sample map differs from local map');
    sampleMapFetched = true;
  },
});
const repl = core.repl({ getTime: () => 0, onSchedule: () => {}, transpiler });
const pattern = await repl.evaluate(code, false);
if (repl.state.error) throw repl.state.error;
if (!sampleMapFetched || !pattern?.queryArc) throw new Error('Song/sample loading did not evaluate');
const convert = hap => ({ start: Number(hap.whole.begin), end: Number(hap.whole.end), midi: hap.value.note == null ? undefined : core.valueToMidi(hap.value), value: hap.value });
const events = pattern.queryArc(0, 36).filter(hap => hap.hasOnset()).map(convert);
const used = new Set();
const shifts = [];
for (const event of events) {
  if (!Number.isFinite(event.value.gain) || event.value.gain < 0 || event.value.gain > 4) throw new Error('Invalid event gain');
  if (event.midi != null && (!Number.isFinite(event.midi) || event.midi < 0 || event.midi > 127)) throw new Error('Invalid pitch');
  if (event.value.s.startsWith('gm_')) continue;
  const bank = map[event.value.s];
  if (!bank) throw new Error(`Missing instrument ${event.value.s}`);
  const info = getCommonSampleInfo(event.value, bank);
  if (!info.url) throw new Error('Missing selected sample');
  await fs.access(path.join(root, 'strudel/website/public/rooftop-v2', decodeURIComponent(info.url)));
  used.add(info.url);
  if (event.value.s.startsWith('roof_clean')) shifts.push(info.transpose);
}
const old = JSON.parse(await fs.readFile(path.join(root, '.music-check/events.json'), 'utf8')).events;
const pitches = items => items.filter(event => [0,1,2,4].includes(event.value.orbit))
  .map(event => [event.start,event.midi,event.value.orbit]).sort((a,b) => a[0]-b[0] || a[2]-b[2] || a[1]-b[1]);
const melodicTracksPreserved = JSON.stringify(pitches(events)) === JSON.stringify(pitches(old));
if (!melodicTracksPreserved) throw new Error('Main guitar/lead/bass note sequence unexpectedly changed');
const hatTimes = events.filter(event => event.value.cut === 17).map(event => event.start);
if (new Set(hatTimes).size !== hatTimes.length) throw new Error('Open/closed hats overlap at the same onset');
const sections = [[0,4],[4,12],[12,20],[20,24],[24,32],[32,36]].map(([begin,end]) => ({ begin,end,events: events.filter(event => event.start >= begin && event.start < end).length }));
const report = { cps: repl.scheduler.cps, totalCycles: 36, seconds: 36/repl.scheduler.cps, events: events.length, usedSampleFiles: used.size, sampleMapFetched, melodicTracksPreserved, simultaneousHatConflicts: false, guitarTransposeRange: [Math.min(...shifts),Math.max(...shifts)], sections };
await fs.writeFile(path.join(directory, 'events.json'), JSON.stringify({ cps: repl.scheduler.cps, totalCycles: 36, events }, null, 2));
await fs.writeFile(path.join(directory, 'validation.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
repl.stop();
