'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdReward } from '@/lib/view-types';
import { Modal } from '@/components/player/Overlays';
import { showRewardedAd } from './rewarded';

const TEST_AD_SECONDS = 5;

/**
 * "Watch a short video" for coins and Bonus Briefs. Resolves with the reward when the
 * video finished (or no ad could be shown), or null if the player stopped early.
 * In development, without an ad unit, a 5-second stand-in plays instead.
 */
export function useRewardedAd() {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const resolver = useRef<((reward: AdReward | null) => void) | null>(null);

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      setSecondsLeft(null);
      resolver.current?.({ provider: 'dev', id: `dev-${Date.now()}` });
      resolver.current = null;
      return;
    }
    const timer = setTimeout(
      () =>
        setSecondsLeft((current) => (current === null ? null : current - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const stop = useCallback(() => {
    setSecondsLeft(null);
    resolver.current?.(null);
    resolver.current = null;
  }, []);

  const watch = useCallback(async (): Promise<AdReward | null> => {
    setLoading(true);
    const outcome = await showRewardedAd();
    setLoading(false);
    if (outcome.status === 'rewarded') return outcome.reward;
    if (outcome.status === 'closed') return null;
    return new Promise<AdReward | null>((resolve) => {
      resolver.current = resolve;
      setSecondsLeft(TEST_AD_SECONDS);
    });
  }, []);

  const overlay = (
    <Modal open={secondsLeft !== null} onClose={stop} label="Video ad">
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <span className="font-mono text-[11px] tracking-[0.2em] text-faint">
          TEST AD · DEVELOPMENT ONLY
        </span>
        <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-line-strong bg-walnut">
          <span className="font-mono text-5xl font-semibold text-amber">
            {secondsLeft ?? 0}
          </span>
        </div>
        <p className="text-sm text-muted">
          In production a short rewarded video plays here.
        </p>
        <button
          type="button"
          onClick={stop}
          className="text-sm font-bold text-muted underline"
        >
          Stop video (no reward)
        </button>
      </div>
    </Modal>
  );

  return { watch, loading, overlay };
}
