import { SOUNDS } from '../config';

/**
 * Every sound effect in the game, invented on the spot with the Web Audio
 * API - there are no sound files anywhere in this project. A sound is just a
 * note that slides from one pitch to another, described in config.ts as
 * `{ from, to, time, shape, loud }`. Because nothing needs re-building, a
 * number changed in config.ts is heard the very next time the sound plays.
 *
 * Two rules this file must never break:
 *   1. NEVER THROW. Some computers have no sound card and some browsers
 *      block audio outright - none of that should ever stop the game.
 *   2. NEVER LOG. `npm run check:game` fails the moment anything shows up in
 *      the browser console, sound-related or not.
 */

// Only made the first time a sound is needed, not when the page loads.
// Browsers refuse to make noise before the player has done something like
// press a key, and the first call to playSound() always comes from one, so
// by the time this runs the browser is already happy to let us make noise.
let audioContext: AudioContext | undefined;

declare global {
  interface Window {
    // A headless browser (used by npm run check:game) has no ears, so it
    // reads these two instead to prove a sound really happened.
    __soundsPlayed?: string[];
    __audioState?: string;
  }
}

const WAVE_SHAPES = ['sine', 'square', 'sawtooth', 'triangle'];

function getAudioContext(): AudioContext | undefined {
  if (audioContext) return audioContext;
  try {
    const AudioContextClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return undefined;
    audioContext = new AudioContextClass();
  } catch {
    return undefined;
  }
  return audioContext;
}

/** Play one of the named sounds from config.ts's SOUNDS object. Never throws. */
export function playSound(name: string) {
  try {
    (window.__soundsPlayed ??= []).push(name);
  } catch {
    // No headless checker watching - that is fine, the game does not need it.
  }

  try {
    const audio = getAudioContext();
    if (!audio) {
      window.__audioState = 'none';
      return;
    }
    // Ask nicely to be allowed to play. If the browser says no, .catch stops
    // that turning into an unhandled promise rejection - which counts as a
    // console error and would fail npm run check:game.
    audio.resume().catch(() => {});
    window.__audioState = audio.state;

    const sound = (
      SOUNDS as Record<string, { from: number; to: number; time: number; shape: string; loud: number }>
    )[name];
    if (!sound) return;

    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    // A typo in `shape` (like 'sqare') falls back to a normal square wave
    // instead of throwing - see the note on SOUNDS in config.ts.
    oscillator.type = (WAVE_SHAPES.includes(sound.shape) ? sound.shape : 'square') as OscillatorType;

    const now = audio.currentTime;
    const seconds = sound.time / 1000;
    oscillator.frequency.setValueAtTime(sound.from, now);
    oscillator.frequency.exponentialRampToValueAtTime(sound.to, now + seconds);

    gain.gain.setValueAtTime(sound.loud, now);
    // Ramping to exactly 0 is a real Web Audio error - it insists on sliding
    // towards something just above zero instead.
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);

    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(now);
    oscillator.stop(now + seconds);
  } catch {
    // Never let a sound problem stop the game.
  }
}
