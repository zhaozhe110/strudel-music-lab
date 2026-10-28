import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { PUBLIC, verifyRuntime, resolveInside, mimeType, fail } from './lib/project.mjs';

async function main() {
  const { values } = parseArgs({ options: { port: { type: 'string', default: '3009' }, help: { type: 'boolean' } } });
  if (values.help) { console.log('npm start -- [--port 3009]\nServe repo/public over the pinned runtime build on 127.0.0.1 only. No files are modified.'); return; }
  const port = Number(values.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port.');
  const { runtime } = await verifyRuntime({ build: true });
  const roots = [PUBLIC, path.join(runtime, 'website/dist')];
  const server = http.createServer(async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      let filename;
      for (const root of roots) {
        try {
          let candidate = await resolveInside(root, pathname);
          if ((await fs.stat(candidate)).isDirectory()) candidate = await resolveInside(root, pathname.replace(/\/$/, '') + '/index.html');
          if ((await fs.stat(candidate)).isFile()) { filename = candidate; break; }
        } catch { /* Try the next static root. */ }
      }
      if (!filename) { response.writeHead(404); response.end('Not found'); return; }
      const body = await fs.readFile(filename);
      response.writeHead(200, { 'Content-Type': mimeType(filename), 'Content-Length': body.length, 'Cache-Control': 'no-cache' });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch { response.writeHead(400); response.end('Bad request'); }
  });
  server.on('error', error => {
    if (error.code === 'EADDRINUSE') fail(new Error(`Port ${port} is already in use. Keep that service or choose --port; no process was stopped.`));
    else fail(error);
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`Strudel: http://127.0.0.1:${port}\nAssets: repo/public (read-only overlay). Press Ctrl+C to stop.`);
    if (port !== 3009) console.warn('Saved scores use sample URLs on port 3009. An alternate port serves the editor, but browser playback needs matching sample base URLs in the score. Offline render/validate do not need a server.');
  });
}
main().catch(fail);
