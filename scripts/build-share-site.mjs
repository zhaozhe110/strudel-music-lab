import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT } from './lib/project.mjs';

const source = 'pieces/little-logic/袖珍电路-v4-online.strudel';
const code = await fs.readFile(path.join(ROOT, source), 'utf8');
const target = 'https://strudel.cc/#' + encodeURIComponent(Buffer.from(code, 'utf8').toString('base64'));
const escapeHtml = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>袖珍电路 v4 · LITTLE LOGIC</title>
  <meta name="description" content="在 Strudel 打开袖珍电路 v4：136 BPM 的机械电子小品。">
  <style>
    :root { color-scheme: dark; font-family: system-ui, sans-serif; background: #08110d; color: #e7eee8; }
    body { max-width: 36rem; margin: 16vh auto; padding: 1.5rem; line-height: 1.7; }
    h1 { font-size: 1.8rem; letter-spacing: .04em; }
    a { color: #ffe45c; text-underline-offset: .25em; }
    small { color: #a3aaa5; }
  </style>
</head>
<body>
  <h1>袖珍电路 · LITTLE LOGIC</h1>
  <p>正在打开 Strudel。进入后点击 <strong>play</strong> 开始播放。</p>
  <p><a id="open-strudel" href="${escapeHtml(target)}">没有自动打开？点击进入作品</a></p>
  <p><small>v4 · 136 BPM · <a href="https://github.com/zhaozhe110/strudel-music-lab">代码与采样来源</a></small></p>
  <script>location.replace(document.getElementById('open-strudel').href);</script>
</body>
</html>
`;

const directory = path.join(ROOT, 'share-site');
await fs.mkdir(directory, { recursive: true });
await fs.writeFile(path.join(directory, 'index.html'), html);
await fs.writeFile(path.join(directory, '.nojekyll'), '');
console.log(JSON.stringify({
  source,
  sourceSha256: crypto.createHash('sha256').update(code).digest('hex'),
  targetCharacters: target.length,
  siteFiles: ['share-site/index.html', 'share-site/.nojekyll'],
  note: 'Build only. No publication, network request, or change to the score.',
}, null, 2));
