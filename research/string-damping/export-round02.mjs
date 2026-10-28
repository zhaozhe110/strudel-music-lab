const fs = await import('node:fs/promises');
const root = '<LEGACY_WORKSPACE>';
const task = await taskSpace(11);
const p = task.page('p1');
const rendered = await p.evaluate(() => {
  if (window.__dampingRender?.state !== 'done') throw new Error('Render not finished');
  const b = window.__dampingBuffer;
  const frames = b.length, rate = b.sampleRate;
  const bytes = new Uint8Array(44 + frames * 4);
  const v = new DataView(bytes.buffer);
  const text = (offset, value) => [...value].forEach((c, i) => v.setUint8(offset + i, c.charCodeAt(0)));
  text(0, 'RIFF'); v.setUint32(4, bytes.length - 8, true); text(8, 'WAVE');
  text(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 2, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 4, true);
  v.setUint16(32, 4, true); v.setUint16(34, 16, true); text(36, 'data');
  v.setUint32(40, frames * 4, true);
  for (let ch = 0; ch < 2; ch++) {
    const data = b.getChannelData(ch);
    for (let i = 0; i < frames; i++) {
      const x = Math.max(-1, Math.min(1, data[i]));
      v.setInt16(44 + 4 * i + ch * 2, Math.round(x * (x < 0 ? 32768 : 32767)), true);
    }
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return { data: btoa(binary), report: window.__dampingRender };
});
await fs.writeFile(root + '/天台晚风-同弦止音AB.wav', Buffer.from(rendered.data, 'base64'));
await fs.writeFile(root + '/.string-damping/render-report.json', JSON.stringify(rendered.report, null, 2));
console.log({ saved: true, seconds: rendered.report.seconds, peak: rendered.report.peak });
// Reload restores a fresh live context after the offline rendering experiment.
const code = await fs.readFile(root + '/天台晚风-同弦止音试验.strudel', 'utf8');
await p.goto('http://127.0.0.1:3009/#' + encodeURIComponent(Buffer.from(code).toString('base64')));
await p.reload();
console.log(await p.snapshot());
await task.finish({ keep: ['p1'] });
