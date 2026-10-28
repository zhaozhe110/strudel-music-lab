import { articulationSettings, scheduleStaticDetune, scheduleVibratoDepth } from './articulation-curves.mjs';

const pitchEnvelopeFields = ['penv', 'pattack', 'pdecay', 'psustain', 'prelease', 'panchor', 'pcurve'];

/**
 * Call after samples(...) has registered roof_clean / roof_clean_soft.
 * installGuitarArticulations({getSound,registerSound,getAudioContext});
 * Then s('roof_live') or s('roof_live_soft') may carry these extra event fields:
 * slideFrom (semitones), slideTime (s), pickCents, pickDecay (s),
 * vib (Hz), vibmod (semitones), vibdelay (s), vibattack (s).
 */
export function installGuitarArticulations(api = globalThis, aliases = {
  roof_live: 'roof_clean',
  roof_live_soft: 'roof_clean_soft',
}) {
  const { getSound, registerSound, getAudioContext } = api;
  for (const [key, fn] of Object.entries({ getSound, registerSound, getAudioContext })) {
    if (typeof fn !== 'function') throw new Error(`Missing Strudel API: ${key}`);
  }
  for (const [alias, baseName] of Object.entries(aliases)) {
    const base = getSound(baseName);
    if (typeof base?.onTrigger !== 'function') throw new Error(`Load ${baseName} before installing guitar articulation`);
    if (alias === baseName) throw new Error('Articulated instruments need distinct names from their base samples');
    registerSound(alias, async (t, value, onended, cps) => {
      const p = articulationSettings(value);
      const baseValue = { ...value, vib: 0 };
      // Avoid a second native pitch envelope fighting the authored slide curve.
      // For ordinary notes with no authored slide/pick curve, native penv remains valid.
      if (p.slideFrom !== 0 || p.pickCents !== 0) {
        for (const field of pitchEnvelopeFields) delete baseValue[field];
      }
      const handle = await base.onTrigger(t, baseValue, onended, cps);
      if (!handle) return handle; // preserves speed(0), dropped/late samples etc.
      const sources = (handle.nodes?.source ?? []).filter(source => source?.detune);
      if (!sources.length) return handle;
      const begin = Math.max(0, t + (Number(value.nudge) || 0));
      for (const source of sources) scheduleStaticDetune(source.detune, begin, p);

      if (p.vib > 0 && p.vibmod > 0) {
        const context = getAudioContext();
        const oscillator = context.createOscillator();
        const depth = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(p.vib, begin);
        depth.gain.value = 0;
        const plan = scheduleVibratoDepth(depth.gain, begin, p);
        oscillator.connect(depth);
        for (const source of sources) depth.connect(source.detune);
        oscillator.start(plan.start); // phase is zero when the vibrato starts

        let sourcesLeft = sources.length;
        let cleaned = false;
        const cleanup = () => {
          sourcesLeft -= 1;
          if (cleaned || sourcesLeft > 0) return;
          cleaned = true;
          try { oscillator.stop(); } catch {}
          oscillator.disconnect();
          depth.disconnect();
        };
        // Do NOT use Strudel onceEnded here: it overwrites node.onended.
        // The base sampler owns its onended callback and must still release nodes.
        for (const source of sources) source.addEventListener('ended', cleanup, { once: true });
        handle.nodes = { ...handle.nodes, vib: [oscillator], vib_gain: [depth] };
      }
      return handle;
    }, { ...base.data, articulation: 'rooftop-v3', baseSound: baseName });
  }
  return Object.keys(aliases);
}
