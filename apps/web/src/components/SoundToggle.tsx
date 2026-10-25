'use client';

import { useEffect, useRef, useState } from 'react';
import {
  canVibrate,
  feedback,
  listenForFirstGesture,
  setFeedbackSettings,
  unlockAudio,
  useFeedbackSettings,
} from '@/lib/feedback';
import { IconSound, IconSoundOff } from './icons';

/** Speaker button with a small menu: sound effects on/off, vibration on/off. */
export function SoundToggle({ className }: { className?: string }) {
  const settings = useFeedbackSettings();
  const [open, setOpen] = useState(false);
  const [vibrationAvailable, setVibrationAvailable] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listenForFirstGesture();
    setVibrationAvailable(canVibrate());
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', closeOnOutside);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('pointerdown', closeOnOutside);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const toggleSound = () => {
    const sound = !settings.sound;
    setFeedbackSettings({ sound });
    if (sound) {
      unlockAudio();
      feedback('tap');
    }
  };
  const toggleHaptics = () => {
    const haptics = !settings.haptics;
    setFeedbackSettings({ haptics });
    if (haptics) feedback('confirm');
  };

  const row =
    'flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2.5 text-left text-sm font-semibold hover:bg-line';
  const pill = (on: boolean) =>
    `rounded-full px-2 py-0.5 font-mono text-[11px] ${on ? 'bg-amber text-ink' : 'bg-line-strong text-body'}`;

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        aria-label={settings.sound ? 'Sound on' : 'Sound off'}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((isOpen) => !isOpen)}
        className={
          className ??
          'flex h-10 w-10 items-center justify-center rounded-full border border-line text-muted hover:bg-walnut hover:text-paper'
        }
      >
        {settings.sound ? (
          <IconSound className="h-4 w-4" />
        ) : (
          <IconSoundOff className="h-4 w-4" />
        )}
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Sound settings"
          className="absolute right-0 top-12 z-40 w-56 rounded-xl border border-line bg-cocoa p-1.5 shadow-xl"
        >
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={settings.sound}
            onClick={toggleSound}
            className={row}
          >
            Sound effects
            <span className={pill(settings.sound)}>
              {settings.sound ? 'ON' : 'OFF'}
            </span>
          </button>
          {vibrationAvailable && (
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={settings.haptics}
              onClick={toggleHaptics}
              className={row}
            >
              Vibration
              <span className={pill(settings.haptics)}>
                {settings.haptics ? 'ON' : 'OFF'}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
