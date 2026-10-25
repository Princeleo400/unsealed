'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { feedback } from '@/lib/feedback';
import { EMPTY_BOARD, parseBoard, type LocalBoard } from '@/lib/board';
import type {
  CaseView,
  PaywallInfo,
  PlayAction,
  PlayResponse,
  PlayResult,
} from '@/lib/view-types';

/** The sound (and vibration) for a server reply. The biggest moment wins. */
function playCueFor(result: PlayResult, newEvidence: boolean) {
  switch (result.type) {
    case 'verdict':
      return feedback(
        result.status === 'solved'
          ? 'stamp'
          : result.status === 'cold'
            ? 'cold'
            : 'wrong',
      );
    case 'string':
      if (result.duplicate) return feedback('tap');
      if (!result.valid) return feedback('wrong');
      return feedback(result.breakthrough ? 'breakthrough' : 'link');
    case 'confront':
      if (result.duplicate) return feedback('tap');
      return feedback(result.valid ? 'breakthrough' : 'wrong');
    case 'hint':
      return feedback('hint');
    default:
      if (newEvidence) feedback('unlock');
  }
}

const tokenKey = (slug: string) => `unsealed:play:${slug}`;

function readToken(slug: string): string | undefined {
  try {
    return localStorage.getItem(tokenKey(slug)) ?? undefined;
  } catch {
    return undefined;
  }
}
function writeToken(slug: string, token: string | null) {
  try {
    if (token) localStorage.setItem(tokenKey(slug), token);
    else localStorage.removeItem(tokenKey(slug));
  } catch {
    /* storage unavailable (private mode): the session still works for this tab */
  }
}

export type Toast = {
  id: number;
  tone: 'gold' | 'red' | 'info';
  title: string;
  body?: string;
};

export function usePlay(slug: string) {
  const [view, setView] = useState<CaseView | null>(null);
  const [error, setError] = useState<{
    code: string;
    message: string;
    paywall?: PaywallInfo;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const token = useRef<string | undefined>(undefined);
  const toastId = useRef(0);
  /** Account sync status. `source` is fixed at start: where the progress came from. */
  const [sync, setSync] = useState<SyncInfo | null>(null);
  const [remoteBoard, setRemoteBoard] = useState<LocalBoard | null>(null);

  const toast = useCallback((newToast: Omit<Toast, 'id'>) => {
    const id = ++toastId.current;
    setToasts((xs) => [...xs.slice(-1), { ...newToast, id }]); // at most 2 on screen so evidence stays readable
    setTimeout(
      () => setToasts((xs) => xs.filter((toast) => toast.id !== id)),
      newToast.tone === 'gold' ? 9000 : 5500,
    );
  }, []);
  const dismiss = useCallback(
    (id: number) => setToasts((xs) => xs.filter((toast) => toast.id !== id)),
    [],
  );

  const send = useCallback(
    async (
      action: PlayAction,
    ): Promise<{
      result: PlayResult;
      unlocked: { id: string; number: number; title: string }[];
    } | null> => {
      setBusy(true);
      try {
        const res = await fetch(`/api/play/${slug}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token: token.current, action }),
        });
        const json = (await res
          .json()
          .catch(() => null)) as PlayResponse | null;
        if (!json) {
          if (action.type === 'start')
            setError({
              code: 'server_error',
              message: 'The case file server is not responding right now.',
            });
          else
            toast({
              tone: 'red',
              title: 'Something went wrong',
              body: 'Please try that again.',
            });
          return null;
        }
        if (!json.ok) {
          if (json.token) {
            token.current = json.token;
            writeToken(slug, json.token);
          }
          if (json.view) setView(json.view);
          if (json.error.code === 'session_invalid') setError(json.error);
          else if (
            json.error.code === 'paywall' ||
            json.error.code === 'access_unavailable'
          )
            setError({ ...json.error, paywall: json.paywall });
          else toast({ tone: 'red', title: json.error.message });
          return null;
        }
        token.current = json.token;
        writeToken(slug, json.token);
        setView(json.view);
        setError(null);
        if (json.sync) {
          const s2 = json.sync;
          if (action.type === 'start') {
            setSync({
              signedIn: s2.signedIn,
              source: s2.source,
              saved: s2.saved,
            });
            const rb = s2.source === 'account' ? parseBoard(s2.board) : null;
            if (rb) setRemoteBoard(rb);
          } else
            setSync((prev) => ({
              signedIn: s2.signedIn,
              source: prev?.source ?? s2.source,
              saved: s2.saved,
            }));
        }
        for (const evidenceBrief of json.unlocked)
          toast({
            tone: 'info',
            title: 'New evidence',
            body: `${evidenceBrief.number}. ${evidenceBrief.title}`,
          });
        playCueFor(json.result, json.unlocked.length > 0);
        return { result: json.result, unlocked: json.unlocked };
      } catch {
        if (action.type === 'start')
          setError({
            code: 'offline',
            message:
              'We couldn’t reach the case file. Check your internet connection.',
          });
        else
          toast({
            tone: 'red',
            title: 'Connection problem',
            body: 'Check your internet and try again.',
          });
        return null;
      } finally {
        setBusy(false);
      }
    },
    [slug, toast],
  );

  useEffect(() => {
    token.current = readToken(slug);
    void send({ type: 'start' });
  }, [slug, send]);

  const restart = useCallback(async () => {
    token.current = undefined;
    writeToken(slug, null);
    try {
      localStorage.removeItem(`unsealed:local:${slug}`);
    } catch {
      /* ignore */
    }
    setError(null);
    setRemoteBoard(null);
    await send({ type: 'start', fresh: true }); // "Play again": start clean even if the account has a save
  }, [slug, send]);

  const retry = useCallback(async () => {
    setError(null);
    await send({ type: 'start' });
  }, [send]);

  return {
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
  };
}

export type { LocalBoard };
const EMPTY: LocalBoard = EMPTY_BOARD;
type SyncInfo = {
  signedIn: boolean;
  source: 'account' | 'device' | 'new';
  saved: boolean;
};

/**
 * Player-only scratch state that never affects grading: pins, notes, crossed-off suspects, timeline
 * placements. Kept in the browser; for signed-in players it also syncs to the account (debounced).
 */
export function useLocalBoard(
  slug: string,
  opts: { remoteBoard?: LocalBoard | null; signedIn?: boolean } = {},
) {
  const key = `unsealed:local:${slug}`;
  const [board, setBoard] = useState<LocalBoard>(EMPTY);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? parseBoard(JSON.parse(raw)) : null;
      if (parsed) setBoard(parsed);
    } catch {
      /* ignore */
    }
    loaded.current = true;
  }, [key]);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(key, JSON.stringify(board));
    } catch {
      /* ignore */
    }
  }, [key, board]);

  // The account's board wins when the account's case progress was used.
  useEffect(() => {
    if (opts.remoteBoard) setBoard(opts.remoteBoard);
  }, [opts.remoteBoard]);

  // Push changes to the account, at most every 1.5 s.
  const firstPush = useRef(true);
  useEffect(() => {
    if (!opts.signedIn || !loaded.current) return;
    if (firstPush.current) {
      firstPush.current = false; // skip the initial load itself
      if (!opts.remoteBoard && board === EMPTY) return;
    }
    const timeout = setTimeout(() => {
      void fetch(`/api/saves/${slug}/board`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(board),
      }).catch(() => undefined);
    }, 1500);
    return () => clearTimeout(timeout);
  }, [board, opts.signedIn, opts.remoteBoard, slug]);

  const update = useCallback(
    (fn: (board: LocalBoard) => LocalBoard) => setBoard((board) => fn(board)),
    [],
  );
  const reset = useCallback(() => setBoard(EMPTY), []);
  return { board, update, reset };
}

export const formatClock = (minutes: number) =>
  `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
