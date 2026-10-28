import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as core from '../strudel/packages/core/index.mjs';
import * as mini from '../strudel/packages/mini/index.mjs';
import { transpiler } from '../strudel/packages/transpiler/index.mjs';

const root = '<LEGACY_WORKSPACE>';
const source = path.join(root, '错拍之后-完整曲.strudel');
let cpm, loaded = 0;
await core.evalScope(core, mini, {
  samples: async url => { assert((await fetch(url)).ok); },
  getAudioContext: () => null,
  loadBuffer: async url => { assert((await fetch(url, { method: 'HEAD' })).ok); loaded++; },
  setcpm: value => { cpm = value; },
});

const code = await fs.readFile(source, 'utf8');
const offset = code.lastIndexOf('\nstepcat(...sections.map');
assert(offset > 0);
const instrumented = code.slice(0, offset) + '\n({ sections, TOTAL_BEATS, result: ' + code.slice(offset + 1).trim() + ' })';
const { pattern: { sections, TOTAL_BEATS, result } } = await core.evaluate(instrumented, transpiler);
const cps = cpm / 60, cycles = TOTAL_BEATS / 4;
const events = result.queryArc(0, cycles, { cyclist: true, _cps: cps })
  .filter(h => h.hasOnset())
  .map(h => ({ start: Number(h.whole.begin), end: Number(h.whole.end), duration: Number(h.duration), value: h.value }))
  .sort((a, b) => a.start - b.start);
assert(events.length > 100);
const sourceBank = JSON.parse(await fs.readFile(path.join(root, 'strudel/website/public/band-reference/samples.json')));
const reference = {
  band_rhythm_a: [.48, .22], band_rhythm_b: [.42, .78], band_rhythm_c: [.48, .35],
  band_lead: [.38, .58], band_bass: [.48, .5], band_drums: [.65, .5],
};
for (const event of events) {
  const v = event.value;
  assert(event.end > event.start && event.start >= 0 && event.end <= cycles + 1e-8);
  assert(sourceBank[v.s]?.[v.n]);
  for (const k of ['speed', 'note', 'freq', 'crush', 'coarse', 'cutoff', 'vib', 'room', 'delay']) assert(!(k in v), k);
  assert(Math.abs(v.pan - reference[v.s][1]) < 1e-9);
  assert(v.gain <= reference[v.s][0] + 1e-9 && v.postgain === .72);
  const seconds = (event.end - event.start) / cps;
  const sliceSeconds = ((v.end ?? 1) - (v.begin ?? 0)) * 8 * 60 / 99;
  assert(Math.abs(seconds - sliceSeconds) < 1e-8, JSON.stringify(event));
  if (v.clip != null) assert(Math.abs(event.duration / cps + v.release - seconds) < 1e-8);
}
assert.equal(result.queryArc(cycles, cycles * 2, { cyclist: true, _cps: cps }).filter(h => h.hasOnset()).length, 0);
let beat = 0;
const timeline = sections.map(([name, beats]) => {
  const section = { name, startBeat: beat, beats, startSeconds: beat * 60 / 99, endSeconds: (beat + beats) * 60 / 99 };
  beat += beats;
  return section;
});
const payload = { title: '错拍之后', cps, totalCycles: cycles, totalBeats: TOTAL_BEATS, durationSeconds: TOTAL_BEATS * 60 / 99, sections: timeline, events };
await fs.writeFile(path.join(root, '.song-arrangement/events.json'), JSON.stringify(payload, null, 2));
for (const area of ['public', 'dist']) {
  const out = path.join(root, 'strudel/website', area, 'band-song');
  await fs.mkdir(out, { recursive: true });
  await fs.writeFile(path.join(out, 'events.json'), JSON.stringify(payload));
}
const report = {
  events: events.length, preloaded: loaded, totalBeats: TOTAL_BEATS, seconds: payload.durationSeconds,
  finitePlayback: true, pitchAndSpeedUnchanged: true, slicesMatchSchedule: true,
  approvedSourcesAndBaseGainAndPanPreserved: true,
  fullLengthEvents: events.filter(e => Math.abs((e.end - e.start) * 4 - 8) < 1e-9).length,
  shortSegmentMinimumBeats: Math.min(...events.map(e => (e.end - e.start) * 4)),
  sections: timeline,
};
await fs.writeFile(path.join(root, '.song-arrangement/validation.json'), JSON.stringify(report, null, 2));
const url = 'http://127.0.0.1:3009/#' + encodeURIComponent(Buffer.from(code).toString('base64'));
await fs.writeFile(path.join(root, '打开错拍之后.webloc'), '<?xml version="1.0" encoding="UTF-8"?>\n<plist version="1.0"><dict><key>URL</key><string>' + url + '</string></dict></plist>\n');
console.log(report);
