'use client';

import { useMemo, useState } from 'react';
import { buildTimeline, findConflicts, newSession, type CasePublic } from '@unsealed/engine';
import type { CaseView } from '@/lib/view-types';
import type { LocalBoard } from './usePlay';
import { IconWarn } from '@/components/icons';

const hhmm = (at: string) => at.slice(11, 16);

export function TimelinePanel({
  view,
  board,
  onUpdate,
  onOpen,
}: {
  view: CaseView;
  board: LocalBoard;
  onUpdate: (fn: (b: LocalBoard) => LocalBoard) => void;
  onOpen: (id: string) => void;
}) {
  // The timeline only needs the evidence the player can see; build a minimal case for the engine.
  const pubLike = useMemo(() => ({ evidence: view.evidence }) as unknown as CasePublic, [view.evidence]);
  const state = useMemo(() => ({ ...newSession({ id: view.case.id, version: 1 }), read: view.read }), [view.case.id, view.read]);
  const events = useMemo(() => buildTimeline(pubLike, state), [pubLike, state]);
  const conflicts = useMemo(() => findConflicts(pubLike, state, board.placements), [pubLike, state, board.placements]);
  const conflictKeys = new Set(conflicts.flatMap((c) => [`${c.a.at}|${c.a.suspectId}`, `${c.b.at}|${c.b.suspectId}`]));
  const name = (id: string) => view.case.suspects.find((s) => s.id === id)?.short ?? id;

  const [suspectId, setSuspectId] = useState(view.case.suspects[0]?.id ?? '');
  const [time, setTime] = useState('00:30');
  const [place, setPlace] = useState('');

  const placementsByTime = board.placements.map((p) => ({ ...p, key: `${p.at}|${p.suspectId}` }));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-extrabold">The night</h2>
        <p className="text-sm text-muted">Built from {events.length} timestamps in the evidence you’ve read.</p>
      </div>

      {events.length === 0 ? (
        <p className="rounded-xl border border-line p-6 text-center text-muted">Read evidence and its times will appear here.</p>
      ) : (
        <ol className="relative m-0 flex list-none flex-col gap-2 p-0 before:absolute before:bottom-0 before:left-[61px] before:top-0 before:w-0.5 before:bg-line">
          {events.map((ev, i) => {
            const flagged = ev.suspectIds.some((s) => conflictKeys.has(`${ev.at}|${s}`));
            return (
              <li key={i} className="relative grid grid-cols-[48px_28px_1fr] items-center">
                <span className={`font-mono text-xs ${flagged ? 'text-amber' : 'text-muted'}`}>{hhmm(ev.at)}</span>
                <span className={`h-2.5 w-2.5 justify-self-center rounded-full ${flagged ? 'bg-amber' : 'bg-muted'}`} aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => onOpen(ev.evidenceId)}
                  className={`rounded-lg px-3 py-2 text-left text-sm ${flagged ? 'border border-amber bg-line' : 'bg-walnut hover:bg-line'}`}
                >
                  {flagged && (
                    <span className="mb-1 flex items-center gap-1.5 text-xs font-bold text-amber-soft">
                      <IconWarn className="h-3.5 w-3.5" /> Conflict in this window
                    </span>
                  )}
                  {ev.label}
                  {ev.place && <span className="text-faint"> · {ev.place}</span>}
                  <span className="block text-[11px] text-faint">from {view.evidence.find((e) => e.id === ev.evidenceId)?.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}

      <section className="rounded-2xl border border-line bg-cocoa p-4">
        <h3 className="font-extrabold">Place a suspect</h3>
        <p className="mt-1 text-sm text-muted">Where do you think someone was? Clashes with the evidence light up in amber.</p>
        <form
          className="mt-3 grid gap-2 sm:grid-cols-[1fr_110px_1fr_auto]"
          onSubmit={(ev) => {
            ev.preventDefault();
            if (!place.trim() || !/^\d{2}:\d{2}$/.test(time)) return;
            // Cases happen over one night: afternoon/evening times belong to the first date, small hours to the next.
            const shift = (d: string, n: number) => {
              const x = new Date(`${d}T00:00:00Z`);
              x.setUTCDate(x.getUTCDate() + n);
              return x.toISOString().slice(0, 10);
            };
            const evening = events.find((e) => hhmm(e.at) >= '12:00')?.at.slice(0, 10);
            const first = evening ?? shift(events[0]?.at.slice(0, 10) ?? new Date().toISOString().slice(0, 10), -1);
            const day = time >= '12:00' ? first : shift(first, 1);
            onUpdate((b) => ({ ...b, placements: [...b.placements, { suspectId, at: `${day}T${time}`, place: place.trim() }] }));
            setPlace('');
          }}
        >
          <label className="sr-only" htmlFor="tl-suspect">Suspect</label>
          <select id="tl-suspect" value={suspectId} onChange={(e) => setSuspectId(e.target.value)} className="h-11 rounded-lg border border-line bg-walnut px-2 text-sm">
            {view.case.suspects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="tl-time">Time</label>
          <input id="tl-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-11 rounded-lg border border-line bg-walnut px-2 text-sm" />
          <label className="sr-only" htmlFor="tl-place">Place</label>
          <input id="tl-place" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Place, e.g. Studio B" className="h-11 rounded-lg border border-line bg-walnut px-3 text-sm placeholder:text-faint" />
          <button type="submit" className="h-11 rounded-lg bg-amber px-4 text-sm font-extrabold text-ink">Place</button>
        </form>
        {placementsByTime.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1 text-sm">
            {placementsByTime.map((p, i) => (
              <li key={i} className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 ${conflictKeys.has(p.key) ? 'border border-amber' : 'bg-walnut'}`}>
                <span>
                  <span className="font-mono text-xs text-muted">{hhmm(p.at)}</span> {name(p.suspectId)} · {p.place}
                </span>
                <button
                  type="button"
                  aria-label="Remove placement"
                  onClick={() => onUpdate((b) => ({ ...b, placements: b.placements.filter((_, j) => j !== i) }))}
                  className="px-2 text-faint hover:text-paper"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
