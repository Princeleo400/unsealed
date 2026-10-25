'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Relation } from '@unsealed/engine';
import {
  IconBack,
  IconBoard,
  IconBulb,
  IconClock,
  IconFolder,
  IconScales,
  IconTimeline,
} from '@/components/icons';
import { SoundToggle } from '@/components/SoundToggle';
import { feedback } from '@/lib/feedback';
import { BoardPanel } from './BoardPanel';
import { DebriefPanel } from './DebriefPanel';
import { EvidenceViewer } from './EvidenceViewer';
import { FilePanel } from './FilePanel';
import { BriefingModal, HintModal, Toasts } from './Overlays';
import { TimelinePanel } from './TimelinePanel';
import { VerdictPanel } from './VerdictPanel';
import { formatClock, useLocalBoard, usePlay } from './usePlay';

type Panel = 'file' | 'board' | 'timeline' | 'verdict';

/** True at the `lg` breakpoint and up. The file list is rendered once: sidebar on desktop, a panel on phones. */
function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return desktop;
}

export function CasePlayer({ slug }: { slug: string }) {
  const {
    view,
    error,
    busy,
    send,
    restart,
    retry,
    toasts,
    toast,
    dismiss,
    sync,
    remoteBoard,
  } = usePlay(slug);
  const { board, update, reset } = useLocalBoard(slug, {
    remoteBoard,
    signedIn: sync?.signedIn,
  });
  const isDesktop = useIsDesktop();
  const [panel, setPanel] = useState<Panel>('file');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showBriefing, setShowBriefing] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [lastSearch, setLastSearch] = useState<{
    query: string;
    results: { id: string; number: number; title: string }[];
  } | null>(null);
  const [lastVerdict, setLastVerdict] = useState<{
    correctSections: number;
    accusationsLeft: number;
  } | null>(null);

  useEffect(() => {
    if (
      view &&
      !board.seenBriefing &&
      view.read.length === 0 &&
      view.status === 'active'
    )
      setShowBriefing(true);
  }, [view, board.seenBriefing]);

  useEffect(() => {
    if (view && view.status !== 'active') setPanel('verdict');
  }, [view?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = useMemo(
    () => view?.evidence.find((evidence) => evidence.id === selectedId) ?? null,
    [view, selectedId],
  );

  const open = useCallback(
    (id: string) => {
      feedback('paper');
      setSelectedId(id);
      setPanel('file');
      window.scrollTo({ top: 0 });
      if (view && !view.read.includes(id))
        void send({ type: 'read', evidenceId: id });
    },
    [view, send],
  );

  const siblings = useMemo(() => {
    if (!view || !selected) return { prev: undefined, next: undefined };
    const list = view.evidence
      .filter((evidence) => evidence.tab === selected.tab)
      .sort((first, second) => first.number - second.number);
    const position = list.findIndex((evidence) => evidence.id === selected.id);
    return { prev: list[position - 1]?.id, next: list[position + 1]?.id };
  }, [view, selected]);

  if (error?.paywall) {
    const paywall = error.paywall;
    const back = `/play/${paywall.slug}`;
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6 text-center">
        <p className="font-mono text-xs tracking-[0.25em] text-red-text">
          SEALED FILE
        </p>
        <h1 className="text-3xl font-extrabold">{paywall.title}</h1>
        <p className="text-body">
          Unlock this case once and keep it forever, or get Case Pass for every
          case with unlimited hints and no ads.
        </p>
        <Link
          href={`/pass?case=${encodeURIComponent(paywall.slug)}&back=${encodeURIComponent(back)}`}
          className="flex h-12 items-center justify-center rounded-xl bg-amber font-extrabold text-ink"
        >
          See prices
        </Link>
        {!paywall.signedIn && (
          <Link
            href={`/signin?next=${encodeURIComponent(back)}`}
            className="flex h-12 items-center justify-center rounded-xl border border-line-strong font-extrabold"
          >
            I already bought it: sign in
          </Link>
        )}
        <Link
          href="/play/001-dead-air"
          className="text-sm font-bold text-amber"
        >
          Play Case #001 free instead
        </Link>
      </main>
    );
  }

  if (error) {
    const sessionLost = error.code === 'session_invalid';
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-extrabold">
          {sessionLost
            ? 'We couldn’t reopen your case'
            : 'The case file won’t open'}
        </h1>
        <p className="text-body">{error.message}</p>
        {sessionLost ? (
          <button
            type="button"
            onClick={() => {
              reset();
              void restart();
            }}
            className="h-12 rounded-xl bg-amber font-extrabold text-ink"
          >
            Start the case again
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void retry()}
            className="h-12 rounded-xl bg-amber font-extrabold text-ink"
          >
            Try again
          </button>
        )}
        <Link href="/" className="text-sm font-bold text-amber">
          Back to the home page
        </Link>
      </main>
    );
  }

  if (!view) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p
          role="status"
          className="font-mono text-sm tracking-[0.2em] text-muted"
        >
          OPENING THE CASE FILE…
        </p>
      </main>
    );
  }

  const closed = view.status !== 'active';
  const togglePin = (id: string) => {
    feedback('tap');
    update((board) => ({
      ...board,
      pins: board.pins.includes(id)
        ? board.pins.filter((pinnedId) => pinnedId !== id)
        : [...board.pins, id],
    }));
  };

  const onCheck = async (
    firstId: string,
    secondId: string,
    relation: Relation,
  ) => {
    const outcome = await send({
      type: 'string',
      a: firstId,
      b: secondId,
      relation,
    });
    if (!outcome || outcome.result.type !== 'string') return null;
    if (outcome.result.duplicate)
      toast({
        tone: 'info',
        title: 'Already checked',
        body: 'No extra time charged.',
      });
    else if (outcome.result.valid && outcome.result.breakthrough)
      toast({
        tone: 'gold',
        title: 'Breakthrough!',
        body: outcome.result.breakthrough.insight,
      });
    else
      toast({
        tone: 'red',
        title: 'No link found',
        body: '+10 minutes on the clock.',
      });
    return outcome.result.valid;
  };

  const onConfront = async (line: number, evidenceId: string) => {
    if (!selected) return;
    const outcome = await send({
      type: 'confront',
      statementId: selected.id,
      line,
      evidenceId,
    });
    if (!outcome || outcome.result.type !== 'confront') return;
    if (outcome.result.duplicate)
      toast({ tone: 'info', title: 'You already tried that.' });
    else if (outcome.result.valid)
      toast({
        tone: 'gold',
        title: 'The statement changed',
        body: outcome.result.revealLines.map((line) => line.text).join(' '),
      });
    else
      toast({
        tone: 'red',
        title: 'That doesn’t break the statement',
        body: '+10 minutes on the clock.',
      });
  };

  const nav: { id: Panel; label: string; icon: typeof IconFolder }[] = [
    { id: 'file', label: 'File', icon: IconFolder },
    { id: 'board', label: 'Board', icon: IconBoard },
    { id: 'timeline', label: 'Timeline', icon: IconTimeline },
    { id: 'verdict', label: closed ? 'Debrief' : 'Verdict', icon: IconScales },
  ];

  const fileList = (
    <FilePanel
      view={view}
      selectedId={selectedId}
      pins={board.pins}
      busy={busy}
      onOpen={open}
      onLead={async (id) => {
        const outcome = await send({ type: 'lead', leadId: id });
        if (outcome?.result.type === 'lead')
          toast({
            tone: 'info',
            title: 'Lead followed',
            body: `+${outcome.result.costHours} h on the clock.`,
          });
      }}
      onSearch={async (query) => {
        const outcome = await send({ type: 'search', query: query });
        if (outcome?.result.type === 'search')
          setLastSearch({
            query: outcome.result.query,
            results: outcome.result.results,
          });
      }}
      lastSearch={lastSearch}
    />
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-walnut bg-ink/95 backdrop-blur">
        <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
          <Link
            href="/cases"
            aria-label="Back to cases"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line hover:bg-walnut"
          >
            <IconBack className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setShowBriefing(true)}
              className="block max-w-full truncate text-left text-base font-extrabold hover:text-amber"
            >
              {view.case.title}
            </button>
            <p className="truncate text-xs text-muted">
              {view.read.length}/{view.case.totalEvidence} read ·{' '}
              {view.breakthroughs.length}/{view.case.totalBreakthroughs}{' '}
              breakthroughs
              {sync?.signedIn
                ? sync.saved
                  ? ' · saved to account'
                  : ' · not synced'
                : ''}
            </p>
          </div>
          <span
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-1.5 font-mono text-xs"
            aria-label={`Investigation clock ${formatClock(view.clockMinutes)}, par ${view.case.parHours} hours`}
          >
            <IconClock className="h-3.5 w-3.5 text-amber" />
            {formatClock(view.clockMinutes)}
            <span className="hidden text-faint sm:inline">
              / par {view.case.parHours}h
            </span>
          </span>
          {!closed && (
            <button
              type="button"
              onClick={() => setShowHints(true)}
              aria-label="Hint"
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line bg-walnut px-2.5 text-xs font-bold sm:px-3"
            >
              <IconBulb className="h-4 w-4 text-amber" />
              <span className="hidden sm:inline">Hint</span>
            </button>
          )}
          <SoundToggle className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-muted hover:bg-walnut hover:text-paper" />
        </div>
      </header>

      <div className="flex flex-1">
        {isDesktop && (
          <aside
            aria-label="Case file"
            className="sticky top-16 h-[calc(100dvh-4rem)] w-[320px] shrink-0 overflow-y-auto border-r border-walnut p-4"
          >
            {fileList}
          </aside>
        )}

        <main className="min-w-0 flex-1 px-4 pb-28 pt-4 lg:px-8 lg:pb-10">
          <nav
            aria-label="Case views"
            className="mb-5 hidden gap-1 rounded-xl bg-walnut p-1 lg:flex"
          >
            {nav.map((navItem) => (
              <button
                key={navItem.id}
                type="button"
                onClick={() => setPanel(navItem.id)}
                aria-current={panel === navItem.id ? 'page' : undefined}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold ${panel === navItem.id ? 'bg-paper text-ink' : 'text-muted hover:text-paper'}`}
              >
                <navItem.icon className="h-4 w-4" />{' '}
                {navItem.id === 'file' ? 'Evidence' : navItem.label}
              </button>
            ))}
          </nav>

          <div className="mx-auto max-w-3xl">
            {panel === 'file' &&
              (selected ? (
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="flex items-center gap-1 self-start text-sm font-bold text-amber lg:hidden"
                  >
                    <IconBack className="h-4 w-4" /> File
                  </button>
                  <EvidenceViewer
                    evidence={selected}
                    view={view}
                    pinned={board.pins.includes(selected.id)}
                    busy={busy}
                    onTogglePin={() => togglePin(selected.id)}
                    onConfront={onConfront}
                    onPrev={
                      siblings.prev ? () => open(siblings.prev!) : undefined
                    }
                    onNext={
                      siblings.next ? () => open(siblings.next!) : undefined
                    }
                  />
                </div>
              ) : isDesktop ? (
                <div className="rounded-2xl border border-dashed border-line p-10 text-center text-muted">
                  Choose a piece of evidence from the file on the left.
                </div>
              ) : (
                fileList
              ))}

            {panel === 'board' && (
              <BoardPanel
                view={view}
                board={board}
                busy={busy}
                onUpdate={update}
                onCheck={onCheck}
                onOpen={open}
              />
            )}
            {panel === 'timeline' && (
              <TimelinePanel
                view={view}
                board={board}
                onUpdate={update}
                onOpen={open}
              />
            )}
            {panel === 'verdict' &&
              (closed && view.debrief ? (
                <DebriefPanel
                  view={view}
                  onRestart={() => {
                    reset();
                    setSelectedId(null);
                    setLastVerdict(null);
                    setPanel('file');
                    void restart();
                  }}
                />
              ) : (
                <VerdictPanel
                  view={view}
                  busy={busy}
                  lastResult={lastVerdict}
                  onSubmit={async (answer) => {
                    const outcome = await send({ type: 'verdict', answer });
                    if (outcome?.result.type === 'verdict') {
                      setLastVerdict({
                        correctSections: outcome.result.correctSections,
                        accusationsLeft: outcome.result.accusationsLeft,
                      });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                />
              ))}
          </div>
        </main>
      </div>

      <nav
        aria-label="Case views"
        className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-walnut bg-ink/95 px-2 pb-[max(env(safe-area-inset-bottom),12px)] pt-2 backdrop-blur lg:hidden"
      >
        {nav.map((navItem) => (
          <button
            key={navItem.id}
            type="button"
            onClick={() => {
              setPanel(navItem.id);
              if (navItem.id === 'file' && panel === 'file')
                setSelectedId(null);
            }}
            aria-current={panel === navItem.id ? 'page' : undefined}
            className={`flex min-w-16 flex-col items-center gap-1 py-1 text-[11px] font-bold ${panel === navItem.id ? 'text-amber' : 'text-muted'}`}
          >
            <navItem.icon className="h-[22px] w-[22px]" />
            {navItem.label}
          </button>
        ))}
      </nav>

      <BriefingModal
        view={view}
        open={showBriefing}
        onClose={() => {
          setShowBriefing(false);
          update((board) => ({ ...board, seenBriefing: true }));
        }}
      />
      <HintModal
        view={view}
        open={showHints}
        busy={busy}
        onClose={() => setShowHints(false)}
        onHint={async (tier, adReward) => {
          const outcome = await send({ type: 'hint', tier, adReward });
          return outcome?.result.type === 'hint' ? outcome.result.text : null;
        }}
      />
      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
