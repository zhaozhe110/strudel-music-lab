import fs from 'node:fs/promises';
import path from 'node:path';
import { exists, run } from './project.mjs';

export function measure(channels) {
  let peak = 0, energy = 0;
  for (const channel of channels) for (const value of channel) {
    if (!Number.isFinite(value)) throw new Error('Audio contains a non-finite sample.');
    peak = Math.max(peak, Math.abs(value));
    energy += value * value;
  }
  const rms = Math.sqrt(energy / (channels.length * channels[0].length));
  return { peak, rms, peakDbFS: peak > 0 ? 20 * Math.log10(peak) : null, rmsDbFS: rms > 0 ? 20 * Math.log10(rms) : null };
}

export async function writeWav(filename, channels, sampleRate) {
  const frames = channels[0].length;
  const count = channels.length;
  const bytes = frames * count * 2;
  const output = Buffer.alloc(44 + bytes);
  output.write('RIFF', 0); output.writeUInt32LE(36 + bytes, 4); output.write('WAVE', 8);
  output.write('fmt ', 12); output.writeUInt32LE(16, 16); output.writeUInt16LE(1, 20);
  output.writeUInt16LE(count, 22); output.writeUInt32LE(sampleRate, 24);
  output.writeUInt32LE(sampleRate * count * 2, 28); output.writeUInt16LE(count * 2, 32); output.writeUInt16LE(16, 34);
  output.write('data', 36); output.writeUInt32LE(bytes, 40);
  for (let frame = 0; frame < frames; frame++) for (let ch = 0; ch < count; ch++) {
    const value = channels[ch][frame];
    if (!Number.isFinite(value) || Math.abs(value) > 1) throw new Error('Cannot write clipping or non-finite PCM. Use peak normalization.');
    output.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(value * 32768))), 44 + 2 * (frame * count + ch));
  }
  await fs.mkdir(path.dirname(filename), { recursive: true });
  await fs.writeFile(filename, output);
}

export async function optionalAac(wavFile, m4aFile) {
  if (process.platform !== 'darwin' || !await exists('/usr/bin/afconvert')) return { created: false, reason: 'afconvert is unavailable on this platform; the WAV is complete.' };
  try {
    await run('/usr/bin/afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '192000', wavFile, m4aFile], { capture: true });
    return { created: true };
  } catch (error) { return { created: false, reason: `${error.message}; the WAV is complete.` }; }
}
