// Same-RMS A/B excerpts; no playback or source-file modification.
// node compare-previews.mjs a.wav b.wav out-prefix [a-start-sec] [b-start-sec] [seconds]
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {OfflineAudioContext} from '../.audio-preview/node_modules/node-web-audio-api/index.js';

const [a,b,prefix,aStart='0',bStart='0',length='16']=process.argv.slice(2);
if(!a||!b||!prefix)throw new Error('Expected a.wav b.wav out-prefix [a-start-sec] [b-start-sec] [seconds]');
const rate=44100,context=new OfflineAudioContext(2,rate,rate),target=Math.pow(10,-22/20),ceiling=.82,gapSeconds=.6;
async function excerpt(file,startSeconds) {
 const bytes=await fs.readFile(file);
 const audio=await context.decodeAudioData(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length));
 const start=Math.floor(Number(startSeconds)*rate),count=Math.floor(Number(length)*rate);
 if(start<0||start+count>audio.length)throw new Error(`Excerpt exceeds ${file}`);
 const channels=Array.from({length:2},(_,ch)=>{const data=new Float32Array(audio.length);audio.copyFromChannel(data,Math.min(ch,audio.numberOfChannels-1));return data.slice(start,start+count);});
 let sum=0,peak=0;
 for(const channel of channels)for(const value of channel){sum+=value*value;peak=Math.max(peak,Math.abs(value));}
 const rms=Math.sqrt(sum/(count*2));if(!rms)throw new Error('Silent excerpt '+file);
 return {file:path.resolve(file),startSeconds:Number(startSeconds),channels,count,rms,peak,gain:target/rms};
}
const parts=await Promise.all([excerpt(a,aStart),excerpt(b,bStart)]);
const commonHeadroom=Math.min(1,...parts.map(part=>ceiling/(part.peak*part.gain)));
const gap=Math.floor(gapSeconds*rate),count=parts[0].count+gap+parts[1].count;
const data=Array.from({length:2},()=>new Float32Array(count));
let offset=0;
for(const part of parts) {
 for(let ch=0;ch<2;ch++)for(let i=0;i<part.count;i++){
  const fade=Math.min(1,i/(rate*.015),(part.count-i)/(rate*.03));
  data[ch][offset+i]=part.channels[ch][i]*part.gain*commonHeadroom*fade;
 }
 offset+=part.count+gap;
}
const size=count*4,wav=Buffer.alloc(44+size);
wav.write('RIFF');wav.writeUInt32LE(36+size,4);wav.write('WAVE',8);wav.write('fmt ',12);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(size,40);
let finalPeak=0;
for(let i=0;i<count;i++)for(let ch=0;ch<2;ch++){finalPeak=Math.max(finalPeak,Math.abs(data[ch][i]));wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,data[ch][i]))*32767),44+(i*2+ch)*2);}
const out=path.resolve(prefix);await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out+'.wav',wav);
execFileSync('/usr/bin/afconvert',[out+'.wav',out+'.m4a','-f','m4af','-d','aac','-b','192000']);
const report={matching:'RMS matched, not BS.1770 LUFS',targetRmsDbFS:-22+20*Math.log10(commonHeadroom),finalPeak,gapSeconds,durationSeconds:count/rate,segments:parts.map((part,index)=>({file:part.file,startSeconds:part.startSeconds,lengthSeconds:part.count/rate,comparisonStartSeconds:index===0?0:parts[0].count/rate+gapSeconds,sourceRmsDbFS:20*Math.log10(part.rms),gain:part.gain*commonHeadroom}))};
await fs.writeFile(out+'-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({wav:out+'.wav',m4a:out+'.m4a',...report},null,2));
