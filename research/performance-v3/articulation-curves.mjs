// Shared by the browser instrument and the offline preview renderer.
// Values below are control values, not note changes/transcriptions.
const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp01 = value => Math.min(1, Math.max(0, value));
const smoothstep = value => {
  const u = clamp01(value);
  return u * u * (3 - 2 * u);
};

export function articulationSettings(value = {}) {
  return {
    slideFrom: finite(value.slideFrom, 0), // semitones relative to target note
    slideTime: Math.max(0.001, finite(value.slideTime, 0.085)), // seconds
    pickCents: finite(value.pickCents, 0), // cents, transient string sharpness
    pickDecay: Math.max(0.001, finite(value.pickDecay, 0.045)), // seconds to zero
    vib: Math.max(0, finite(value.vib, 0)), // Hz
    vibmod: Math.max(0, finite(value.vibmod, 0.5)), // semitone peak depth
    vibdelay: Math.max(0, finite(value.vibdelay, 0)), // seconds of zero vibrato
    vibattack: Math.max(0, finite(value.vibattack, 0)), // seconds of linear fade-in
  };
}

export function staticDetuneAt(elapsed, value = {}) {
  const p = articulationSettings(value);
  const t = Math.max(0, elapsed);
  const glide = p.slideFrom * 100 * (1 - smoothstep(t / p.slideTime));
  const pick = p.pickCents * (1 - smoothstep(t / p.pickDecay));
  return glide + pick;
}

export function vibratoDetuneAt(elapsed, value = {}) {
  const p = articulationSettings(value);
  if (!p.vib || !p.vibmod || elapsed < p.vibdelay) return 0;
  const time = elapsed - p.vibdelay;
  const ramp = p.vibattack > 0 ? clamp01(time / p.vibattack) : 1;
  return 100 * p.vibmod * ramp * Math.sin(2 * Math.PI * p.vib * time);
}

export function createStaticDetuneCurve(value = {}) {
  const p = articulationSettings(value);
  if (p.slideFrom === 0 && p.pickCents === 0) return null;
  const duration = Math.max(p.slideFrom ? p.slideTime : 0, p.pickCents ? p.pickDecay : 0, 0.001);
  // 1 kHz control curve, linearly interpolated by WebAudio. No release reset:
  // after reaching the target pitch, the detune remains exactly zero.
  const count = Math.min(4097, Math.max(2, Math.ceil(duration * 1000) + 1));
  const values = Float32Array.from({ length: count }, (_, i) => staticDetuneAt(duration * i / (count - 1), p));
  values[values.length - 1] = 0;
  return { duration, values };
}

export function scheduleStaticDetune(param, begin, value = {}) {
  const curve = createStaticDetuneCurve(value);
  if (curve) param.setValueCurveAtTime(curve.values, begin, curve.duration);
  return curve;
}

export function scheduleVibratoDepth(param, begin, value = {}) {
  const p = articulationSettings(value);
  const start = begin + p.vibdelay;
  param.setValueAtTime(p.vibattack ? 0 : p.vibmod * 100, start);
  if (p.vibattack) param.linearRampToValueAtTime(p.vibmod * 100, start + p.vibattack);
  return { start, depthCents: p.vibmod * 100, riseEnd: start + p.vibattack };
}
