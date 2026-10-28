// Use rendered PCM to preserve the exact original tempo, synthesis and effects.
// Set zero-based source cycles explicitly after the intended excerpts are chosen:
// POCKET_AB_V1_START=8 POCKET_AB_V2_START=8 node .pocket-calculator-v2/compare.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { readPcm16Wav, measure, writePcm16Wav, encodeAac } from './audio-files.mjs';

const root = '<LEGACY_WORKSPACE>';
const outdir = path.join(root, '.pocket-calculator-v2');
const sampleRate = 44100;
const bpm = 126;
const cps = bpm / 240;
const cycles = 8;
const pauseSeconds = .8;
const edgeFadeSeconds = .008;
const targetRmsDb = -20;
const maxPeak = .84;
const starts = [process.env.POCKET_AB_V1_START, process.env.POCKET_AB_V2_START];
if (starts.some(s => s === undefined)) throw new Error('Set POCKET_AB_V1_START and POCKET_AB_V2_START to approved zero-based source cycles');
const versions = [
  { label: 'A / v1', filename: path.join(root, '袖珍电路-v1-试听.wav'), scoreFile: path.join(root, '袖珍电路-v1-顶部可视化存档.strudel'), renderReport: path.join(root, '.pocket-calculator/render-report.json'), start: Number(starts[0]) },
  { label: 'B / v2', filename: path.join(root, '袖珍电路-v2-试听.wav'), scoreFile: path.join(root, '袖珍电路-v2.strudel'), renderReport: path.join(outdir, 'render-report.json'), start: Number(starts[1]) },
];
const frameCount = Math.round(cycles / cps * sampleRate);
const pauseFrames = Math.round(pauseSeconds * sampleRate);
const fadeFrames = Math.round(edgeFadeSeconds * sampleRate);
for (const version of versions) {
  if (!Number.isFinite(version.start) || version.start < 0) throw new Error('Invalid excerpt start cycle');
  const input = await readPcm16Wav(version.filename);
  if (input.channels !== 2 || input.sampleRate !== sampleRate) throw new Error('Both inputs must be 44.1 kHz stereo PCM16');
  const startFrame = Math.round(version.start / cps * sampleRate);
  if (startFrame + frameCount > input.length) throw new Error('Requested excerpt extends beyond the WAV');
  version.wavSha256 = crypto.createHash('sha256').update(input.file).digest('hex');
  version.renderMetadata = JSON.parse(await fs.readFile(version.renderReport, 'utf8'));
  version.savedScoreSha256 = crypto.createHash('sha256').update(await fs.readFile(version.scoreFile)).digest('hex');
  if (Math.abs(version.renderMetadata.bpm - bpm) > 1e-6) throw new Error('Render BPM does not match excerpt settings');
  version.samples = input.samples.map(channel => channel.slice(startFrame, startFrame + frameCount));
  // Tiny boundary fades suppress clipping discontinuities from cutting existing audio.
  for (const channel of version.samples) for (let frame = 0; frame < frameCount; frame++) {
    const fade = Math.min(1, frame / fadeFrames, (frameCount - 1 - frame) / fadeFrames);
    channel[frame] *= fade;
  }
  version.before = measure(version.samples);
  if (!version.before.rms) throw new Error('Cannot match a silent excerpt');
}
// Pick one RMS target for both excerpts, lowering it equally when either crest
// factor needs more peak headroom. No compression or limiting is performed.
const rmsTarget = Math.min(10 ** (targetRmsDb / 20), ...versions.map(v => maxPeak * v.before.rms / v.before.peak));
for (const version of versions) {
  version.constantGain = rmsTarget / version.before.rms;
  version.samples.forEach(channel => { for (let i = 0; i < channel.length; i++) channel[i] *= version.constantGain; });
  version.after = measure(version.samples);
}
const joined = Array.from({ length: 2 }, () => new Float64Array(frameCount * 2 + pauseFrames));
for (let ch = 0; ch < 2; ch++) {
  joined[ch].set(versions[0].samples[ch], 0);
  joined[ch].set(versions[1].samples[ch], frameCount + pauseFrames);
}
const basename = path.join(root, '袖珍电路-v1-v2-主题对照');
await writePcm16Wav(basename + '.wav', joined, sampleRate);
encodeAac(basename + '.wav', basename + '.m4a');
const report = {
  method: 'Eight-bar excerpts from the existing full-song PCM renders; original speed, synthesis, filter and delay retained. Independent constant gains match RMS exactly. No compressor, limiter or EQ. 8 ms boundary fades; 0.8 s silence between A and B.',
  sampleRate, bpm, excerptCycles: cycles, excerptSeconds: frameCount / sampleRate,
  targetRmsDbFS: 20 * Math.log10(rmsTarget),
  matchingErrorDb: Math.abs(versions[0].after.rmsDbFS - versions[1].after.rmsDbFS),
  order: versions.map(v => ({
    label: v.label, sourceWav: v.filename, wavSha256: v.wavSha256,
    savedScoreFile: v.scoreFile, savedScoreSha256: v.savedScoreSha256,
    renderedScoreSha256: v.renderMetadata.scoreSha256,
    startCycle: v.start, endCycle: v.start + cycles,
    humanBarRange: `${v.start + 1}–${v.start + cycles}`,
    before: v.before, constantGain: v.constantGain, after: v.after,
  })),
  bStartsAtSeconds: (frameCount + pauseFrames) / sampleRate,
  output: { wav: basename + '.wav', m4a: basename + '.m4a', ...measure(joined) },
};
await fs.writeFile(path.join(outdir, 'ab-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
