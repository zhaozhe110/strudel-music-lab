// A finite, explicitly notated score repeated as a normal Strudel Pattern.
// Timings are already in Strudel cycles; 1 cycle = four quarter notes.
export function performancePattern(score, api = globalThis, options = {}) {
  const { Pattern, Hap, TimeSpan } = api;
  if (![Pattern, Hap, TimeSpan].every(value => typeof value === 'function')) throw new Error('Strudel core is not ready');
  if (!(score.totalCycles > 0) || !Array.isArray(score.events)) throw new Error('Invalid performance score');
  const { guitarLevel = 1, bassLevel = 1, drumsLevel = 1, articulations = true, humanTiming = true } = options;
  const events = score.events.map(event => {
    const value = { ...event.value };
    value.gain *= value.orbit < 2 ? guitarLevel : value.orbit === 4 ? bassLevel : drumsLevel;
    if (!articulations) {
      for (const key of ['slideFrom', 'pickCents', 'vib', 'vibmod']) value[key] = 0;
    }
    const start = humanTiming ? event.start : event.meta.gridBeat / 4;
    return { start, end: start + event.end - event.start, value };
  });
  return new Pattern(state => {
    const result = [], begin = Number(state.span.begin), end = Number(state.span.end);
    const first = Math.floor(begin / score.totalCycles) - 1;
    const last = Math.floor(end / score.totalCycles);
    for (let loop = first; loop <= last; loop++) {
      const shift = loop * score.totalCycles;
      for (const event of events) {
        const a = event.start + shift, b = event.end + shift;
        if (a >= end || b <= begin) continue;
        // Shift Strudel's rational times rather than reparsing large floating
        // timestamps, keeping the note length identical over repeated loops.
        const whole = new TimeSpan(event.start, event.end).withTime(time => time.add(shift));
        const part = whole.intersection(state.span);
        // superdough writes duration (seconds) back onto the supplied value.
        // A Hap interprets value.duration as cycles, so sharing this object
        // across queries would make later loops grow longer on every play.
        if (part) result.push(new Hap(whole, part, { ...event.value }));
      }
    }
    return result;
  });
}
