'use client';

import { useSyncExternalStore } from 'react';

/**
 * Player choices for sound and vibration, remembered in this browser. Both start on;
 * the speaker button in the header changes them. Shared by every component through a
 * tiny store, so a change in the header is heard everywhere at once.
 */
export type FeedbackSettings = { sound: boolean; haptics: boolean };

const STORAGE_KEY = 'unsealed:feedback';
const DEFAULTS: FeedbackSettings = { sound: true, haptics: true };

let current: FeedbackSettings | null = null;
const listeners = new Set<() => void>();

function read(): FeedbackSettings {
  if (current) return current;
  try {
    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? 'null',
    ) as Partial<FeedbackSettings> | null;
    current = {
      sound: typeof stored?.sound === 'boolean' ? stored.sound : DEFAULTS.sound,
      haptics:
        typeof stored?.haptics === 'boolean'
          ? stored.haptics
          : DEFAULTS.haptics,
    };
  } catch {
    current = { ...DEFAULTS };
  }
  return current;
}

export function getFeedbackSettings(): FeedbackSettings {
  return typeof window === 'undefined' ? DEFAULTS : read();
}

export function setFeedbackSettings(change: Partial<FeedbackSettings>) {
  current = { ...read(), ...change };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    /* storage unavailable: the choice lasts for this visit */
  }
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useFeedbackSettings(): FeedbackSettings {
  return useSyncExternalStore(subscribe, getFeedbackSettings, () => DEFAULTS);
}
