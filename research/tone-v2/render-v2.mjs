// Offline preview of the same Strudel events and samples.
// Sample selection and envelopes follow the local Strudel source;
// reverb is an approximation, so this is not a browser loopback recording.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { OfflineAudioContext } from '../.audio-preview/node_modules/node-web-audio-api/index.js';
import { noteToMidi, getSoundIndex } from '../strudel/packages/core/index.mjs';

const root = '<LEGACY_WORKSPACE>';
const directory = path.join(root, '.tone-v2');
const input = JSON.parse(await fs.readFile(path.join(directory, 'events.json'), 'utf8'));
const sampleMap = JSON.parse(await fs.readFile(path.join(directory, 'samples.json'), 'utf8'));
let validation = {};
try { validation = JSON.parse(await fs.readFile(path.join(directory, 'validation.json'), 'utf8')); } catch {}
const events = input.events;
const cps = input.cps ?? validation.cps ?? 0.55;
const rate = 44100;
const cycles = input.totalCycles ?? validation.totalCycles ?? 36;
const duration = cycles / cps + 3;
const orbitNumbers = [...new Set(events.map(event => event.value.orbit ?? 0))].sort((a, b) => a - b);
const ac = new OfflineAudioContext(2 + 2 * orbitNumbers.length, Math.ceil(duration * rate), rate);
const master = ac.createGain();
master.channelCount = 2;
master.channelCountMode = 'explicit';
const recordMerger = ac.createChannelMerger(2 + 2 * orbitNumbers.length);
const masterSplit = ac.createChannelSplitter(2);
master.connect(masterSplit);
masterSplit.connect(recordMerger, 0, 0);
masterSplit.connect(recordMerger, 1, 1);
recordMerger.connect(ac.destination);

const stats = { usedSamples: [], sourceMap: path.join(directory, 'samples.json') };
const buffers = new Map();
async function resolveLocal(resource) {
  if (resource.startsWith('http://127.0.0.1:3009/') || resource.startsWith('http://localhost:3009/')) {
    const pathname = decodeURIComponent(new URL(resource).pathname);
    const candidates = [
      path.join(root, 'strudel/website/public', pathname),
      path.join(root, 'strudel/website/dist', pathname),
      path.join(directory, pathname.replace(/^\/[^/]+\//, '')),
    ];
    for (const candidate of candidates) {
      try { await fs.access(candidate); return candidate; } catch {}
    }
    throw new Error('Local sample URL is not present on disk: ' + resource);
  }
  if (resource.startsWith('/')) {
    try { await fs.access(resource); return resource; } catch {}
    return path.join(root, 'strudel/website/public', resource);
  }
  if (/^https?:/.test(resource)) throw new Error('Preview expects downloaded samples, got ' + resource);
  return path.resolve(directory, resource);
}
async function loadBuffer(resource) {
  if (buffers.has(resource)) return buffers.get(resource);
  const promise = (async () => {
    const filename = await resolveLocal(resource);
    const bytes = await fs.readFile(filename);
    const buffer = await ac.decodeAudioData(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    stats.usedSamples.push({ file: filename, bytes: bytes.length, channels: buffer.numberOfChannels, seconds: buffer.duration });
    return buffer;
  })();
  buffers.set(resource, promise);
  return promise;
}

function sampleInfo(event) {
  const value = event.value;
  const instrument = (value.bank ? `${value.bank}_${value.s}` : value.s).toLowerCase();
  const key = Object.keys(sampleMap).find(name => name.toLowerCase() === instrument);
  if (!key) throw new Error('Missing sample instrument ' + instrument);
  const bank = sampleMap[key];
  const base = bank._base ?? sampleMap._base ?? '';
  let samples, transpose;
  const midi = event.midi ?? (value.note == null ? 36 : noteToMidi(value.note));
  if (Array.isArray(bank)) {
    samples = bank;
    transpose = midi - 36;
  } else if (typeof bank === 'string') {
    samples = [bank];
    transpose = midi - 36;
  } else {
    const keys = Object.keys(bank).filter(name => !name.startsWith('_'));
    const closest = keys.reduce((best, candidate) => best == null || Math.abs(noteToMidi(candidate) - midi) < Math.abs(noteToMidi(best) - midi) ? candidate : best, null);
    samples = Array.isArray(bank[closest]) ? bank[closest] : [bank[closest]];
    transpose = midi - noteToMidi(closest);
  }
  return { resource: base + samples[getSoundIndex(value.n, samples.length)], rate: Math.abs(value.speed ?? 1) * Math.pow(2, transpose / 12) };
}

const bassFile = path.join(root, '.audio-preview/assets/0330_FluidR3_GM_sf2_file.js');
const sandbox = vm.createContext({}, { codeGeneration: { strings: false, wasm: false } });
new vm.Script(await fs.readFile(bassFile, 'utf8')).runInContext(sandbox, { timeout: 1000 });
const bassZones = Object.values(sandbox).find(value => value?.zones).zones;
const zoneBuffers = new Map();
async function bassInfo(event) {
  const zone = bassZones.find(zone => zone.keyRangeLow <= event.midi && zone.keyRangeHigh + 1 >= event.midi);
  if (!zone) throw new Error('Missing bass zone for ' + event.midi);
  if (!zoneBuffers.has(zone)) {
    const bytes = Buffer.from(zone.file, 'base64');
    zoneBuffers.set(zone, ac.decodeAudioData(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)));
  }
  const detune = zone.originalPitch - 100 * (zone.coarseTune ?? 0) - (zone.fineTune ?? 0);
  return { buffer: await zoneBuffers.get(zone), zone, rate: Math.pow(2, (100 * event.midi - detune) / 1200) };
}

let seed = 72491;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
function impulse(seconds) {
  const length = Math.max(2, Math.round(seconds * rate));
  const buffer = ac.createBuffer(2, length, rate);
  for (let channel = 0; channel < 2; channel++) {
    const data = new Float32Array(length);
    let previous = 0;
    for (let i = 0; i < length; i++) {
      previous = 0.5 * previous + 0.5 * (random() * 2 - 1);
      data[i] = previous * Math.pow(1 - i / length, 2.6);
    }
    buffer.copyToChannel(data, channel);
  }
  return buffer;
}
const orbits = new Map();
function getOrbit(value) {
  const number = value.orbit ?? 0;
  if (orbits.has(number)) return orbits.get(number);
  const bus = ac.createGain();
  bus.channelCount = 2;
  bus.channelCountMode = 'explicit';
  bus.connect(master);
  const splitter = ac.createChannelSplitter(2);
  bus.connect(splitter);
  const offset = 2 + 2 * orbitNumbers.indexOf(number);
  splitter.connect(recordMerger, 0, offset);
  splitter.connect(recordMerger, 1, offset + 1);
  const reverb = ac.createConvolver();
  reverb.buffer = impulse(value.roomsize ?? 1.5);
  const wet = ac.createGain();
  wet.gain.value = 0.55;
  reverb.connect(wet).connect(bus);
  const delay = ac.createDelay(3);
  delay.delayTime.value = value.delaysync != null ? value.delaysync / cps : value.delaytime ?? 0.2;
  const feedback = ac.createGain();
  feedback.gain.value = Math.min(value.delayfeedback ?? 0.2, 0.98);
  delay.connect(feedback).connect(delay);
  delay.connect(bus);
  const orbit = { bus, reverb, delay };
  orbits.set(number, orbit);
  return orbit;
}

// Mirrors Strudel getADSRValues defaults and linear getParamADSR behavior.
function adsr(value) {
  const { attack: a, decay: d, sustain: s, release: r } = value;
  if (a == null && d == null && s == null && r == null) return [0.001, 0.001, 1, 0.01];
  const sustain = s != null ? s : d == null ? 1 : 0.001;
  return [Math.max(a ?? 0, 0.001), Math.max(d ?? 0, 0.001), Math.min(sustain, 1), Math.max(r ?? 0, 0.01)];
}
function envelope(param, value, begin, holdEnd, amplitude) {
  const [attack, decay, sustain, release] = adsr(value);
  const duration = holdEnd - begin;
  const at = time => time < attack ? amplitude * time / attack : amplitude * (1 + (sustain - 1) * (time - attack) / decay);
  param.setValueAtTime(0, begin);
  if (attack > duration) {
    param.linearRampToValueAtTime(at(duration), holdEnd);
  } else if (attack + decay > duration) {
    param.linearRampToValueAtTime(amplitude, begin + attack);
    param.linearRampToValueAtTime(at(duration), holdEnd);
  } else {
    param.linearRampToValueAtTime(amplitude, begin + attack);
    param.linearRampToValueAtTime(amplitude * sustain, begin + attack + decay);
    param.setValueAtTime(amplitude * sustain, holdEnd);
  }
  param.linearRampToValueAtTime(0, holdEnd + release);
  return holdEnd + release + 0.01;
}
const cutGroups = new Map();
function connectFX(source, value, begin, holdEnd, isFont) {
  const env = ac.createGain();
  const amplitude = (value.gain ?? 0.8) * (value.velocity ?? 1) * (isFont ? 0.3 : 1);
  const end = envelope(env.gain, value, begin, holdEnd, amplitude);
  source.connect(env);
  const cutGain = ac.createGain();
  env.connect(cutGain);
  if (!isFont && value.cut != null) {
    const previous = cutGroups.get(value.cut);
    if (previous) {
      previous.gain.setValueAtTime(1, begin);
      previous.gain.linearRampToValueAtTime(0, begin + 0.01);
    }
    cutGroups.set(value.cut, cutGain);
  }
  let node = cutGain;
  for (const [type, cutoff, q] of [
    ['highpass', value.hcutoff, value.hresonance],
    ['lowpass', value.cutoff, value.resonance],
  ]) {
    if (cutoff != null) {
      const filter = ac.createBiquadFilter();
      filter.type = type; filter.frequency.value = cutoff; filter.Q.value = q ?? 1;
      node.connect(filter); node = filter;
    }
  }
  const panner = ac.createStereoPanner();
  panner.pan.value = 2 * (value.pan ?? 0.5) - 1;
  node.connect(panner);
  const orbit = getOrbit(value);
  panner.connect(orbit.bus);
  if (value.room) { const send = ac.createGain(); send.gain.value = value.room; panner.connect(send).connect(orbit.reverb); }
  if (value.delay) { const send = ac.createGain(); send.gain.value = value.delay; panner.connect(send).connect(orbit.delay); }
  return end;
}

const scheduled = await Promise.all(events.map(async event => {
  const isFont = event.value.s === 'gm_electric_bass_finger';
  if (isFont) return { event, isFont, ...await bassInfo(event) };
  const selected = sampleInfo(event);
  return { event, isFont, buffer: await loadBuffer(selected.resource), rate: selected.rate };
}));
console.log(`Decoded ${buffers.size} sampled guitar/drum files and ${zoneBuffers.size} bass zones`);
for (const entry of scheduled.sort((a, b) => a.event.start - b.event.start)) {
  const { event, buffer, rate: playbackRate, isFont, zone } = entry;
  const value = event.value;
  const begin = event.start / cps;
  let length = (event.end - event.start) / cps * (value.clip ?? value.legato ?? 1);
  const source = ac.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = playbackRate;
  let offset = isFont ? 0 : (value.begin ?? 0) * buffer.duration;
  if (isFont && zone.loopStart > 1 && zone.loopStart < zone.loopEnd) {
    source.loop = true; source.loopStart = zone.loopStart / zone.sampleRate; source.loopEnd = zone.loopEnd / zone.sampleRate;
  } else if (value.loop) {
    source.loop = true; source.loopStart = (value.loopBegin ?? 0) * buffer.duration; source.loopEnd = (value.loopEnd ?? 1) * buffer.duration;
  }
  if (!isFont && value.clip == null && value.loop == null && value.release == null) {
    length = ((value.end ?? 1) - (value.begin ?? 0)) * buffer.duration / playbackRate;
  }
  const end = connectFX(source, value, begin, begin + length, isFont);
  source.start(begin + (value.nudge ?? 0), offset);
  source.stop(end);
}
console.log(`Rendering ${events.length} events over ${duration.toFixed(2)} seconds`);
const rendered = await ac.startRendering();
const outputChannels = [new Float32Array(rendered.length), new Float32Array(rendered.length)];
outputChannels.forEach((data, i) => rendered.copyFromChannel(data, i));
function analyze(channels, start = 0, end = rendered.length) {
  let sum = 0, peak = 0, nonzero = 0;
  for (let i = start; i < end; i++) for (const data of channels) {
    const sample = data[i];
    if (!Number.isFinite(sample)) throw new Error('Non-finite output sample');
    peak = Math.max(peak, Math.abs(sample)); sum += sample * sample;
    if (Math.abs(sample) > 1e-5) nonzero++;
  }
  return { peak, rms: Math.sqrt(sum / ((end - start) * channels.length)), nonzeroSamples: nonzero };
}
const raw = analyze(outputChannels);
if (!raw.nonzeroSamples || raw.peak === 0) throw new Error('Rendered output is silent');
const normalization = 0.82 / raw.peak;
const orbitStats = {};
for (let i = 0; i < orbitNumbers.length; i++) {
  const channels = [new Float32Array(rendered.length), new Float32Array(rendered.length)];
  channels.forEach((data, channel) => rendered.copyFromChannel(data, 2 + 2 * i + channel));
  const analysis = analyze(channels);
  orbitStats[orbitNumbers[i]] = { rawPeak: analysis.peak, rawRmsDbFS: 20 * Math.log10(analysis.rms), finalRmsDbFS: 20 * Math.log10(analysis.rms * normalization) };
}
for (let i = 0; i < rendered.length; i++) {
  const fade = Math.min(1, (rendered.length - i) / rate / 0.8);
  for (const channel of outputChannels) channel[i] *= normalization * fade;
}
const final = analyze(outputChannels);
const byteLength = rendered.length * 4;
const wav = Buffer.alloc(44 + byteLength);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + byteLength, 4); wav.write('WAVE', 8); wav.write('fmt ', 12);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22); wav.writeUInt32LE(rate, 24);
wav.writeUInt32LE(rate * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(byteLength, 40);
for (let i = 0; i < rendered.length; i++) for (let channel = 0; channel < 2; channel++) {
  wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, outputChannels[channel][i])) * 32767), 44 + (i * 2 + channel) * 2);
}
const destination = path.join(root, '天台晚风-v2-preview.wav');
await fs.writeFile(destination, wav);
const m4a = path.join(root, '天台晚风-v2-preview.m4a');
execFileSync('/usr/bin/afconvert', [destination, m4a, '-f', 'm4af', '-d', 'aac', '-b', '192000']);
const report = {
  file: destination, m4a, events: events.length, sampleRate: rate, channels: 2, duration: rendered.length / rate,
  rawPeak: raw.peak, finalPeak: final.peak, peakDbFS: 20 * Math.log10(final.peak), rmsDbFS: 20 * Math.log10(final.rms),
  nonzeroSamples: final.nonzeroSamples, normalization, orbitStats, ...stats,
  notes: 'Same Strudel event timing, sample selection, repitch, gain and envelope semantics. The native offline renderer approximates spatial effects; not a browser loopback recording. The v1 source and preview are preserved.',
};
await fs.writeFile(path.join(directory, 'render-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ file: destination, m4a, rawPeak: raw.peak, peakDbFS: report.peakDbFS, rmsDbFS: report.rmsDbFS, orbitStats }, null, 2));
