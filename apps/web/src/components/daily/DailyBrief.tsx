'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { DailyView } from '@/server/daily';
import { ShareButton } from '@/components/share/ShareButton';
import { PlayMorePanel } from './PlayMorePanel';

type Mark = '' | 'x' | 'v';
type Solution = {
  culprit: number;
  place: number;
  rows: { suspect: number; place: number; object: number }[];
};
type Saved = {
  places: Mark[][];
  objects: Mark[][];
  wrong: number;
  status: 'playing' | 'solved' | 'failed';
  /**
   * Time actually spent on the page, in ms. The clock stops while the page is hidden or
   * closed, and stays stopped (clues covered) until the player taps Resume.
   */
  activeMs: number;
  seconds: number;
  /** Server-signed time of the first open; lets the share card check the time. */
  startToken?: string;
  solution?: Solution;
  /** Server-signed proof of a correct answer, used for the share card. */
  proof?: string;
  guesses: { suspect: number; place: number }[];
};
type History = Record<
  string,
  { solved: boolean; wrong: number; seconds: number }
>;

const MAX_TRIES = 3;
const HISTORY_KEY = 'unsealed:daily:history';
/** Results of Briefs older than the free week: shown as ✓/✕, never counted in the streak. */
const ARCHIVE_HISTORY_KEY = 'unsealed:daily:archive-history';
const load = <T,>(storageKey: string): T | null => {
  try {
    const stored = localStorage.getItem(storageKey);
    return stored ? (JSON.parse(stored) as T) : null;
  } catch {
    return null;
  }
};
const save = (storageKey: string, value: unknown) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
};
const grid = (size: number): Mark[][] =>
  Array.from({ length: size }, () => Array<Mark>(size).fill(''));
/** Saves from before the pausing clock had `startedAt` instead of `activeMs`. */
const upgradeSave = (stored: Saved): Saved => ({
  ...stored,
  activeMs: typeof stored.activeMs === 'number' ? stored.activeMs : 0,
});
const CHECKPOINT_MS = 10_000;
const mmss = (totalSeconds: number) =>
  `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
const dayBefore = (date: string) =>
  new Date(Date.parse(`${date}T00:00:00Z`) - 86400000)
    .toISOString()
    .slice(0, 10);

export function streakFrom(history: History, today: string): number {
  let date = history[today]?.solved ? today : dayBefore(today);
  let streak = 0;
  while (history[date]?.solved) {
    streak++;
    date = dayBefore(date);
  }
  return streak;
}

export function DailyBrief({
  date,
  ticket,
}: {
  date?: string;
  /** A Bonus Brief ticket: plays an extra puzzle instead of the calendar Daily. */
  ticket?: string;
}) {
  const [daily, setDaily] = useState<DailyView | null>(null);
  const [error, setError] = useState<{
    message: string;
    code?: string;
  } | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [who, setWho] = useState<number | null>(null);
  const [where, setWhere] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [coinNote, setCoinNote] = useState<string | null>(null);
  // When the clock is running: the moment the current stretch of play began. Null = paused.
  const [runningSince, setRunningSinceState] = useState<number | null>(null);
  const runningRef = useRef<number | null>(null);
  const setRunningSince = useCallback((value: number | null) => {
    runningRef.current = value;
    setRunningSinceState(value);
  }, []);
  const savedRef = useRef<Saved | null>(null);
  savedRef.current = saved;
  const storageKey = daily ? `unsealed:daily:${daily.id}` : null;

  /** Adds the running stretch to the saved time and stops the clock. */
  const pauseClock = useCallback(() => {
    const since = runningRef.current;
    if (since === null) return;
    setRunningSince(null);
    const playedMs = Date.now() - since;
    const addTime = (current: Saved): Saved =>
      current.status === 'playing'
        ? { ...current, activeMs: current.activeMs + playedMs }
        : current;
    // A functional update, so a guess saved at the same moment isn't overwritten.
    setSaved((prev) => prev && addTime(prev));
    // Written now as well: when the page is closing React may not get to render again.
    if (storageKey && savedRef.current)
      save(storageKey, addTime(savedRef.current));
  }, [setRunningSince, storageKey]);

  const resumeClock = useCallback(() => {
    if (runningRef.current === null && savedRef.current?.status === 'playing')
      setRunningSince(Date.now());
  }, [setRunningSince]);

  // Only a hidden or closed page pauses. A window that merely loses focus still shows the
  // clues, so its clock keeps running.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') pauseClock();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', pauseClock);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', pauseClock);
    };
  }, [pauseClock]);

  // Save the running time every few seconds, so a crash or killed tab loses very little.
  useEffect(() => {
    if (runningSince === null) return;
    const timer = setInterval(() => {
      pauseClock();
      resumeClock();
    }, CHECKPOINT_MS);
    return () => clearInterval(timer);
  }, [runningSince, pauseClock, resumeClock]);

  useEffect(() => {
    fetch(
      ticket
        ? `/api/daily/bonus?ticket=${encodeURIComponent(ticket)}`
        : `/api/daily${date ? `?date=${encodeURIComponent(date)}` : ''}`,
    )
      .then((response) => response.json())
      .then(
        (reply: {
          ok: boolean;
          daily?: DailyView;
          message?: string;
          code?: string;
        }) => {
          if (!reply.ok || !reply.daily)
            return setError({
              message: reply.message ?? 'Could not load the Daily Brief.',
              code: reply.code,
            });
          const dailyView = reply.daily;
          setDaily(dailyView);
          const size = dailyView.suspects.length;
          const stored = load<Saved>(`unsealed:daily:${dailyView.id}`);
          const prev = stored ? upgradeSave(stored) : null;
          setSaved(
            prev
              ? { ...prev, startToken: prev.startToken ?? dailyView.startToken }
              : {
                  places: grid(size),
                  objects: grid(size),
                  wrong: 0,
                  status: 'playing',
                  activeMs: 0,
                  seconds: 0,
                  startToken: dailyView.startToken,
                  guesses: [],
                },
          );
          // A fresh Brief starts its clock straight away (if the page is on screen). A Brief
          // left part-way waits behind the "Paused" cover until the player taps Resume.
          setRunningSince(
            !prev && document.visibilityState === 'visible' ? Date.now() : null,
          );
        },
      )
      .catch(() => setError({ message: 'No connection. Please try again.' }));
  }, [date, ticket]);

  useEffect(() => {
    if (daily && saved) save(`unsealed:daily:${daily.id}`, saved);
  }, [daily, saved]);

  useEffect(() => {
    const timeout = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timeout);
  }, []);

  // Account sync: merge the account's history into this browser, and upload results played while signed out.
  const [signedIn, setSignedIn] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);
  useEffect(() => {
    fetch('/api/daily/results')
      .then((response) => response.json())
      .then((reply: { ok: boolean; signedIn: boolean; history?: History }) => {
        if (!reply.ok || !reply.signedIn || !reply.history) return;
        setSignedIn(true);
        const local = load<History>(HISTORY_KEY) ?? {};
        const remote = reply.history;
        save(HISTORY_KEY, { ...local, ...remote }); // the account's record of a day wins
        const missing = Object.entries(local)
          .filter(([date]) => !remote[date])
          .sort(([firstDate], [secondDate]) =>
            firstDate < secondDate ? 1 : -1,
          )
          .slice(0, 60)
          .map(([date, dayResult]) => ({ date, ...dayResult }));
        if (missing.length)
          void fetch('/api/daily/results', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ results: missing }),
          }).catch(() => undefined);
        setHistoryVersion((version) => version + 1);
      })
      .catch(() => undefined);
  }, []);

  const history = useMemo(
    () => load<History>(HISTORY_KEY) ?? {},
    [saved?.status, historyVersion],
  ); // eslint-disable-line react-hooks/exhaustive-deps
  const archiveHistory = useMemo(
    () => load<History>(ARCHIVE_HISTORY_KEY) ?? {},
    [saved?.status],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = useCallback(
    (status: 'solved' | 'failed', solution: Solution, wrong: number) => {
      if (!daily) return;
      // Read the running stretch now: the update below runs later, after the clock stops.
      const since = runningRef.current;
      const stoppedAt = Date.now();
      setSaved((prev) => {
        if (!prev) return prev;
        const activeMs =
          prev.activeMs + (since === null ? 0 : stoppedAt - since);
        const seconds = Math.round(activeMs / 1000);
        const result = { solved: status === 'solved', wrong, seconds };
        if (daily.kind === 'bonus')
          return { ...prev, status, solution, seconds, wrong, activeMs }; // Bonus Briefs never touch the streak
        if (!daily.archive.includes(daily.id)) {
          // A Brief from the full archive: remembered here, but no streak and no account record.
          const archiveHistory = load<History>(ARCHIVE_HISTORY_KEY) ?? {};
          archiveHistory[daily.id] ??= result;
          save(ARCHIVE_HISTORY_KEY, archiveHistory);
          return { ...prev, status, solution, seconds, wrong, activeMs };
        }
        const history = load<History>(HISTORY_KEY) ?? {};
        if (!history[daily.id]) {
          history[daily.id] = result;
          if (signedIn)
            void fetch('/api/daily/results', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                results: [{ date: daily.id, ...history[daily.id] }],
              }),
            }).catch(() => undefined);
        }
        save(HISTORY_KEY, history);
        return { ...prev, status, solution, seconds, wrong, activeMs };
      });
      setRunningSince(null);
    },
    [daily, signedIn, setRunningSince],
  );

  if (error?.code === 'archive_locked')
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
        <p className="font-mono text-xs tracking-[0.25em] text-red-text">
          DAILY ARCHIVE
        </p>
        <h1 className="text-2xl font-extrabold">
          This Brief is in the archive
        </h1>
        <p role="alert" className="text-body">
          {error.message} Every day&apos;s Brief from the last week stays free.
        </p>
        <Link
          href="/pass"
          className="flex h-12 items-center rounded-xl bg-amber px-6 font-extrabold text-ink"
        >
          See Case Pass
        </Link>
        <Link href="/daily" className="text-sm font-bold text-amber">
          Play today&apos;s Brief
        </Link>
      </div>
    );
  if (error)
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p role="alert" className="text-body">
          {error.message}
        </p>
        {ticket && (
          <Link href="/daily" className="text-sm font-bold text-amber">
            Back to the Daily Brief
          </Link>
        )}
      </div>
    );
  if (!daily || !saved)
    return (
      <p
        role="status"
        className="py-20 text-center font-mono text-sm tracking-[0.2em] text-muted"
      >
        {ticket ? 'OPENING YOUR BONUS BRIEF…' : 'OPENING TODAY’S BRIEF…'}
      </p>
    );

  const suspectCount = daily.suspects.length;
  const playing = saved.status === 'playing';
  const paused = playing && runningSince === null;
  const elapsed = playing
    ? Math.floor(
        (saved.activeMs + (runningSince === null ? 0 : now - runningSince)) /
          1000,
      )
    : saved.seconds;
  const freshStart = saved.activeMs === 0 && saved.guesses.length === 0;
  const tomorrow = Date.parse(`${daily.today}T00:00:00Z`) + 86400000;
  const untilNext = Math.max(0, Math.round((tomorrow - now) / 1000));
  const streak = streakFrom(history, daily.today);

  const cycle = (
    which: 'places' | 'objects',
    rowIndex: number,
    columnIndex: number,
  ) => {
    if (!playing) return;
    setSaved((prev) => {
      if (!prev) return prev;
      const nextGrid = prev[which].map((row) => [...row]);
      nextGrid[rowIndex]![columnIndex] =
        nextGrid[rowIndex]![columnIndex] === ''
          ? 'x'
          : nextGrid[rowIndex]![columnIndex] === 'x'
            ? 'v'
            : '';
      return { ...prev, [which]: nextGrid };
    });
  };

  const isBonus = daily.kind === 'bonus';
  const endpoint = isBonus ? '/api/daily/bonus' : '/api/daily';
  const target = isBonus ? { ticket: daily.ticket } : { date: daily.id };

  const submit = async () => {
    if (who === null || where === null) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'answer',
          ...target,
          suspect: who,
          place: where,
        }),
      });
      const reply = (await res.json()) as {
        ok: boolean;
        correct?: boolean;
        solution?: Solution;
        message?: string;
        coinsEarned?: number;
        proof?: string;
      };
      if (reply.ok && reply.coinsEarned)
        setCoinNote(
          `+${reply.coinsEarned} coin for solving today's Daily. Spend it on a Bonus Brief below.`,
        );
      if (!reply.ok) return setMsg(reply.message ?? 'Something went wrong.');
      const guesses = [...saved.guesses, { suspect: who, place: where }];
      if (reply.correct && reply.solution) {
        setSaved((prev) => prev && { ...prev, guesses, proof: reply.proof });
        finish('solved', reply.solution, saved.wrong);
        return;
      }
      const wrong = saved.wrong + 1;
      if (wrong >= MAX_TRIES) {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ type: 'reveal', ...target }),
        });
        const rj = (await response.json()) as { solution: Solution };
        setSaved((prev) => prev && { ...prev, guesses, wrong });
        finish('failed', rj.solution, wrong);
      } else {
        setSaved((prev) => prev && { ...prev, guesses, wrong });
        setMsg(
          `Not quite. ${MAX_TRIES - wrong} ${MAX_TRIES - wrong === 1 ? 'try' : 'tries'} left.`,
        );
      }
    } catch {
      setMsg('No connection. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const shareText = () =>
    saved.status === 'solved'
      ? `I solved ${isBonus ? 'a Bonus Brief' : `UNSEALED Daily #${daily.number}`} in ${mmss(saved.seconds)}. Can you?`
      : `${isBonus ? 'This Bonus Brief' : `UNSEALED Daily #${daily.number}`} beat me. Can you solve it?`;

  // A render function (not a nested component) so the grid isn't remounted on each tap and keeps keyboard focus.
  const renderGrid = ({
    which,
    cols,
    label,
  }: {
    which: 'places' | 'objects';
    cols: string[];
    label: string;
  }) => (
    <div className="overflow-x-auto">
      <table
        className="w-full border-separate border-spacing-1 text-xs"
        aria-label={label}
      >
        <thead>
          <tr>
            <th scope="col" className="w-20">
              <span className="sr-only">Suspect</span>
            </th>
            {cols.map((column) => (
              <th
                key={column}
                scope="col"
                className="align-bottom font-semibold leading-tight text-muted"
              >
                <span className="block min-w-14 break-words">
                  {column.replace(/^the /, '')}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {daily.suspects.map((name, rowIndex) => (
            <tr key={name}>
              <th scope="row" className="pr-1 text-left text-sm font-bold">
                {name}
              </th>
              {cols.map((column, ci) => {
                const mark = saved[which][rowIndex]![ci]!;
                return (
                  <td key={column}>
                    <button
                      type="button"
                      onClick={() => cycle(which, rowIndex, ci)}
                      aria-label={`${name}, ${column}: ${mark === '' ? 'empty' : mark === 'x' ? 'ruled out' : 'confirmed'}`}
                      className={`h-11 w-full min-w-11 rounded-md border text-base font-extrabold ${
                        mark === 'v'
                          ? 'border-green-text bg-green/35 text-[#8fd9b0]'
                          : mark === 'x'
                            ? 'border-line bg-walnut text-red-text'
                            : 'border-line bg-walnut'
                      }`}
                    >
                      {mark === 'v' ? '✓' : mark === 'x' ? '✕' : ''}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs tracking-[0.15em] text-red-text">
            {isBonus ? 'BONUS BRIEF' : `DAILY BRIEF #${daily.number}`} ·{' '}
            {daily.city.toUpperCase()}
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
            {daily.title}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {daily.difficultyLabel} · {suspectCount} suspects ·{' '}
            {daily.clues.length} clues
            {isBonus && ' · no streak'}
            {!isBonus &&
              daily.id !== daily.today &&
              (daily.archive.includes(daily.id)
                ? ` · from ${daily.id}`
                : ` · archive Brief from ${daily.id} (no streak)`)}
          </p>
        </div>
        <div className="flex gap-2 font-mono text-sm">
          <span
            className="rounded-full border border-line px-3 py-1.5"
            aria-label="Time"
          >
            {mmss(elapsed)}
            {paused && ' · paused'}
          </span>
          {!isBonus && (
            <span
              className="rounded-full border border-line px-3 py-1.5"
              aria-label="Streak"
            >
              Streak {streak}
            </span>
          )}
        </div>
      </div>

      <p className="leading-relaxed text-body">{daily.intro}</p>

      {paused ? (
        <section
          aria-label="Paused"
          className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-cocoa px-5 py-12 text-center"
        >
          <p className="font-mono text-xs tracking-[0.25em] text-amber">
            {freshStart ? 'READY WHEN YOU ARE' : 'PAUSED'}
          </p>
          <p className="max-w-sm text-body">
            {freshStart
              ? 'The clock starts when you open the clues.'
              : `The clock stopped at ${mmss(elapsed)} when you left. The clues stay covered until you carry on.`}
          </p>
          <button
            type="button"
            onClick={resumeClock}
            className="h-12 rounded-xl bg-amber px-8 font-extrabold text-ink"
          >
            {freshStart ? 'Start' : 'Resume'}
          </button>
        </section>
      ) : (
        <>
          <ol
            className="m-0 flex list-none flex-col gap-2 p-0"
            aria-label="Clues"
          >
            {daily.clues.map((clue, index) => {
              const [tag, ...rest] = clue.text.split(' · ');
              return (
                <li
                  key={index}
                  className="rounded-lg bg-paper px-3.5 py-2.5 text-[15px] leading-snug text-ink"
                >
                  <span className="font-mono text-xs font-semibold tracking-wide text-[#4a3f35]">
                    {tag}
                  </span>{' '}
                  {rest.join(' · ')}
                </li>
              );
            })}
          </ol>

          <section
            aria-label="Deduction grids"
            className="flex flex-col gap-4 rounded-2xl border border-line p-3 sm:p-4"
          >
            <p className="text-xs text-faint">
              Tap a box to cycle: empty → ✕ ruled out → ✓ confirmed. Grids are
              just for you; they aren’t graded.
            </p>
            <h2 className="font-mono text-[11px] tracking-[0.15em] text-faint">
              WHERE WAS EVERYONE?
            </h2>
            {renderGrid({
              which: 'places',
              cols: daily.places,
              label: 'Suspects and places',
            })}
            <h2 className="font-mono text-[11px] tracking-[0.15em] text-faint">
              WHO HAD WHAT?
            </h2>
            {renderGrid({
              which: 'objects',
              cols: daily.objects,
              label: 'Suspects and objects',
            })}
          </section>

          {playing ? (
            <section
              aria-label="Your answer"
              className="flex flex-col gap-4 rounded-2xl border border-line bg-cocoa p-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-extrabold">{daily.title}</h2>
                <span
                  className="flex gap-1.5"
                  aria-label={`${MAX_TRIES - saved.wrong} tries left`}
                >
                  {[...Array(MAX_TRIES)].map((_, index) => (
                    <span
                      key={index}
                      className={`h-2.5 w-2.5 rounded-full ${index < saved.wrong ? 'bg-line-strong' : 'bg-amber'}`}
                    />
                  ))}
                </span>
              </div>
              <div
                className="flex flex-wrap gap-2"
                role="radiogroup"
                aria-label="Who"
              >
                {daily.suspects.map((name, index) => (
                  <button
                    key={name}
                    type="button"
                    role="radio"
                    aria-checked={who === index}
                    onClick={() => setWho(index)}
                    className={`min-h-11 rounded-xl border px-4 font-bold ${who === index ? 'border-paper bg-paper text-ink' : 'border-line-strong bg-walnut hover:border-amber'}`}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <p className="text-sm font-bold">Where were they?</p>
              <div
                className="flex flex-wrap gap-2"
                role="radiogroup"
                aria-label="Where"
              >
                {daily.places.map((place, index) => (
                  <button
                    key={place}
                    type="button"
                    role="radio"
                    aria-checked={where === index}
                    onClick={() => setWhere(index)}
                    className={`min-h-11 rounded-xl border px-4 text-sm font-bold ${where === index ? 'border-paper bg-paper text-ink' : 'border-line-strong bg-walnut hover:border-amber'}`}
                  >
                    {place}
                  </button>
                ))}
              </div>
              {msg && (
                <p
                  role="status"
                  className="text-sm font-semibold text-red-soft"
                >
                  {msg}
                </p>
              )}
              <button
                type="button"
                disabled={busy || who === null || where === null}
                onClick={submit}
                className="h-12 rounded-xl bg-amber font-extrabold text-ink disabled:bg-line-strong disabled:text-body"
              >
                Name who took it
              </button>
            </section>
          ) : (
            <section
              aria-label="Result"
              className="flex flex-col gap-4 rounded-2xl border-2 border-amber bg-cocoa p-5"
            >
              <p
                className={`w-fit -rotate-2 border-2 px-3 py-1 font-mono text-sm tracking-[0.25em] ${saved.status === 'solved' ? 'border-green-text text-green-text' : 'border-red-text text-red-text'}`}
              >
                {saved.status === 'solved' ? 'SOLVED' : 'CASE COLD'}
              </p>
              <p className="text-lg font-extrabold">
                {daily.suspects[saved.solution!.culprit]} took the{' '}
                {daily.objects[daily.target]}, at{' '}
                {daily.places[saved.solution!.place]}.
              </p>
              <p className="text-sm text-muted">
                {saved.status === 'solved'
                  ? `Solved in ${mmss(saved.seconds)} with ${saved.wrong} wrong ${saved.wrong === 1 ? 'guess' : 'guesses'}.`
                  : 'Three tries used.'}
                {!isBonus && ` Streak: ${streak}.`}
              </p>
              <table className="text-sm">
                <thead>
                  <tr className="text-left text-faint">
                    <th className="py-1 font-semibold">Who</th>
                    <th className="font-semibold">Where</th>
                    <th className="font-semibold">Had</th>
                  </tr>
                </thead>
                <tbody>
                  {saved.solution!.rows.map((row) => (
                    <tr key={row.suspect} className="border-t border-line">
                      <td className="py-1.5 font-bold">
                        {daily.suspects[row.suspect]}
                      </td>
                      <td>{daily.places[row.place]}</td>
                      <td>{daily.objects[row.object]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="grid items-start gap-2 sm:grid-cols-2">
                <ShareButton
                  text={shareText()}
                  request={() => ({
                    kind: 'daily',
                    ...target,
                    proof: saved.proof,
                    start: saved.startToken,
                    wrong: saved.wrong,
                    seconds: saved.seconds,
                  })}
                />
                <Link
                  href="/play/001-dead-air"
                  className="flex h-12 items-center justify-center rounded-xl bg-amber font-extrabold text-ink"
                >
                  Play a full case
                </Link>
              </div>
              {coinNote && (
                <p
                  role="status"
                  className="text-sm font-semibold text-green-text"
                >
                  {coinNote}
                </p>
              )}
              {!isBonus && daily.id === daily.today && (
                <p className="text-center font-mono text-xs text-faint">
                  Next brief in {Math.floor(untilNext / 3600)}h{' '}
                  {String(Math.floor((untilNext % 3600) / 60)).padStart(2, '0')}
                  m
                </p>
              )}
            </section>
          )}
        </>
      )}

      {!isBonus && daily.archive.length > 1 && (
        <nav aria-label="Past briefs" className="flex flex-col gap-2">
          <h2 className="font-mono text-[11px] tracking-[0.15em] text-faint">
            THIS WEEK
          </h2>
          <div className="flex flex-wrap gap-2">
            {daily.archive.map((date) => {
              const dayResult = history[date];
              return (
                <Link
                  key={date}
                  href={date === daily.today ? '/daily' : `/daily?date=${date}`}
                  aria-current={date === daily.id ? 'page' : undefined}
                  className={`rounded-lg border px-3 py-2 font-mono text-xs ${date === daily.id ? 'border-amber text-amber' : 'border-line text-muted hover:text-paper'}`}
                >
                  {date.slice(5)}{' '}
                  {dayResult ? (dayResult.solved ? '✓' : '✕') : ''}
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {isBonus ? (
        <Link href="/daily" className="text-sm font-bold text-amber">
          Back to today&apos;s Daily
        </Link>
      ) : daily.fullArchive ? (
        <form
          action="/daily"
          aria-label="Full archive"
          className="flex flex-col gap-2"
        >
          <h2 className="font-mono text-[11px] tracking-[0.15em] text-faint">
            FULL ARCHIVE · CASE PASS
          </h2>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
              Any day since {daily.epoch}
              <input
                type="date"
                name="date"
                required
                min={daily.epoch}
                max={daily.today}
                defaultValue={daily.id}
                className="h-11 rounded-xl border border-line bg-walnut px-3 font-mono text-paper"
              />
            </label>
            <button
              type="submit"
              className="h-11 rounded-xl border border-line-strong px-4 font-extrabold hover:border-amber"
            >
              Open
            </button>
          </div>
          <p className="text-xs text-faint">
            Archive Briefs show your result here but don&apos;t count towards
            your streak.
            {archiveHistory[daily.id]
              ? ` ${daily.id}: ${archiveHistory[daily.id]!.solved ? 'solved ✓' : 'not solved ✕'}.`
              : ''}
          </p>
        </form>
      ) : (
        <p className="text-sm text-muted">
          Older Briefs are in the{' '}
          <Link href="/pass" className="font-bold text-amber">
            full archive with Case Pass
          </Link>
          .
        </p>
      )}
      <PlayMorePanel />
    </div>
  );
}
