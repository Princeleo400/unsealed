'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { DailyView } from '@/server/daily';

type Mark = '' | 'x' | 'v';
type Solution = { culprit: number; place: number; rows: { suspect: number; place: number; object: number }[] };
type Saved = {
  places: Mark[][];
  objects: Mark[][];
  wrong: number;
  status: 'playing' | 'solved' | 'failed';
  startedAt: number;
  seconds: number;
  solution?: Solution;
  guesses: { suspect: number; place: number }[];
};
type History = Record<string, { solved: boolean; wrong: number; seconds: number }>;

const MAX_TRIES = 3;
const HISTORY_KEY = 'unsealed:daily:history';
const load = <T,>(k: string): T | null => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
};
const save = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* storage unavailable */
  }
};
const grid = (n: number): Mark[][] => Array.from({ length: n }, () => Array<Mark>(n).fill(''));
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const dayBefore = (d: string) => new Date(Date.parse(`${d}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);

export function streakFrom(history: History, today: string): number {
  let d = history[today]?.solved ? today : dayBefore(today);
  let n = 0;
  while (history[d]?.solved) {
    n++;
    d = dayBefore(d);
  }
  return n;
}

export function DailyBrief({ date }: { date?: string }) {
  const [daily, setDaily] = useState<DailyView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [s, setS] = useState<Saved | null>(null);
  const [who, setWho] = useState<number | null>(null);
  const [where, setWhere] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/daily${date ? `?date=${encodeURIComponent(date)}` : ''}`)
      .then((r) => r.json())
      .then((j: { ok: boolean; daily?: DailyView; message?: string }) => {
        if (!j.ok || !j.daily) return setError(j.message ?? 'Could not load the Daily Brief.');
        const d = j.daily;
        setDaily(d);
        const n = d.suspects.length;
        const prev = load<Saved>(`unsealed:daily:${d.id}`);
        setS(prev ?? { places: grid(n), objects: grid(n), wrong: 0, status: 'playing', startedAt: Date.now(), seconds: 0, guesses: [] });
      })
      .catch(() => setError('No connection. Please try again.'));
  }, [date]);

  useEffect(() => {
    if (daily && s) save(`unsealed:daily:${daily.id}`, s);
  }, [daily, s]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const history = useMemo(() => load<History>(HISTORY_KEY) ?? {}, [s?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = useCallback(
    (status: 'solved' | 'failed', solution: Solution, wrong: number) => {
      if (!daily) return;
      setS((prev) => {
        if (!prev) return prev;
        const seconds = Math.round((Date.now() - prev.startedAt) / 1000);
        const h = load<History>(HISTORY_KEY) ?? {};
        if (!h[daily.id]) h[daily.id] = { solved: status === 'solved', wrong, seconds };
        save(HISTORY_KEY, h);
        return { ...prev, status, solution, seconds, wrong };
      });
    },
    [daily],
  );

  if (error) return <p role="alert" className="py-20 text-center text-body">{error}</p>;
  if (!daily || !s) return <p role="status" className="py-20 text-center font-mono text-sm tracking-[0.2em] text-muted">OPENING TODAY’S BRIEF…</p>;

  const n = daily.suspects.length;
  const playing = s.status === 'playing';
  const elapsed = playing ? Math.round((now - s.startedAt) / 1000) : s.seconds;
  const tomorrow = Date.parse(`${daily.today}T00:00:00Z`) + 86400000;
  const untilNext = Math.max(0, Math.round((tomorrow - now) / 1000));
  const streak = streakFrom(history, daily.today);

  const cycle = (which: 'places' | 'objects', r: number, c: number) => {
    if (!playing) return;
    setS((prev) => {
      if (!prev) return prev;
      const g = prev[which].map((row) => [...row]);
      g[r]![c] = g[r]![c] === '' ? 'x' : g[r]![c] === 'x' ? 'v' : '';
      return { ...prev, [which]: g };
    });
  };

  const submit = async () => {
    if (who === null || where === null) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/daily', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'answer', date: daily.id, suspect: who, place: where }),
      });
      const j = (await res.json()) as { ok: boolean; correct?: boolean; solution?: Solution; message?: string };
      if (!j.ok) return setMsg(j.message ?? 'Something went wrong.');
      const guesses = [...s.guesses, { suspect: who, place: where }];
      if (j.correct && j.solution) {
        setS({ ...s, guesses });
        finish('solved', j.solution, s.wrong);
        return;
      }
      const wrong = s.wrong + 1;
      if (wrong >= MAX_TRIES) {
        const r = await fetch('/api/daily', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'reveal', date: daily.id }) });
        const rj = (await r.json()) as { solution: Solution };
        setS({ ...s, guesses, wrong });
        finish('failed', rj.solution, wrong);
      } else {
        setS({ ...s, guesses, wrong });
        setMsg(`Not quite. ${MAX_TRIES - wrong} ${MAX_TRIES - wrong === 1 ? 'try' : 'tries'} left.`);
      }
    } catch {
      setMsg('No connection. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const shareText = () => {
    const squares = [...Array(s.wrong)].map(() => '🟥').join('') + (s.status === 'solved' ? '🟩' : '');
    return `UNSEALED Daily #${daily.number} · ${daily.difficultyLabel} · ${daily.city}\n${squares} ${s.status === 'solved' ? `solved in ${mmss(s.seconds)}` : 'case went cold'}\nStreak ${streak}\n${window.location.origin}/daily`;
  };
  const share = async () => {
    const text = shareText();
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      }
    } catch {
      /* cancelled */
    }
  };

  // A render function (not a nested component) so the grid isn't remounted on each tap and keeps keyboard focus.
  const renderGrid = ({ which, cols, label }: { which: 'places' | 'objects'; cols: string[]; label: string }) => (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-xs" aria-label={label}>
        <thead>
          <tr>
            <th scope="col" className="w-20"><span className="sr-only">Suspect</span></th>
            {cols.map((c) => (
              <th key={c} scope="col" className="align-bottom font-semibold leading-tight text-muted">
                <span className="block min-w-14 break-words">{c.replace(/^the /, '')}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {daily.suspects.map((name, r) => (
            <tr key={name}>
              <th scope="row" className="pr-1 text-left text-sm font-bold">{name}</th>
              {cols.map((c, ci) => {
                const m = s[which][r]![ci]!;
                return (
                  <td key={c}>
                    <button
                      type="button"
                      onClick={() => cycle(which, r, ci)}
                      aria-label={`${name}, ${c}: ${m === '' ? 'empty' : m === 'x' ? 'ruled out' : 'confirmed'}`}
                      className={`h-11 w-full min-w-11 rounded-md border text-base font-extrabold ${
                        m === 'v' ? 'border-green-text bg-green/35 text-[#8fd9b0]' : m === 'x' ? 'border-line bg-walnut text-red-text' : 'border-line bg-walnut'
                      }`}
                    >
                      {m === 'v' ? '✓' : m === 'x' ? '✕' : ''}
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
            DAILY BRIEF #{daily.number} · {daily.city.toUpperCase()}
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{daily.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {daily.difficultyLabel} · {n} suspects · {daily.clues.length} clues{daily.id !== daily.today && ` · from ${daily.id}`}
          </p>
        </div>
        <div className="flex gap-2 font-mono text-sm">
          <span className="rounded-full border border-line px-3 py-1.5" aria-label="Time">{mmss(elapsed)}</span>
          <span className="rounded-full border border-line px-3 py-1.5" aria-label="Streak">Streak {streak}</span>
        </div>
      </div>

      <p className="leading-relaxed text-body">{daily.intro}</p>

      <ol className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Clues">
        {daily.clues.map((c, i) => {
          const [tag, ...rest] = c.text.split(' · ');
          return (
            <li key={i} className="rounded-lg bg-paper px-3.5 py-2.5 text-[15px] leading-snug text-ink">
              <span className="font-mono text-xs font-semibold tracking-wide text-[#4a3f35]">{tag}</span>{' '}
              {rest.join(' · ')}
            </li>
          );
        })}
      </ol>

      <section aria-label="Deduction grids" className="flex flex-col gap-4 rounded-2xl border border-line p-3 sm:p-4">
        <p className="text-xs text-faint">Tap a box to cycle: empty → ✕ ruled out → ✓ confirmed. Grids are just for you; they aren’t graded.</p>
        <h2 className="font-mono text-[11px] tracking-[0.15em] text-faint">WHERE WAS EVERYONE?</h2>
        {renderGrid({ which: 'places', cols: daily.places, label: 'Suspects and places' })}
        <h2 className="font-mono text-[11px] tracking-[0.15em] text-faint">WHO HAD WHAT?</h2>
        {renderGrid({ which: 'objects', cols: daily.objects, label: 'Suspects and objects' })}
      </section>

      {playing ? (
        <section aria-label="Your answer" className="flex flex-col gap-4 rounded-2xl border border-line bg-cocoa p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold">{daily.title}</h2>
            <span className="flex gap-1.5" aria-label={`${MAX_TRIES - s.wrong} tries left`}>
              {[...Array(MAX_TRIES)].map((_, i) => (
                <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < s.wrong ? 'bg-line-strong' : 'bg-amber'}`} />
              ))}
            </span>
          </div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Who">
            {daily.suspects.map((name, i) => (
              <button key={name} type="button" role="radio" aria-checked={who === i} onClick={() => setWho(i)}
                className={`min-h-11 rounded-xl border px-4 font-bold ${who === i ? 'border-paper bg-paper text-ink' : 'border-line-strong bg-walnut hover:border-amber'}`}>
                {name}
              </button>
            ))}
          </div>
          <p className="text-sm font-bold">Where were they?</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Where">
            {daily.places.map((p, i) => (
              <button key={p} type="button" role="radio" aria-checked={where === i} onClick={() => setWhere(i)}
                className={`min-h-11 rounded-xl border px-4 text-sm font-bold ${where === i ? 'border-paper bg-paper text-ink' : 'border-line-strong bg-walnut hover:border-amber'}`}>
                {p}
              </button>
            ))}
          </div>
          {msg && <p role="status" className="text-sm font-semibold text-red-soft">{msg}</p>}
          <button type="button" disabled={busy || who === null || where === null} onClick={submit}
            className="h-12 rounded-xl bg-amber font-extrabold text-ink disabled:bg-line-strong disabled:text-body">
            Name who took it
          </button>
        </section>
      ) : (
        <section aria-label="Result" className="flex flex-col gap-4 rounded-2xl border-2 border-amber bg-cocoa p-5">
          <p className={`w-fit -rotate-2 border-2 px-3 py-1 font-mono text-sm tracking-[0.25em] ${s.status === 'solved' ? 'border-green-text text-green-text' : 'border-red-text text-red-text'}`}>
            {s.status === 'solved' ? 'SOLVED' : 'CASE COLD'}
          </p>
          <p className="text-lg font-extrabold">
            {daily.suspects[s.solution!.culprit]} took the {daily.objects[daily.target]}, at {daily.places[s.solution!.place]}.
          </p>
          <p className="text-sm text-muted">
            {s.status === 'solved' ? `Solved in ${mmss(s.seconds)} with ${s.wrong} wrong ${s.wrong === 1 ? 'guess' : 'guesses'}.` : 'Three tries used.'} Streak: {streak}.
          </p>
          <table className="text-sm">
            <thead>
              <tr className="text-left text-faint"><th className="py-1 font-semibold">Who</th><th className="font-semibold">Where</th><th className="font-semibold">Had</th></tr>
            </thead>
            <tbody>
              {s.solution!.rows.map((r) => (
                <tr key={r.suspect} className="border-t border-line">
                  <td className="py-1.5 font-bold">{daily.suspects[r.suspect]}</td>
                  <td>{daily.places[r.place]}</td>
                  <td>{daily.objects[r.object]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={share} className="h-12 rounded-xl border border-line-strong font-extrabold">{copied ? 'Copied!' : 'Share result'}</button>
            <Link href="/play/001-dead-air" className="flex h-12 items-center justify-center rounded-xl bg-amber font-extrabold text-ink">Play a full case</Link>
          </div>
          {daily.id === daily.today && (
            <p className="text-center font-mono text-xs text-faint">Next brief in {Math.floor(untilNext / 3600)}h {String(Math.floor((untilNext % 3600) / 60)).padStart(2, '0')}m</p>
          )}
        </section>
      )}

      {daily.archive.length > 1 && (
        <nav aria-label="Past briefs" className="flex flex-col gap-2">
          <h2 className="font-mono text-[11px] tracking-[0.15em] text-faint">THIS WEEK</h2>
          <div className="flex flex-wrap gap-2">
            {daily.archive.map((d) => {
              const h = history[d];
              return (
                <Link key={d} href={d === daily.today ? '/daily' : `/daily?date=${d}`} aria-current={d === daily.id ? 'page' : undefined}
                  className={`rounded-lg border px-3 py-2 font-mono text-xs ${d === daily.id ? 'border-amber text-amber' : 'border-line text-muted hover:text-paper'}`}>
                  {d.slice(5)} {h ? (h.solved ? '✓' : '✕') : ''}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
