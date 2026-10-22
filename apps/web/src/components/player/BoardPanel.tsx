'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import type { Relation } from '@unsealed/engine';
import type { CaseView } from '@/lib/view-types';
import type { LocalBoard } from './usePlay';

const RELATIONS: { id: Relation; label: string; help: string }[] = [
  {
    id: 'contradiction',
    label: 'Contradiction',
    help: 'They can’t both be true',
  },
  {
    id: 'corroboration',
    label: 'Corroboration',
    help: 'One confirms the other',
  },
  { id: 'link', label: 'Link', help: 'Same person, thing or place' },
];

type Point = { x: number; y: number };

export function BoardPanel({
  view,
  board,
  busy,
  onUpdate,
  onCheck,
  onOpen,
}: {
  view: CaseView;
  board: LocalBoard;
  busy: boolean;
  onUpdate: (fn: (board: LocalBoard) => LocalBoard) => void;
  onCheck: (
    firstId: string,
    secondId: string,
    relation: Relation,
  ) => Promise<boolean | null>;
  onOpen: (id: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [relation, setRelation] = useState<Relation | null>(null);
  const [centers, setCenters] = useState<Record<string, Point>>({});
  const boxRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const pinned = board.pins
    .map((id) => view.evidence.find((evidence) => evidence.id === id))
    .filter((evidence) => evidence !== undefined);
  const active = view.status === 'active';

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => {
      const base = box.getBoundingClientRect();
      const next: Record<string, Point> = {};
      for (const [id, el] of Object.entries(cardRefs.current)) {
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        next[id] = {
          x: rect.left - base.left + rect.width / 2,
          y: rect.top - base.top + 10,
        };
      }
      setCenters(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [board.pins.join(','), view.strings.length]);

  const toggleSelect = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : current.length >= 2
          ? [current[1]!, id]
          : [...current, id],
    );
  };
  const title = (id: string) => {
    const evidence = view.evidence.find((evidence) => evidence.id === id);
    return evidence
      ? `${String(evidence.number).padStart(2, '0')} ${evidence.title}`
      : id;
  };

  async function check() {
    if (selected.length !== 2 || !relation) return;
    const ok = await onCheck(selected[0]!, selected[1]!, relation);
    if (ok !== null) {
      setSelected([]);
      setRelation(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-extrabold">Detective board</h2>
          <p className="text-sm text-muted">
            {pinned.length} pinned ·{' '}
            <span className="font-bold text-amber">
              {view.breakthroughs.length}/{view.case.totalBreakthroughs}{' '}
              breakthroughs
            </span>
          </p>
        </div>
      </div>

      <div
        className="flex flex-wrap gap-2"
        aria-label="Suspects (tap to cross off)"
      >
        {view.case.suspects.map((suspect) => {
          const crossed = board.crossed.includes(suspect.id);
          return (
            <button
              key={suspect.id}
              type="button"
              aria-pressed={crossed}
              onClick={() =>
                onUpdate((board) => ({
                  ...board,
                  crossed: crossed
                    ? board.crossed.filter(
                        (crossedId) => crossedId !== suspect.id,
                      )
                    : [...board.crossed, suspect.id],
                }))
              }
              className={`rounded-full border px-3 py-1.5 text-sm font-bold ${crossed ? 'border-line text-faint line-through' : 'border-line-strong text-paper'}`}
            >
              {suspect.short}
            </button>
          );
        })}
      </div>

      <div
        ref={boxRef}
        className="relative min-h-[260px] rounded-xl border-[6px] border-[#3a2a1e] bg-[#9a6b43] p-4"
      >
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {view.strings.map((breakthrough, index) => {
            const fromPoint = centers[breakthrough.a];
            const toPoint = centers[breakthrough.b];
            if (!fromPoint || !toPoint) return null;
            return (
              <line
                key={index}
                x1={fromPoint.x}
                y1={fromPoint.y}
                x2={toPoint.x}
                y2={toPoint.y}
                stroke={breakthrough.valid ? '#E8B83A' : '#C2412D'}
                strokeWidth={breakthrough.valid ? 3 : 2.5}
                opacity={0.95}
              />
            );
          })}
          {selected.length === 2 &&
            centers[selected[0]!] &&
            centers[selected[1]!] && (
              <line
                x1={centers[selected[0]!]!.x}
                y1={centers[selected[0]!]!.y}
                x2={centers[selected[1]!]!.x}
                y2={centers[selected[1]!]!.y}
                stroke="#F3EBDD"
                strokeWidth={2.5}
                strokeDasharray="6 5"
              />
            )}
        </svg>
        {pinned.length === 0 ? (
          <p className="relative py-16 text-center font-semibold text-ink">
            Pin evidence from the file. Then tap two cards and tie a red string
            between them.
          </p>
        ) : (
          <ul className="relative grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
            {pinned.map((evidence, index) => {
              const sel = selected.includes(evidence.id);
              return (
                <li
                  key={evidence.id}
                  style={{
                    transform: `rotate(${[-2, 1.5, -1, 2, -1.5][index % 5]}deg)`,
                  }}
                >
                  <button
                    ref={(el) => {
                      cardRefs.current[evidence.id] = el;
                    }}
                    type="button"
                    onClick={() => toggleSelect(evidence.id)}
                    aria-pressed={sel}
                    className={`relative w-full bg-paper px-3 pb-3 pt-4 text-left text-ink shadow-[0_6px_14px_rgba(0,0,0,0.35)] ${sel ? 'ring-4 ring-amber' : ''}`}
                  >
                    <span
                      className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-red"
                      aria-hidden="true"
                    />
                    <span className="block font-mono text-[10px] text-[#5c4f42]">
                      {String(evidence.number).padStart(2, '0')}
                    </span>
                    <span className="block text-[13px] font-extrabold leading-snug">
                      {evidence.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {active && (
        <section
          aria-label="Check a string"
          className="rounded-2xl border border-line bg-cocoa p-4"
        >
          <h3 className="font-extrabold">How are these connected?</h3>
          <p className="mt-1 text-sm text-muted">
            {selected.length === 2
              ? `${title(selected[0]!)}  ↔  ${title(selected[1]!)}`
              : `Select two cards on the board (${selected.length}/2).`}
          </p>
          <div
            className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3"
            role="radiogroup"
            aria-label="Relation"
          >
            {RELATIONS.map((relationOption) => (
              <button
                key={relationOption.id}
                type="button"
                role="radio"
                aria-checked={relation === relationOption.id}
                onClick={() => setRelation(relationOption.id)}
                className={`rounded-xl border px-3 py-2.5 text-left ${relation === relationOption.id ? 'border-2 border-amber bg-line' : 'border-line-strong'}`}
              >
                <span className="block text-sm font-extrabold">
                  {relationOption.label}
                </span>
                <span className="block text-xs text-muted">
                  {relationOption.help}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={busy || selected.length !== 2 || !relation}
            onClick={check}
            className="mt-3 h-12 w-full rounded-xl bg-amber font-extrabold text-ink disabled:bg-line-strong disabled:text-body"
          >
            Check the string · costs 10 min
          </button>
        </section>
      )}

      {view.breakthroughs.length > 0 && (
        <section aria-label="Breakthroughs" className="flex flex-col gap-2">
          <h3 className="font-mono text-[11px] tracking-[0.15em] text-faint">
            BREAKTHROUGHS
          </h3>
          {view.breakthroughs.map((breakthrough) => (
            <div
              key={breakthrough.id}
              className="rounded-xl border border-amber bg-line p-3 text-sm leading-relaxed"
            >
              <span className="font-mono text-xs font-semibold text-amber">
                {breakthrough.id}
              </span>{' '}
              {breakthrough.insight}
            </div>
          ))}
        </section>
      )}

      {view.strings.some((breakthrough) => !breakthrough.valid) && (
        <section
          aria-label="Strings with no link"
          className="flex flex-col gap-1"
        >
          <h3 className="font-mono text-[11px] tracking-[0.15em] text-faint">
            NO LINK FOUND
          </h3>
          {view.strings
            .filter((breakthrough) => !breakthrough.valid)
            .map((breakthrough, index) => (
              <p key={index} className="text-sm text-muted">
                <button
                  type="button"
                  className="underline-offset-2 hover:underline"
                  onClick={() => onOpen(breakthrough.a)}
                >
                  {title(breakthrough.a)}
                </button>{' '}
                ↔{' '}
                <button
                  type="button"
                  className="underline-offset-2 hover:underline"
                  onClick={() => onOpen(breakthrough.b)}
                >
                  {title(breakthrough.b)}
                </button>{' '}
                · {breakthrough.relation}
              </p>
            ))}
        </section>
      )}

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-muted">
        My notes
        <textarea
          value={board.notes}
          onChange={(ev) =>
            onUpdate((board) => ({
              ...board,
              notes: ev.target.value.slice(0, 5000),
            }))
          }
          placeholder="Times, lies, who had the code…"
          rows={5}
          className="rounded-xl border border-line bg-paper p-3 font-normal text-ink placeholder:text-[#8a7c69]"
        />
      </label>
    </div>
  );
}
