import assert from 'node:assert/strict';
import { createStaticDetuneCurve, staticDetuneAt, vibratoDetuneAt } from './articulation-curves.mjs';
import { installGuitarArticulations } from './guitar-articulation.mjs';

class MockParam {
  constructor() { this.value = 0; this.calls = []; }
  setValueAtTime(...args) { this.calls.push(['set', ...args]); }
  linearRampToValueAtTime(...args) { this.calls.push(['ramp', ...args]); }
  setValueCurveAtTime(values, ...args) { this.calls.push(['curve', [...values], ...args]); }
}
class MockNode extends EventTarget {
  constructor() { super(); this.connections = []; this.detune = new MockParam(); this.gain = new MockParam(); this.frequency = new MockParam(); this.disconnects = 0; this.stops = []; }
  connect(target) { this.connections.push(target); return target; }
  disconnect() { this.disconnects += 1; }
  start(time) { this.started = time; }
  stop(time) { this.stops.push(time); }
  end() { this.onended?.(); this.dispatchEvent(new Event('ended')); }
}
const originals = [], oscillators = [], gains = [], baseCalls = [];
let released = 0;
const sources = new Map(['roof_clean','roof_clean_soft'].map(name => [name, {
  data: { samples: { c4: ['test.wav'] } },
  async onTrigger(t, value, onended, cps) {
    baseCalls.push({ t, value, cps });
    const source = new MockNode();
    source.onended = () => { released += 1; onended(); };
    const handle = { node: {}, nodes: { source: [source] }, stop: time => source.stop(time) };
    originals.push(handle);
    return handle;
  },
}]));
const api = {
  getSound: name => sources.get(name),
  registerSound: (name, onTrigger, data) => sources.set(name, { onTrigger, data }),
  getAudioContext: () => ({
    createOscillator() { const node = new MockNode(); oscillators.push(node); return node; },
    createGain() { const node = new MockNode(); gains.push(node); return node; },
  }),
};
installGuitarArticulations(api);
let callbackCount = 0;
const input = { note: 'e4', duration: 0.8, gain: 0.2, attack: 0.001, release: 0.12,
  slideFrom: -2, slideTime: 0.09, pickCents: 4, pickDecay: 0.04,
  penv: 12, vib: 5, vibmod: 0.12, vibdelay: 0.25, vibattack: 0.15 };
const handle = await sources.get('roof_live').onTrigger(10, input, () => callbackCount++, 0.5);
assert.equal(baseCalls[0].value.vib, 0);
assert.equal(baseCalls[0].value.penv, undefined);
assert.equal(baseCalls[0].value.note, 'e4');
assert.equal(baseCalls[0].value.release, 0.12);
assert.equal(input.vib, 5); // no mutation of the event
assert.equal(handle, originals[0]);
const curveCall = handle.nodes.source[0].detune.calls[0];
assert.equal(curveCall[0], 'curve');
assert.equal(curveCall[1][0], -196);
assert.equal(curveCall[1].at(-1), 0);
assert.equal(curveCall[2], 10);
assert.equal(curveCall[3], 0.09);
assert.equal(oscillators[0].started, 10.25);
assert.deepEqual(gains[0].gain.calls, [['set',0,10.25],['ramp',12,10.4]]);
handle.nodes.source[0].end();
assert.equal(released, 1); assert.equal(callbackCount, 1);
assert.equal(oscillators[0].stops.length, 1);
assert.equal(oscillators[0].disconnects, 1);
assert.equal(gains[0].disconnects, 1);
assert.equal(staticDetuneAt(0.5, input), 0);
assert.equal(vibratoDetuneAt(0.249, input), 0);
assert(Math.abs(vibratoDetuneAt(0.45, input)) < 1e-9); // one full vibrato period
assert.equal(createStaticDetuneCurve({}), null);
await sources.get('roof_live_soft').onTrigger(12, { note: 'g4', vib: 0, release: 0.05 }, () => {}, 0.5);
assert.equal(oscillators.length, 1); // short/non-vibrato notes do not get LFO nodes
console.log(JSON.stringify({ tests: 'passed', cases: ['up-slide reaches and holds target','delayed vibrato ramp','native pitch envelope exclusion on slide','base ADSR and callback preserved','LFO cleanup','unmodified input','no LFO for plain notes'], curvePoints: curveCall[1].length }));
