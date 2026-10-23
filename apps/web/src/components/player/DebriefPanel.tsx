'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { CaseView } from '@/lib/view-types';
import { ShareButton } from '@/components/share/ShareButton';
import { formatClock } from './usePlay';

const BADGES: Record<string, { label: string; help: string }> = {
  sharp: { label: 'Sharp', help: 'Solved on the first accusation' },
  swift: { label: 'Swift', help: 'At or under the Inspector’s Par' },
  unassisted: { label: 'Unassisted', help: 'No hints used' },
  weaver: { label: 'Weaver', help: 'Every breakthrough found' },
};

export function DebriefPanel({
  view,
  onRestart,
}: {
  view: CaseView;
  onRestart: () => void;
}) {
  const debriefView = view.debrief!;
  const solved = view.status === 'solved';
  const [step, setStep] = useState(0);
  const currentStep = debriefView.steps[step]!;

  const shareText = solved
    ? `I solved "${view.case.title}" on UNSEALED with a score of ${debriefView.score.total}. Can you?`
    : `"${view.case.title}" went cold on me. Can you solve it?`;
  // The signed play state proves the result; the server reads score and badges from it.
  const shareRequest = () => {
    try {
      const token = localStorage.getItem(`unsealed:play:${view.case.id}`);
      return token
        ? { kind: 'case' as const, caseId: view.case.id, token }
        : null;
    } catch {
      return null;
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col items-center gap-2 pt-2 text-center">
        <span
          className={`-rotate-3 border-[2.5px] px-4 py-1.5 font-mono text-sm tracking-[0.3em] ${solved ? 'border-green-text text-green-text' : 'border-red-text text-red-text'}`}
        >
          {solved ? 'CASE CLOSED' : 'CASE COLD'}
        </span>
        <p className="text-sm text-muted">
          {view.case.title} ·{' '}
          {solved
            ? `solved on accusation ${view.accusations.length}`
            : 'three accusations used'}{' '}
          · clock {formatClock(view.clockMinutes)} / par {view.case.parHours}h
        </p>
        <p className="font-mono text-6xl font-semibold tracking-tight text-amber">
          {debriefView.score.total}
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Badges">
        {Object.entries(BADGES).map(([id, badge]) => {
          const got = debriefView.score.badges.includes(id as never);
          return (
            <li
              key={id}
              className={`rounded-xl border p-3 text-center ${got ? 'border-amber bg-line' : 'border-line opacity-60'}`}
            >
              <span
                className={`block text-sm font-extrabold ${got ? 'text-amber' : ''}`}
              >
                {badge.label}
              </span>
              <span className="block text-[11px] text-muted">{badge.help}</span>
              <span className="sr-only">{got ? 'earned' : 'not earned'}</span>
            </li>
          );
        })}
      </ul>

      <section
        className="rounded-2xl bg-paper p-5 text-ink"
        aria-label="What really happened"
      >
        <p className="font-mono text-[11px] tracking-[0.15em] text-[#4a3f35]">
          WHAT REALLY HAPPENED · {step + 1} OF {debriefView.steps.length}
        </p>
        <p className="mt-2 text-lg font-extrabold leading-snug">
          {currentStep.time}
        </p>
        <p className="mt-1 leading-relaxed">{currentStep.text}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
            className="h-10 rounded-full border border-ink px-4 text-sm font-bold disabled:opacity-30"
          >
            Back
          </button>
          <div className="flex flex-1 gap-1" aria-hidden="true">
            {debriefView.steps.map((_, index) => (
              <span
                key={index}
                className={`h-1 flex-1 rounded ${index <= step ? 'bg-ink' : 'bg-paper-line'}`}
              />
            ))}
          </div>
          <button
            type="button"
            disabled={step === debriefView.steps.length - 1}
            onClick={() => setStep(step + 1)}
            className="h-10 rounded-full bg-ink px-4 text-sm font-bold text-paper disabled:opacity-30"
          >
            Next
          </button>
        </div>
      </section>

      <section
        className="rounded-2xl border border-line p-4"
        aria-label="The solution"
      >
        <h3 className="font-extrabold">The solution</h3>
        <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-[80px_1fr]">
          <dt className="text-muted">Who</dt>
          <dd className="m-0 font-bold">{debriefView.solution.who}</dd>
          <dt className="text-muted">How</dt>
          <dd className="m-0">{debriefView.solution.how.join(' · ')}</dd>
          <dt className="text-muted">Why</dt>
          <dd className="m-0">{debriefView.solution.why.join(' · ')}</dd>
          <dt className="text-muted">Key proof</dt>
          <dd className="m-0">{debriefView.solution.proofCore.join(' + ')}</dd>
        </dl>
      </section>

      <section aria-label="Breakthroughs" className="flex flex-col gap-2">
        <h3 className="font-mono text-[11px] tracking-[0.15em] text-faint">
          BREAKTHROUGHS ·{' '}
          {
            debriefView.breakthroughs.filter(
              (breakthrough) => breakthrough.found,
            ).length
          }{' '}
          OF {debriefView.breakthroughs.length} FOUND
        </h3>
        {debriefView.breakthroughs.map((breakthrough) => (
          <div
            key={breakthrough.id}
            className={`rounded-xl border p-3 text-sm leading-relaxed ${breakthrough.found ? 'border-amber bg-line' : 'border-dashed border-line-strong text-body'}`}
          >
            <span
              className={`font-mono text-xs font-semibold ${breakthrough.found ? 'text-amber' : 'text-faint'}`}
            >
              {breakthrough.id} · {breakthrough.found ? 'found' : 'missed'}
            </span>{' '}
            {breakthrough.insight}
          </div>
        ))}
      </section>

      <div className="grid items-start gap-2 sm:grid-cols-3">
        <ShareButton text={shareText} request={shareRequest} />
        <button
          type="button"
          onClick={onRestart}
          className="h-12 rounded-xl border border-line-strong font-extrabold"
        >
          Play again
        </button>
        <Link
          href="/cases"
          className="flex h-12 items-center justify-center rounded-xl bg-amber font-extrabold text-ink"
        >
          Next case
        </Link>
      </div>
    </div>
  );
}
