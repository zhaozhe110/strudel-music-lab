import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { OfflineAudioContext } from '../.audio-preview/node_modules/node-web-audio-api/index.js';

const root = '<LEGACY_WORKSPACE>';
const rate = 44100;
const cps = 0.55;
const startCycle = 4;
const lengthCycles = 8;
const ac = new OfflineAudioContext(2, 1, rate);
const inputs = [];
for (const file of ['天台晚风-preview.wav', '天台晚风-v2-preview.wav']) {
  const raw = await fs.readFile(path.join(root, file));
  const decoded = await ac.decodeAudioData(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
  const start = Math.round(startCycle / cps * rate);
  const length = Math.round(lengthCycles / cps * rate);
  const channels = [new Float32Array(length), new Float32Array(length)];
  channels.forEach((data, channel) => decoded.copyFromChannel(data, channel, start));
  let sum = 0, peak = 0;
  for (let i = 0; i < length; i++) for (const data of channels) {
    sum += data[i] * data[i]; peak = Math.max(peak, Math.abs(data[i]));
  }
  inputs.push({ file, channels, rms: Math.sqrt(sum / (length * 2)), peak, length });
}
let targetRms = Math.pow(10, -22 / 20);
for (const input of inputs) targetRms = Math.min(targetRms, 0.82 * input.rms / input.peak);
const gap = Math.round(0.5 * rate);
const length = inputs[0].length * 2 + gap;
const output = [new Float32Array(length), new Float32Array(length)];
const report = { startCycle, lengthCycles, matching: 'RMS matched; not BS.1770 LUFS', targetRmsDbFS: 20 * Math.log10(targetRms), gapSeconds: gap / rate, segments: [] };
let offset = 0;
for (const input of inputs) {
  const gain = targetRms / input.rms;
  for (let i = 0; i < input.length; i++) {
    const fade = Math.min(1, i / (rate * 0.012), (input.length - 1 - i) / (rate * 0.08));
    for (let channel = 0; channel < 2; channel++) output[channel][offset + i] = input.channels[channel][i] * gain * fade;
  }
  report.segments.push({ file: input.file, fromSeconds: offset / rate, toSeconds: (offset + input.length) / rate, gain, originalRmsDbFS: 20 * Math.log10(input.rms) });
  offset += input.length + gap;
}
const bytes = length * 4;
const wav = Buffer.alloc(44 + bytes);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + bytes, 4); wav.write('WAVE', 8); wav.write('fmt ', 12);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22); wav.writeUInt32LE(rate, 24);
wav.writeUInt32LE(rate * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(bytes, 40);
for (let i = 0; i < length; i++) for (let channel = 0; channel < 2; channel++) wav.writeInt16LE(Math.round(output[channel][i] * 32767), 44 + (i * 2 + channel) * 2);
const destination = path.join(root, '天台晚风-音色对比.wav');
await fs.writeFile(destination, wav);
execFileSync('/usr/bin/afconvert', [destination, path.join(root, '天台晚风-音色对比.m4a'), '-f', 'm4af', '-d', 'aac', '-b', '192000']);
await fs.writeFile(path.join(root, '.tone-v2/comparison-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
