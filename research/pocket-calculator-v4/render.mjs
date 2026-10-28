// Render the saved Strudel score with its actual local Superdough engine.
// Native Superdough oscillators and its sampler; local sample sources only.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { registerHooks } from 'node:module';
import { spawnSync } from 'node:child_process';
import * as audio from '../.audio-preview/node_modules/node-web-audio-api/index.js';

const root = '<LEGACY_WORKSPACE>';
const outdir = path.join(root, '.pocket-calculator-v4');
const scoreFile = path.resolve(process.env.POCKET_SCORE_FILE || path.join(root, '袖珍电路-v4.strudel'));
const beginCycle = Number(process.env.POCKET_RENDER_BEGIN || 0);
const cycles = Number(process.env.POCKET_RENDER_CYCLES || 64);
const sampleRate = 44100;
const tailSeconds = 2;
const basename = process.env.POCKET_RENDER_NAME || '袖珍电路-v4-试听';
const reportPrefix = basename === '袖珍电路-v4-试听' ? '' : `${basename}-`;
if (!Number.isFinite(cycles) || cycles <= 0 || cycles > 512) throw new Error('Invalid POCKET_RENDER_CYCLES');
if (!Number.isFinite(beginCycle) || beginCycle < 0) throw new Error('Invalid POCKET_RENDER_BEGIN');
if (path.basename(basename) !== basename) throw new Error('POCKET_RENDER_NAME must be a filename without directories');
if (!basename.startsWith('袖珍电路-v4')) throw new Error('Use a v4 output name so previous versions remain preserved');

Object.assign(globalThis, audio);
// Vite normally turns this resource into a worklet URL. This score exclusively
// uses native WebAudio nodes, so the resource is not loaded in the offline host.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.endsWith('?audioworklet')) {
      return { url: 'data:text/javascript,export default ""', shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const core = await import('../strudel/packages/core/index.mjs');
const mini = await import('../strudel/packages/mini/index.mjs');
const { transpiler } = await import('../strudel/packages/transpiler/index.mjs');
const dough = await import('../strudel/packages/superdough/index.mjs');
await core.evalScope(core, mini, { samples: dough.samples });
// Editor-only visuals do not affect offline audio; keep the saved score runnable.
for (const name of ['_pianoroll', '_scope', '_spectrum', 'pianoroll', 'scope', 'spectrum']) {
  core.Pattern.prototype[name] = function () { return this; };
}
const repl = core.repl({ getTime: () => 0, onSchedule: () => {}, transpiler });
const code = await fs.readFile(scoreFile, 'utf8');
const pattern = await repl.evaluate(code, false);
if (repl.state.error) throw repl.state.error;
if (!pattern?.queryArc) throw new Error('Score did not produce a Strudel pattern');
const cps = repl.scheduler.cps;
const events = pattern.queryArc(beginCycle, beginCycle + cycles)
  .filter(hap => hap.hasOnset())
  .map(hap => ({
    start: Number(hap.whole.begin),
    end: Number(hap.whole.end),
    duration: Number(hap.duration),
    value: { ...hap.value },
  }))
  .sort((a, b) => a.start - b.start);
repl.stop();

const permittedSounds = new Set(['square', 'sawtooth', 'sine', 'triangle', 'user', 'white', 'pink', 'brown']);
const permittedSamples = new Set(['pckit0', 'pckit1', 'pckit2', 'pckit3', 'pckit4', 'pckit5', 'pc_keys']);
const unsupportedEffects = ['coarse', 'crush', 'shape', 'distort', 'djf', 'stretch', 'transient', 'workletSrc', 'lfo', 'env'];
for (const event of events) {
  const v = event.value;
  const soundName = String(v.s).toLowerCase();
  if (!permittedSounds.has(soundName) && !permittedSamples.has(soundName)) throw new Error(`Unsupported sound for this renderer: ${v.s}`);
  if (permittedSamples.has(soundName) && dough.getSound(soundName)?.data?.type !== 'sample') throw new Error(`Sample was not registered: ${v.s}`);
  if (v.bank || v.room > 0 || v.ftype === 'ladder') throw new Error('Score requests an unconfigured bank, reverb, or ladder filter');
  for (const key of unsupportedEffects) if (v[key] != null) throw new Error(`Score requires a worklet for ${key}`);
  if (!(event.duration > 0) || !Number.isFinite(event.start)) throw new Error('Invalid timing');
}

const duration = cycles / cps + tailSeconds;
const ac = new audio.OfflineAudioContext(2, Math.ceil(sampleRate * duration), sampleRate);
dough.setAudioContext(ac);
dough.registerSynthSounds();
const usedSamples = new Map();
const samplePitchMappings = new Map();
let sampleEventCount = 0;
for (const event of events) {
  const v = event.value;
  const sound = dough.getSound(v.s);
  if (sound?.data?.type !== 'sample') continue;
  sampleEventCount++;
  const info = dough.getSampleInfo(v, sound.data.samples);
  const url = new URL(info.url);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname)) throw new Error(`Expected a local source sample: ${url.href}`);
  usedSamples.set(info.url, { url: info.url, sound: v.s });
  const mapping = { sound: v.s, note: v.note ?? null, speed: v.speed ?? 1, ...info };
  samplePitchMappings.set(JSON.stringify(mapping), mapping);
}
const sampleSources = await Promise.all([...usedSamples.values()].map(async sample => {
  const buffer = await dough.loadBuffer(sample.url, ac, sample.sound);
  const response = await fetch(sample.url);
  if (!response.ok) throw new Error(`Cannot verify sample source: ${response.status} ${sample.url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  return { ...sample, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), durationSeconds: buffer.duration, sampleRate: buffer.sampleRate, channels: buffer.numberOfChannels };
}));
// Whole-score scheduling needs room for future notes before the offline clock runs.
dough.setMaxPolyphony(events.length + 32);
for (const event of events) {
  await dough.superdough({ ...event.value }, (event.start - beginCycle) / cps, event.duration / cps, cps, event.start);
}
console.log(`Scheduled ${events.length} events; rendering ${duration.toFixed(2)} seconds with Superdough`);
const rendered = await ac.startRendering();
const channels = [new Float32Array(rendered.length), new Float32Array(rendered.length)];
channels.forEach((channel, index) => rendered.copyFromChannel(channel, index));

let rawPeak = 0;
let rawSum = 0;
let nonFinite = 0;
for (const channel of channels) for (const sample of channel) {
  if (!Number.isFinite(sample)) nonFinite++;
  rawPeak = Math.max(rawPeak, Math.abs(sample));
  rawSum += sample * sample;
}
if (nonFinite || rawPeak < 1e-5) throw new Error(`Bad audio: nonFinite=${nonFinite}, peak=${rawPeak}`);
const scale = 0.84 / rawPeak;
const bytes = rendered.length * 4;
const wav = Buffer.alloc(44 + bytes);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + bytes, 4); wav.write('WAVE', 8);
wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(2, 22); wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(bytes, 40);
let finalPeak = 0;
let finalSum = 0;
for (let frame = 0; frame < rendered.length; frame++) {
  const fade = Math.min(1, (rendered.length - frame) / (sampleRate * .4));
  for (let ch = 0; ch < 2; ch++) {
    const value = channels[ch][frame] * scale * fade;
    finalPeak = Math.max(finalPeak, Math.abs(value));
    finalSum += value * value;
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value)) * 32767), 44 + 2 * (2 * frame + ch));
  }
}
const wavFile = path.join(root, basename + '.wav');
const m4aFile = path.join(root, basename + '.m4a');
await fs.writeFile(wavFile, wav);
const conversion = spawnSync('/usr/bin/afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '192000', wavFile, m4aFile], { encoding: 'utf8' });
if (conversion.status !== 0) throw new Error(`AAC conversion failed: ${conversion.stderr}`);

const byBar = [];
for (let bar = 0; bar < cycles; bar++) {
  const start = Math.floor(bar / cps * sampleRate);
  const end = Math.min(rendered.length, Math.floor((bar + 1) / cps * sampleRate));
  let sum = 0, peak = 0;
  for (const channel of channels) for (let frame = start; frame < end; frame++) {
    const value = channel[frame] * scale;
    sum += value * value;
    peak = Math.max(peak, Math.abs(value));
  }
  byBar.push({ bar: bar + 1, sourceBar: beginCycle + bar + 1, rmsDbFS: 20 * Math.log10(Math.sqrt(sum / (2 * (end - start)))), peak });
}
const report = {
  scoreFile,
  scoreSha256: crypto.createHash('sha256').update(code).digest('hex'),
  engine: 'Local Strudel core/transpiler and unmodified Superdough synth/sampler/effects source with node-web-audio-api OfflineAudioContext',
  hostAdapter: 'Only the unused Vite ?audioworklet URL import is stubbed; no oscillator, envelope, filter, panning, or delay logic is substituted.',
  postprocessing: 'Constant peak normalization to 0.84 and 0.4-second tail fade; AAC compression for preview.',
  bpm: cps * 240, beginCycle, endCycle: beginCycle + cycles, cycles, musicalDurationSeconds: cycles / cps,
  durationSeconds: rendered.length / sampleRate, sampleRate, channels: 2,
  events: events.length, rawPeak, rawRmsDbFS: 20 * Math.log10(Math.sqrt(rawSum / (2 * rendered.length))),
  sampleEventCount, sampleSources, samplePitchMappings: [...samplePitchMappings.values()],
  normalizationGain: scale, finalPeak, finalPeakDbFS: 20 * Math.log10(finalPeak),
  finalRmsDbFS: 20 * Math.log10(Math.sqrt(finalSum / (2 * rendered.length))), nonFiniteSamples: nonFinite,
  wavFile, m4aFile, byBar,
};
await fs.mkdir(outdir, { recursive: true });
await fs.writeFile(path.join(outdir, reportPrefix + 'events.json'), JSON.stringify(events, null, 2));
await fs.writeFile(path.join(outdir, reportPrefix + 'render-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, byBar: undefined }, null, 2));
