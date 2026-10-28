import path from 'node:path';
import { parseArgs } from 'node:util';
import { ROOT, relative, filesUnder, writeJson, fail } from './lib/project.mjs';
import { loadScore, selection, queryEvents, ensureSounds, verifySampleResources, assertRenderable, soundName } from './lib/engine.mjs';

function normalized(events, offset) {
  return events.map(event => ({
    start: +(event.start - offset).toFixed(9), end: +(event.end - offset).toFixed(9),
    value: Object.fromEntries(Object.entries(event.value).sort(([a], [b]) => a.localeCompare(b))),
  })).sort((a, b) => a.start - b.start || JSON.stringify(a.value).localeCompare(JSON.stringify(b.value)));
}

async function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    begin: { type: 'string' }, cycles: { type: 'string' }, 'from-seconds': { type: 'string' }, seconds: { type: 'string' },
    'expect-repeat': { type: 'string' }, all: { type: 'boolean' }, 'allow-remote': { type: 'boolean' },
    out: { type: 'string', default: 'outputs/validation.json' }, help: { type: 'boolean' },
  } });
  if (values.help) {
    console.log('npm run validate -- [score.strudel ...] [options]\nDefault: all little-logic and reference scores. --all scans all pieces.\n--begin N --cycles N / --from-seconds S --seconds S\n--expect-repeat N verifies the same event pattern after N cycles.\n--out outputs/validation.json --allow-remote\nChecks real REPL evaluation, finite timing/pitches/gains, registered sounds, and every declared local sample file. Reports offline-render support separately.');
    return;
  }
  const files = positionals.length ? positionals.map(file => path.resolve(ROOT, file)) : values.all
    ? await filesUnder(path.join(ROOT, 'pieces'), '.strudel')
    : [...await filesUnder(path.join(ROOT, 'pieces/little-logic'), '.strudel'), ...await filesUnder(path.join(ROOT, 'pieces/reference'), '.strudel')];
  if (!files.length) throw new Error('No score files found.');
  const results = [];
  for (const filename of files) {
    try {
      const score = await loadScore(filename, { allowRemote: values['allow-remote'] });
      const range = selection(score, values);
      const events = queryEvents(score, range);
      if (!events.length) throw new Error('Selected range contains no note onsets.');
      await ensureSounds(score, events);
      const resources = await verifySampleResources(score, events);
      let offlineRender = { supported: true };
      try { assertRenderable(score, events); } catch (error) { offlineRender = { supported: false, reason: error.message }; }
      let repeats;
      if (values['expect-repeat'] !== undefined) {
        const period = Number(values['expect-repeat']);
        if (!Number.isFinite(period) || period <= 0) throw new Error('Invalid --expect-repeat value.');
        const following = queryEvents(score, { begin: range.begin + period, end: range.end + period });
        repeats = JSON.stringify(normalized(events, range.begin)) === JSON.stringify(normalized(following, range.begin + period));
        if (!repeats) throw new Error(`Events do not repeat after ${period} cycles.`);
      }
      const result = {
        source: relative(filename), ok: true, sourceSha256: score.sourceSha256, runtimeRevision: score.revision,
        bpm: score.cps * 240, selection: range, seconds: range.cycles / score.cps, events: events.length,
        sounds: events.reduce((counts, event) => { const name = soundName(event.value); counts[name] = (counts[name] || 0) + 1; return counts; }, {}),
        declaredSampleFiles: resources.length, localSampleFilesVerified: resources.filter(r => r.file).length,
        resources, fetchedResources: [...score.trace.resources.values()], offlineRender,
        ...(repeats !== undefined ? { repeats, periodCycles: Number(values['expect-repeat']) } : {}),
      };
      results.push(result);
      console.log(`OK ${result.source}: ${result.events} events, ${result.localSampleFilesVerified} local sample files${offlineRender.supported ? '' : '; browser-only DSP'}`);
    } catch (error) {
      results.push({ source: relative(filename), ok: false, error: error.message });
      console.error(`FAIL ${relative(filename)}: ${error.message}`);
    }
  }
  const report = { scope: 'Structural and local-resource validation, not a subjective listening test or browser audio verification.', ok: results.every(result => result.ok), results };
  const output = path.resolve(ROOT, values.out);
  await writeJson(output, report);
  console.log(`${results.filter(result => result.ok).length}/${results.length} passed; report: ${relative(output)}`);
  if (!report.ok) process.exitCode = 1;
}
main().catch(fail);
