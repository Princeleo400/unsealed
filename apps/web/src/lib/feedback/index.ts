'use client';

import { getFeedbackSettings } from './settings';
import { playSound, unlockAudio, type SoundCue } from './sounds';

export type { SoundCue } from './sounds';
export {
  setFeedbackSettings,
  useFeedbackSettings,
  type FeedbackSettings,
} from './settings';
export { unlockAudio } from './sounds';

/**
 * Vibration patterns in ms (vibrate, pause, vibrate…). Only for moments that matter, so
 * the phone doesn't buzz on every tap. Works on Android browsers; iPhone browsers don't
 * offer vibration to websites, so there it is silently skipped.
 */
const VIBRATIONS: Partial<Record<SoundCue, number | number[]>> = {
  mark: 8,
  confirm: 12,
  link: 20,
  breakthrough: [30, 60, 30, 60, 80],
  wrong: [60, 40, 60],
  coin: 15,
  stamp: [20, 40, 140],
  cold: [120, 80, 120],
};

export const canVibrate = () =>
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

/** Plays a game moment: its sound and, where it has one, its vibration. */
export function feedback(cue: SoundCue) {
  if (typeof window === 'undefined') return;
  const settings = getFeedbackSettings();
  if (settings.sound) playSound(cue);
  const pattern = VIBRATIONS[cue];
  if (settings.haptics && pattern !== undefined && canVibrate()) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* some browsers throw when vibration is blocked */
    }
  }
}

let listening = false;
/** Lets the first tap or key press anywhere switch the audio on (browser rule). */
export function listenForFirstGesture() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  const unlock = () => {
    if (getFeedbackSettings().sound) unlockAudio();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}
