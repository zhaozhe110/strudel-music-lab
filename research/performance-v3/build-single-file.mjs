import fs from 'node:fs/promises';
import path from 'node:path';

const root = '<LEGACY_WORKSPACE>';
const folder = path.join(root, '.performance-v3');
const read = name => fs.readFile(path.join(folder, name), 'utf8');
const stripExport = source => source.replace(/^export /gm, '');
const curves = stripExport(await read('articulation-curves.mjs'));
const guitar = stripExport((await read('guitar-articulation.mjs')).replace(/^import[^\n]*\n/, ''));
const pattern = stripExport(await read('performance-pattern.mjs'));
const composer = await read('compose-v3.mjs');
const start = composer.indexOf('const events =');
const end = composer.indexOf('const sampleMap=');
if (start < 0 || end < start) throw new Error('Composer boundaries changed');
const body = composer.slice(start, end).trimEnd();
let code = `// "天台晚风 v3 完整版" — 原创双吉他片段
// 编曲、滑音、揉弦和循环逻辑全部内联；音频仍使用已下载的本地采样。
// 在本地 Strudel 中整体粘贴后点击 play。约 79 秒一轮。
const BPM = 126;
const MASTER = 0.70;
const GUITARS = 1;
const BASS = 1;
const DRUMS = 1;
const ARTICULATIONS = true;
const HUMAN_TIMING = true;
const SAMPLE_BASE = 'http://127.0.0.1:3009/rooftop-v3/';

${curves.trim()}

${guitar.trim()}

${pattern.trim()}

// 以下函数完整生成 42 小节、777 个事件，不读取外部 score.json。
function buildRooftopScore(bpm, master) {
  const cps = bpm / 240;
${body.split('\n').map(line => '  ' + line).join('\n')}
  return {
    title: '天台晚风 v3', revision: 'draft-c', bpm, cps,
    totalCycles: cursor / 4, totalBeats: cursor, sections, bars,
    instrumentAliases: { roof_live: 'roof_clean', roof_live_soft: 'roof_clean_soft' },
    events,
  };
}

await samples(SAMPLE_BASE + 'samples.json');
installGuitarArticulations({ getSound, registerSound, getAudioContext });
const score = buildRooftopScore(BPM, MASTER);
const warmResponse = await fetch(SAMPLE_BASE + 'preload.json');
if (!warmResponse.ok) throw new Error('无法读取本地采样清单，请先启动 Strudel');
const warm = await warmResponse.json();
await Promise.all(warm.map(url => loadBuffer(url, getAudioContext())));
setcpm(BPM / 4);
performancePattern(score, { Pattern, Hap, TimeSpan }, {
  guitarLevel: GUITARS,
  bassLevel: BASS,
  drumsLevel: DRUMS,
  articulations: ARTICULATIONS,
  humanTiming: HUMAN_TIMING,
})
`;
// Strudel treats untagged template literals as mini notation, including in
// error paths. Preserve these messages as ordinary single-quoted strings.
code = code
  .replace('`Missing Strudel API: ${key}`', "'Missing Strudel API: ' + key")
  .replace('`Load ${baseName} before installing guitar articulation`', "'Load ' + baseName + ' before installing guitar articulation'")
  .replace('`Unplayable string assignment ${pitch} / ${string}`', "'Unplayable string assignment ' + pitch + ' / ' + string");
const output = path.join(root, '天台晚风-v3-完整版.strudel');
await fs.writeFile(output, code);
console.log(JSON.stringify({output, bytes: Buffer.byteLength(code), lines: code.split('\n').length}));
