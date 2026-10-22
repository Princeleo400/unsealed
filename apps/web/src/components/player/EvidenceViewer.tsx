'use client';

import { useState } from 'react';
import type { Evidence } from '@unsealed/engine';
import type { CaseView } from '@/lib/view-types';
import { EvidenceBody } from './EvidenceBody';
import { IconPin } from '@/components/icons';

const pad = (value: number) => String(value).padStart(2, '0');

export function EvidenceViewer({
  evidence: evidence,
  view,
  pinned,
  busy,
  onTogglePin,
  onConfront,
  onPrev,
  onNext,
}: {
  evidence: Evidence;
  view: CaseView;
  pinned: boolean;
  busy: boolean;
  onTogglePin: () => void;
  onConfront: (line: number, evidenceId: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const [confronting, setConfronting] = useState<number | null>(null);
  const isStatement = evidence.body.type === 'statement';
  const revealed = view.revealedLines[evidence.id] ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted">
          {evidence.tab[0]!.toUpperCase() + evidence.tab.slice(1)} ·{' '}
          {pad(evidence.number)}/{view.case.totalEvidence}
        </span>
        <button
          type="button"
          onClick={onTogglePin}
          aria-pressed={pinned}
          className={`flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-extrabold ${
            pinned
              ? 'border-amber bg-amber text-ink'
              : 'border-amber text-amber hover:bg-amber/10'
          }`}
        >
          <IconPin className="h-4 w-4" />
          {pinned ? 'Pinned' : 'Pin to board'}
        </button>
      </div>

      <article className="rounded-sm bg-paper px-4 py-5 text-ink shadow-[0_16px_40px_rgba(0,0,0,0.45)] sm:px-6">
        <h2 className="text-xl font-extrabold leading-tight">
          {evidence.title}
        </h2>
        <p className="mb-4 mt-1 text-xs text-[#5c4f42]">{evidence.source}</p>
        <EvidenceBody evidence={evidence} view={view} />

        {isStatement && evidence.body.type === 'statement' && (
          <ol className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
            {evidence.body.lines.map((line) => {
              const extra = revealed.filter(
                (revealedLine) => parseInt(revealedLine.n, 10) === line.n,
              );
              const broken = extra.length > 0;
              return (
                <li key={line.n} className="flex flex-col gap-2">
                  <div
                    className={`flex gap-3 rounded-lg border p-3 text-[15px] leading-relaxed ${confronting === line.n ? 'border-amber bg-amber-wash' : 'border-paper-line bg-paper-2'}`}
                  >
                    <span className="font-mono text-sm text-[#5c4f42]">
                      {line.n}
                    </span>
                    <span
                      className={`flex-1 ${broken ? 'text-[#7a6d5c] line-through' : ''}`}
                    >
                      {line.text}
                    </span>
                    {view.status === 'active' && !broken && (
                      <button
                        type="button"
                        onClick={() =>
                          setConfronting(confronting === line.n ? null : line.n)
                        }
                        className="h-8 shrink-0 self-start rounded-full border border-ink px-3 text-xs font-extrabold hover:bg-ink hover:text-paper"
                        aria-expanded={confronting === line.n}
                      >
                        {confronting === line.n ? 'Cancel' : 'Confront'}
                      </button>
                    )}
                  </div>
                  {extra.map((revealedLine) => (
                    <div
                      key={revealedLine.n}
                      className="ml-6 flex gap-3 rounded-lg border-2 border-amber bg-amber-wash p-3 text-[15px] leading-relaxed"
                    >
                      <span className="font-mono text-sm font-semibold">
                        {revealedLine.n}
                      </span>
                      <span>{revealedLine.text}</span>
                    </div>
                  ))}
                  {confronting === line.n && (
                    <div className="ml-6 rounded-lg border border-ink p-3">
                      <p className="mb-2 text-sm font-bold">
                        Present which evidence against line {line.n}?
                      </p>
                      <p className="mb-3 text-xs text-[#4a3f35]">
                        A wrong confrontation costs 10 minutes.
                      </p>
                      <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                        {view.evidence
                          .filter((candidate) => candidate.id !== evidence.id)
                          .sort((first, second) => first.number - second.number)
                          .map((candidate) => (
                            <button
                              key={candidate.id}
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                onConfront(line.n, candidate.id);
                                setConfronting(null);
                              }}
                              className="rounded-md px-2 py-2 text-left text-sm hover:bg-paper-line"
                            >
                              <span className="font-mono text-xs text-[#5c4f42]">
                                {pad(candidate.number)}
                              </span>{' '}
                              {candidate.title}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </article>

      {(onPrev || onNext) && (
        <div className="flex justify-between">
          <button
            type="button"
            onClick={onPrev}
            disabled={!onPrev}
            className="h-10 rounded-full border border-line px-4 text-sm font-bold disabled:opacity-30"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!onNext}
            className="h-10 rounded-full border border-line px-4 text-sm font-bold disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
