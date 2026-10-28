import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

export async function readPcm16Wav(filename) {
  const file = await fs.readFile(filename);
  if (file.toString('ascii', 0, 4) !== 'RIFF' || file.toString('ascii', 8, 12) !== 'WAVE') throw new Error(`Not WAV: ${filename}`);
  let fmt, data;
  for (let offset = 12; offset + 8 <= file.length;) {
    const name = file.toString('ascii', offset, offset + 4);
    const size = file.readUInt32LE(offset + 4);
    const chunk = file.subarray(offset + 8, offset + 8 + size);
    if (name === 'fmt ') fmt = chunk;
    if (name === 'data') data = chunk;
    offset += 8 + size + size % 2;
  }
  if (!fmt || !data || fmt.readUInt16LE(0) !== 1 || fmt.readUInt16LE(14) !== 16) throw new Error(`Expected PCM16 WAV: ${filename}`);
  const channels = fmt.readUInt16LE(2);
  const sampleRate = fmt.readUInt32LE(4);
  const length = data.length / (channels * 2);
  const samples = Array.from({ length: channels }, () => new Float64Array(length));
  for (let frame = 0; frame < length; frame++) {
    for (let ch = 0; ch < channels; ch++) samples[ch][frame] = data.readInt16LE((frame * channels + ch) * 2) / 32768;
  }
  return { samples, channels, sampleRate, length, file };
}

export function measure(samples) {
  let peak = 0, sum = 0;
  for (const channel of samples) for (const sample of channel) {
    if (!Number.isFinite(sample)) throw new Error('Non-finite audio sample');
    peak = Math.max(peak, Math.abs(sample));
    sum += sample * sample;
  }
  const rms = Math.sqrt(sum / (samples.length * samples[0].length));
  return { peak, rms, peakDbFS: peak > 0 ? 20 * Math.log10(peak) : null, rmsDbFS: rms > 0 ? 20 * Math.log10(rms) : null };
}

export async function writePcm16Wav(filename, samples, sampleRate) {
  const length = samples[0].length;
  const channels = samples.length;
  if (samples.some(c => c.length !== length)) throw new Error('Unequal channel lengths');
  const bytes = length * channels * 2;
  const wav = Buffer.alloc(44 + bytes);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + bytes, 4); wav.write('WAVE', 8);
  wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(channels, 22); wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * channels * 2, 28); wav.writeUInt16LE(channels * 2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(bytes, 40);
  for (let frame = 0; frame < length; frame++) for (let ch = 0; ch < channels; ch++) {
    const value = samples[ch][frame];
    if (!Number.isFinite(value) || Math.abs(value) > 1) throw new Error(`Out-of-range sample at ${frame}`);
    wav.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(value * 32768))), 44 + 2 * (frame * channels + ch));
  }
  await fs.writeFile(filename, wav);
}

export function encodeAac(wavFile, m4aFile) {
  const result = spawnSync('/usr/bin/afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '192000', wavFile, m4aFile], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`AAC conversion failed: ${result.stderr}`);
}
