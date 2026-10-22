'use client';

import { useEffect, useRef, useState } from 'react';
import type { CaseView } from '@/lib/view-types';
import { IconClose } from '@/components/icons';
import { mdToHtml } from './EvidenceBody';
import type { Toast } from './usePlay';

/** Accessible modal built on <dialog>. */
export function Modal({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      onCancel={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-line bg-cocoa p-0 text-paper backdrop:bg-black/70"
    >
      <div className="relative max-h-[85dvh] overflow-y-auto p-5 sm:p-6">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-line hover:bg-walnut">
          <IconClose className="h-4 w-4" />
        </button>
        {children}
      </div>
    </dialog>
  );
}

export function BriefingModal({ view, open, onClose }: { view: CaseView; open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} label="Case briefing">
      <span className="inline-block -rotate-2 border-[1.5px] border-red-text px-2 py-0.5 font-mono text-[11px] tracking-[0.2em] text-red-text">CASE BRIEFING</span>
      <h2 className="mt-3 text-3xl font-extrabold tracking-tight">{view.case.title}</h2>
      <p className="mt-1 text-sm text-muted">
        {view.case.city.name}, {view.case.city.country} · {view.case.estMinutes[0]}–{view.case.estMinutes[1]} min · par {view.case.parHours} h
      </p>
      <div className="doc mt-4 text-[15px] leading-relaxed text-body" dangerouslySetInnerHTML={{ __html: mdToHtml(view.case.briefing) }} />
      <h3 className="mt-5 font-mono text-[11px] tracking-[0.15em] text-faint">HOW IT WORKS</h3>
      <ul className="mt-2 flex flex-col gap-1.5 text-sm text-body">
        <li><b className="text-paper">Read</b> the file. Unread items have an amber dot.</li>
        <li><b className="text-paper">Pin</b> clues, then tie a <b className="text-paper">red string</b> between two that connect (+10 min per check).</li>
        <li><b className="text-paper">Follow leads</b> for new evidence (costs hours) and <b className="text-paper">search</b> the archive (free).</li>
        <li><b className="text-paper">Confront</b> a line in a statement with evidence (+10 min if wrong).</li>
        <li>When you’re sure, fill in the <b className="text-paper">verdict</b>. You get 3 accusations.</li>
      </ul>
      <p className="mt-4 text-xs text-faint">Content notes: {view.case.contentNotes.join(' · ')}. A work of fiction.</p>
      <button type="button" onClick={onClose} className="mt-5 h-12 w-full rounded-xl bg-amber font-extrabold text-ink">
        Open the case file
      </button>
    </Modal>
  );
}

export function HintModal({
  view,
  open,
  busy,
  onClose,
  onHint,
}: {
  view: CaseView;
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onHint: (tier: 'nudge' | 'pointer' | 'reveal') => Promise<string | null>;
}) {
  const [text, setText] = useState<string | null>(null);
  const tiers = [
    { id: 'nudge' as const, label: 'Nudge', cost: 10, help: 'Which direction to look' },
    { id: 'pointer' as const, label: 'Pointer', cost: 30, help: 'Which items to compare' },
    { id: 'reveal' as const, label: 'Reveal', cost: 75, help: 'Tells you the breakthrough' },
  ];
  return (
    <Modal open={open} onClose={() => { setText(null); onClose(); }} label="Hints">
      <h2 className="text-2xl font-extrabold">Need a hint?</h2>
      <p className="mt-1 text-sm text-muted">
        Hints never cost money. They cost score. {view.hintsLeft !== null && <b className="text-paper">{view.hintsLeft} free hints left for this case.</b>}
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {tiers.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={busy || view.hintsLeft === 0}
            onClick={async () => setText(await onHint(t.id))}
            className="flex items-center justify-between rounded-xl border border-line-strong px-4 py-3 text-left hover:border-amber disabled:opacity-50"
          >
            <span>
              <span className="block font-extrabold">{t.label}</span>
              <span className="block text-xs text-muted">{t.help}</span>
            </span>
            <span className="font-mono text-sm text-red-soft">−{t.cost}</span>
          </button>
        ))}
      </div>
      {text && (
        <p role="status" className="mt-4 rounded-xl border border-amber bg-line p-4 leading-relaxed">
          {text}
        </p>
      )}
    </Modal>
  );
}

export function Toasts({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:pr-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto w-full max-w-sm rounded-xl border px-4 py-3 shadow-2xl ${
            t.tone === 'gold' ? 'shimmer border-amber bg-[#3a2f27]' : t.tone === 'red' ? 'border-red bg-[#2e1c17]' : 'border-line-strong bg-walnut'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`font-extrabold ${t.tone === 'gold' ? 'text-amber' : t.tone === 'red' ? 'text-red-soft' : ''}`}>{t.title}</p>
              {t.body && <p className="mt-0.5 text-sm leading-relaxed text-body">{t.body}</p>}
            </div>
            <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="text-faint hover:text-paper">
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
