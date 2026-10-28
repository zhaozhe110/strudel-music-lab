// Reproducible offline preview using Strudel event/sample/pitch semantics.
// Usage: node render-v3.mjs [input-directory] [output-prefix]
// Required input: events.json {events,cps,totalCycles}; samples.json.
// Optional events.json: sections, renderOptions, articulationExtension.
// Space effects remain an approximation, not a browser loopback recording.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { OfflineAudioContext } from '../.audio-preview/node_modules/node-web-audio-api/index.js';
import { noteToMidi, getSoundIndex } from '../strudel/packages/core/index.mjs';
import { getADSRValues, getParamADSR, getPitchEnvelope } from '../strudel/packages/superdough/helpers.mjs';
import { articulationSettings, scheduleStaticDetune, scheduleVibratoDepth } from './articulation-curves.mjs';

const root = '<LEGACY_WORKSPACE>';
const directory = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, '.performance-v3');
const outputPrefix = process.argv[3] ? path.resolve(process.argv[3]) : path.join(root, '天台晚风-v3-preview');
const input = JSON.parse(await fs.readFile(path.join(directory, 'events.json'), 'utf8'));
const sampleMap = JSON.parse(await fs.readFile(path.join(directory, 'samples.json'), 'utf8'));
let validation = {};
try { validation = JSON.parse(await fs.readFile(path.join(directory, 'validation.json'), 'utf8')); } catch {}
const events = input.events;
const instrumentAliases = {roof_live:'roof_clean',roof_live_soft:'roof_clean_soft',...(input.instrumentAliases??{})};
if (!Array.isArray(events) || !events.length) throw new Error('Expected non-empty events array');
const renderOptions = input.renderOptions ?? {};
const cps = input.cps ?? validation.cps ?? 0.55;
const rate = renderOptions.sampleRate ?? 44100;
const cycles = input.totalCycles ?? validation.totalCycles ?? 36;
const duration = cycles / cps + (renderOptions.tailSeconds ?? 3);
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

const stats = { rendererRevision:'v3.1', usedSamples: [], sourceMap: path.join(directory, 'samples.json'), articulation: { slides: 0, nativePitchEnvelopes: 0, vibratoNotes: 0, delayedVibratoNotes: 0, pickDetuneNotes: 0, extendedControls: [] }, unsupportedControls: [] };
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
  return path.resolve(directory, decodeURIComponent(resource));
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
  const sound = instrumentAliases[value.s] ?? value.s;
  const instrument = (value.bank ? `${value.bank}_${sound}` : sound).toLowerCase();
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
  if (!samples?.length) throw new Error(`No samples for ${instrument}`);
  return { resource: base + samples[getSoundIndex(value.n, samples.length)], rate: Math.abs(value.speed ?? 1) * Math.pow(2, transpose / 12) };
}

const bassFile = path.join(root, '.audio-preview/assets/0330_FluidR3_GM_sf2_file.js');
let bassZones;
if (events.some(event => event.value.s === 'gm_electric_bass_finger')) {
  const sandbox = vm.createContext({}, { codeGeneration: { strings: false, wasm: false } });
  new vm.Script(await fs.readFile(bassFile, 'utf8')).runInContext(sandbox, { timeout: 1000 });
  bassZones = Object.values(sandbox).find(value => value?.zones).zones;
}
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
const reverbKey = value => JSON.stringify([value.roomsize??2,value.roomfade??.1,value.roomlp??15000,value.roomdim??1000]);
const reverbBuffers = new Map();
async function impulse(value) {
  // Matches Strudel reverbGen (Alan deLespinasse, Apache-2.0): exponential
  // -60 dB at roomsize, an extra 50% tail, fade-in, moving lowpass.
  // The seeded random sequence makes offline iterations reproducible.
  const seconds = value.roomsize ?? 2;
  const fade = value.roomfade ?? .1;
  const length = Math.max(2, Math.round(seconds * 1.5 * rate));
  const buffer = ac.createBuffer(2,length,rate);
  const decayFrames = Math.round(seconds*rate);
  const fadeFrames = Math.round(fade*rate);
  const decayBase = Math.pow(1/1000,1/decayFrames);
  for (let channel = 0; channel < 2; channel++) {
    const data = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      data[i]=(random()*2-1)*Math.pow(decayBase,i);
      if(i<fadeFrames)data[i]*=i/fadeFrames;
    }
    buffer.copyToChannel(data, channel);
  }
  const start = value.roomlp??15000,end=value.roomdim??1000;
  if(!start)return buffer;
  const context=new OfflineAudioContext(2,length,rate);
  const source=context.createBufferSource();source.buffer=buffer;
  const filter=context.createBiquadFilter();filter.type='lowpass';filter.Q.value=.0001;
  filter.frequency.setValueAtTime(Math.min(start,rate/2),0);
  filter.frequency.linearRampToValueAtTime(Math.min(end,rate/2),seconds);
  source.connect(filter).connect(context.destination);source.start(0);
  return context.startRendering();
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
  const orbit = {bus,reverbs:new Map(),delay:null,feedback:null};
  orbits.set(number, orbit);
  return orbit;
}
function getReverb(orbit,value) {
  const key=reverbKey(value);
  if(!orbit.reverbs.has(key)){
    const node=ac.createConvolver();node.buffer=reverbBuffers.get(key);
    if(!node.buffer)throw new Error('Reverb buffer was not prepared');
    node.connect(orbit.bus);orbit.reverbs.set(key,node);
  }
  return orbit.reverbs.get(key);
}
function getDelay(orbit,value,time) {
  const delayTime=value.delaytime??(value.delaysync??3/16)/cps;
  const feedback=Math.min(.98,Math.max(0,value.delayfeedback??.5));
  if(!(delayTime>0&&feedback>0))return null;
  if(!orbit.delay){
    orbit.delay=ac.createDelay(5);orbit.feedback=ac.createGain();
    orbit.delay.connect(orbit.feedback).connect(orbit.delay);orbit.delay.connect(orbit.bus);
  }
  orbit.delay.delayTime.setValueAtTime(delayTime,time);
  orbit.feedback.gain.setValueAtTime(feedback,time);
  return orbit.delay;
}

function envelope(param, value, begin, holdEnd, amplitude) {
  const [attack, decay, sustain, release] = getADSRValues([value.attack, value.decay, value.sustain, value.release]);
  getParamADSR(param, attack, decay, sustain, release, 0, amplitude, begin, holdEnd, 'linear');
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
    const cutTime = begin+(Number(value.nudge)||0);
    if (previous) {
      previous.gain.setValueAtTime(1, cutTime);
      previous.gain.linearRampToValueAtTime(0, cutTime + 0.01);
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
  if (value.compressor !== undefined) {
    const compressor=ac.createDynamicsCompressor();
    for (const [key,v] of Object.entries({threshold:value.compressor??-3,ratio:value.compressorRatio??10,knee:value.compressorKnee??10,attack:value.compressorAttack??.005,release:value.compressorRelease??.05})) compressor[key].value=v;
    node.connect(compressor);node=compressor;
  }
  const panner = ac.createStereoPanner();
  panner.pan.value = 2 * (value.pan ?? 0.5) - 1;
  node.connect(panner);
  const orbit = getOrbit(value);
  const post = ac.createGain();
  post.gain.value = value.postgain ?? 1;
  panner.connect(post);
  const direct = ac.createGain();
  direct.gain.value = value.dry ?? 1;
  post.connect(direct).connect(orbit.bus);
  if (value.room>0) { const send = ac.createGain(); send.gain.value = value.room; post.connect(send).connect(getReverb(orbit,value)); }
  if (value.delay>0) {
    const delay=getDelay(orbit,value,begin);
    if(delay){const send = ac.createGain(); send.gain.value = value.delay; post.connect(send).connect(delay);}
  }
  return end;
}

// Stock Strudel pitch/vibrato controls. Custom delayed vibrato is only valid
// when the browser registers the same articulation extension; the report lists it.
function pitchArticulation(source, value, begin, holdEnd, end) {
  const custom = Object.hasOwn(instrumentAliases,value.s);
  const p = articulationSettings(value);
  const extendedPitch = custom && (p.slideFrom !== 0 || p.pickCents !== 0);
  if (!custom && (p.slideFrom || p.pickCents || p.vibdelay || p.vibattack)) {
    throw new Error(`Extended articulation on ${value.s} requires a registered articulated instrument alias`);
  }
  const nativePitch = value.pattack ?? value.pdecay ?? value.psustain ?? value.prelease ?? value.penv;
  if (nativePitch !== undefined && !extendedPitch) {
    getPitchEnvelope(source.detune, value, begin, holdEnd);
    stats.articulation.nativePitchEnvelopes++;
  }
  const articulationBegin = custom ? Math.max(0,begin+(Number(value.nudge)||0)) : begin;
  if (extendedPitch) {
    scheduleStaticDetune(source.detune,articulationBegin,p);
    if (value.slideFrom) stats.articulation.slides++;
    if (value.pickCents) stats.articulation.pickDetuneNotes++;
    stats.articulation.extendedControls.push('slideFrom/slideTime/pickCents/pickDecay');
  }
  if (value.vib > 0 && (!custom || p.vibmod > 0)) {
    const oscillator = ac.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = value.vib;
    const depth = ac.createGain();
    const cents = (value.vibmod ?? 0.5) * 100;
    let start=begin;
    if (custom) {
      depth.gain.value=0;
      const plan=scheduleVibratoDepth(depth.gain,articulationBegin,p);
      start=plan.start;
    } else depth.gain.setValueAtTime(cents,begin);
    if (custom && (p.vibdelay || p.vibattack)) {
      stats.articulation.delayedVibratoNotes++;
      stats.articulation.extendedControls.push('vibdelay/vibattack');
    }
    oscillator.connect(depth).connect(source.detune);
    oscillator.start(start);
    oscillator.stop(Math.max(start,end));
    stats.articulation.vibratoNotes++;
  }
}

const unsupported = ['shape','distort','crush','coarse','transient','tremolo','tremolosync','phaserrate','stretch','djf','lpenv','hpenv','bpenv','lpattack','hpattack','bpattack','fmi','fmh','leslie','ir'];
for (const control of unsupported) if (events.some(event => event.value[control] != null)) stats.unsupportedControls.push(control);
if (stats.unsupportedControls.length && !renderOptions.allowUnsupportedControls) throw new Error('Unsupported audible controls: '+stats.unsupportedControls.join(', '));
for(const value of new Map(events.filter(event=>event.value.room>0).map(event=>[reverbKey(event.value),event.value])).values()){
  reverbBuffers.set(reverbKey(value),await impulse(value));
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
  let length = event.durationSeconds ?? (event.durationCycles ?? ((value.duration ?? (event.end - event.start)) * (value.clip ?? value.legato ?? 1))) / cps;
  if (!(length > 0) || !Number.isFinite(length)) throw new Error('Invalid event duration');
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
  pitchArticulation(source, value, begin, begin + length, end);
  source.start(isFont ? begin : begin + (value.nudge ?? 0), offset);
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
const ceiling = renderOptions.peakCeiling ?? 0.82;
let normalization = ceiling / raw.peak;
if (renderOptions.normalize === 'none') normalization = 1;
if (renderOptions.normalize === 'rms') normalization = Math.min(Math.pow(10,(renderOptions.targetRmsDb ?? -21)/20)/raw.rms, ceiling/raw.peak);
const db = value => value > 0 ? 20 * Math.log10(value) : null;
const rangeStats = (channels, startSeconds, endSeconds) => {
  const start = Math.min(rendered.length-1, Math.max(0, Math.floor(startSeconds*rate)));
  const end = Math.min(rendered.length, Math.max(start+1, Math.floor(endSeconds*rate)));
  const result = analyze(channels,start,end);
  return { startSeconds: start/rate, endSeconds: end/rate, rawPeak: result.peak, rawRmsDbFS: db(result.rms), finalRmsDbFS: db(result.rms*normalization) };
};
const sectionDefinitions = input.sections ?? Array.from({length:Math.ceil(cycles/4)},(_,index)=>({name:`cycles_${index*4}_${Math.min(index*4+4,cycles)}`,start:index*4,end:Math.min(index*4+4,cycles)}));
const sectionMetrics = sectionDefinitions.map(section => {
  const startSeconds = section.startSeconds ?? (section.start ?? section.begin ?? section.beginCycle ?? 0)/cps;
  const endSeconds = section.endSeconds ?? (section.end ?? section.endCycle ?? cycles)/cps;
  return { name: section.name ?? 'section', ...rangeStats(outputChannels,startSeconds,endSeconds) };
});
const orbitStats = {};
for (let i = 0; i < orbitNumbers.length; i++) {
  const channels = [new Float32Array(rendered.length), new Float32Array(rendered.length)];
  channels.forEach((data, channel) => rendered.copyFromChannel(data, 2 + 2 * i + channel));
  const analysis = analyze(channels);
  const group = events.filter(event => (event.value.orbit ?? 0) === orbitNumbers[i]);
  let attackEnergy = 0, bodyEnergy = 0, measured = 0;
  for (const event of group) {
    const onset = event.start/cps;
    if (onset+0.22 >= duration) continue;
    const attack = analyze(channels,Math.floor(onset*rate),Math.floor((onset+0.035)*rate));
    const body = analyze(channels,Math.floor((onset+0.08)*rate),Math.floor((onset+0.22)*rate));
    attackEnergy += attack.rms**2; bodyEnergy += body.rms**2; measured++;
  }
  const intervals = group.map(event=>event.start).sort((a,b)=>a-b).filter((time,index,array)=>index===0 || time!==array[index-1])
    .map((time,index,array)=>index ? (time-array[index-1])/cps : null).filter(value=>value!=null);
  orbitStats[orbitNumbers[i]] = {
    rawPeak: analysis.peak, rawRmsDbFS: db(analysis.rms), finalRmsDbFS: db(analysis.rms*normalization),
    measuredOnsets: measured,
    onsetAttackToBodyDb: bodyEnergy>0 ? 10*Math.log10(attackEnergy/bodyEnergy) : null,
    interOnsetSeconds: intervals.length ? {min:Math.min(...intervals),max:Math.max(...intervals),uniqueRoundedToMs:new Set(intervals.map(value=>Math.round(value*1000))).size} : null,
    sections: sectionDefinitions.map(section => ({name:section.name??'section',...rangeStats(channels,section.startSeconds??(section.start??section.begin??section.beginCycle??0)/cps,section.endSeconds??(section.end??section.endCycle??cycles)/cps)})),
  };
}
const frameSeconds = 0.05;
const frameEnvelope = Array.from({length:Math.ceil(duration/frameSeconds)},(_,index)=>{
  const value=rangeStats(outputChannels,index*frameSeconds,Math.min(duration,(index+1)*frameSeconds));
  return {seconds:Math.round(index*frameSeconds*1000)/1000,rmsDbFS:value.rawRmsDbFS};
});
const silentFrames = frameEnvelope.filter(frame=>frame.rmsDbFS==null || frame.rmsDbFS < -70).length;
const tail = rangeStats(outputChannels,cycles/cps,duration);
stats.articulation.extendedControls = [...new Set(stats.articulation.extendedControls)];
stats.reverbConfigurations = [...orbits.entries()].flatMap(([orbit, state]) => [...state.reverbs.keys()].map(key=>({orbit,roomsize:JSON.parse(key)[0],fade:JSON.parse(key)[1],lowpassStart:JSON.parse(key)[2],lowpassEnd:JSON.parse(key)[3]})));
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
const destination = `${outputPrefix}.wav`;
await fs.mkdir(path.dirname(destination), {recursive:true});
await fs.writeFile(destination, wav);
const m4a = `${outputPrefix}.m4a`;
execFileSync('/usr/bin/afconvert', [destination, m4a, '-f', 'm4af', '-d', 'aac', '-b', '192000']);
const report = {
  file: destination, m4a, events: events.length, sampleRate: rate, channels: 2, duration: rendered.length / rate,
  rawPeak: raw.peak, finalPeak: final.peak, peakDbFS: 20 * Math.log10(final.peak), rmsDbFS: 20 * Math.log10(final.rms),
  nonzeroSamples: final.nonzeroSamples, normalization, normalizationMode: renderOptions.normalize ?? 'peak', orbitStats, sectionMetrics, tail, silenceBelowMinus70dBSeconds:silentFrames*frameSeconds, ...stats,
  notes: 'Uses local Strudel getADSRValues/getParamADSR/getPitchEnvelope, nearest-root/n selection, source pitch, gain/pan and matching browser articulation curves. Reverb uses the Strudel exponential/fade/filter algorithm with a reproducible random seed; changing room parameters uses separate offline convolvers, so parameter changes and browser random IRs are not bit-exact. Not a browser loopback recording. Objective metrics do not prove musical quality or that the output was listened to.',
};
await fs.writeFile(`${outputPrefix}-report.json`, JSON.stringify(report, null, 2));
await fs.writeFile(`${outputPrefix}-envelope.json`, JSON.stringify(frameEnvelope));
console.log(JSON.stringify({ file: destination, m4a, rawPeak: raw.peak, peakDbFS: report.peakDbFS, rmsDbFS: report.rmsDbFS, articulation:stats.articulation, sectionMetrics }, null, 2));
