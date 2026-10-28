import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { registerHooks } from 'node:module';
import * as audio from '../.audio-preview/node_modules/node-web-audio-api/index.js';
import { measure, writePcm16Wav, encodeAac } from './audio-files.mjs';

Object.assign(globalThis, audio);
registerHooks({resolve(specifier, context, next) {
  if (specifier.endsWith('?audioworklet')) return {url:'data:text/javascript,export default ""',shortCircuit:true};
  return next(specifier, context);
}});
const core=await import('../strudel/packages/core/index.mjs');
const mini=await import('../strudel/packages/mini/index.mjs');
const {transpiler}=await import('../strudel/packages/transpiler/index.mjs');
const dough=await import('../strudel/packages/superdough/index.mjs');
await core.evalScope(core, mini, {samples:dough.samples});
const base='http://127.0.0.1:3009/pocket-calculator-remake/';
const response=await fetch(base+'score.json');
if(!response.ok)throw new Error('Local Strudel sample server is unavailable');
const data=await response.json();
const allowed=new Set(['pcKit0','pcKit1','pcKit2','pcKit3','pcKit4','pcKit5','pc_keys']);
const sampleMap=Object.fromEntries(Object.entries(data.samples).filter(([name])=>allowed.has(name)));
if(Object.keys(sampleMap).length!==7)throw new Error('Required sample mapping missing');
await core.evalScope({probeSamples:sampleMap,probeBase:base});
const repl=core.repl({getTime:()=>0,onSchedule:()=>{},transpiler});
const code=`
setcpm(120)
await samples(probeSamples, probeBase)
arrange(
  [6, sound("<pcKit0 pcKit1 pcKit2 pcKit3 pcKit4 pcKit5>").gain(.4)],
  [6, note("<ab4 bb4 g5 fs6 a4 c5>").sound("pc_keys").gain(.25).clip(1).release(.01)]
)
`;
const pattern=await repl.evaluate(code,false);
if(repl.state.error)throw repl.state.error;
const cps=repl.scheduler.cps;
const events=pattern.queryArc(0,12).filter(h=>h.hasOnset());
repl.stop();
const ac=new audio.OfflineAudioContext(2,Math.ceil(7.5*44100),44100);
dough.setAudioContext(ac);
dough.registerSynthSounds();
dough.setMaxPolyphony(100);
const samples=new Map();
const pitches=[];
for(const hap of events){
  const v={...hap.value};
  const sound=dough.getSound(v.s);
  if(sound?.data?.type!=='sample')throw new Error('Sample was not registered');
  const info=dough.getSampleInfo(v,sound.data.samples);
  if(!samples.has(info.url)){
    const buffer=await dough.loadBuffer(info.url,ac,v.s);
    const bytes=Buffer.from(await(await fetch(info.url)).arrayBuffer());
    const original=Array.from({length:buffer.numberOfChannels},(_,ch)=>{const d=new Float32Array(buffer.length);buffer.copyFromChannel(d,ch);return d;});
    const stats=measure(original);
    if(stats.peak<1e-5)throw new Error('Silent source sample');
    samples.set(info.url,{url:info.url,durationSeconds:buffer.duration,channels:buffer.numberOfChannels,decodedSampleRate:buffer.sampleRate,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),stats});
  }
  if(v.note!=null)pitches.push({note:v.note,...info});
  await dough.superdough(v,Number(hap.whole.begin)/cps,Number(hap.duration)/cps,cps,Number(hap.whole.begin));
}
const rendered=await ac.startRendering();
const channels=Array.from({length:2},(_,ch)=>{const d=new Float64Array(rendered.length);const src=new Float32Array(rendered.length);rendered.copyFromChannel(src,ch);d.set(src);return d;});
const stats=measure(channels);
if(stats.peak<1e-5||stats.peak>=1)throw new Error('Unexpected probe audio level');
const sections=[];
for(let index=0;index<12;index++){
  const start=Math.round(index/cps*44100),end=Math.round((index+1)/cps*44100);
  const stat=measure(channels.map(ch=>ch.slice(start,end)));
  if(stat.peak<1e-5)throw new Error(`Silent test step ${index}`);
  sections.push({step:index+1,...stat});
}
const wav='<LEGACY_WORKSPACE>/.pocket-calculator-v4/sample-probe.wav';
const m4a='<LEGACY_WORKSPACE>/.pocket-calculator-v4/sample-probe.m4a';
await writePcm16Wav(wav,channels,44100);encodeAac(wav,m4a);
const report={description:'Native sampler probe only: six one-shot drums, four root-note keys and two transposed key notes; no source melody, lead, bass or voice timeline.',registrationThroughCoreEvalScope:true,eventCount:events.length,sources:[...samples.values()],pitches,output:{wav,m4a,...stats},sections};
await fs.writeFile('<LEGACY_WORKSPACE>/.pocket-calculator-v4/sample-probe-report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,sources:report.sources.map(({stats,...s})=>s),sections:undefined},null,2));
