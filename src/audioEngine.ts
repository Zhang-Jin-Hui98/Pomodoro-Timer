/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// AetherFocus web audio synthesizer engine
let audioCtx: AudioContext | null = null;

// Node references
let rainSource: AudioBufferSourceNode | null = null;
let rainGain: GainNode | null = null;

let waveSource: AudioBufferSourceNode | null = null;
let waveGain: GainNode | null = null;
let waveFilter: BiquadFilterNode | null = null;
let waveLfo: OscillatorNode | null = null;

let tickGain: GainNode | null = null;

// Initialize or resume the primary AudioContext safely
export function initAudio(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Generate an AudioBuffer with White Noise
function createWhiteNoiseBuffer(ctx: AudioContext, durationSeconds = 3.0): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const bufferSize = sampleRate * durationSeconds;
  const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

// ----------------------------------------------------
// cosmic rain: White Noise passed through dynamic muffled filters
// ----------------------------------------------------
export function startCosmicRain(volume: number) {
  const ctx = initAudio();
  if (rainSource) {
    setCosmicRainVolume(volume);
    return;
  }

  // Create noise buffer
  const noiseBuff = createWhiteNoiseBuffer(ctx, 4.0);
  rainSource = ctx.createBufferSource();
  rainSource.buffer = noiseBuff;
  rainSource.loop = true;

  // Rain lowpass filter (soft sound - around 800Hz)
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 950;
  lowpass.Q.value = 0.5;

  // Add a slight crackle/resonance bandpass filter to simulate separate drops
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 2000;
  bandpass.Q.value = 0.25;

  rainGain = ctx.createGain();
  rainGain.gain.setValueAtTime(0, ctx.currentTime);
  // Fade in
  rainGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 1.5);

  // Connect routes: noiseSource -> bandpass -> lowpass -> rainGain -> destination
  rainSource.connect(bandpass);
  bandpass.connect(lowpass);
  lowpass.connect(rainGain);
  rainGain.connect(ctx.destination);

  rainSource.start();
}

export function stopCosmicRain() {
  if (rainGain && audioCtx) {
    const currentGain = rainGain.gain.value;
    rainGain.gain.setValueAtTime(currentGain, audioCtx.currentTime);
    rainGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
    
    const sourceToStop = rainSource;
    rainSource = null;
    rainGain = null;

    setTimeout(() => {
      try {
        if (sourceToStop) {
          sourceToStop.stop();
        }
      } catch (e) {
        // Safe wrap
      }
    }, 600);
  }
}

export function setCosmicRainVolume(volume: number) {
  if (rainGain && audioCtx) {
    rainGain.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 0.15);
  }
}

// ----------------------------------------------------
// ocean waves: Modulated noise to create rise and fall of tide
// ----------------------------------------------------
export function startOceanWaves(volume: number) {
  const ctx = initAudio();
  if (waveSource) {
    setOceanWavesVolume(volume);
    return;
  }

  const noiseBuff = createWhiteNoiseBuffer(ctx, 5.0);
  waveSource = ctx.createBufferSource();
  waveSource.buffer = noiseBuff;
  waveSource.loop = true;

  // Wave filter - lowpass
  waveFilter = ctx.createBiquadFilter();
  waveFilter.type = 'lowpass';
  waveFilter.frequency.value = 500; // base offset
  waveFilter.Q.value = 1.0;

  waveGain = ctx.createGain();
  waveGain.gain.setValueAtTime(0, ctx.currentTime);
  // Fade in
  waveGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 2.0);

  // Create an LFO Oscillator to sweep filter frequency and volume automatically!
  waveLfo = ctx.createOscillator();
  waveLfo.type = 'sine';
  waveLfo.frequency.setValueAtTime(0.08, ctx.currentTime); // 0.08 Hz = ~12.5s cycle

  // Gain node to transform LFO [-1, 1] into appropriate filter frequency sweep range
  const lfoFilterGain = ctx.createGain();
  lfoFilterGain.gain.setValueAtTime(350, ctx.currentTime); // range sweep +/- 350Hz

  // Gain node to transform LFO into subtle gain sweeps
  const lfoVolumeGain = ctx.createGain();
  lfoVolumeGain.gain.setValueAtTime(0.25, ctx.currentTime); // sweep index +/- 0.25

  // Connect LFO:
  // LFO -> Filter Gain -> filter frequency
  waveLfo.connect(lfoFilterGain);
  lfoFilterGain.connect(waveFilter.frequency);

  // LFO -> Volume Gain -> waveGain gain param
  waveLfo.connect(lfoVolumeGain);
  lfoVolumeGain.connect(waveGain.gain);

  // Connect main flow
  waveSource.connect(waveFilter);
  waveFilter.connect(waveGain);
  waveGain.connect(ctx.destination);

  waveLfo.start();
  waveSource.start();
}

export function stopOceanWaves() {
  if (waveGain && audioCtx) {
    const currentGain = waveGain.gain.value;
    waveGain.gain.setValueAtTime(currentGain, audioCtx.currentTime);
    waveGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.8);

    const sourceToStop = waveSource;
    const lfoToStop = waveLfo;

    waveSource = null;
    waveLfo = null;
    waveGain = null;
    waveFilter = null;

    setTimeout(() => {
      try {
        if (sourceToStop) sourceToStop.stop();
        if (lfoToStop) lfoToStop.stop();
      } catch (e) {
        // ignore
      }
    }, 900);
  }
}

export function setOceanWavesVolume(volume: number) {
  if (waveGain && audioCtx) {
    // We adjust the primary waveGain base offset, which gets added to the LFO modulation.
    // If volume is 0, we shouldn't get values.
    // To implement simple scaling, we can adjust the LFO modulators if wanted,
    // or simply standard scale. Let's smoothly set base volume.
    waveGain.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 0.3);
  }
}

// ----------------------------------------------------
// mechanical tick-tock synthesizer clicker
// ----------------------------------------------------
export function playTick(tickType: 'tick' | 'tock') {
  try {
    const ctx = initAudio();
    const now = ctx.currentTime;

    // Woodblock / clock clock sound synthesized:
    // A sine wave starting around 1200Hz (tick) or 900Hz (tock), decaying instantly to 40Hz
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    
    if (tickType === 'tick') {
      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.02);
    } else {
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.02);
    }

    gain.gain.setValueAtTime(0.04, now); // soft volume so it doesn't drill your ears
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.03);
  } catch (e) {
    console.warn("Audio Context tick failed to play:", e);
  }
}

// ----------------------------------------------------
// smart alarm: Warm E-Major Chime melody (E - G# - B - E)
// ----------------------------------------------------
export function playChime() {
  try {
    const ctx = initAudio();
    const now = ctx.currentTime;
    
    // Notes for E-Major: E4 (329.63Hz), G#4 (415.30Hz), B4 (493.88Hz), E5 (659.25Hz)
    const notes = [329.63, 415.30, 493.88, 659.25];
    
    // Staggered arpeggio for a soothing wind-chime or harp effect
    notes.forEach((freq, idx) => {
      const noteDelay = idx * 0.15; // 150ms delay between note triggers
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const subFilter = ctx.createBiquadFilter();
      
      // Use clean sine waves for pure chime tones
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + noteDelay);
      
      subFilter.type = 'lowpass';
      subFilter.frequency.setValueAtTime(1200, now + noteDelay);
      
      // Bell/Chime envelope with long tail (1.5s)
      gain.gain.setValueAtTime(0, now + noteDelay);
      gain.gain.linearRampToValueAtTime(0.12, now + noteDelay + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + noteDelay + 1.8);
      
      osc.connect(subFilter);
      subFilter.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + noteDelay);
      osc.stop(now + noteDelay + 2.0);
    });
  } catch (e) {
    console.error("Audio Context chime alarm failed to play:", e);
  }
}
