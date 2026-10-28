import fs from 'node:fs/promises';
import path from 'node:path';
import { getCommonSampleInfo } from '../strudel/packages/superdough/util.mjs';
const root='<LEGACY_WORKSPACE>', dir=path.join(root,'.performance-v3');
const revision=process.argv[2]||'draft-c';
const score=JSON.parse(await fs.readFile(path.join(dir,revision,'events.json'),'utf8'));
const samples=JSON.parse(await fs.readFile(path.join(dir,revision,'samples.json'),'utf8'));
const urls=[...new Set(score.events.filter(e=>!e.value.s.startsWith('gm_')).map(e=>samples._base+getCommonSampleInfo(e.value,samples[e.value.s]).url))];
for(const area of ['public','dist']){
  const out=path.join(root,'strudel/website',area,'rooftop-v3');await fs.mkdir(out,{recursive:true});
  for(const file of ['articulation-curves.mjs','guitar-articulation.mjs','performance-pattern.mjs'])await fs.copyFile(path.join(dir,file),path.join(out,file));
  await fs.writeFile(path.join(out,'samples.json'),JSON.stringify(samples,null,2));
  await fs.writeFile(path.join(out,'score.json'),JSON.stringify(score));
  await fs.writeFile(path.join(out,'preload.json'),JSON.stringify(urls));
}
const code=await fs.readFile(path.join(root,'天台晚风-v3.strudel'),'utf8');
const url='http://127.0.0.1:3009/#'+encodeURIComponent(Buffer.from(code).toString('base64'));
await fs.writeFile(path.join(root,'打开天台晚风-v3.webloc'),'<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict><key>URL</key><string>'+url+'</string></dict></plist>\n');
console.log(JSON.stringify({revision,preloadFiles:urls.length,events:score.events.length,sourceBytes:Buffer.byteLength(code)}));
