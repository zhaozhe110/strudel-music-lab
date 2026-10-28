# Pocket Calculator source analysis

Source: supplied `Kraftwerk - Pocket Calculator (2009 Remaster).mp3`.
No human listening claim is made by this analysis; measurements are from decoded PCM, spectra, and AI-separated stems.

- Decoded length: 296.829388 s, 44,100 Hz stereo.
- Best first-30-second eighth-note pulse: 136.034 BPM.
- Best fixed full-file eighth-note pulse: 135.842 BPM; local 30-second fits span 135.688–136.058 BPM. This recording is not perfectly fixed-tempo.
- First lead Ab3 attack: approximately 0.3025 s.
- Approximate full form: 168 bars at 135.85 BPM, with opening offset and fade.

## Verified intro pitch motif

Eighth-note grid, two bars:

`ab3 bb3 f4 ~ f4 ~ ~ eb4 | ab3 f4 eb4 ~ eb4 d4 ~ ~`

Every second two-bar repetition adds C4 at the final eighth. The strong harmonic-family evidence supports MIDI 56, 58, 65, 63, 62, and 60; this was cross-checked against the lead multisamples. The source includes small timing and amplitude variations.

## Approximate arrangement landmarks

- 0.30–28.4 s: opening lead riff.
- 28.4–141.5 s: low Ab3 ostinato under spoken/processed voice and additional figures.
- 141.5–169.6 s: opening lead motif returns; ostinato overlaps in parts.
- 169.6–268.6 s: ostinato and calculator figures/solo.
- 268.6 s through fade: riff returns, with other layers continuing.

These are musical landmarks inferred from pitch activations, not a manually annotated score.

## Final files for reconstruction

- `lead-events-snapped.json`: 851 lower/middle melodic events. 786 attacks within 65 ms of a detected drum stroke were aligned to that stroke minus 6.7 ms. Other attacks retained measured timing. Duration and velocity are approximate.
- `calculator-events-confirmed.json`: 57 conservative square-buzzer events at F#6 (MIDI 90) and G5 (MIDI 79). These use a strong fundamental plus third harmonic and weak subharmonic test; actual source examples were verified by the timbre analysis agent.
- `tempo.json`: measured tempo fits.
- `zoom.png` and `other-zoom.png`: intro spectral evidence.

Velocity is `sqrt(spectralStrength / 0.17)` with limits, not a calibrated reproduction of an analog envelope. Pan is an arrangement choice, not a measured pan curve. `confidence` is an analyst/DSP category, not a probability. Events remain an approximate transcription, especially simultaneous lower voices and weak notes beneath vocals.

## Files not for final playback

`lead-events-raw.json`, `calculator-events.json`, and `calculator-events-pure.json` are intermediate diagnostic detections. In particular, the first calculator candidate set contains vocal-formant harmonics falsely assigned to high notes. Do not use it for playback. Example: the apparent E6 at 32.45 s is a formant-rich sound with approximately 165 Hz harmonic spacing, not a clean E6 oscillator. Keeping original separated vocals alongside those detections would double parts of the voice.

## Method

Used existing conda `quant` Python environment (NumPy/SciPy/Matplotlib); decoded via macOS `afconvert`. Whole-file onset periodicity and STFT; nonnegative harmonic-template fit on the AI-separated `other` stem, followed by note thresholding, octave/overtone suppression, near-neighbor suppression, merging, and timing alignment to the drum event map. Verified high buzzer using a separate odd-harmonic detector at 22.05 kHz.
