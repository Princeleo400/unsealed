'use client';

/**
 * Sound effects made in code with the Web Audio API: no audio files, nothing to download.
 * Each cue is a few short tones and bursts of filtered noise shaped to sit with the noir
 * look (paper, stamps, a soft piano-like chime). To swap in recorded sounds later, change
 * `playSound` to play a file for that cue; nothing else needs to change.
 */
export type SoundCue =
  | 'tap' // choosing an option
  | 'mark' // ruling something out on a grid (✕)
  | 'confirm' // confirming on a grid (✓)
  | 'paper' // opening evidence
  | 'unlock' // new evidence or a lead opens up
  | 'link' // a red string that holds
  | 'breakthrough' // a breakthrough or a statement breaks
  | 'wrong' // a wrong answer, a string that doesn't hold
  | 'hint'
  | 'coin'
  | 'stamp' // case closed / Brief solved
  | 'cold'; // case went cold

type Tone = {
  frequency: number;
  /** Seconds after the cue starts. */
  at?: number;
  duration: number;
  volume?: number;
  wave?: OscillatorType;
  /** Slide to this frequency over the tone. */
  slideTo?: number;
};
type Noise = {
  at?: number;
  duration: number;
  volume?: number;
  /** Band-pass centre: low = thud, high = paper. */
  filter: number;
  q?: number;
};
type CueRecipe = { tones?: Tone[]; noise?: Noise[] };

const RECIPES: Record<SoundCue, CueRecipe> = {
  tap: {
    tones: [{ frequency: 880, duration: 0.04, volume: 0.25, wave: 'triangle' }],
  },
  mark: {
    tones: [{ frequency: 520, duration: 0.05, volume: 0.25, wave: 'triangle' }],
    noise: [{ duration: 0.03, filter: 3200, volume: 0.15 }],
  },
  confirm: {
    tones: [
      { frequency: 784, duration: 0.06, volume: 0.25, wave: 'triangle' },
      {
        frequency: 1046,
        at: 0.05,
        duration: 0.08,
        volume: 0.22,
        wave: 'triangle',
      },
    ],
  },
  paper: {
    noise: [
      { duration: 0.09, filter: 2600, q: 0.8, volume: 0.55 },
      { at: 0.07, duration: 0.12, filter: 1800, q: 0.7, volume: 0.4 },
    ],
  },
  unlock: {
    tones: [
      { frequency: 523, duration: 0.12, volume: 0.25 },
      { frequency: 659, at: 0.08, duration: 0.12, volume: 0.25 },
      { frequency: 784, at: 0.16, duration: 0.22, volume: 0.25 },
    ],
  },
  link: {
    tones: [
      {
        frequency: 196,
        duration: 0.25,
        volume: 0.35,
        wave: 'triangle',
        slideTo: 220,
      },
      { frequency: 392, duration: 0.18, volume: 0.15 },
    ],
  },
  breakthrough: {
    tones: [
      { frequency: 392, duration: 0.5, volume: 0.22 },
      { frequency: 494, at: 0.09, duration: 0.5, volume: 0.22 },
      { frequency: 587, at: 0.18, duration: 0.5, volume: 0.22 },
      { frequency: 784, at: 0.27, duration: 0.7, volume: 0.25 },
    ],
  },
  wrong: {
    tones: [
      {
        frequency: 165,
        duration: 0.18,
        volume: 0.35,
        wave: 'square',
        slideTo: 110,
      },
    ],
    noise: [{ duration: 0.08, filter: 300, volume: 0.3 }],
  },
  hint: {
    tones: [
      { frequency: 1175, duration: 0.25, volume: 0.24 },
      { frequency: 1568, at: 0.1, duration: 0.35, volume: 0.2 },
    ],
  },
  coin: {
    tones: [
      { frequency: 1319, duration: 0.08, volume: 0.22, wave: 'square' },
      {
        frequency: 1976,
        at: 0.07,
        duration: 0.25,
        volume: 0.18,
        wave: 'square',
      },
    ],
  },
  stamp: {
    tones: [
      { frequency: 110, duration: 0.22, volume: 0.6, slideTo: 55 },
      { frequency: 523, at: 0.3, duration: 0.6, volume: 0.18 },
      { frequency: 659, at: 0.3, duration: 0.6, volume: 0.16 },
      { frequency: 784, at: 0.3, duration: 0.8, volume: 0.16 },
    ],
    noise: [{ duration: 0.12, filter: 500, q: 0.6, volume: 0.6 }],
  },
  cold: {
    tones: [
      { frequency: 294, duration: 0.5, volume: 0.22, wave: 'triangle' },
      {
        frequency: 247,
        at: 0.35,
        duration: 0.5,
        volume: 0.22,
        wave: 'triangle',
      },
      {
        frequency: 196,
        at: 0.7,
        duration: 0.9,
        volume: 0.22,
        wave: 'triangle',
        slideTo: 185,
      },
    ],
  },
};

const MASTER_VOLUME = 0.5;
let context: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;

function audio(): { context: AudioContext; master: GainNode } | null {
  if (typeof window === 'undefined') return null;
  if (!context) {
    const AudioContextClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return null;
    // Safari: "ambient" mixes with the player's music and obeys the silent switch.
    const session = (navigator as { audioSession?: { type: string } })
      .audioSession;
    if (session) session.type = 'ambient';
    context = new AudioContextClass();
    master = context.createGain();
    master.gain.value = MASTER_VOLUME;
    master.connect(context.destination);
  }
  return { context, master: master! };
}

/**
 * Browsers only allow sound after the player has touched the page. Called on the first
 * tap or key press so later cues (for example after a server reply) can play.
 */
export function unlockAudio() {
  audio();
}

function playTone(
  audioContext: AudioContext,
  output: AudioNode,
  start: number,
  tone: Tone,
) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const begin = start + (tone.at ?? 0);
  const end = begin + tone.duration;
  oscillator.type = tone.wave ?? 'sine';
  oscillator.frequency.setValueAtTime(tone.frequency, begin);
  if (tone.slideTo)
    oscillator.frequency.exponentialRampToValueAtTime(tone.slideTo, end);
  gain.gain.setValueAtTime(0.0001, begin);
  gain.gain.exponentialRampToValueAtTime(tone.volume ?? 0.3, begin + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  oscillator.connect(gain).connect(output);
  oscillator.start(begin);
  oscillator.stop(end + 0.02);
}

function playNoise(
  audioContext: AudioContext,
  output: AudioNode,
  start: number,
  noise: Noise,
) {
  if (!noiseBuffer) {
    noiseBuffer = audioContext.createBuffer(
      1,
      audioContext.sampleRate,
      audioContext.sampleRate,
    );
    const samples = noiseBuffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++)
      samples[index] = Math.random() * 2 - 1;
  }
  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  const begin = start + (noise.at ?? 0);
  const end = begin + noise.duration;
  source.buffer = noiseBuffer;
  filter.type = 'bandpass';
  filter.frequency.value = noise.filter;
  filter.Q.value = noise.q ?? 1;
  gain.gain.setValueAtTime(noise.volume ?? 0.3, begin);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  source.connect(filter).connect(gain).connect(output);
  source.start(begin, Math.random() * 0.5);
  source.stop(end + 0.02);
}

export function playSound(cue: SoundCue) {
  const ready = audio();
  if (!ready) return;
  const schedule = () => {
    const recipe = RECIPES[cue];
    const start = ready.context.currentTime + 0.005;
    for (const tone of recipe.tones ?? [])
      playTone(ready.context, ready.master, start, tone);
    for (const noise of recipe.noise ?? [])
      playNoise(ready.context, ready.master, start, noise);
  };
  if (ready.context.state === 'running') schedule();
  // Not allowed yet (no tap on the page so far): stay silent rather than queue up sounds.
  else
    void ready.context
      .resume()
      .then(() => {
        if (ready.context.state === 'running') schedule();
      })
      .catch(() => {});
}
