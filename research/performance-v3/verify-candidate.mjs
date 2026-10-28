import fs from 'node:fs/promises';
import path from 'node:path';
import * as core from '../strudel/packages/core/index.mjs';
import * as mini from '../strudel/packages/mini/index.mjs';
import * as tonal from '../strudel/packages/tonal/index.mjs';
import { transpiler } from '../strudel/packages/transpiler/index.mjs';
import { performancePattern } from './performance-pattern.mjs';

const root='<LEGACY_WORKSPACE>', revision='draft-c';
const folder=path.join(root,'.performance-v3',revision);
const score=JSON.parse(await fs.readFile(path.join(folder,'events.json'),'utf8'));
const pattern=performancePattern(score,core);
const haps=pattern.queryArc(0,score.totalCycles).filter(h=>h.hasOnset());
if(haps.length!==score.events.length)throw new Error('Timeline event count differs');
const next=pattern.queryArc(score.totalCycles,2*score.totalCycles).filter(h=>h.hasOnset());
if(next.length!==haps.length)throw new Error('Second loop drops events');
const a=haps.map(h=>({t:Number(h.whole.begin),v:h.value}));
const b=next.map(h=>({t:Number(h.whole.begin)-score.totalCycles,v:h.value}));
if(a.some((event,i)=>Math.abs(event.t-b[i].t)>1e-10||JSON.stringify(event.v)!==JSON.stringify(b[i].v)))throw new Error('Loop values differ');
// Exercise the same mutable handoff as webaudioOutput -> superdough: the
// engine writes the scheduled duration in seconds back onto each Hap value.
const pristineSeconds=haps.map(h=>Number(h.duration)/score.cps);
const observedLoopSeconds=[];
for(let loop=0;loop<4;loop++){
  const scheduled=pattern.queryArc(loop*score.totalCycles,(loop+1)*score.totalCycles).filter(h=>h.hasOnset());
  const seconds=scheduled.map(h=>Number(h.duration)/score.cps);
  if(seconds.some((value,i)=>Math.abs(value-pristineSeconds[i])>1e-10))throw new Error(`Live duration writeback leaked into loop ${loop}`);
  observedLoopSeconds.push(seconds[0]);
  scheduled.forEach((hap,i)=>{hap.value.duration=seconds[i];});
  const repeatQuery=pattern.queryArc(loop*score.totalCycles,(loop+1)*score.totalCycles).filter(h=>h.hasOnset());
  if(repeatQuery.some((hap,i)=>Math.abs(Number(hap.duration)/score.cps-pristineSeconds[i])>1e-10))throw new Error('Live mutation leaked into a repeated query');
}
if(score.events.some(event=>event.value.duration!==undefined))throw new Error('Live playback mutated the saved score');
const off=performancePattern(score,core,{articulations:false}).queryArc(0,score.totalCycles).filter(h=>h.hasOnset());
if(off.some(h=>h.value.slideFrom||h.value.vib||h.value.pickCents))throw new Error('Articulation toggle not applied');
const map=new Map();let preloadCount=0;
const api={
  getSound:name=>map.get(name),
  registerSound:(name,onTrigger,data)=>map.set(name,{onTrigger,data}),
  getAudioContext:()=>null,
  samples:async url=>{
    const response=await fetch(url);if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const bank=await response.json();for(const [key,values] of Object.entries(bank))if(!key.startsWith('_'))map.set(key,{onTrigger:async()=>undefined,data:{samples:values}});
  },
  loadBuffer:async url=>{
    const response=await fetch(url,{method:'HEAD'});if(!response.ok)throw new Error(`Sample HTTP ${response.status}: ${url}`);preloadCount++;
  }
};
await core.evalScope(core,mini,tonal,api);
let code=await fs.readFile(path.join(root,'天台晚风-v3.strudel'),'utf8');
// Execute the real loader and served score in Node, resolving only its two ESM
// module imports to the identical local files because Node does not import HTTP.
for(const file of ['guitar-articulation.mjs','performance-pattern.mjs']){
  const specifier=file==='performance-pattern.mjs'?`${file}?v=2`:file;
  const served=await (await fetch(`http://127.0.0.1:3009/rooftop-v3/${specifier}`)).text();
  const local=await fs.readFile(path.join(root,'.performance-v3',file),'utf8');
  if(served!==local)throw new Error('Published module differs: '+file);
  code=code.replace(`import(base + '${specifier}')`,`import('${new URL(specifier,import.meta.url).href}')`);
}
const repl=core.repl({getTime:()=>0,onSchedule:()=>{},transpiler});
const loaded=await repl.evaluate(code,false);if(repl.state.error)throw repl.state.error;
const loadedCount=loaded.queryArc(0,score.totalCycles).filter(h=>h.hasOnset()).length;
if(loadedCount!==score.events.length)throw new Error('Strudel loader changed events');
const composition=JSON.parse(await fs.readFile(path.join(folder,'composition-gate.json'),'utf8'));
const report={revision,sourceLoaderEvaluated:true,browserAudioAuditioned:false,note:'Node evaluation verifies published code/score/sample availability and actual engine duration-writeback semantics, not browser audio output or subjective quality.',events:haps.length,loopRepeats:true,liveWritebackIsolated:true,checkedLiveLoops:4,firstNoteSecondsByLoop:observedLoopSeconds,articulationToggle:true,preloadedFiles:preloadCount,registeredVoices:[...map.keys()].filter(k=>k.startsWith('roof_live')),cps:repl.scheduler.cps,meterCounts:score.bars.reduce((acc,bar)=>(acc[bar.meter]=(acc[bar.meter]||0)+1,acc),{}),compositionReview:composition};
await fs.writeFile(path.join(folder,'runtime-validation.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,compositionReview:'See composition-gate.json'},null,2));
repl.stop();
