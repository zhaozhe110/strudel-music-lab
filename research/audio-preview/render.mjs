import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { OfflineAudioContext } from 'node-web-audio-api';

const root='<LEGACY_WORKSPACE>';
const assets=path.join(root,'.audio-preview/assets');
await fs.mkdir(assets,{recursive:true});
const {events}=JSON.parse(await fs.readFile(path.join(root,'.music-check/events.json'),'utf8'));
const bank=JSON.parse(await fs.readFile(path.join(root,'.music-check/tidal-drum-machines.json'),'utf8'));
const cps=.55, rate=44100, duration=36/cps+2.5;
const ac=new OfflineAudioContext(2,Math.ceil(duration*rate),rate);
const sources=[];
async function fetchAsset(url,name) {
  const filename=path.join(assets,name);
  try { return await fs.readFile(filename); } catch {}
  const response=await fetch(url,{signal:AbortSignal.timeout(45000)});
  if(!response.ok) throw new Error(`${response.status} ${url}`);
  const data=Buffer.from(await response.arrayBuffer());
  await fs.writeFile(filename,data);sources.push({url,file:filename,bytes:data.length});
  return data;
}
const fontNames={
 'gm_electric_guitar_clean:5':'0270_Stratocaster_sf2_file',
 'gm_electric_guitar_clean:2':'0270_FluidR3_GM_sf2_file',
 'gm_electric_bass_finger:1':'0330_FluidR3_GM_sf2_file',
};
const fonts={};
await Promise.all(Object.entries(fontNames).map(async([key,name])=>{
 const txt=(await fetchAsset(`https://felixroos.github.io/webaudiofontdata/sound/${name}.js`,`${name}.js`)).toString();
 const ctx=vm.createContext({}, {codeGeneration:{strings:false,wasm:false}});
 new vm.Script(txt).runInContext(ctx,{timeout:1000});
 fonts[key]=Object.values(ctx).find(x=>x?.zones)?.zones;
 if(!fonts[key])throw new Error(`No zones in ${name}`);
}));
console.log('Loaded guitar and bass fonts');
const drumBuffers={};
await Promise.all(['bd','sd','hh','oh'].map(async(s)=>{
 const key=`RolandTR707_${s}`;
 const resource=bank[key][0];
 const raw=await fetchAsset('https://strudel.b-cdn.net/tidal-drum-machines/machines/'+encodeURI(resource),`707-${s}.wav`);
 drumBuffers[s]=await ac.decodeAudioData(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
}));
console.log('Loaded 707 kit');
const zoneBuffers=new Map();
async function getZoneBuffer(zone) {
 if(zoneBuffers.has(zone))return zoneBuffers.get(zone);
 let b;
 if(zone.file) {
   const raw=Buffer.from(zone.file,'base64');
   b=await ac.decodeAudioData(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
 } else if(zone.sample) {
   const raw=Buffer.from(zone.sample,'base64'), data=new Float32Array(raw.length/2);
   for(let i=0;i<data.length;i++)data[i]=raw.readInt16LE(i*2)/65536;
   b=ac.createBuffer(1,data.length,zone.sampleRate);b.copyToChannel(data,0);
 } else throw new Error('Missing font samples');
 zoneBuffers.set(zone,b);return b;
}
const zonesNeeded=new Set(events.filter(e=>e.midi!==undefined && e.midi!==null).map(e=>{
 const zones=fonts[`${e.value.s}:${e.value.n??0}`];
 const zone=zones?.find(z=>z.keyRangeLow<=e.midi && z.keyRangeHigh+1>=e.midi);
 if(!zone) throw new Error(`No pitch ${e.midi} in ${e.value.s}:${e.value.n}`);
 return zone;
}));
await Promise.all([...zonesNeeded].map(getZoneBuffer));
console.log('Decoded',zonesNeeded.size,'soundfont zones');

let seed=72491;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function impulse(seconds) {
 const length=Math.round(seconds*rate), b=ac.createBuffer(2,length,rate);
 for(let ch=0;ch<2;ch++){
  const d=new Float32Array(length);let last=0;
  for(let i=0;i<length;i++){last=.5*last+.5*(random()*2-1);d[i]=last*Math.pow(1-i/length,2.6);}
  b.copyToChannel(d,ch);
 }
 return b;
}
const orbits=new Map();
function orbit(v) {
 const key=v.orbit??0;
 if(orbits.has(key))return orbits.get(key);
 const bus=ac.createGain();bus.connect(ac.destination);
 const reverb=ac.createConvolver();reverb.buffer=impulse(v.roomsize??1.6);
 const wet=ac.createGain();wet.gain.value=.55;reverb.connect(wet).connect(bus);
 const delay=ac.createDelay(2);delay.delayTime.value=(v.delaysync??.125)/cps;
 const feedback=ac.createGain();feedback.gain.value=v.delayfeedback??.2;
 delay.connect(feedback).connect(delay);delay.connect(bus);
 const x={bus,reverb,delay};orbits.set(key,x);return x;
}
function connectFX(source,v,begin,holdEnd,end,isFont){
 const envelope=ac.createGain();
 const amplitude=(v.gain??1)*(isFont ? 0.3 : 1);
 const attack=Math.max(v.attack??.001,.0001);
 envelope.gain.setValueAtTime(0,begin);
 envelope.gain.linearRampToValueAtTime(amplitude,begin+attack);
 envelope.gain.setValueAtTime(amplitude,Math.max(begin+attack,holdEnd));
 envelope.gain.linearRampToValueAtTime(0,end);
 source.connect(envelope);
 let node=envelope;
 if(v.hcutoff){const f=ac.createBiquadFilter();f.type='highpass';f.frequency.value=v.hcutoff;f.Q.value=.7;node.connect(f);node=f;}
 if(v.cutoff){const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=v.cutoff;f.Q.value=.7;node.connect(f);node=f;}
 const pan=ac.createStereoPanner();pan.pan.value=2*(v.pan??.5)-1;node.connect(pan);
 const o=orbit(v);pan.connect(o.bus);
 if(v.room){const g=ac.createGain();g.gain.value=v.room;pan.connect(g).connect(o.reverb);}
 if(v.delay){const g=ac.createGain();g.gain.value=v.delay;pan.connect(g).connect(o.delay);}
}
for(const event of events){
 const v=event.value,begin=event.start/cps, length=(event.end-event.start)/cps;
 const source=ac.createBufferSource();const isFont=!!fontNames[`${v.s}:${v.n??0}`];
 let holdEnd,end;
 if(isFont){
  const zone=fonts[`${v.s}:${v.n??0}`].find(z=>z.keyRangeLow<=event.midi&&z.keyRangeHigh+1>=event.midi);
  source.buffer=zoneBuffers.get(zone);
  const baseDetune=zone.originalPitch-100*(zone.coarseTune??0)-(zone.fineTune??0);
  source.playbackRate.value=Math.pow(2,(100*event.midi-baseDetune)/1200);
  if(zone.loopStart>1&&zone.loopStart<zone.loopEnd){source.loop=true;source.loopStart=zone.loopStart/zone.sampleRate;source.loopEnd=zone.loopEnd/zone.sampleRate;}
  holdEnd=begin+length*(v.clip??1);end=holdEnd+(v.release??.1)+.01;
 }else{
  source.buffer=drumBuffers[v.s];if(!source.buffer)throw new Error(`Unknown drum ${v.s}`);
  const sampleLength=source.buffer.duration;
  holdEnd=begin+(v.clip?Math.min(sampleLength,length*v.clip):sampleLength);
  end=holdEnd+.015;
 }
 connectFX(source,v,begin,holdEnd,end,isFont);source.start(begin);source.stop(end);
}
console.log('Rendering',events.length,'events over',duration.toFixed(2),'seconds');
const result=await ac.startRendering();
const channels=[new Float32Array(result.length),new Float32Array(result.length)];
channels.forEach((d,i)=>result.copyFromChannel(d,i));
let peak=0,sum=0,nonzero=0;
for(let i=0;i<result.length;i++)for(const data of channels){const x=data[i];peak=Math.max(peak,Math.abs(x));sum+=x*x;if(Math.abs(x)>1e-5)nonzero++;}
const normalization=.82/peak;
const size=result.length*4, output=Buffer.alloc(44+size);
output.write('RIFF',0);output.writeUInt32LE(36+size,4);output.write('WAVE',8);output.write('fmt ',12);
output.writeUInt32LE(16,16);output.writeUInt16LE(1,20);output.writeUInt16LE(2,22);output.writeUInt32LE(rate,24);output.writeUInt32LE(rate*4,28);output.writeUInt16LE(4,32);output.writeUInt16LE(16,34);output.write('data',36);output.writeUInt32LE(size,40);
let finalSum=0;
for(let i=0;i<result.length;i++)for(let ch=0;ch<2;ch++){
 const fade=Math.min(1,(result.length-i)/rate/.8);
 const sample=channels[ch][i]*normalization*fade;finalSum+=sample*sample;
 output.writeInt16LE(Math.round(Math.max(-1,Math.min(1,sample))*32767),44+(i*2+ch)*2);
}
const destination=path.join(root,'天台晚风-preview.wav');await fs.writeFile(destination,output);
const report={file:destination,events:events.length,sampleRate:rate,channels:2,duration:result.length/rate,rawPeak:peak,finalPeak:.82,peakDbFS:20*Math.log10(.82),rmsDbFS:20*Math.log10(Math.sqrt(finalSum/(result.length*2))),nonzeroSamples:nonzero,normalization,sources,notes:'Same Strudel event timings, notes, soundfont choices and 707 samples. Native offline renderer approximates envelopes, filters, reverb and delay; not a bit-exact recording of browser Strudel. Original composition, not a transcription of Chinese Football.'};
await fs.writeFile(path.join(root,'.audio-preview/render-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
