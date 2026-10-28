import fs from 'node:fs/promises';
import * as core from '../strudel/packages/core/index.mjs';
import * as mini from '../strudel/packages/mini/index.mjs';
import {transpiler,registerWidgetType} from '../strudel/packages/transpiler/index.mjs';
registerWidgetType('_pianoroll');
await core.evalScope(core,mini,{samples:async()=>{}});
core.Pattern.prototype._pianoroll=function(){return this};
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,...rest)=>String(url).endsWith('/score.json')?new Response(await fs.readFile('strudel/website/public/pocket-calculator-remake/score.json')):originalFetch(url,...rest);
const cycles=168.01780829166668;
async function inspect(path){
 const code=await fs.readFile(path,'utf8');
 const meta=transpiler(code,{emitMiniLocations:true,emitWidgets:true});
 const repl=core.repl({getTime:()=>0,onSchedule:()=>{},transpiler});
 const p=await repl.evaluate(code,false);
 if(repl.state.error)throw repl.state.error;
 const haps=p.queryArc(0,cycles).filter(h=>h.hasOnset());repl.stop();
 const normalize=h=>{
  const value={...h.value};if(value.note!==undefined)value.note=core.valueToMidi(value);
  return {start:Number(h.whole.begin),end:Number(h.whole.end),value};
 };
 const normalized=haps.map(normalize).sort((a,b)=>a.start-b.start||JSON.stringify(a.value).localeCompare(JSON.stringify(b.value)));
 return{code,meta,haps,normalized};
}
const before=await inspect('.pocket-visual-fix/before.strudel');
const after=await inspect('Pocket Calculator-复刻版.strudel');
const same=JSON.stringify(before.normalized)===JSON.stringify(after.normalized);
const highlightCount=after.haps.filter(h=>h.context.locations?.length).length;
const widgetLine=after.code.slice(0,after.meta.widgets[0].from).split('\n').length;
const result={beforeEvents:before.haps.length,afterEvents:after.haps.length,audioEventsEquivalent:same,beforeHighlightable:before.haps.filter(h=>h.context.locations?.length).length,afterHighlightable:highlightCount,miniTokens:after.meta.miniLocations?.length,widgetLine};
await fs.writeFile('.pocket-visual-fix/after-compiled.json',JSON.stringify(after.meta));
await fs.writeFile('.pocket-visual-fix/validation.json',JSON.stringify(result,null,2));
console.log(result);
if(!same||highlightCount!==after.haps.length||widgetLine>12)throw Error('Display regression check failed');
