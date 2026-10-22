'use client';

import { useMemo, useState } from 'react';
import {
  buildTimeline,
  findConflicts,
  newSession,
  type CasePublic,
} from '@unsealed/engine';
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
  onUpdate: (fn: (board: LocalBoard) => LocalBoard) => void;
  onOpen: (id: string) => void;
}) {
  // The timeline only needs the evidence the player can see; build a minimal case for the engine.
  const pubLike = useMemo(
    () => ({ evidence: view.evidence }) as unknown as CasePublic,
    [view.evidence],
  );
  const state = useMemo(
    () => ({
      ...newSession({ id: view.case.id, version: 1 }),
      read: view.read,
    }),
    [view.case.id, view.read],
  );
  const events = useMemo(() => buildTimeline(pubLike, state), [pubLike, state]);
  const conflicts = useMemo(
    () => findConflicts(pubLike, state, board.placements),
    [pubLike, state, board.placements],
  );
  const conflictKeys = new Set(
    conflicts.flatMap((conflict) => [
      `${conflict.a.at}|${conflict.a.suspectId}`,
      `${conflict.b.at}|${conflict.b.suspectId}`,
    ]),
  );
  const name = (id: string) =>
    view.case.suspects.find((suspect) => suspect.id === id)?.short ?? id;

  const [suspectId, setSuspectId] = useState(view.case.suspects[0]?.id ?? '');
  const [time, setTime] = useState('00:30');
  const [place, setPlace] = useState('');

  const placementsByTime = board.placements.map((placement) => ({
    ...placement,
    key: `${placement.at}|${placement.suspectId}`,
  }));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-extrabold">The night</h2>
        <p className="text-sm text-muted">
          Built from {events.length} timestamps in the evidence you’ve read.
        </p>
      </div>

      {events.length === 0 ? (
        <p className="rounded-xl border border-line p-6 text-center text-muted">
          Read evidence and its times will appear here.
        </p>
      ) : (
        <ol className="relative m-0 flex list-none flex-col gap-2 p-0 before:absolute before:bottom-0 before:left-[61px] before:top-0 before:w-0.5 before:bg-line">
          {events.map((ev, index) => {
            const flagged = ev.suspectIds.some((suspectId) =>
              conflictKeys.has(`${ev.at}|${suspectId}`),
            );
            return (
              <li
                key={index}
                className="relative grid grid-cols-[48px_28px_1fr] items-center"
              >
                <span
                  className={`font-mono text-xs ${flagged ? 'text-amber' : 'text-muted'}`}
                >
                  {hhmm(ev.at)}
                </span>
                <span
                  className={`h-2.5 w-2.5 justify-self-center rounded-full ${flagged ? 'bg-amber' : 'bg-muted'}`}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  onClick={() => onOpen(ev.evidenceId)}
                  className={`rounded-lg px-3 py-2 text-left text-sm ${flagged ? 'border border-amber bg-line' : 'bg-walnut hover:bg-line'}`}
                >
                  {flagged && (
                    <span className="mb-1 flex items-center gap-1.5 text-xs font-bold text-amber-soft">
                      <IconWarn className="h-3.5 w-3.5" /> Conflict in this
                      window
                    </span>
                  )}
                  {ev.label}
                  {ev.place && (
                    <span className="text-faint"> · {ev.place}</span>
                  )}
                  <span className="block text-[11px] text-faint">
                    from{' '}
                    {
                      view.evidence.find(
                        (evidence) => evidence.id === ev.evidenceId,
                      )?.title
                    }
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}

      <section className="rounded-2xl border border-line bg-cocoa p-4">
        <h3 className="font-extrabold">Place a suspect</h3>
        <p className="mt-1 text-sm text-muted">
          Where do you think someone was? Clashes with the evidence light up in
          amber.
        </p>
        <form
          className="mt-3 grid gap-2 sm:grid-cols-[1fr_110px_1fr_auto]"
          onSubmit={(ev) => {
            ev.preventDefault();
            if (!place.trim() || !/^\d{2}:\d{2}$/.test(time)) return;
            // Cases happen over one night: afternoon/evening times belong to the first date, small hours to the next.
            const shift = (isoDate: string, days: number) => {
              const shifted = new Date(`${isoDate}T00:00:00Z`);
              shifted.setUTCDate(shifted.getUTCDate() + days);
              return shifted.toISOString().slice(0, 10);
            };
            const evening = events
              .find((timelineEvent) => hhmm(timelineEvent.at) >= '12:00')
              ?.at.slice(0, 10);
            const first =
              evening ??
              shift(
                events[0]?.at.slice(0, 10) ??
                  new Date().toISOString().slice(0, 10),
                -1,
              );
            const day = time >= '12:00' ? first : shift(first, 1);
            onUpdate((board) => ({
              ...board,
              placements: [
                ...board.placements,
                { suspectId, at: `${day}T${time}`, place: place.trim() },
              ],
            }));
            setPlace('');
          }}
        >
          <label className="sr-only" htmlFor="tl-suspect">
            Suspect
          </label>
          <select
            id="tl-suspect"
            value={suspectId}
            onChange={(event) => setSuspectId(event.target.value)}
            className="h-11 rounded-lg border border-line bg-walnut px-2 text-sm"
          >
            {view.case.suspects.map((suspect) => (
              <option key={suspect.id} value={suspect.id}>
                {suspect.name}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="tl-time">
            Time
          </label>
          <input
            id="tl-time"
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="h-11 rounded-lg border border-line bg-walnut px-2 text-sm"
          />
          <label className="sr-only" htmlFor="tl-place">
            Place
          </label>
          <input
            id="tl-place"
            value={place}
            onChange={(event) => setPlace(event.target.value)}
            placeholder="Place, e.g. Studio B"
            className="h-11 rounded-lg border border-line bg-walnut px-3 text-sm placeholder:text-faint"
          />
          <button
            type="submit"
            className="h-11 rounded-lg bg-amber px-4 text-sm font-extrabold text-ink"
          >
            Place
          </button>
        </form>
        {placementsByTime.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1 text-sm">
            {placementsByTime.map((placement, index) => (
              <li
                key={index}
                className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 ${conflictKeys.has(placement.key) ? 'border border-amber' : 'bg-walnut'}`}
              >
                <span>
                  <span className="font-mono text-xs text-muted">
                    {hhmm(placement.at)}
                  </span>{' '}
                  {name(placement.suspectId)} · {placement.place}
                </span>
                <button
                  type="button"
                  aria-label="Remove placement"
                  onClick={() =>
                    onUpdate((board) => ({
                      ...board,
                      placements: board.placements.filter(
                        (_, placementIndex) => placementIndex !== index,
                      ),
                    }))
                  }
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
