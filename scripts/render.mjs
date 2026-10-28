import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { ROOT, relative, exists, writeJson, fail } from './lib/project.mjs';
import { loadScore, selection, queryEvents, ensureSounds, renderAudio, sha256 } from './lib/engine.mjs';
import { measure, writeWav, optionalAac } from './lib/audio.mjs';

async function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    begin: { type: 'string' }, cycles: { type: 'string' }, 'from-seconds': { type: 'string' }, seconds: { type: 'string' },
    out: { type: 'string' }, tail: { type: 'string', default: '2' }, 'sample-rate': { type: 'string', default: '44100' },
    normalize: { type: 'string', default: 'peak' }, peak: { type: 'string', default: '.84' },
    aac: { type: 'boolean' }, force: { type: 'boolean' }, 'allow-remote': { type: 'boolean' }, help: { type: 'boolean' },
  } });
  if (values.help || positionals.length !== 1) {
    console.log('npm run render -- pieces/<category>/<score>.strudel [options]\n  --begin N --cycles N       Cycle range (one cycle is usually one 4/4 bar)\n  --from-seconds S --seconds S  Alternative range in source seconds\n  --out outputs/name        Output prefix; no extension\n  --tail 2 --sample-rate 44100\n  --normalize peak|none --peak .84\n  --aac                     Also produce M4A when macOS afconvert is available\n  --force                   Explicitly replace existing output files\n  --allow-remote            Permit external asset fetches\nDefault range: final arrange() length, otherwise 64 cycles. Localhost asset URLs read repo/public directly.');
    if (!values.help) process.exitCode = 1;
    return;
  }
  const filename = path.resolve(ROOT, positionals[0]);
  const prefix = path.resolve(ROOT, values.out || path.join('outputs', path.basename(filename, path.extname(filename))));
  const outputs = { wav: prefix + '.wav', report: prefix + '.render.json', events: prefix + '.events.json', ...(values.aac ? { m4a: prefix + '.m4a' } : {}) };
  if (!values.force) for (const output of Object.values(outputs)) if (await exists(output)) throw new Error(`Output exists: ${relative(output)}. Choose --out or explicitly pass --force.`);
  const tail = Number(values.tail), sampleRate = Number(values['sample-rate']), targetPeak = Number(values.peak);
  if (!(tail >= 0 && tail <= 30) || ![22050, 44100, 48000, 96000].includes(sampleRate) || !(targetPeak > 0 && targetPeak < 1) || !['peak', 'none'].includes(values.normalize)) throw new Error('Invalid audio options.');
  const score = await loadScore(filename, { allowRemote: values['allow-remote'] });
  const range = selection(score, values);
  const events = queryEvents(score, range);
  if (!events.length) throw new Error('Selected range contains no note onsets.');
  await ensureSounds(score, events);
  const audio = await renderAudio(score, events, range, { sampleRate, tail });
  if (sha256(await fs.readFile(filename)) !== score.sourceSha256) throw new Error('Score changed during rendering; output was not saved.');
  const raw = measure(audio.channels);
  if (raw.peak < 1e-8) throw new Error('Rendered audio is silent.');
  const gain = values.normalize === 'peak' ? targetPeak / raw.peak : 1;
  const fadeFrames = Math.min(Math.round(.4 * sampleRate), Math.round(tail * sampleRate));
  for (const channel of audio.channels) for (let i = 0; i < channel.length; i++) {
    channel[i] *= gain * (fadeFrames > 0 ? Math.min(1, (channel.length - i) / fadeFrames) : 1);
  }
  const final = measure(audio.channels);
  await writeWav(outputs.wav, audio.channels, sampleRate);
  const aac = values.aac ? await optionalAac(outputs.wav, outputs.m4a) : { created: false, reason: 'Not requested.' };
  if (values.aac && !aac.created) console.warn(aac.reason);
  const report = {
    source: relative(filename), sourceSha256: score.sourceSha256, runtimeRevision: score.revision,
    nodeVersion: process.versions.node, engine: 'Pinned Strudel core/transpiler and native Superdough synth/sampler/effects with node-web-audio-api 2.2.0',
    hostAdapter: 'Editor visuals are no-ops; unused Vite worklet URL import is stubbed. Unsupported DSP is rejected, never substituted.',
    localAssets: 'Loopback fetch URLs are mapped to repo/public; no local web server is required for rendering.',
    selection: range, bpm: score.cps * 240, musicalDurationSeconds: range.cycles / score.cps,
    excerptMode: 'Only note onsets inside the selected range are scheduled; pre-existing sustained notes and effect tails are not reconstructed. Render the full piece from zero for a complete timeline.',
    durationSeconds: audio.channels[0].length / sampleRate, sampleRate, channels: 2, events: events.length,
    raw, rawPeakExceedsUnity: raw.peak > 1, normalization: values.normalize, constantGain: gain, tailFadeSeconds: fadeFrames / sampleRate, final,
    sampleEvents: audio.sampleEvents, sampleSources: audio.sampleSources, samplePitchMappings: audio.samplePitchMappings,
    outputs: Object.fromEntries(Object.entries(outputs).filter(([key]) => key !== 'm4a' || aac.created).map(([key, value]) => [key, relative(value)])), aac,
  };
  await writeJson(outputs.events, events);
  await writeJson(outputs.report, report);
  console.log(JSON.stringify({ source: report.source, events: events.length, seconds: report.durationSeconds, rawPeak: raw.peak, finalPeakDbFS: final.peakDbFS, outputs: report.outputs }, null, 2));
}
main().catch(fail);
