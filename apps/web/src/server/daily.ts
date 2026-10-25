import 'server-only';
import {
  DAILY_EPOCH,
  DIFFICULTY_LABEL,
  checkDailyAnswer,
  generateDaily,
  type DailyPuzzle,
  type DailySolution,
} from '@unsealed/engine';
import { z } from 'zod';
import { signPayload, verifyPayload } from './session';

/** Free players can open today's Daily and the previous 6 (FR-DAILY-06). Case Pass opens every day since launch. */
export const ARCHIVE_DAYS = 7;
const DAY_MS = 86_400_000;

/** Who is asking: Case Pass holders get the full archive. */
export type DailyAccess = { fullArchive: boolean };
const FREE: DailyAccess = { fullArchive: false };

const salt = () => process.env.DAILY_SALT || 'unsealed';
const cache = new Map<
  string,
  { puzzle: DailyPuzzle; solution: DailySolution }
>();

export const todayUTC = (now = new Date()) => now.toISOString().slice(0, 10);

/** A real Daily: well-formed, not before launch, not in the future. */
export function isPublishedDate(date: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  const today = Date.parse(`${todayUTC(now)}T00:00:00Z`);
  return (
    !Number.isNaN(timestamp) &&
    timestamp <= today &&
    timestamp >= Date.parse(`${DAILY_EPOCH}T00:00:00Z`)
  );
}

/** Inside the free window: today and the previous ARCHIVE_DAYS - 1 days. */
export function isRecentDate(date: string, now = new Date()): boolean {
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  const today = Date.parse(`${todayUTC(now)}T00:00:00Z`);
  return (
    isPublishedDate(date, now) && timestamp > today - ARCHIVE_DAYS * DAY_MS
  );
}

export function isOpenDate(
  date: string,
  now = new Date(),
  access: DailyAccess = FREE,
): boolean {
  return access.fullArchive
    ? isPublishedDate(date, now)
    : isRecentDate(date, now);
}

/** A published Daily that only the full archive (Case Pass) opens. */
export const isArchiveOnlyDate = (date: string, now = new Date()) =>
  isPublishedDate(date, now) && !isRecentDate(date, now);

export const ARCHIVE_LOCKED_MESSAGE =
  'Older Daily Briefs are in the full archive, included with Case Pass.';

function get(date: string) {
  let hit = cache.get(date);
  if (!hit) {
    hit = generateDaily(date, salt());
    cache.set(date, hit);
    if (cache.size > 30) cache.delete(cache.keys().next().value as string);
  }
  return hit;
}

export type DailyView = DailyPuzzle & {
  /** 'bonus' = an extra puzzle outside the calendar (no streak, no archive). */
  kind: 'daily' | 'bonus';
  /** Bonus Briefs only: the signed ticket that proves the puzzle was paid for. */
  ticket?: string;
  difficultyLabel: string;
  /** The free window, newest first. */
  archive: string[];
  today: string;
  /** Signed time this Brief was opened; the browser keeps the one from its first open. */
  startToken: string;
  /** True for Case Pass holders: any day since `epoch` can be opened. */
  fullArchive: boolean;
  epoch: string;
};

export function dailyView(
  date: string,
  now = new Date(),
  access: DailyAccess = FREE,
): DailyView {
  const { puzzle } = get(date);
  const today = todayUTC(now);
  const archive = Array.from({ length: ARCHIVE_DAYS }, (_, daysAgo) =>
    new Date(Date.parse(`${today}T00:00:00Z`) - daysAgo * DAY_MS)
      .toISOString()
      .slice(0, 10),
  ).filter((date) => isRecentDate(date, now));
  return {
    ...puzzle,
    kind: 'daily',
    startToken: startToken(puzzle.id, now),
    difficultyLabel: DIFFICULTY_LABEL[puzzle.difficulty],
    archive,
    today,
    fullArchive: access.fullArchive,
    epoch: DAILY_EPOCH,
  };
}

export const DailyRequest = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('answer'),
    date: z.string(),
    suspect: z.number().int().min(0).max(9),
    place: z.number().int().min(0).max(9),
  }),
  z.object({ type: z.literal('reveal'), date: z.string() }),
]);

/** Grading happens here so the answer is never in the page. Reveal is for players who used all 3 tries. */
export function handleDaily(
  body: unknown,
  now = new Date(),
  access: DailyAccess = FREE,
) {
  const parsed = DailyRequest.safeParse(body);
  if (!parsed.success)
    return {
      status: 400,
      json: { ok: false as const, message: 'Invalid request.' },
    };
  const req = parsed.data;
  if (!isOpenDate(req.date, now, access))
    return isArchiveOnlyDate(req.date, now)
      ? {
          status: 402,
          json: {
            ok: false as const,
            code: 'archive_locked' as const,
            message: ARCHIVE_LOCKED_MESSAGE,
          },
        }
      : {
          status: 404,
          json: {
            ok: false as const,
            message: 'That Daily Brief is not available.',
          },
        };
  const { puzzle, solution } = get(req.date);
  return grade(puzzle, solution, req, now);
}

/**
 * Server timing for share cards. The page shows a pausing clock measured in the browser,
 * which we can't trust on its own. So when a Brief opens the server signs the start time,
 * a correct answer comes back with a signed solve time, and the share card never shows a
 * time longer than the real gap between the two (or one too short to be possible).
 */
const START_PURPOSE = 'brief-start';
const SOLVED_PURPOSE = 'daily-solved';
/** No honest player solves a Brief faster than this; shorter claims show no time. */
export const MIN_SOLVE_SECONDS = 10;

export const startToken = (puzzleId: string, now = new Date()) =>
  signPayload(START_PURPOSE, { id: puzzleId, startedAt: now.getTime() });
export const solvedProof = (puzzleId: string, now = new Date()) =>
  signPayload(SOLVED_PURPOSE, { id: puzzleId, solvedAt: now.getTime() });

export const isSolvedProof = (proof: string | undefined, puzzleId: string) =>
  Boolean(
    proof &&
    verifyPayload<{ id: string }>(SOLVED_PURPOSE, proof)?.id === puzzleId,
  );

/**
 * The time to print on a share card: the player's own (paused) clock, capped at the
 * server-measured time from opening to solving. Null when it can't be checked.
 */
export function verifiedSeconds(
  claimedSeconds: number,
  puzzleId: string,
  start: string | undefined,
  proof: string | undefined,
): number | null {
  const opened = start
    ? verifyPayload<{ id: string; startedAt: number }>(START_PURPOSE, start)
    : null;
  const solved = proof
    ? verifyPayload<{ id: string; solvedAt: number }>(SOLVED_PURPOSE, proof)
    : null;
  if (opened?.id !== puzzleId || solved?.id !== puzzleId) return null;
  if (typeof opened.startedAt !== 'number') return null;
  if (typeof solved.solvedAt !== 'number') return null;
  const serverSeconds = Math.floor((solved.solvedAt - opened.startedAt) / 1000);
  const seconds = Math.min(
    Math.max(0, Math.round(claimedSeconds)),
    serverSeconds,
  );
  return seconds >= MIN_SOLVE_SECONDS ? seconds : null;
}

/** Grades an answer (or reveals after 3 tries). Shared by the Daily and Bonus Briefs. */
export function grade(
  puzzle: DailyPuzzle,
  solution: DailySolution,
  req: { type: 'reveal' } | { type: 'answer'; suspect: number; place: number },
  now = new Date(),
) {
  const full = {
    culprit: solution.culprit,
    place: solution.place[solution.culprit]!,
    rows: puzzle.suspects.map((_, index) => ({
      suspect: index,
      place: solution.place[index]!,
      object: solution.object[index]!,
    })),
  };
  if (req.type === 'reveal')
    return {
      status: 200,
      json: { ok: true as const, correct: false, solution: full },
    };
  const correct = checkDailyAnswer(solution, {
    suspect: req.suspect,
    place: req.place,
  });
  return {
    status: 200,
    json: {
      ok: true as const,
      correct,
      solution: correct ? full : undefined,
      // Lets the player make a share card that says "solved" without us trusting their word.
      proof: correct ? solvedProof(puzzle.id, now) : undefined,
    },
  };
}
