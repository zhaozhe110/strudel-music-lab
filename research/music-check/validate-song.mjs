import fs from 'node:fs/promises';
import * as core from '../strudel/packages/core/index.mjs';
import * as mini from '../strudel/packages/mini/index.mjs';
import * as tonal from '../strudel/packages/tonal/index.mjs';
import { transpiler } from '../strudel/packages/transpiler/index.mjs';

const base = '<LEGACY_WORKSPACE>';
const code = await fs.readFile(`${base}/天台晚风.strudel`, 'utf8');
await core.evalScope(core, mini, tonal);
const repl = core.repl({ getTime: () => 0, onSchedule: () => {}, transpiler });
const pattern = await repl.evaluate(code, false);
if (repl.state.error) throw repl.state.error;
if (!pattern?.queryArc) throw new Error('Song did not evaluate to a pattern');

const sections = [
  { name: 'intro', start: 0, end: 4 },
  { name: 'entrance', start: 4, end: 12 },
  { name: 'full_a', start: 12, end: 20 },
  { name: 'break', start: 20, end: 24 },
  { name: 'full_b', start: 24, end: 32 },
  { name: 'outro', start: 32, end: 36 },
];

function serialize(hap) {
  const value = hap.value;
  const midi = value.note == null ? undefined : core.valueToMidi(value);
  if (value.note != null && (!Number.isFinite(midi) || midi < 0 || midi > 127)) {
    throw new Error(`Invalid note: ${JSON.stringify(value)}`);
  }
  if (!Number.isFinite(value.gain) || value.gain < 0 || value.gain > 1) {
    throw new Error(`Invalid gain: ${JSON.stringify(value)}`);
  }
  if (typeof value.s !== 'string') throw new Error(`Missing sound: ${JSON.stringify(value)}`);
  return {
    start: Number(hap.whole.begin), end: Number(hap.whole.end), midi,
    value,
  };
}

const events = pattern.queryArc(0, 36).filter(h => h.hasOnset()).map(serialize);
const next = pattern.queryArc(36, 40).filter(h => h.hasOnset()).map(serialize);
const intro = events.filter(e => e.start >= 0 && e.start < 4);
const normalize = (items, offset) => items.map(e => ({
  ...e, start: e.start - offset, end: e.end - offset,
})).sort((a,b) => a.start-b.start || JSON.stringify(a.value).localeCompare(JSON.stringify(b.value)));
const loopRepeats = JSON.stringify(normalize(intro, 0)) === JSON.stringify(normalize(next, 36));
if (!loopRepeats) throw new Error('36-cycle loop does not repeat its intro at the boundary');
const trackKey = e => `${e.value.bank ? e.value.bank + ':' : ''}${e.value.s}:${e.value.n ?? 0}`;
const summarize = items => ({
  count: items.length,
  gains: { min: Math.min(...items.map(e=>e.value.gain)), max: Math.max(...items.map(e=>e.value.gain)) },
  midiRange: [Math.min(...items.filter(e=>e.midi!==undefined).map(e=>e.midi)), Math.max(...items.filter(e=>e.midi!==undefined).map(e=>e.midi))],
  sounds: items.reduce((acc,e)=>(acc[trackKey(e)]=(acc[trackKey(e)]||0)+1,acc),{}),
});
const summary = {
  checkedCodeBytes: Buffer.byteLength(code), cps: repl.scheduler.cps, bpmAtFourBeats: repl.scheduler.cps*60*4,
  totalCycles:36, durationSeconds:36/repl.scheduler.cps, total:summarize(events),
  sections:sections.map(section => ({...section,...summarize(events.filter(e=>e.start>=section.start&&e.start<section.end))})),
  loopRepeats,
  bassRootsByCycle:Array.from({length:36},(_,cycle)=>({cycle,root:events.find(e=>e.start>=cycle&&e.start<cycle+1&&e.value.s==='gm_electric_bass_finger')?.value.note ?? null})),
};
await fs.writeFile(`${base}/.music-check/events.json`,JSON.stringify({events,next},null,2));
await fs.writeFile(`${base}/.music-check/validation.json`,JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
repl.stop();
