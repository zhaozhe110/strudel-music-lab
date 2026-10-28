import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { registerHooks } from 'node:module';
import * as audio from 'node-web-audio-api';
import { ROOT, PUBLIC, relative, verifyRuntime, resolveInside, mimeType } from './project.mjs';

export const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const nativeFetch = globalThis.fetch;
let modules, currentTrace;
const supportedSynths = new Set(['square', 'sqr', 'sawtooth', 'saw', 'sine', 'sin', 'triangle', 'tri', 'user', 'white', 'pink', 'brown', 'crackle', 'sbd']);
const unsupportedEffects = ['coarse', 'crush', 'shape', 'distort', 'djf', 'stretch', 'transient', 'workletSrc', 'lfo', 'env'];

const isLocal = url => ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);

async function localResource(url) {
  const filename = await resolveInside(PUBLIC, decodeURIComponent(url.pathname));
  const bytes = await fs.readFile(filename);
  const entry = { url: url.href, file: relative(filename), bytes: bytes.length, sha256: sha256(bytes) };
  currentTrace?.resources.set(url.href, entry);
  return { filename, bytes, entry };
}

async function mappedFetch(input, options = {}) {
  const value = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const url = new URL(value, 'http://127.0.0.1:3009/');
  if (isLocal(url)) {
    if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    try {
      const { filename, bytes } = await localResource(url);
      return new Response(bytes, { status: 200, headers: { 'Content-Type': mimeType(filename) } });
    } catch (error) {
      throw new Error(`Local asset ${url.pathname} could not be read from repo/public: ${error.message}`);
    }
  }
  if (!currentTrace?.allowRemote) throw new Error(`Remote fetch is disabled: ${url.href}. Use --allow-remote only when the score needs external assets.`);
  return nativeFetch(input, options);
}

async function loadModules() {
  if (modules) return modules;
  const info = await verifyRuntime();
  Object.assign(globalThis, audio);
  // Native-node scores do not use this Vite-generated worklet bundle. Reject
  // worklet-dependent instruments/effects explicitly instead of approximating.
  registerHooks({ resolve(specifier, context, nextResolve) {
    if (specifier.endsWith('?audioworklet')) return { url: 'data:text/javascript,export default ""', shortCircuit: true };
    return nextResolve(specifier, context);
  } });
  const get = filename => import(pathToFileURL(path.join(info.runtime, filename)).href);
  const core = await get('packages/core/index.mjs');
  const mini = await get('packages/mini/index.mjs');
  const tonal = await get('packages/tonal/index.mjs');
  const { transpiler } = await get('packages/transpiler/index.mjs');
  const dough = await get('packages/superdough/index.mjs');
  dough.setLogger((message, type) => {
    if (!['load-sample', 'loaded-sample'].includes(type)) console.log(message);
  });
  globalThis.fetch = mappedFetch;
  for (const name of ['_pianoroll', '_scope', '_spectrum', 'pianoroll', 'scope', 'spectrum']) {
    core.Pattern.prototype[name] = function () { return this; };
  }
  modules = { ...info, core, mini, tonal, transpiler, dough, audio };
  return modules;
}

export async function loadScore(filename, { allowRemote = false } = {}) {
  const engine = await loadModules();
  const { core, mini, tonal, transpiler, dough } = engine;
  const code = await fs.readFile(filename, 'utf8');
  const trace = { allowRemote, resources: new Map(), declaredSamples: new Set(), arrangementLengths: [] };
  currentTrace = trace;
  dough.soundMap.set({});
  dough.registerSynthSounds();
  // Some saved scores explicitly preload their samples. Give that code a tiny
  // offline context, never a system audio-device context. Close it by rendering
  // its single silent frame before any real export context is installed.
  const preloadContext = new audio.OfflineAudioContext(2, 1, 44100);
  dough.setAudioContext(preloadContext);
  dough.setSuperdoughAudioController(null);
  const samples = async (...args) => {
    const before = { ...dough.soundMap.get() };
    await dough.samples(...args);
    for (const [name, sound] of Object.entries(dough.soundMap.get())) {
      if (!name.startsWith('_') && sound.data?.type === 'sample' && before[name] !== sound) trace.declaredSamples.add(name);
    }
  };
  const arrange = (...sections) => {
    trace.arrangementLengths.push(sections.reduce((total, section) => total + Number(section[0]), 0));
    return core.arrange(...sections);
  };
  await core.evalScope(core, mini, tonal, { samples, arrange, loadBuffer: dough.loadBuffer, getAudioContext: dough.getAudioContext });
  const repl = core.repl({ getTime: () => 0, onSchedule: () => {}, transpiler });
  let pattern;
  try {
    pattern = await repl.evaluate(code, false);
    if (repl.state.error) throw repl.state.error;
    if (!pattern?.queryArc) throw new Error('The score did not produce a Strudel pattern.');
  } finally {
    repl.stop();
    await preloadContext.startRendering();
  }
  return { ...engine, code, filename, sourceSha256: sha256(code), pattern, cps: repl.scheduler.cps, trace };
}

export function selection(score, options = {}) {
  if (options.begin !== undefined && options['from-seconds'] !== undefined) throw new Error('Choose --begin or --from-seconds, not both.');
  if (options.cycles !== undefined && options.seconds !== undefined) throw new Error('Choose --cycles or --seconds, not both.');
  const begin = options['from-seconds'] !== undefined ? Number(options['from-seconds']) * score.cps : Number(options.begin || 0);
  const inferred = score.trace.arrangementLengths.at(-1);
  const cycles = options.seconds !== undefined ? Number(options.seconds) * score.cps : Number(options.cycles ?? (inferred > 0 ? inferred : 64));
  if (!Number.isFinite(begin) || begin < 0 || !Number.isFinite(cycles) || cycles <= 0 || cycles > 4096) throw new Error('Invalid render/query range.');
  return { begin, cycles, end: begin + cycles };
}

export function queryEvents(score, { begin, end }) {
  return score.pattern.queryArc(begin, end).filter(hap => hap.hasOnset()).map(hap => {
    const event = { start: Number(hap.whole.begin), end: Number(hap.whole.end), duration: Number(hap.duration), value: { ...hap.value } };
    if (!Number.isFinite(event.start) || !Number.isFinite(event.end) || !(event.duration > 0) || event.end <= event.start) throw new Error('Invalid event timing.');
    if (typeof event.value.s !== 'string') throw new Error(`Event at cycle ${event.start} has no sound.`);
    for (const key of ['gain', 'velocity', 'pan']) if (event.value[key] != null && !Number.isFinite(Number(event.value[key]))) throw new Error(`Invalid ${key} at cycle ${event.start}.`);
    if (event.value.note != null && !Number.isFinite(score.core.valueToMidi(event.value))) throw new Error(`Invalid note at cycle ${event.start}.`);
    return event;
  }).sort((a, b) => a.start - b.start);
}

export function soundName(value) { return value.bank ? `${value.bank}_${value.s}` : value.s; }

export async function ensureSounds(score, events) {
  let drumMap;
  for (const event of events) {
    const name = soundName(event.value);
    if (score.dough.getSound(name)) continue;
    if (event.value.bank) {
      drumMap ??= JSON.parse(await fs.readFile(path.join(score.runtime, 'website/public/tidal-drum-machines.json'), 'utf8'));
      const key = Object.keys(drumMap).find(key => key.toLowerCase() === name.toLowerCase());
      if (key) {
        await score.dough.samples({ [key]: drumMap[key] }, 'https://strudel.b-cdn.net/tidal-drum-machines/machines/');
        continue;
      }
    }
    throw new Error(`Unregistered sound: ${name}. The score must register its samples explicitly.`);
  }
}

export function assertRenderable(score, events) {
  for (const { value } of events) {
    const name = soundName(value).toLowerCase();
    const sound = score.dough.getSound(name);
    if (sound?.data?.type !== 'sample' && !supportedSynths.has(name)) throw new Error(`Offline rendering does not support ${name}; use the Strudel browser runtime.`);
    if (value.room > 0 || value.ftype === 'ladder') throw new Error('Offline rendering currently excludes reverb and the ladder worklet filter.');
    for (const key of unsupportedEffects) if (value[key] != null) throw new Error(`Offline rendering excludes worklet effect ${key}; the score was not modified.`);
  }
}

function sampleUrls(sound) {
  const bank = sound.data.samples;
  return Array.isArray(bank) ? bank : Object.values(bank).flat();
}

export async function verifySampleResources(score, events) {
  const names = new Set([...score.trace.declaredSamples, ...events.map(event => soundName(event.value))]);
  const urls = new Set();
  for (const name of names) {
    const sound = score.dough.getSound(name);
    if (sound?.data?.type === 'sample') for (const url of sampleUrls(sound)) urls.add(url);
  }
  const resources = [];
  for (const value of urls) {
    const url = new URL(value);
    if (isLocal(url)) resources.push((await localResource(url)).entry);
    else resources.push({ url: url.href, verified: false, reason: 'External sample URL; not downloaded by structural validation.' });
  }
  return resources;
}

export async function renderAudio(score, events, range, { sampleRate = 44100, tail = 2 } = {}) {
  assertRenderable(score, events);
  const ac = new audio.OfflineAudioContext(2, Math.ceil((range.cycles / score.cps + tail) * sampleRate), sampleRate);
  score.dough.setAudioContext(ac);
  score.dough.setSuperdoughAudioController(null);
  score.dough.setMaxPolyphony(events.length + 32);
  const sources = new Map();
  const mappings = new Map();
  let sampleEvents = 0;
  for (const event of events) {
    const value = { ...event.value, s: soundName(event.value) };
    const sound = score.dough.getSound(value.s);
    if (sound?.data?.type !== 'sample') continue;
    sampleEvents++;
    const info = score.dough.getSampleInfo(value, sound.data.samples);
    sources.set(info.url, { url: info.url, sound: value.s });
    const mapping = { sound: value.s, note: value.note ?? null, speed: value.speed ?? 1, ...info };
    mappings.set(JSON.stringify(mapping), mapping);
  }
  const sampleSources = [];
  for (const source of sources.values()) {
    const buffer = await score.dough.loadBuffer(source.url, ac, source.sound);
    const resource = score.trace.resources.get(source.url);
    sampleSources.push({ ...source, ...resource, durationSeconds: buffer.duration, sampleRate: buffer.sampleRate, channels: buffer.numberOfChannels });
  }
  for (const event of events) await score.dough.superdough({ ...event.value }, (event.start - range.begin) / score.cps, event.duration / score.cps, score.cps, event.start);
  console.log(`Rendering ${events.length} events (${(range.cycles / score.cps + tail).toFixed(2)} seconds) with the pinned Superdough engine...`);
  const rendered = await ac.startRendering();
  const channels = Array.from({ length: 2 }, (_, index) => {
    const data = new Float32Array(rendered.length);
    rendered.copyFromChannel(data, index);
    return data;
  });
  return { channels, sampleRate, sampleEvents, sampleSources, samplePitchMappings: [...mappings.values()] };
}
