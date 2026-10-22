'use client';

import { useState } from 'react';
import type { CaseView, PlayAction } from '@/lib/view-types';

type Answer = Extract<PlayAction, { type: 'verdict' }>['answer'];

export function VerdictPanel({
  view,
  busy,
  onSubmit,
  lastResult,
}: {
  view: CaseView;
  busy: boolean;
  onSubmit: (a: Answer) => void;
  lastResult: { correctSections: number; accusationsLeft: number } | null;
}) {
  const v = view.case.verdict;
  const [who, setWho] = useState<Record<string, string>>({});
  const [how, setHow] = useState<Record<string, string>>({});
  const [why, setWhy] = useState<Record<string, string>>({});
  const [proof, setProof] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [filter, setFilter] = useState('');

  const complete =
    v.who.every((b) => who[b.blankId]) &&
    v.how.every((b) => how[b.blankId]) &&
    v.why.every((b) => why[b.blankId]) &&
    proof.length === v.proofCount;

  const last = lastResult ?? (view.accusations.length ? { correctSections: view.accusations.at(-1)!.correctSections, accusationsLeft: view.accusationsLeft } : null);

  const blankGroup = (
    title: string,
    blanks: CaseView['case']['verdict']['how'],
    value: Record<string, string>,
    set: (f: (x: Record<string, string>) => Record<string, string>) => void,
  ) => (
    <fieldset className="flex flex-col gap-4 rounded-2xl border border-line p-4">
      <legend className="px-1 font-mono text-[11px] tracking-[0.15em] text-faint">{title}</legend>
      {blanks.map((b) => (
        <div key={b.blankId} className="flex flex-col gap-2">
          <p className="font-extrabold">{b.prompt}</p>
          {b.options.length === 0 ? (
            <p className="text-sm text-muted">You haven’t discovered any answers for this yet. Keep reading.</p>
          ) : (
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={b.prompt}>
              {b.options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={value[b.blankId] === o.id}
                  onClick={() => set((x) => ({ ...x, [b.blankId]: o.id }))}
                  className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-semibold ${
                    value[b.blankId] === o.id ? 'border-paper bg-paper text-ink' : 'border-line-strong bg-walnut text-paper hover:border-amber'
                  }`}
                >
                  {o.text}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      <p className="text-xs text-faint">More options appear as you discover them in the file.</p>
    </fieldset>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-extrabold">Your verdict</h2>
        <span className="flex items-center gap-1.5 text-sm text-muted" aria-label={`${view.accusationsLeft} accusations left`}>
          Accusations
          {Array.from({ length: 3 }, (_, i) => (
            <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < 3 - view.accusationsLeft ? 'bg-line-strong' : 'bg-amber'}`} />
          ))}
        </span>
      </div>

      {last && (
        <div role="status" className="flex items-center gap-4 rounded-2xl border border-line-strong bg-walnut p-4">
          <span className="font-mono text-3xl font-semibold text-amber">{last.correctSections}/4</span>
          <span className="text-sm leading-relaxed text-body">
            Last accusation: {last.correctSections} of 4 sections fully correct. We won’t say which. {last.accusationsLeft} left.
          </span>
        </div>
      )}

      <fieldset className="flex flex-col gap-3 rounded-2xl border border-line p-4">
        <legend className="px-1 font-mono text-[11px] tracking-[0.15em] text-faint">WHO</legend>
        {v.who.map((b) => (
          <div key={b.blankId} className="flex flex-col gap-2">
            <p className="font-extrabold">{b.prompt}</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={b.prompt}>
              {view.case.suspects.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={who[b.blankId] === s.id}
                  onClick={() => setWho((x) => ({ ...x, [b.blankId]: s.id }))}
                  className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm ${
                    who[b.blankId] === s.id ? 'border-paper bg-paper text-ink' : 'border-line-strong bg-walnut hover:border-amber'
                  }`}
                >
                  <span className="block font-extrabold">{s.name}</span>
                  <span className={`block text-xs ${who[b.blankId] === s.id ? 'text-[#4a3f35]' : 'text-muted'}`}>{s.role}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </fieldset>

      {blankGroup('HOW', v.how, how, setHow)}
      {blankGroup('WHY', v.why, why, setWhy)}

      <fieldset className="flex flex-col gap-3 rounded-2xl border border-line p-4">
        <legend className="px-1 font-mono text-[11px] tracking-[0.15em] text-faint">PROOF</legend>
        <p className="font-extrabold">
          Pin the {v.proofCount} pieces of evidence that prove it <span className="font-mono text-sm text-amber">({proof.length}/{v.proofCount})</span>
        </p>
        <label className="sr-only" htmlFor="proof-filter">Filter evidence</label>
        <input
          id="proof-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter evidence…"
          className="h-10 rounded-lg border border-line bg-walnut px-3 text-sm placeholder:text-faint"
        />
        <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
          {view.evidence
            .filter((e) => e.title.toLowerCase().includes(filter.toLowerCase()))
            .sort((a, b) => a.number - b.number)
            .map((e) => {
              const on = proof.includes(e.id);
              const full = !on && proof.length >= v.proofCount;
              return (
                <li key={e.id}>
                  <label className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm ${on ? 'bg-line' : 'hover:bg-walnut'} ${full ? 'opacity-50' : ''}`}>
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={full}
                      onChange={() => setProof((p) => (on ? p.filter((x) => x !== e.id) : [...p, e.id]))}
                      className="h-4 w-4 accent-amber"
                    />
                    <span className="w-6 font-mono text-xs text-faint">{String(e.number).padStart(2, '0')}</span>
                    {e.title}
                  </label>
                </li>
              );
            })}
        </ul>
      </fieldset>

      {confirming ? (
        <div className="rounded-2xl border-2 border-amber bg-cocoa p-4">
          <p className="font-extrabold">Accuse now?</p>
          <p className="mt-1 text-sm text-body">This uses 1 of your {view.accusationsLeft} remaining accusations.</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onSubmit({ who, how, why, proof });
                setConfirming(false);
              }}
              className="h-12 flex-1 rounded-xl bg-amber font-extrabold text-ink"
            >
              Submit accusation
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="h-12 rounded-xl border border-line-strong px-5 font-bold">
              Not yet
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={!complete || busy}
          onClick={() => setConfirming(true)}
          className="h-14 rounded-xl bg-amber text-base font-extrabold text-ink disabled:bg-line-strong disabled:text-body"
        >
          {complete ? 'Accuse' : 'Fill every blank to accuse'}
        </button>
      )}
    </div>
  );
}
