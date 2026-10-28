'use client';

/**
 * Ad blocker detection, so players who block the reward videos are asked to pause their
 * blocker instead of getting the reward anyway. Two checks, because blockers work in
 * different ways:
 *  1. A "bait" element with ad-like class names: cosmetic filters (uBlock Origin, AdBlock,
 *     Adblock Plus, Brave) hide it.
 *  2. A request for Google's ad script: network filters (most blockers, Brave Shields,
 *     Safari content blockers, DNS blockers) make it fail.
 * Either one means "blocked". A player who is simply offline is not counted as blocked.
 */
const AD_SCRIPT = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js';
const BAIT_CLASSES =
  'adsbox ad-banner ad-placement pub_300x250 textads banner-ads sponsored-ad';

function baitIsHidden(): Promise<boolean> {
  return new Promise((resolve) => {
    const bait = document.createElement('div');
    bait.className = BAIT_CLASSES;
    bait.setAttribute('aria-hidden', 'true');
    bait.style.cssText =
      'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;';
    bait.innerHTML = '&nbsp;';
    document.body.appendChild(bait);
    // Give cosmetic filters a moment to apply.
    window.setTimeout(() => {
      const style = window.getComputedStyle(bait);
      const hidden =
        bait.offsetParent === null ||
        bait.offsetHeight === 0 ||
        style.display === 'none' ||
        style.visibility === 'hidden';
      bait.remove();
      resolve(hidden);
    }, 120);
  });
}

async function scriptIsBlocked(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false)
    return false;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 5000);
  try {
    // "no-cors": we only care whether the request is allowed out, not the reply.
    await fetch(AD_SCRIPT, {
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    return false;
  } catch (error) {
    // A slow network (our own time-out) isn't proof of a blocker.
    return (error as Error)?.name !== 'AbortError';
  } finally {
    window.clearTimeout(timer);
  }
}

let cached: Promise<boolean> | null = null;

/** True when an ad blocker would stop reward videos. Cached for the page; `fresh` re-checks. */
export function detectAdBlocker(fresh = false): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (!cached || fresh)
    cached = Promise.all([baitIsHidden(), scriptIsBlocked()])
      .then(([cosmetic, network]) => cosmetic || network)
      .catch(() => false);
  return cached;
}

/** Short, browser-specific steps for pausing a blocker. */
export function adBlockerSteps(): string[] {
  if (typeof navigator === 'undefined') return [];
  const agent = navigator.userAgent;
  const isBrave = Boolean((navigator as { brave?: unknown }).brave);
  const isIos = /iPhone|iPad|iPod/.test(agent);
  if (isBrave)
    return [
      'Tap the lion icon in the address bar.',
      'Turn Shields down for this site.',
    ];
  if (isIos)
    return [
      'Tap "aA" (or the page icon) in the address bar.',
      'Choose "Turn off Content Blockers".',
    ];
  return [
    'Click your ad blocker’s icon next to the address bar (uBlock, AdBlock, Adblock Plus…).',
    'Choose "Pause" or "Don’t run on this site".',
  ];
}
