'use client';

import type { AdReward } from '@/lib/view-types';

/**
 * Rewarded video for hints (web).
 *
 * Production: Google Ad Manager "rewarded ads for web" via GPT, when NEXT_PUBLIC_GAM_REWARDED_AD_UNIT
 * is set (e.g. "/1234567/unsealed_rewarded_hint"). Requires a Google Ad Manager account; Google
 * serves rewarded web ads mainly on mobile browsers, so desktop often gets "no fill".
 * No fill / blocked: the player still gets the hint (provider "no-fill"); the server caps ad hints per case.
 * Development without an ad unit: a 5-second simulated video so the flow can be tested.
 */

type GptSlot = { addService: (service: unknown) => GptSlot };
type GptEvent = { slot: GptSlot; makeRewardedVisible?: () => void };
type Googletag = {
  cmd: { push: (fn: () => void) => void };
  defineOutOfPageSlot: (unit: string, format: unknown) => GptSlot | null;
  enums: { OutOfPageFormat: { REWARDED: unknown } };
  pubads: () => {
    addEventListener: (ev: string, fn: (event: GptEvent) => void) => void;
    removeEventListener?: (ev: string, fn: (event: GptEvent) => void) => void;
  };
  enableServices: () => void;
  display: (slot: GptSlot) => void;
  destroySlots: (slots: GptSlot[]) => void;
};

declare global {
  interface Window {
    googletag?: Googletag;
  }
}

export type RewardedOutcome =
  | { status: 'rewarded'; reward: AdReward }
  | { status: 'closed' }
  | { status: 'dev-simulate' };

const AD_UNIT = process.env.NEXT_PUBLIC_GAM_REWARDED_AD_UNIT;
const id = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

let gptLoading: Promise<Googletag | null> | null = null;
function loadGpt(): Promise<Googletag | null> {
  if (gptLoading) return gptLoading;
  gptLoading = new Promise((resolve) => {
    window.googletag =
      window.googletag ?? ({ cmd: [] } as unknown as Googletag);
    const script = document.createElement('script');
    script.src = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js';
    script.async = true;
    script.onload = () => resolve(window.googletag ?? null);
    script.onerror = () => resolve(null); // ad blocker or offline
    document.head.appendChild(script);
    setTimeout(() => resolve(window.googletag ?? null), 8000);
  });
  return gptLoading;
}

export function rewardedAdsConfigured(): boolean {
  return Boolean(AD_UNIT);
}

/** Shows a rewarded video. Resolves when the player earned the reward, closed early, or no ad could be shown. */
export async function showRewardedAd(): Promise<RewardedOutcome> {
  if (!AD_UNIT) {
    return process.env.NODE_ENV === 'production'
      ? { status: 'rewarded', reward: { provider: 'no-fill', id: id() } }
      : { status: 'dev-simulate' };
  }
  const gt = await loadGpt();
  if (!gt)
    return { status: 'rewarded', reward: { provider: 'no-fill', id: id() } };

  return new Promise<RewardedOutcome>((resolve) => {
    // If no ad is ready within 15 s, don't leave the player stuck: give the hint.
    const noFillTimer = setTimeout(
      () =>
        done({ status: 'rewarded', reward: { provider: 'no-fill', id: id() } }),
      15000,
    );
    let settled = false;
    let granted = false;
    const done = (rewardedOutcome: RewardedOutcome) => {
      if (!settled) {
        settled = true;
        resolve(rewardedOutcome);
      }
    };
    gt.cmd.push(() => {
      const slot = gt.defineOutOfPageSlot(
        AD_UNIT,
        gt.enums.OutOfPageFormat.REWARDED,
      );
      if (!slot)
        return done({
          status: 'rewarded',
          reward: { provider: 'no-fill', id: id() },
        }); // page/format not supported
      slot.addService(gt.pubads());
      const pub = gt.pubads();
      pub.addEventListener('rewardedSlotReady', (event) => {
        if (event.slot !== slot) return;
        clearTimeout(noFillTimer); // the video can now run as long as it needs
        event.makeRewardedVisible?.();
      });
      pub.addEventListener('rewardedSlotGranted', (event) => {
        if (event.slot === slot) granted = true;
      });
      pub.addEventListener('rewardedSlotClosed', (event) => {
        if (event.slot !== slot) return;
        gt.destroySlots([slot]);
        done(
          granted
            ? { status: 'rewarded', reward: { provider: 'gam', id: id() } }
            : { status: 'closed' },
        );
      });
      pub.addEventListener('slotRenderEnded', (event) => {
        const ev = event as GptEvent & { isEmpty?: boolean };
        if (ev.slot === slot && ev.isEmpty) {
          gt.destroySlots([slot]);
          done({
            status: 'rewarded',
            reward: { provider: 'no-fill', id: id() },
          });
        }
      });
      gt.enableServices();
      gt.display(slot);
    });
  });
}
