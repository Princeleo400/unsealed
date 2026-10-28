'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { detectAdBlocker } from '@/components/ads/adblock';
import { rewardVideosInUse } from '@/components/ads/rewarded';
import { useRewardedAd } from '@/components/ads/useRewardedAd';
import { COIN_RULES, type CoinStatus } from '@/lib/coins';
import { feedback } from '@/lib/feedback';

const LEVELS = [
  { id: 'rookie', label: 'Rookie' },
  { id: 'detective', label: 'Detective' },
  { id: 'inspector', label: 'Inspector' },
  { id: 'chief', label: 'Chief' },
] as const;
type Level = (typeof LEVELS)[number]['id'];

const coinWord = (count: number) => (count === 1 ? 'coin' : 'coins');

/**
 * "Play more today": Bonus Briefs paid with coins (members), a short video (guests)
 * or free with Case Pass. Coins come from the daily login, solving today's Daily and videos.
 */
export function PlayMorePanel() {
  const router = useRouter();
  const ad = useRewardedAd();
  const [coins, setCoins] = useState<CoinStatus | null>(null);
  const [level, setLevel] = useState<Level>('detective');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{
    tone: 'good' | 'bad';
    text: string;
  } | null>(null);

  // Warn up front, before the player taps a video button that can't work.
  const [blockerOn, setBlockerOn] = useState(false);
  useEffect(() => {
    if (!rewardVideosInUse()) return;
    let active = true;
    void detectAdBlocker().then((blocked) => {
      if (active) setBlockerOn(blocked);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    fetch('/api/coins')
      .then((response) => response.json())
      .then((reply: { ok: boolean; coins?: CoinStatus }) => {
        if (!reply.ok || !reply.coins) return;
        setCoins(reply.coins);
        if (reply.coins.signedIn && reply.coins.loginBonus > 0)
          setNote({
            tone: 'good',
            text: `Daily login: +${reply.coins.loginBonus} ${coinWord(reply.coins.loginBonus)}.`,
          });
      })
      .catch(() => undefined);
  }, []);

  if (!coins) return null;

  const start = async (adReward?: unknown) => {
    setBusy(true);
    setNote(null);
    try {
      const response = await fetch('/api/daily/bonus/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ difficulty: level, adReward }),
      });
      const reply = (await response.json()) as {
        ok: boolean;
        ticket?: string;
        message?: string;
        code?: string;
      };
      if (reply.ok && reply.ticket) {
        feedback('unlock');
        router.push(`/daily/bonus?ticket=${encodeURIComponent(reply.ticket)}`);
        return;
      }
      if (reply.code === 'guest_limit' && !coins.signedIn)
        setCoins({ ...coins, guestBonusLeft: 0 });
      setNote({ tone: 'bad', text: reply.message ?? 'Something went wrong.' });
    } catch {
      setNote({ tone: 'bad', text: 'No connection. Please try again.' });
    }
    setBusy(false);
  };

  const watchForGuestBonus = async () => {
    const watched = await ad.watch({
      reward: 'Bonus Briefs',
      signedIn: false,
    });
    if (watched.status === 'blocked') return;
    if (watched.status === 'stopped')
      return setNote({
        tone: 'bad',
        text: 'Watch the video to the end to play.',
      });
    await start(watched.reward);
  };

  const watchForCoin = async () => {
    if (!coins.signedIn) return;
    setNote(null);
    const watched = await ad.watch({ reward: 'coins', signedIn: true });
    if (watched.status === 'blocked') return;
    if (watched.status === 'stopped')
      return setNote({
        tone: 'bad',
        text: 'Watch the video to the end to earn a coin.',
      });
    const reward = watched.reward;
    const response = await fetch('/api/coins/ad', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ adReward: reward }),
    }).catch(() => null);
    const reply = (await response?.json().catch(() => null)) as {
      ok: boolean;
      balance?: number;
      message?: string;
    } | null;
    if (reply?.ok && typeof reply.balance === 'number') {
      setCoins({
        ...coins,
        balance: reply.balance,
        adsLeft: Math.max(0, coins.adsLeft - 1),
      });
      feedback('coin');
      setNote({
        tone: 'good',
        text: `+${COIN_RULES.perAd} coin. Thanks for watching.`,
      });
    } else {
      if (response?.status === 429) setCoins({ ...coins, adsLeft: 0 });
      setNote({
        tone: 'bad',
        text: reply?.message ?? 'Couldn’t add your coin. Please try again.',
      });
    }
  };

  const canAfford = coins.signedIn && coins.balance >= COIN_RULES.bonusCost;
  const bonusLeftToday = coins.signedIn ? coins.bonusLeft : null;

  return (
    <section
      aria-labelledby="play-more"
      className="flex flex-col gap-4 rounded-2xl border border-line bg-walnut p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="play-more" className="text-xl font-extrabold">
            Play more today
          </h2>
          <p className="mt-1 text-sm text-body">
            Bonus Briefs are extra puzzles. They don&apos;t change your streak.
          </p>
        </div>
        {coins.signedIn && !coins.pass && (
          <span
            className="rounded-full border border-amber px-3 py-1.5 font-mono text-sm font-semibold text-amber"
            aria-label={`${coins.balance} ${coinWord(coins.balance)}`}
          >
            ◉ {coins.balance}
          </span>
        )}
      </div>

      <div
        role="group"
        aria-label="Difficulty"
        className="flex flex-wrap gap-2"
      >
        {LEVELS.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={level === option.id}
            onClick={() => {
              feedback('tap');
              setLevel(option.id);
            }}
            className={`rounded-full border px-3 py-1.5 text-sm font-bold ${level === option.id ? 'border-amber bg-amber text-ink' : 'border-line-strong text-muted hover:text-paper'}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {coins.signedIn ? (
        coins.pass ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void start()}
            className="h-12 rounded-xl bg-amber font-extrabold text-ink disabled:opacity-50"
          >
            {busy
              ? 'Opening…'
              : 'Play a Bonus Brief · unlimited with Case Pass'}
          </button>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={busy || !canAfford || bonusLeftToday === 0}
              onClick={() => void start()}
              className="h-12 rounded-xl bg-amber px-3 font-extrabold text-ink disabled:opacity-50"
            >
              {busy
                ? 'Opening…'
                : bonusLeftToday === 0
                  ? 'Daily limit reached'
                  : `Play a Bonus Brief · ${COIN_RULES.bonusCost} ${coinWord(COIN_RULES.bonusCost)}`}
            </button>
            <button
              type="button"
              disabled={ad.loading || coins.adsLeft === 0}
              onClick={() => void watchForCoin()}
              className="h-12 rounded-xl border border-line-strong px-3 font-extrabold disabled:opacity-50"
            >
              {ad.loading
                ? 'Loading video…'
                : coins.adsLeft === 0
                  ? 'No more video coins today'
                  : `Watch a video · +${COIN_RULES.perAd} coin (${coins.adsLeft} left)`}
            </button>
          </div>
        )
      ) : coins.guestBonusLeft > 0 ? (
        <button
          type="button"
          disabled={busy || ad.loading}
          onClick={() => void watchForGuestBonus()}
          className="h-12 rounded-xl bg-amber font-extrabold text-ink disabled:opacity-50"
        >
          {ad.loading || busy
            ? 'Loading…'
            : 'Watch a short video to play a Bonus Brief'}
        </button>
      ) : null}

      {!coins.signedIn && (
        <p className="text-sm text-muted">
          <Link href="/signin?next=/daily" className="font-bold text-amber">
            Sign in
          </Link>{' '}
          to collect free coins every day: +{COIN_RULES.dailyLogin} for
          visiting, +{COIN_RULES.dailySolve} for solving the Daily.
        </p>
      )}
      {coins.signedIn && !coins.pass && (
        <p className="text-xs text-faint">
          Earn coins: +{COIN_RULES.dailyLogin} each day you visit, +
          {COIN_RULES.dailySolve} for solving the Daily, +{COIN_RULES.perAd} per
          video (up to {COIN_RULES.maxAdsPerDay} a day). Up to{' '}
          {COIN_RULES.maxBonusPerDay} Bonus Briefs a day.{' '}
          <Link href="/pass" className="font-bold text-amber">
            Unlimited with Case Pass
          </Link>
          .
        </p>
      )}
      {blockerOn && !(coins.signedIn && coins.pass) && (
        <p
          role="status"
          className="rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-body"
        >
          <b className="text-amber">Your ad blocker is on,</b> so videos
          can&apos;t play here.{' '}
          {coins.signedIn
            ? 'Pause it for UNSEALED to earn coins from videos. Your daily coins still arrive without it.'
            : 'Pause it for UNSEALED, then reload, to play a free Bonus Brief.'}
        </p>
      )}
      {note && (
        <p
          role="status"
          className={`text-sm font-semibold ${note.tone === 'good' ? 'text-green-text' : 'text-red-soft'}`}
        >
          {note.text}
        </p>
      )}
      {ad.overlay}
    </section>
  );
}
