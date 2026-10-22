'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import type { Relation } from '@unsealed/engine';
import type { CaseView } from '@/lib/view-types';
import type { LocalBoard } from './usePlay';

const RELATIONS: { id: Relation; label: string; help: string }[] = [
  { id: 'contradiction', label: 'Contradiction', help: 'They can’t both be true' },
  { id: 'corroboration', label: 'Corroboration', help: 'One confirms the other' },
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
  onUpdate: (fn: (b: LocalBoard) => LocalBoard) => void;
  onCheck: (a: string, b: string, r: Relation) => Promise<boolean | null>;
  onOpen: (id: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [relation, setRelation] = useState<Relation | null>(null);
  const [centers, setCenters] = useState<Record<string, Point>>({});
  const boxRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const pinned = board.pins.map((id) => view.evidence.find((e) => e.id === id)).filter((e) => e !== undefined);
  const active = view.status === 'active';

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => {
      const base = box.getBoundingClientRect();
      const next: Record<string, Point> = {};
      for (const [id, el] of Object.entries(cardRefs.current)) {
        if (!el) continue;
        const r = el.getBoundingClientRect();
        next[id] = { x: r.left - base.left + r.width / 2, y: r.top - base.top + 10 };
      }
      setCenters(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [board.pins.join(','), view.strings.length]);

  const toggleSelect = (id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 2 ? [s[1]!, id] : [...s, id]));
  };
  const title = (id: string) => {
    const e = view.evidence.find((x) => x.id === id);
    return e ? `${String(e.number).padStart(2, '0')} ${e.title}` : id;
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
              {view.breakthroughs.length}/{view.case.totalBreakthroughs} breakthroughs
            </span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Suspects (tap to cross off)">
        {view.case.suspects.map((s) => {
          const crossed = board.crossed.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={crossed}
              onClick={() =>
                onUpdate((b) => ({ ...b, crossed: crossed ? b.crossed.filter((x) => x !== s.id) : [...b.crossed, s.id] }))
              }
              className={`rounded-full border px-3 py-1.5 text-sm font-bold ${crossed ? 'border-line text-faint line-through' : 'border-line-strong text-paper'}`}
            >
              {s.short}
            </button>
          );
        })}
      </div>

      <div ref={boxRef} className="relative min-h-[260px] rounded-xl border-[6px] border-[#3a2a1e] bg-[#9a6b43] p-4">
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          {view.strings.map((s, i) => {
            const a = centers[s.a];
            const b = centers[s.b];
            if (!a || !b) return null;
            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={s.valid ? '#E8B83A' : '#C2412D'} strokeWidth={s.valid ? 3 : 2.5} opacity={0.95} />;
          })}
          {selected.length === 2 && centers[selected[0]!] && centers[selected[1]!] && (
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
            Pin evidence from the file. Then tap two cards and tie a red string between them.
          </p>
        ) : (
          <ul className="relative grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
            {pinned.map((e, i) => {
              const sel = selected.includes(e.id);
              return (
                <li key={e.id} style={{ transform: `rotate(${[-2, 1.5, -1, 2, -1.5][i % 5]}deg)` }}>
                  <button
                    ref={(el) => {
                      cardRefs.current[e.id] = el;
                    }}
                    type="button"
                    onClick={() => toggleSelect(e.id)}
                    aria-pressed={sel}
                    className={`relative w-full bg-paper px-3 pb-3 pt-4 text-left text-ink shadow-[0_6px_14px_rgba(0,0,0,0.35)] ${sel ? 'ring-4 ring-amber' : ''}`}
                  >
                    <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-red" aria-hidden="true" />
                    <span className="block font-mono text-[10px] text-[#5c4f42]">{String(e.number).padStart(2, '0')}</span>
                    <span className="block text-[13px] font-extrabold leading-snug">{e.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {active && (
        <section aria-label="Check a string" className="rounded-2xl border border-line bg-cocoa p-4">
          <h3 className="font-extrabold">How are these connected?</h3>
          <p className="mt-1 text-sm text-muted">
            {selected.length === 2 ? `${title(selected[0]!)}  ↔  ${title(selected[1]!)}` : `Select two cards on the board (${selected.length}/2).`}
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Relation">
            {RELATIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={relation === r.id}
                onClick={() => setRelation(r.id)}
                className={`rounded-xl border px-3 py-2.5 text-left ${relation === r.id ? 'border-2 border-amber bg-line' : 'border-line-strong'}`}
              >
                <span className="block text-sm font-extrabold">{r.label}</span>
                <span className="block text-xs text-muted">{r.help}</span>
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
          <h3 className="font-mono text-[11px] tracking-[0.15em] text-faint">BREAKTHROUGHS</h3>
          {view.breakthroughs.map((b) => (
            <div key={b.id} className="rounded-xl border border-amber bg-line p-3 text-sm leading-relaxed">
              <span className="font-mono text-xs font-semibold text-amber">{b.id}</span> {b.insight}
            </div>
          ))}
        </section>
      )}

      {view.strings.some((s) => !s.valid) && (
        <section aria-label="Strings with no link" className="flex flex-col gap-1">
          <h3 className="font-mono text-[11px] tracking-[0.15em] text-faint">NO LINK FOUND</h3>
          {view.strings
            .filter((s) => !s.valid)
            .map((s, i) => (
              <p key={i} className="text-sm text-muted">
                <button type="button" className="underline-offset-2 hover:underline" onClick={() => onOpen(s.a)}>{title(s.a)}</button> ↔{' '}
                <button type="button" className="underline-offset-2 hover:underline" onClick={() => onOpen(s.b)}>{title(s.b)}</button> · {s.relation}
              </p>
            ))}
        </section>
      )}

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-muted">
        My notes
        <textarea
          value={board.notes}
          onChange={(ev) => onUpdate((b) => ({ ...b, notes: ev.target.value.slice(0, 5000) }))}
          placeholder="Times, lies, who had the code…"
          rows={5}
          className="rounded-xl border border-line bg-paper p-3 font-normal text-ink placeholder:text-[#8a7c69]"
        />
      </label>
    </div>
  );
}
