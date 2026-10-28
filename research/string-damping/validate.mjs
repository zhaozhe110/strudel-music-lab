import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as core from '../strudel/packages/core/index.mjs';
import * as mini from '../strudel/packages/mini/index.mjs';
import * as tonal from '../strudel/packages/tonal/index.mjs';
import { transpiler } from '../strudel/packages/transpiler/index.mjs';

const root = '<LEGACY_WORKSPACE>';
await core.evalScope(core, mini, tonal, {
  getAudioContext: () => null,
  loadBuffer: async url => {
    const path = new URL(url).pathname;
    await fs.access(root + '/strudel/website/public' + path);
  },
  samples: async url => {
    const response = await fetch(url);
    assert(response.ok, 'Sample map unavailable');
  },
});
// Only the visual timeline is omitted from this event-level validation.
const query = async filename => {
  const code = (await fs.readFile(root + '/' + filename, 'utf8')).replace('.timeline(1)', '');
  const repl = core.repl({ getTime: () => 0, onSchedule: () => {}, transpiler });
  const pattern = await repl.evaluate(code, false);
  if (repl.state.error) throw repl.state.error;
  const events = pattern.queryArc(0, 70).filter(h => h.hasOnset()).map(h => ({
    start: Number(h.whole.begin), end: Number(h.whole.end),
    midi: h.value.note == null ? undefined : core.valueToMidi(h.value), value: h.value,
  }));
  repl.stop();
  return events;
};
const baseline = await query('天台晚风-拨弦连续性试验.strudel');
const candidate = await query('天台晚风-同弦止音试验.strudel');
assert.equal(candidate.length, baseline.length);
let changed = 0;
for (let i = 0; i < candidate.length; i++) {
  const c = structuredClone(candidate[i]);
  if (c.value.orbit === 0) {
    assert([101, 102, 103, 104].includes(c.value.cut));
    delete c.value.cut;
    changed++;
  } else {
    assert(![101, 102, 103, 104].includes(c.value.cut));
  }
  assert.deepEqual(c, baseline[i]);
}
const A = baseline.filter(e => e.start < 4 && e.value.orbit === 0);
const B = candidate.filter(e => e.start < 4 && e.value.orbit === 0);
assert.equal(A.length, 32);
const previousAB = JSON.parse(await fs.readFile(root + '/.legato-ab/events.json', 'utf8'));
assert.deepEqual(A.map(({ midi, ...e }) => e), previousAB.B.map(({ midi, ...e }) => e));
const score = { cps: 0.55, phraseCycles: 4, phraseSeconds: 4 / 0.55, A, B };
const report = {
  events: candidate.length, modifiedLeftEvents: changed,
  comparisonBaseline: '天台晚风-拨弦连续性试验.strudel',
  changedFieldsOnly: ['cut'], originalNotesOnsetsRestsAndOtherTracksPreserved: true,
  audibleNoteEndsChanged: true, samplesAndFxPreserved: true, notesPerAB: 32,
  subjectiveListeningVerified: false,
};
await fs.writeFile(root + '/.string-damping/events.json', JSON.stringify(score, null, 2));
await fs.writeFile(root + '/.string-damping/validation.json', JSON.stringify(report, null, 2));
for (const target of ['public', 'dist']) {
  const path = root + '/strudel/website/' + target + '/rooftop-damping';
  await fs.mkdir(path, { recursive: true });
  await fs.writeFile(path + '/events.json', JSON.stringify(score));
}
console.log(report);
