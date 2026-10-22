'use client';

import { useState } from 'react';
import type { Evidence } from '@unsealed/engine';
import type { CaseView } from '@/lib/view-types';
import { EvidenceBody } from './EvidenceBody';
import { IconPin } from '@/components/icons';

const pad = (n: number) => String(n).padStart(2, '0');

export function EvidenceViewer({
  e,
  view,
  pinned,
  busy,
  onTogglePin,
  onConfront,
  onPrev,
  onNext,
}: {
  e: Evidence;
  view: CaseView;
  pinned: boolean;
  busy: boolean;
  onTogglePin: () => void;
  onConfront: (line: number, evidenceId: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const [confronting, setConfronting] = useState<number | null>(null);
  const isStatement = e.body.type === 'statement';
  const revealed = view.revealedLines[e.id] ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted">
          {e.tab[0]!.toUpperCase() + e.tab.slice(1)} · {pad(e.number)}/{view.case.totalEvidence}
        </span>
        <button
          type="button"
          onClick={onTogglePin}
          aria-pressed={pinned}
          className={`flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-extrabold ${
            pinned ? 'border-amber bg-amber text-ink' : 'border-amber text-amber hover:bg-amber/10'
          }`}
        >
          <IconPin className="h-4 w-4" />
          {pinned ? 'Pinned' : 'Pin to board'}
        </button>
      </div>

      <article className="rounded-sm bg-paper px-4 py-5 text-ink shadow-[0_16px_40px_rgba(0,0,0,0.45)] sm:px-6">
        <h2 className="text-xl font-extrabold leading-tight">{e.title}</h2>
        <p className="mb-4 mt-1 text-xs text-[#5c4f42]">{e.source}</p>
        <EvidenceBody e={e} view={view} />

        {isStatement && e.body.type === 'statement' && (
          <ol className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
            {e.body.lines.map((l) => {
              const extra = revealed.filter((r) => parseInt(r.n, 10) === l.n);
              const broken = extra.length > 0;
              return (
                <li key={l.n} className="flex flex-col gap-2">
                  <div className={`flex gap-3 rounded-lg border p-3 text-[15px] leading-relaxed ${confronting === l.n ? 'border-amber bg-amber-wash' : 'border-paper-line bg-paper-2'}`}>
                    <span className="font-mono text-sm text-[#5c4f42]">{l.n}</span>
                    <span className={`flex-1 ${broken ? 'text-[#7a6d5c] line-through' : ''}`}>{l.text}</span>
                    {view.status === 'active' && !broken && (
                      <button
                        type="button"
                        onClick={() => setConfronting(confronting === l.n ? null : l.n)}
                        className="h-8 shrink-0 self-start rounded-full border border-ink px-3 text-xs font-extrabold hover:bg-ink hover:text-paper"
                        aria-expanded={confronting === l.n}
                      >
                        {confronting === l.n ? 'Cancel' : 'Confront'}
                      </button>
                    )}
                  </div>
                  {extra.map((r) => (
                    <div key={r.n} className="ml-6 flex gap-3 rounded-lg border-2 border-amber bg-amber-wash p-3 text-[15px] leading-relaxed">
                      <span className="font-mono text-sm font-semibold">{r.n}</span>
                      <span>{r.text}</span>
                    </div>
                  ))}
                  {confronting === l.n && (
                    <div className="ml-6 rounded-lg border border-ink p-3">
                      <p className="mb-2 text-sm font-bold">Present which evidence against line {l.n}?</p>
                      <p className="mb-3 text-xs text-[#4a3f35]">A wrong confrontation costs 10 minutes.</p>
                      <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                        {view.evidence
                          .filter((x) => x.id !== e.id)
                          .sort((a, b) => a.number - b.number)
                          .map((x) => (
                            <button
                              key={x.id}
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                onConfront(l.n, x.id);
                                setConfronting(null);
                              }}
                              className="rounded-md px-2 py-2 text-left text-sm hover:bg-paper-line"
                            >
                              <span className="font-mono text-xs text-[#5c4f42]">{pad(x.number)}</span> {x.title}
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
          <button type="button" onClick={onPrev} disabled={!onPrev} className="h-10 rounded-full border border-line px-4 text-sm font-bold disabled:opacity-30">
            Previous
          </button>
          <button type="button" onClick={onNext} disabled={!onNext} className="h-10 rounded-full border border-line px-4 text-sm font-bold disabled:opacity-30">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
