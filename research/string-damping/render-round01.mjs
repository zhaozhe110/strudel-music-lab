const task = await taskSpace(11);
const p = task.page('p1');
console.log(await p.evaluate(() => {
  window.__dampingRender = { state: 'loading' };
  (async () => {
    try {
      const score = await (await fetch('/rooftop-damping/events.json')).json();
      const rate = 44100;
      const offline = new OfflineAudioContext(2, 20 * rate, rate);
      setAudioContext(offline);
      setSuperdoughAudioController(null);
      setMaxPolyphony(512);
      const urls = ['/rooftop-restored/samples.json', '/rooftop-touch/samples.json'];
      const maps = [];
      for (const url of urls) {
        await samples(location.origin + url);
        maps.push(await (await fetch(url)).json());
      }
      const sources = new Set();
      for (const e of [...score.A, ...score.B]) {
        const map = maps.find(m => m[e.value.s]);
        const choices = map[e.value.s][e.value.note];
        if (!choices) throw new Error('Missing exact root: ' + e.value.note);
        const file = choices[e.value.n % choices.length];
        sources.add(map._base + file);
      }
      await Promise.all([...sources].map(url => loadBuffer(url, offline)));
      const events = [
        ...score.A.map(e => ({ ...e, time: 0.1 + e.start / score.cps })),
        ...score.B.map(e => ({ ...e, time: 10 + e.start / score.cps })),
      ].sort((a, b) => a.time - b.time);
      for (const e of events) {
        const span = new TimeSpan(e.start, e.end);
        await webaudioOutput(new Hap(span, span, { ...e.value }), e.time, score.cps);
      }
      window.__dampingRender.state = 'rendering';
      const buffer = await offline.startRendering();
      const channels = [buffer.getChannelData(0), buffer.getChannelData(1)];
      const stats = (start, end) => {
        let sum = 0, count = 0, peak = 0;
        for (const ch of channels) {
          for (let i = Math.round(start * rate); i < Math.round(end * rate); i++) {
            if (!Number.isFinite(ch[i])) throw new Error('Nonfinite audio');
            sum += ch[i] ** 2; count++;
            peak = Math.max(peak, Math.abs(ch[i]));
          }
        }
        return { rms: Math.sqrt(sum / count), peak };
      };
      const a = stats(0.1, 8.8), b = stats(10, 18.7);
      const matchB = a.rms / b.rms;
      const peakA = stats(0, 10).peak, peakB = stats(10, 20).peak;
      const commonGain = 0.85 / Math.max(peakA, peakB * matchB);
      for (const ch of channels) {
        for (let i = 0; i < ch.length; i++) ch[i] *= commonGain * (i >= 10 * rate ? matchB : 1);
      }
      window.__dampingBuffer = buffer;
      window.__dampingRender = {
        state: 'done', engine: 'Native Strudel webaudioOutput / OfflineAudioContext',
        A: 'Previous soft-picking version', B: 'Same version plus per-string cut groups',
        AStart: 0.1, BStart: 10, seconds: 20, sampleRate: rate,
        rawA: a, rawB: b, BLevelMatch: matchB, commonGain,
        peak: stats(0, 20).peak, matchedA: stats(0.1, 8.8).rms,
        matchedB: stats(10, 18.7).rms, notesPerVersion: 32,
        sampleFiles: sources.size, subjectiveListeningVerified: false,
      };
    } catch (e) {
      window.__dampingRender = { state: 'error', message: String(e), stack: e.stack };
    }
  })();
  return { started: true };
}));
