'use client';

import { useEffect, useRef, useState } from 'react';
import type { AdReward, CaseView } from '@/lib/view-types';
import { showRewardedAd } from '@/components/ads/rewarded';
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
  onHint: (tier: 'nudge' | 'pointer' | 'reveal', adReward?: AdReward) => Promise<string | null>;
}) {
  type Tier = 'nudge' | 'pointer' | 'reveal';
  const [text, setText] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [devAd, setDevAd] = useState<{ tier: Tier; seconds: number } | null>(null);
  const [loadingAd, setLoadingAd] = useState(false);
  const { freeLeft, adLeft, unlimited } = view.hintAllowance;
  const needsAd = !unlimited && freeLeft === 0;
  const noneLeft = !unlimited && freeLeft === 0 && adLeft === 0;

  // Development stand-in for a rewarded video: a 5-second countdown.
  useEffect(() => {
    if (!devAd) return;
    if (devAd.seconds <= 0) {
      const tier = devAd.tier;
      setDevAd(null);
      void onHint(tier, { provider: 'dev', id: `dev-${Date.now()}` }).then(setText);
      return;
    }
    const t = setTimeout(() => setDevAd((d) => (d ? { ...d, seconds: d.seconds - 1 } : d)), 1000);
    return () => clearTimeout(t);
  }, [devAd, onHint]);

  const ask = async (tier: Tier) => {
    setNote(null);
    if (!needsAd) return setText(await onHint(tier));
    setLoadingAd(true);
    const outcome = await showRewardedAd();
    setLoadingAd(false);
    if (outcome.status === 'dev-simulate') return setDevAd({ tier, seconds: 5 });
    if (outcome.status === 'closed') return setNote('Watch the video to the end to unlock the hint.');
    setText(await onHint(tier, outcome.reward));
  };

  const tiers = [
    { id: 'nudge' as const, label: 'Nudge', cost: 10, help: 'Which direction to look' },
    { id: 'pointer' as const, label: 'Pointer', cost: 30, help: 'Which items to compare' },
    { id: 'reveal' as const, label: 'Reveal', cost: 75, help: 'Tells you the breakthrough' },
  ];
  const close = () => {
    setText(null);
    setNote(null);
    setDevAd(null);
    onClose();
  };

  if (devAd) {
    return (
      <Modal open={open} onClose={close} label="Video ad">
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <span className="font-mono text-[11px] tracking-[0.2em] text-faint">TEST AD · DEVELOPMENT ONLY</span>
          <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-line-strong bg-walnut">
            <span className="font-mono text-5xl font-semibold text-amber">{devAd.seconds}</span>
          </div>
          <p className="text-sm text-muted">In production a short rewarded video plays here. Your hint unlocks when it ends.</p>
          <button type="button" onClick={() => setDevAd(null)} className="text-sm font-bold text-muted underline">
            Stop video (no hint)
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={close} label="Hints">
      <h2 className="text-2xl font-extrabold">Need a hint?</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Hints cost score, never money.{' '}
        {unlimited ? (
          <b className="text-paper">Unlimited hints with Case Pass.</b>
        ) : freeLeft > 0 ? (
          <b className="text-paper">Your first hint is free.</b>
        ) : adLeft > 0 ? (
          <b className="text-paper">Watch a short video to unlock each hint ({adLeft} left for this case).</b>
        ) : (
          <b className="text-paper">You’ve used every hint for this case.</b>
        )}
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {tiers.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={busy || loadingAd || noneLeft}
            onClick={() => void ask(t.id)}
            className="flex items-center justify-between gap-3 rounded-xl border border-line-strong px-4 py-3 text-left hover:border-amber disabled:opacity-50"
          >
            <span>
              <span className="block font-extrabold">{t.label}</span>
              <span className="block text-xs text-muted">{t.help}</span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-0.5">
              <span className="font-mono text-sm text-red-soft">−{t.cost}</span>
              <span className="text-[11px] font-bold text-amber">{needsAd ? '▶ Watch video' : 'Free'}</span>
            </span>
          </button>
        ))}
      </div>
      {loadingAd && <p role="status" className="mt-3 text-sm text-muted">Loading video…</p>}
      {note && <p role="status" className="mt-3 text-sm font-semibold text-red-soft">{note}</p>}
      {noneLeft && (
        <p className="mt-3 rounded-xl border border-line p-3 text-sm text-body">
          Case Pass gives unlimited hints with no ads.{' '}
          <a href="/pass" className="font-bold text-amber">See Case Pass</a>
        </p>
      )}
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
