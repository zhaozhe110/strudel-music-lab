import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT, PUBLIC, DEFAULT_RUNTIME, runtimePath, requireNode, verifyRuntime, exists, run, fail } from './lib/project.mjs';

async function main() {
  if (process.argv.includes('--help')) {
    console.log('npm run setup\nFetch a shallow pinned Strudel checkout, install with pnpm 10.15.0, build, and copy public assets.\nSTRUDEL_RUNTIME reuses an external checkout read-only and verifies it instead.');
    return;
  }
  const metadata = await requireNode();
  const runtime = runtimePath();
  if (runtime !== DEFAULT_RUNTIME) {
    const info = await verifyRuntime({ build: true });
    console.log(`External runtime verified at ${info.revision}; no checkout, dependencies, build or assets were changed.`);
    return;
  }
  const pnpm = path.join(ROOT, 'node_modules', 'pnpm', 'bin', 'pnpm.cjs');
  if (!await exists(pnpm)) throw new Error('Run npm ci before npm run setup.');
  const installed = JSON.parse(await fs.readFile(path.join(ROOT, 'node_modules/pnpm/package.json'), 'utf8'));
  if (installed.version !== metadata.packageManager.version) throw new Error('Installed pnpm does not match runtime/strudel.lock.json. Run npm ci.');
  await fs.mkdir(path.dirname(runtime), { recursive: true });
  if (!await exists(runtime)) {
    await run('git', ['init', runtime]);
  } else if (!await exists(path.join(runtime, '.git'))) {
    throw new Error('Managed runtime directory exists but is not a Git checkout. Move it aside manually before setup.');
  }
  let origin, head;
  try { origin = await run('git', ['-C', runtime, 'config', '--get', 'remote.origin.url'], { capture: true }); } catch { /* New git init. */ }
  if (!origin) await run('git', ['-C', runtime, 'remote', 'add', 'origin', metadata.repository]);
  else if (origin !== metadata.repository) throw new Error('Managed runtime origin does not match the lock file.');
  try { head = await run('git', ['-C', runtime, 'rev-parse', '--verify', 'HEAD'], { capture: true }); } catch { /* Unborn HEAD after init/interrupted fetch. */ }
  if (head !== metadata.revision) {
    const changes = await run('git', ['-C', runtime, 'status', '--porcelain'], { capture: true });
    if (changes) throw new Error('Managed runtime has local changes; setup will not reset them.');
    try { await run('git', ['-C', runtime, 'cat-file', '-e', `${metadata.revision}^{commit}`], { capture: true }); }
    catch { await run('git', ['-C', runtime, 'fetch', '--depth', '1', 'origin', metadata.revision]); }
  }
  if (head !== metadata.revision || !await exists(path.join(runtime, 'package.json'))) {
    await run('git', ['-C', runtime, 'checkout', '--detach', metadata.revision]);
  }
  console.log(`Installing pinned runtime ${metadata.revision} with pnpm ${installed.version}`);
  await run(process.execPath, [pnpm, 'install', '--frozen-lockfile'], { cwd: runtime });
  if (await exists(PUBLIC)) await fs.cp(PUBLIC, path.join(runtime, 'website/public'), { recursive: true, force: true });
  await run(process.execPath, [pnpm, 'build'], { cwd: runtime });
  if (await exists(PUBLIC)) await fs.cp(PUBLIC, path.join(runtime, 'website/dist'), { recursive: true, force: true });
  await verifyRuntime({ build: true });
  console.log('Setup complete. Run npm start. No publication or GitHub operation was performed.');
}
main().catch(fail);
