'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adBlockerSteps } from './adblock';

/**
 * Shown when an ad blocker stops a reward video. Friendly, not a wall: it says why the
 * video matters, how to pause the blocker for this site, and the ad-free alternatives.
 */
export function AdBlockedNotice({
  reward,
  onDismiss,
  signedIn,
}: {
  /** What the videos pay for, read as "how we keep … free": "coins", "hints". */
  reward: string;
  onDismiss: () => void;
  /** Guests are offered sign-in (free daily coins); members are offered Case Pass. */
  signedIn?: boolean;
}) {
  const [steps, setSteps] = useState<string[]>([]);
  useEffect(() => setSteps(adBlockerSteps()), []);

  return (
    <div className="flex flex-col gap-4" role="alert">
      <p className="font-mono text-[11px] tracking-[0.2em] text-amber">
        AD BLOCKER DETECTED
      </p>
      <h2 className="text-2xl font-extrabold leading-tight">
        Pause your ad blocker to watch the video
      </h2>
      <p className="text-sm leading-relaxed text-body">
        Short videos are how we keep {reward} free, and your ad blocker is
        stopping them. UNSEALED only plays a video when you choose to watch one,
        never as a pop-up.
      </p>
      {steps.length > 0 && (
        <ol className="flex list-decimal flex-col gap-1.5 rounded-xl border border-line bg-walnut py-3 pl-9 pr-4 text-sm text-body">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
          <li>Reload the page and try again.</li>
        </ol>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="h-12 rounded-xl bg-amber px-4 font-extrabold text-ink"
        >
          I&apos;ve paused it: reload
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="h-12 rounded-xl border border-line-strong px-4 font-extrabold"
        >
          Not now
        </button>
      </div>
      <p className="text-xs leading-relaxed text-muted">
        {signedIn === false ? (
          <>
            No videos needed:{' '}
            <Link href="/signin?next=/daily" className="font-bold text-amber">
              sign in
            </Link>{' '}
            for free daily coins, or get{' '}
            <Link href="/pass" className="font-bold text-amber">
              Case Pass
            </Link>{' '}
            for no ads at all.
          </>
        ) : (
          <>
            Prefer no ads at all?{' '}
            <Link href="/pass" className="font-bold text-amber">
              Case Pass
            </Link>{' '}
            gives unlimited Bonus Briefs and hints with no videos.
          </>
        )}
      </p>
    </div>
  );
}
