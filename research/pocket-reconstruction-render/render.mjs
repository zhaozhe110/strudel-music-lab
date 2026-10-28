// Offline rendering with the installed Strudel compiler and unmodified Superdough.
// Usage: node render.mjs SCORE.strudel CYCLES OUTPUT_BASENAME [START_CYCLE]
// OUTPUT_BASENAME can be absolute. Existing output files are overwritten.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { registerHooks } from 'node:module';
import { spawnSync } from 'node:child_process';
import * as audio from '../.audio-preview/node_modules/node-web-audio-api/index.js';

const root = '<LEGACY_WORKSPACE>';
const [scoreArg, cyclesArg = '16', outputArg = path.join(root, '.pocket-reconstruction-render/check'), startArg = '0'] = process.argv.slice(2);
if (!scoreArg) throw Error('Usage: node render.mjs SCORE.strudel CYCLES OUTPUT_BASENAME [START_CYCLE]');
const scoreFile = path.resolve(scoreArg), cycles = Number(cyclesArg), begin = Number(startArg);
const output = path.resolve(outputArg), sampleRate = 44100, tailSeconds = Number(process.env.RENDER_TAIL_SECONDS || 1);
if (!(cycles > 0 && cycles <= 1000 && begin >= 0)) throw Error('Invalid cycle range');
Object.assign(globalThis, audio);
// Browser location is used only for sample URL resolution by optional score code.
globalThis.location = new URL('http://127.0.0.1:3009/');
const originalFetch = globalThis.fetch;
const localSampleFiles = new Set();
const localResourceHashes = {};
globalThis.fetch = async (input, init) => {
  const url = String(input);
  let filename;
  if (url.startsWith('file://')) filename = fileURLToPath(url);
  else if (url.startsWith('/') && !url.startsWith('//')) {
    const candidates = [url, path.join(root, 'strudel/website/public', url), path.join(root, 'strudel/website/dist', url)];
    for (const candidate of candidates) { try { await fs.access(candidate); filename = candidate; break; } catch {} }
  } else if (/^https?:\/\/(127\.0\.0\.1|localhost):3009\//.test(url)) {
    const suffix = decodeURIComponent(new URL(url).pathname);
    for (const folder of ['public', 'dist']) {
      const candidate = path.join(root, `strudel/website/${folder}`, suffix);
      try { await fs.access(candidate); filename = candidate; break; } catch {}
    }
  }
  if (filename) {
    const contents = await fs.readFile(filename);
    localSampleFiles.add(filename);
    localResourceHashes[filename] = {sha256:crypto.createHash('sha256').update(contents).digest('hex'),bytes:contents.length};
    return new Response(contents, { status: 200 });
  }
  return originalFetch(input, init);
};
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('?audioworklet')) return {url:'data:text/javascript,export default ""',shortCircuit:true};
  return nextResolve(specifier, context);
}});
const core = await import('../strudel/packages/core/index.mjs');
const mini = await import('../strudel/packages/mini/index.mjs');
const tonal = await import('../strudel/packages/tonal/index.mjs');
const { transpiler } = await import('../strudel/packages/transpiler/index.mjs');
const dough = await import('../strudel/packages/superdough/index.mjs');
await core.evalScope(core, mini, tonal, { samples: dough.samples });
for (const name of ['_pianoroll','_scope','_spectrum','pianoroll','scope','spectrum','_spiral','_punchcard']) {
  core.Pattern.prototype[name] = function () { return this; };
}
const repl = core.repl({ getTime:()=>0, onSchedule:()=>{}, transpiler });
const code = await fs.readFile(scoreFile,'utf8');
const pattern = await repl.evaluate(code,false);
if (repl.state.error) throw repl.state.error;
if (!pattern?.queryArc) throw Error('Score did not produce a Strudel pattern');
const cps = repl.scheduler.cps;
const events = pattern.queryArc(begin, begin + cycles).filter(h=>h.hasOnset()).map(h=>({
  start:Number(h.whole.begin)-begin, end:Number(h.whole.end)-begin,
  duration:Number(h.duration), value:{...h.value}
})).sort((a,b)=>a.start-b.start);
repl.stop();
if (!(cps>0) || !events.length) throw Error('Empty score or invalid cps');
const supportedSynths = new Set(['triangle','square','sawtooth','sine','user','one','tri','sqr','saw','sin','white','pink','brown','sbd']);
const blockedEffects = ['coarse','crush','shape','distort','djf','stretch','transient','workletSrc','lfo','env','vowel','lprate','lpsync','hprate','hpsync','bprate','bpsync','tremolo','tremolosync'];
for (const {start,duration,value:v} of events) {
  if (!(duration > 0) || !Number.isFinite(start)) throw Error('Invalid timing');
  const sound = v.bank ? `${v.bank}_${v.s}` : v.s;
  if (!supportedSynths.has(sound) && !dough.getSound(sound)) throw Error(`Unregistered sample or unsupported oscillator: ${sound}`);
  for (const fx of [...(v.FX||[]),v]) {
    if (fx.room > 0 || fx.ftype==='ladder') throw Error('This renderer does not enable worklet reverb or ladder filters');
    for (const key of blockedEffects) if (fx[key] != null) throw Error(`This renderer does not enable worklet effect ${key}`);
  }
  if (v.note!=null && !Number.isFinite(core.valueToMidi(v))) throw Error(`Invalid note: ${v.note}`);
}
const duration = cycles/cps + tailSeconds;
const ac = new audio.OfflineAudioContext(2,Math.ceil(sampleRate*duration),sampleRate);
dough.setAudioContext(ac);
dough.registerSynthSounds();
dough.setMaxPolyphony(events.length+32);
for (const event of events) {
  await dough.superdough({...event.value},event.start/cps,event.duration/cps,cps,event.start+begin);
}
console.log(`Scheduled ${events.length} Strudel events; rendering ${duration.toFixed(2)} sec`);
const result = await ac.startRendering();
const channels = Array.from({length:2},(_,i)=>{ const data=new Float32Array(result.length);result.copyFromChannel(data,i);return data; });
let rawPeak=0, rawSum=0, nonFinite=0;
for (const channel of channels) for (const sample of channel) { if(!Number.isFinite(sample))nonFinite++; rawPeak=Math.max(rawPeak,Math.abs(sample));rawSum+=sample*sample; }
if(nonFinite||rawPeak<1e-6)throw Error(`Bad audio: nonFinite=${nonFinite}, peak=${rawPeak}`);
const normalize = process.env.RENDER_NORMALIZE !== '0';
const scale=normalize?0.84/rawPeak:1;
if (!normalize && rawPeak>1) console.warn(`WARNING raw peak ${rawPeak} clips PCM16 output`);
const bytes=result.length*4, wav=Buffer.alloc(44+bytes);
wav.write('RIFF',0);wav.writeUInt32LE(36+bytes,4);wav.write('WAVE',8);wav.write('fmt ',12);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(sampleRate,24);wav.writeUInt32LE(sampleRate*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(bytes,40);
let finalPeak=0,finalSum=0;
for(let frame=0;frame<result.length;frame++){
  const fade=Math.min(1,(result.length-frame)/(sampleRate*.15));
  for(let ch=0;ch<2;ch++){
    const value=channels[ch][frame]*scale*fade;
    finalPeak=Math.max(finalPeak,Math.abs(value));finalSum+=value*value;
    wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,value))*32767),44+2*(2*frame+ch));
  }
}
await fs.mkdir(path.dirname(output),{recursive:true});
const wavFile=output+'.wav',m4aFile=output+'.m4a';
await fs.writeFile(wavFile,wav);
const conversion=spawnSync('/usr/bin/afconvert',['-f','m4af','-d','aac','-b','192000',wavFile,m4aFile],{encoding:'utf8'});
if(conversion.status!==0)throw Error(`AAC conversion failed: ${conversion.stderr}`);
const byBar=[];
for(let i=0;i<Math.ceil(cycles);i++){
 const start=Math.floor(i/cps*sampleRate),end=Math.min(result.length,Math.floor(Math.min(cycles,i+1)/cps*sampleRate));
 let sum=0,peak=0;
 for(const channel of channels)for(let frame=start;frame<end;frame++){const value=channel[frame]*scale;sum+=value*value;peak=Math.max(peak,Math.abs(value));}
 byBar.push({cycle:begin+i,rmsDbFS:sum?20*Math.log10(Math.sqrt(sum/(2*(end-start)))):null,peak});
}
const report={
 scoreFile,scoreSha256:crypto.createHash('sha256').update(code).digest('hex'),
 engine:'Installed Strudel core/transpiler/tonal and unmodified Superdough, node-web-audio-api OfflineAudioContext',
 hostAdapter:'Unused Vite worklet resource import stub; visualizers are no-ops; local sample URL reads; no synth/envelope/filter/pan/delay substitution.',
 postprocessing:normalize?'Constant peak normalization to 0.84; 0.15-second tail fade; AAC preview':'No normalization; 0.15-second tail fade; AAC preview',
 bpm:cps*240,cps,begin,cycles,musicalDurationSeconds:cycles/cps,durationSeconds:result.length/sampleRate,sampleRate,channels:2,
 events:events.length,sounds:[...new Set(events.map(e=>e.value.s))],localSampleFiles:[...localSampleFiles],localResourceHashes,
 rawPeak,rawRmsDbFS:20*Math.log10(Math.sqrt(rawSum/(2*result.length))),normalizationGain:scale,
 finalPeak,finalPeakDbFS:20*Math.log10(finalPeak),finalRmsDbFS:20*Math.log10(Math.sqrt(finalSum/(2*result.length))),nonFiniteSamples:nonFinite,
 wavFile,m4aFile,byBar
};
await fs.writeFile(output+'.events.json',JSON.stringify(events,null,2));
await fs.writeFile(output+'.report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,byBar:undefined},null,2));
