import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const PUBLIC = path.join(ROOT, 'public');
export const DEFAULT_RUNTIME = path.join(ROOT, '.runtime', 'strudel');
export const runtimePath = () => path.resolve(process.env.STRUDEL_RUNTIME || DEFAULT_RUNTIME);
export const relative = filename => path.relative(ROOT, filename).split(path.sep).join('/');
export const lock = () => fs.readFile(path.join(ROOT, 'runtime', 'strudel.lock.json'), 'utf8').then(JSON.parse);
export const exists = filename => fs.access(filename).then(() => true, () => false);
export const within = (root, candidate) => candidate === root || candidate.startsWith(root + path.sep);

export async function requireNode() {
  const metadata = await lock();
  if (Number(process.versions.node.split('.')[0]) < metadata.nodeMinMajor) {
    throw new Error(`Node.js ${metadata.nodeMinMajor}+ is required (running ${process.versions.node}).`);
  }
  return metadata;
}

export function run(command, args, options = {}) {
  const { capture = false, ...spawnOptions } = options;
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: ROOT, stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit', ...spawnOptions });
    let stdout = '', stderr = '';
    if (capture) {
      child.stdout.on('data', data => { stdout += data; });
      child.stderr.on('data', data => { stderr += data; });
    }
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(stdout.trim()) : reject(new Error(`${command} ${args.join(' ')} failed (${code})${stderr ? `: ${stderr.trim()}` : ''}`)));
  });
}

export async function verifyRuntime({ build = false } = {}) {
  const metadata = await requireNode();
  const runtime = runtimePath();
  if (!await exists(path.join(runtime, 'packages/core/index.mjs'))) {
    throw new Error('Strudel runtime is missing. Run npm run setup, or set STRUDEL_RUNTIME to an existing pinned checkout.');
  }
  const revision = await run('git', ['-C', runtime, 'rev-parse', 'HEAD'], { capture: true });
  if (revision !== metadata.revision) throw new Error(`Runtime revision ${revision} does not match runtime/strudel.lock.json (${metadata.revision}).`);
  const trackedChanges = await run('git', ['-C', runtime, 'diff', '--name-only', 'HEAD'], { capture: true });
  if (trackedChanges) throw new Error(`Runtime has tracked modifications; a fixed revision is required. Files: ${trackedChanges.split('\n').join(', ')}`);
  if (!await exists(path.join(runtime, 'node_modules'))) throw new Error('Runtime dependencies are missing. Run npm run setup for the managed checkout.');
  if (build && !await exists(path.join(runtime, 'website/dist/index.html'))) throw new Error('Runtime website build is missing. Run npm run setup.');
  return { runtime, revision, metadata };
}

export async function filesUnder(directory, suffix) {
  if (!await exists(directory)) return [];
  const result = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await filesUnder(filename, suffix));
    else if (entry.isFile() && (!suffix || filename.endsWith(suffix))) result.push(filename);
  }
  return result.sort();
}

export async function resolveInside(root, pathname) {
  const candidate = path.resolve(root, '.' + (pathname.startsWith('/') ? pathname : '/' + pathname));
  if (!within(path.resolve(root), candidate)) throw new Error('Path leaves its asset directory.');
  const real = await fs.realpath(candidate);
  const realRoot = await fs.realpath(root);
  if (!within(realRoot, real)) throw new Error('Asset symlink leaves its directory.');
  return real;
}

export const mimeType = filename => ({
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.map': 'application/json',
  '.wasm': 'application/wasm', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg', '.flac': 'audio/flac', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json',
}[path.extname(filename).toLowerCase()] || 'application/octet-stream');

export async function writeJson(filename, value) {
  await fs.mkdir(path.dirname(filename), { recursive: true });
  await fs.writeFile(filename, JSON.stringify(value, null, 2) + '\n');
}

export function fail(error) {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
}
