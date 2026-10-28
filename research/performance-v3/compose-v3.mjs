import fs from 'node:fs/promises';
import path from 'node:path';
import { noteToMidi } from '../strudel/packages/core/index.mjs';
const root = '<LEGACY_WORKSPACE>';
const dir = path.join(root, '.performance-v3');
const revision = process.argv[2] || 'draft-a';
const bpm = 126, cps = bpm / 240, master = 0.70;
const events = [], bars = [], sections = [];
let cursor = 0, counter = 0;
const tuning = {1:64,2:59,3:55,4:50,5:45,6:40};
const rr = [0,2,1,3,2,0,3,1,0,3,2,1,3,0,1,2];
const timing = [0,0.002,-0.002,0.003,0.001,-0.001,0.002,-0.003];
const harmony = {
  G: {root:'g2',fifth:'d3',voices:[['g3',4],['b3',3],['a4',1]]},
  Df: {root:'fs2',fifth:'a2',voices:[['fs3',4],['a3',3],['e4',2]]},
  Em: {root:'e2',fifth:'b2',voices:[['e3',4],['g3',3],['d4',2]]},
  A: {root:'a2',fifth:'e2',voices:[['a3',4],['b3',3],['e4',2]]},
  D: {root:'d2',fifth:'a2',voices:[['d3',4],['a3',3],['e4',2]]},
  Bm: {root:'b1',fifth:'fs2',voices:[['fs3',4],['a3',3],['d4',2]]},
};
function event(beat, duration, value, meta={}, micro=0) {
  const start = Math.max(0, beat + micro*bpm/60);
  const v = {...value, gain:value.gain*master};
  const actualBar = bars.findLast(bar => beat >= bar.start && beat < bar.start+bar.length);
  events.push({start:start/4,end:(start+duration)/4,midi:v.note==null?undefined:noteToMidi(v.note),value:v,meta:{gridBeat:beat,durationBeats:duration,...meta,bar:actualBar?.index??meta.bar}});
}
function guitar(beat,duration,pitch,{role=1,accent=.8,art='pick',string,slideFrom,slideTime=.085,section,bar,grace=false,release}={}) {
  const midi=noteToMidi(pitch);
  string ??= midi>=64?1:midi>=59?2:midi>=55?3:4;
  const fret=midi-tuning[string];
  if(fret<0||fret>20) throw new Error(`Unplayable string assignment ${pitch} / ${string}`);
  const index=counter++, muted=art==='mute', soft=['light','hammer','pull','mute'].includes(art), legato=art==='hammer'||art==='pull';
  const gain=(role===1?.235:.155)*accent;
  const v={s:soft?'roof_live_soft':'roof_live',note:pitch,n:rr[index%rr.length],gain,
    orbit:role,pan:role===0?.25:.70,cut:100+role*10+string,
    attack:legato?.009:.001,release:release??(muted?.055:legato?.14:duration>=1?.28:.13),
    clip:muted?.53:.96,hcutoff:role===0?100:125,cutoff:muted?3300:role===0?5400:5900,
    room:role===0?.06:.085,roomsize:1.15,delay:0,
    pickCents:muted?1:legato?0:accent>.85?4.5:2,pickDecay:.045};
  if(slideFrom!=null){v.slideFrom=slideFrom;v.slideTime=slideTime;v.pickCents=0;}
  if(art==='vibrato'||(art==='slide'&&duration>=1.1)) Object.assign(v,{vib:4.85+(index%3)*.12,vibmod:.085+(index%2)*.015,vibdelay:.23,vibattack:.16});
  const micro=grace?0:timing[index%timing.length]+(role===1?.001:0);
  event(beat,duration,v,{track:role===0?'guitar_support':'guitar_melody',articulation:art,string,fret,section,bar,grace},micro);
}
function dyad(beat,harm,{muted=false,duration=.6,accent=.7,section,bar,full=false}={}){
  const voices=harmony[harm].voices.slice(0,full?3:2);
  voices.forEach(([p,s],i)=>guitar(beat+i*.016,duration,p,{role:0,string:s,accent:accent*(1-i*.06),art:muted?'mute':'light',section,bar}));
}
function bass(beat,duration,pitch,accent,section,bar) {
  event(beat,duration,{s:'gm_electric_bass_finger',n:1,note:pitch,gain:.60*accent,orbit:4,pan:.5,attack:.003,release:.08,clip:.88,hcutoff:42,cutoff:1900},{track:'bass',section,bar},.002);
}
function drum(beat,s,gain,section,bar,n=0) {
  const hat=s.includes('hh')||s.includes('oh')||s.includes('half');
  const v={s,n,gain,orbit:5,pan:hat?.62:s==='roof_ride'?.7:s==='roof_crash'?.32:.5};
  if(hat){v.cut=17;v.hcutoff=1500;}
  if(s==='roof_snare'){v.room=.075;v.roomsize=.8;}
  if(s==='roof_kick')v.cutoff=6500;
  const micro=s.includes('snare')?.005:hat?timing[(counter++)%timing.length]:0;
  event(beat,.12,v,{track:'drums',section,bar},micro);
}
function rhythm(bar,style,variant=0,intensity=1){
  const {start,length,harm,section,index}=bar;
  if(style==='none')return;
  let kicks,snares,hats;
  if(length===3.5){kicks=[0,2,variant%2?2.75:3.25];snares=[1,3];hats=[0,.5,1,1.5,2,2.5,3];}
  else if(length===2.5){kicks=[0,1.5];snares=[2];hats=[0,.5,1.5,2];}
  else if(style==='half'){kicks=[0,2.75];snares=[2];hats=[0,1,2,3.5];}
  else if(style==='interlock'){kicks=variant%2?[0,1.5,2.5]:[0,1.5,3];snares=variant%2?[1,2.75]:[1,3];hats=variant%2?[0,.5,1,1.5,2.5,3,3.5]:[0,.5,1.5,2,2.5,3,3.5];}
  else if(style==='hook'){kicks=variant%2?[0,1.75,2.5]:[0,.75,2,2.75];snares=[1,3];hats=[0,.5,1,1.5,2,2.5,3,3.5];}
  else {kicks=variant%2?[0,2.5,3.5]:[0,1.5,2.75];snares=[1,3];hats=variant%2?[0,.5,1,2,2.5,3,3.5]:[0,.5,1,1.5,2,2.5,3];}
  for(const [i,t] of kicks.entries())if(t<length) {drum(start+t,'roof_kick',1.65*intensity,section,index,(index+i)%2);bass(start+t,i===0?.8:.40,i===0?harmony[harm].root:i%2?harmony[harm].fifth:harmony[harm].root,.9*intensity,section,index);}
  for(const [i,t] of snares.entries())if(t<length)drum(start+t,'roof_snare',.56*intensity,section,index,(index+i)%4);
  for(const [i,t] of hats.entries())if(t<length){const opened=style==='hook'&&variant%4===3&&t===3.5;drum(start+t,opened?'roof_oh':'roof_hh',(i%2?1.35:2.1)*intensity,section,index,(index+i*3)%4);}
  if(variant%4===1&&length===4&&style!=='half')drum(start+2.75,'roof_snare_soft',.52*intensity,section,index,index%2);
  if(variant%8===7&&length===4&&style==='hook'){
    drum(start+3.5,'roof_snare_soft',.65*intensity,section,index,0);
    drum(start+3.75,'roof_snare',.34*intensity,section,index,1);
  }
}
function section(name,meters,harms){
  const begin=cursor;
  const created=meters.map((length,i)=>{const b={index:bars.length,start:cursor,length,meter:length===4?'4/4':length===3.5?'7/8':'5/8',harm:harms[i%harms.length],section:name};bars.push(b);cursor+=length;return b;});
  sections.push({name,begin:begin/4,end:cursor/4,startBeat:begin,endBeat:cursor});return created;
}
const Q=[ [.5,.45,'fs4',.76,'light'],[1,.45,'e4',.70,'pick'],[1.75,.70,'a4',.84,'pick'],[2.75,1.15,'b4',.94,'slide',-2],[4,.95,'a4',.76,'pull'],[5.5,.44,'fs4',.68,'light'],[6,1.15,'e4',.80,'vibrato'] ];
const A=[ [.5,.45,'fs4',.76,'light'],[1,.45,'e4',.70,'pick'],[1.75,.65,'a4',.83,'pick'],[2.5,.20,'cs5',.5,'light'],[2.75,1.1,'d5',.94,'slide',-1],[4.25,.65,'b4',.79,'pick'],[5,.45,'a4',.7,'light'],[5.75,.43,'fs4',.68,'light'],[6.5,1.1,'d4',.82,'vibrato'] ];
function phrase(start,notes,{section,bar,development=0,quiet=false}={}){
  notes.forEach(([t,d,p,a,art,slide],i)=>{
    let pitch=p, onset=t, slidePitch=slide;
    if(development===1&&i===0)onset+=.25;
    if(development===2&&i===notes.length-2)pitch='e4';
    if(development===2&&i===notes.length-1)pitch='d4';
    if(development===3){
      if(i===3)pitch='d5';
      if(i===4){pitch='e5';slidePitch=-2;}
      if(i===5)pitch='d5';
      if(i===6)pitch='b4';
      if(i===7)pitch='a4';
    }
    guitar(start+onset,d,pitch,{role:1,accent:a*(quiet?.72:1),art,slideFrom:slidePitch,section,bar});
  });
}
function support(bar,variant=0,quiet=false){
  dyad(bar.start,bar.harm,{duration:quiet?1.4:.6,accent:quiet?.44:.58,full:false,section:bar.section,bar:bar.index});
  if(!quiet)dyad(bar.start+(variant%2?2.5:2.25),bar.harm,{duration:.32,accent:.47,muted:true,section:bar.section,bar:bar.index});
  // A short reply at a phrase's breathing space, not a third continuous melody.
  if(variant%4===1){guitar(bar.start+3.8,.15,harmony[bar.harm].voices[2][0],{role:0,string:harmony[bar.harm].voices[2][1],accent:.5,art:'light',section:bar.section,bar:bar.index});}
}
const B0=[[0,.38,'d4',.92],[.5,.3,'a4',.62],[1.5,.35,'fs4',.86],[2,.30,'e4',.62],[3,.38,'b4',.9],[3.5,.25,'a4',.58]];
const B1=[[0,.38,'g4',.9],[.5,.28,'b4',.62],[1.5,.35,'a4',.84],[2.5,.34,'fs4',.86],[3,.3,'e4',.60]];
function interlock(bar,variant,{sparse=false,intensity=1}={}){
  const list=variant%2?B1:B0;
  list.filter(([t])=>t<bar.length-.05).forEach(([t,d,p,a],i)=>{if(sparse&&i%2===1)return;guitar(bar.start+t,Math.min(d,bar.length-t-.03),p,{role:0,accent:a*intensity,art:i%2?'light':'mute',section:bar.section,bar:bar.index});});
  for(const [t,p] of (variant%2?[[1,'d5'],[2,'e5'],[3.5,'a4']]:[[1,'e5'],[2.5,'d5']])){
    if(t<bar.length-.1&&!sparse)guitar(bar.start+t,.27,p,{role:1,accent:.60*intensity,art:'light',section:bar.section,bar:bar.index});
  }
}

const intro=section('intro',[4,4,4,4],['D','G','D','A']);
intro.forEach((b,i)=>{interlock(b,i,{sparse:i<2,intensity:.72});if(i===3){bass(b.start,.8,'a2',.65,b.section,b.index);drum(b.start+3,'roof_snare_soft',.35,b.section,b.index);}});
const theme=section('theme_A',Array(8).fill(4),['G','Df','Em','A']);
theme.forEach((b,i)=>{support(b,i);rhythm(b,'verse',i,.84);});
[Q,A,Q,A].forEach((notes,i)=>phrase(theme[i*2].start,notes,{section:'theme_A',bar:theme[i*2].index,development:i===3?2:0}));
const turn=section('turn_7_8',[3.5],['Bm'])[0];
dyad(turn.start,'Bm',{muted:true,accent:.75,duration:.4,full:true,section:turn.section,bar:turn.index});
guitar(turn.start+1.5,.28,'fs4',{role:1,accent:.7,art:'light',section:turn.section,bar:turn.index});
guitar(turn.start+2.5,.24,'e4',{role:0,accent:.6,art:'mute',section:turn.section,bar:turn.index});
guitar(turn.start+3,.25,'fs4',{role:1,accent:.74,art:'pick',section:turn.section,bar:turn.index});
rhythm(turn,'interlock',0,.9);
const inter=section('interlock_B',[3.5,4,3.5,4],['D','G','Bm','A']);
inter.forEach((b,i)=>{interlock(b,i);rhythm(b,'interlock',i,.94);});
const reset=section('reset_5_8',[2.5],['A'])[0];
dyad(reset.start,'A',{muted:true,accent:.8,duration:.4,section:reset.section,bar:reset.index});
guitar(reset.start+.5,.25,'e4',{role:1,accent:.65,art:'light',section:reset.section,bar:reset.index});
guitar(reset.start+1.5,.22,'cs5',{role:1,accent:.55,art:'light',section:reset.section,bar:reset.index});
guitar(reset.start+2,.35,'d5',{role:1,accent:.82,art:'slide',slideFrom:-1,section:reset.section,bar:reset.index});
rhythm(reset,'interlock',0,.9);
const hook=section('theme_C',Array(8).fill(4),['G','Df','Em','A','G','Df','Em','D']);
hook.forEach((b,i)=>{support(b,i);rhythm(b,'hook',i,1);});
[Q,A,Q,A].forEach((notes,i)=>phrase(hook[i*2].start,notes,{section:'theme_C',bar:hook[i*2].index,development:i===2?1:0}));
drum(hook[0].start,'roof_crash',.78,'theme_C',hook[0].index);
const breath=section('breath',Array(4).fill(4),['Bm','G','Em','A']);
breath.forEach((b,i)=>{dyad(b.start,b.harm,{duration:2.3,accent:.49,full:true,section:b.section,bar:b.index});if(i%2===0)rhythm(b,'half',i,.5);else bass(b.start,1.8,harmony[b.harm].root,.6,b.section,b.index);});
const final=section('final_C',Array(8).fill(4),['G','Df','Em','A','G','Df','Em','D']);
final.forEach((b,i)=>{support(b,i,i>5);rhythm(b,i>5?'half':'hook',i,i>5?.78:1.03);});
[Q,A,Q,A].forEach((notes,i)=>phrase(final[i*2].start,notes,{section:'final_C',bar:final[i*2].index,development:i===2?1:i===3?3:0}));
const outro=section('outro',Array(4).fill(4),['G','Df','D','D']);
outro.forEach((b,i)=>{if(i<3)dyad(b.start,b.harm,{duration:i===2?4.2:1.7,accent:.42,full:i===2,section:b.section,bar:b.index});if(i===0)bass(b.start,1.6,'g2',.6,b.section,b.index);});
phrase(outro[0].start,Q,{section:'outro',bar:outro[0].index,quiet:true,development:2});
guitar(outro[2].start,4.2,'d4',{role:1,accent:.56,art:'vibrato',release:.55,section:'outro',bar:outro[2].index});

events.sort((a,b)=>a.start-b.start || (a.value.orbit??0)-(b.value.orbit??0));
const sampleMap=JSON.parse(await fs.readFile(path.join(root,'.tone-v2/samples.json'),'utf8'));
sampleMap.roof_live=sampleMap.roof_clean;sampleMap.roof_live_soft=sampleMap.roof_clean_soft;
const score={title:'天台晚风 v3',revision,bpm,cps,totalCycles:cursor/4,totalBeats:cursor,sections,bars,instrumentAliases:{roof_live:'roof_clean',roof_live_soft:'roof_clean_soft'},events};
const out=path.join(dir,revision);await fs.mkdir(out,{recursive:true});
await fs.writeFile(path.join(out,'events.json'),JSON.stringify(score,null,2));
await fs.writeFile(path.join(out,'samples.json'),JSON.stringify(sampleMap,null,2));
console.log(JSON.stringify({revision,seconds:cursor*60/bpm,bars:bars.length,beats:cursor,events:events.length,slides:events.filter(e=>e.value.slideFrom).length,vibratoNotes:events.filter(e=>e.value.vib).length}));
