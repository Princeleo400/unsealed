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
  onSubmit: (answer: Answer) => void;
  lastResult: { correctSections: number; accusationsLeft: number } | null;
}) {
  const verdict = view.case.verdict;
  const [who, setWho] = useState<Record<string, string>>({});
  const [how, setHow] = useState<Record<string, string>>({});
  const [why, setWhy] = useState<Record<string, string>>({});
  const [proof, setProof] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [filter, setFilter] = useState('');

  const complete =
    verdict.who.every((blank) => who[blank.blankId]) &&
    verdict.how.every((blank) => how[blank.blankId]) &&
    verdict.why.every((blank) => why[blank.blankId]) &&
    proof.length === verdict.proofCount;

  const last =
    lastResult ??
    (view.accusations.length
      ? {
          correctSections: view.accusations.at(-1)!.correctSections,
          accusationsLeft: view.accusationsLeft,
        }
      : null);

  const blankGroup = (
    title: string,
    blanks: CaseView['case']['verdict']['how'],
    value: Record<string, string>,
    set: (
      update: (current: Record<string, string>) => Record<string, string>,
    ) => void,
  ) => (
    <fieldset className="flex flex-col gap-4 rounded-2xl border border-line p-4">
      <legend className="px-1 font-mono text-[11px] tracking-[0.15em] text-faint">
        {title}
      </legend>
      {blanks.map((blank) => (
        <div key={blank.blankId} className="flex flex-col gap-2">
          <p className="font-extrabold">{blank.prompt}</p>
          {blank.options.length === 0 ? (
            <p className="text-sm text-muted">
              You haven’t discovered any answers for this yet. Keep reading.
            </p>
          ) : (
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label={blank.prompt}
            >
              {blank.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={value[blank.blankId] === option.id}
                  onClick={() =>
                    set((current) => ({
                      ...current,
                      [blank.blankId]: option.id,
                    }))
                  }
                  className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-semibold ${
                    value[blank.blankId] === option.id
                      ? 'border-paper bg-paper text-ink'
                      : 'border-line-strong bg-walnut text-paper hover:border-amber'
                  }`}
                >
                  {option.text}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      <p className="text-xs text-faint">
        More options appear as you discover them in the file.
      </p>
    </fieldset>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-extrabold">Your verdict</h2>
        <span
          className="flex items-center gap-1.5 text-sm text-muted"
          aria-label={`${view.accusationsLeft} accusations left`}
        >
          Accusations
          {Array.from({ length: 3 }, (_, index) => (
            <span
              key={index}
              className={`h-2.5 w-2.5 rounded-full ${index < 3 - view.accusationsLeft ? 'bg-line-strong' : 'bg-amber'}`}
            />
          ))}
        </span>
      </div>

      {last && (
        <div
          role="status"
          className="flex items-center gap-4 rounded-2xl border border-line-strong bg-walnut p-4"
        >
          <span className="font-mono text-3xl font-semibold text-amber">
            {last.correctSections}/4
          </span>
          <span className="text-sm leading-relaxed text-body">
            Last accusation: {last.correctSections} of 4 sections fully correct.
            We won’t say which. {last.accusationsLeft} left.
          </span>
        </div>
      )}

      <fieldset className="flex flex-col gap-3 rounded-2xl border border-line p-4">
        <legend className="px-1 font-mono text-[11px] tracking-[0.15em] text-faint">
          WHO
        </legend>
        {verdict.who.map((blank) => (
          <div key={blank.blankId} className="flex flex-col gap-2">
            <p className="font-extrabold">{blank.prompt}</p>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label={blank.prompt}
            >
              {view.case.suspects.map((suspect) => (
                <button
                  key={suspect.id}
                  type="button"
                  role="radio"
                  aria-checked={who[blank.blankId] === suspect.id}
                  onClick={() =>
                    setWho((current) => ({
                      ...current,
                      [blank.blankId]: suspect.id,
                    }))
                  }
                  className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm ${
                    who[blank.blankId] === suspect.id
                      ? 'border-paper bg-paper text-ink'
                      : 'border-line-strong bg-walnut hover:border-amber'
                  }`}
                >
                  <span className="block font-extrabold">{suspect.name}</span>
                  <span
                    className={`block text-xs ${who[blank.blankId] === suspect.id ? 'text-[#4a3f35]' : 'text-muted'}`}
                  >
                    {suspect.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </fieldset>

      {blankGroup('HOW', verdict.how, how, setHow)}
      {blankGroup('WHY', verdict.why, why, setWhy)}

      <fieldset className="flex flex-col gap-3 rounded-2xl border border-line p-4">
        <legend className="px-1 font-mono text-[11px] tracking-[0.15em] text-faint">
          PROOF
        </legend>
        <p className="font-extrabold">
          Pin the {verdict.proofCount} pieces of evidence that prove it{' '}
          <span className="font-mono text-sm text-amber">
            ({proof.length}/{verdict.proofCount})
          </span>
        </p>
        <label className="sr-only" htmlFor="proof-filter">
          Filter evidence
        </label>
        <input
          id="proof-filter"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter evidence…"
          className="h-10 rounded-lg border border-line bg-walnut px-3 text-sm placeholder:text-faint"
        />
        <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
          {view.evidence
            .filter((evidence) =>
              evidence.title.toLowerCase().includes(filter.toLowerCase()),
            )
            .sort((first, second) => first.number - second.number)
            .map((evidence) => {
              const on = proof.includes(evidence.id);
              const full = !on && proof.length >= verdict.proofCount;
              return (
                <li key={evidence.id}>
                  <label
                    className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm ${on ? 'bg-line' : 'hover:bg-walnut'} ${full ? 'opacity-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={full}
                      onChange={() =>
                        setProof((current) =>
                          on
                            ? current.filter(
                                (evidenceId) => evidenceId !== evidence.id,
                              )
                            : [...current, evidence.id],
                        )
                      }
                      className="h-4 w-4 accent-amber"
                    />
                    <span className="w-6 font-mono text-xs text-faint">
                      {String(evidence.number).padStart(2, '0')}
                    </span>
                    {evidence.title}
                  </label>
                </li>
              );
            })}
        </ul>
      </fieldset>

      {confirming ? (
        <div className="rounded-2xl border-2 border-amber bg-cocoa p-4">
          <p className="font-extrabold">Accuse now?</p>
          <p className="mt-1 text-sm text-body">
            This uses 1 of your {view.accusationsLeft} remaining accusations.
          </p>
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
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="h-12 rounded-xl border border-line-strong px-5 font-bold"
            >
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
