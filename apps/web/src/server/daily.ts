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
  difficultyLabel: string;
  /** The free window, newest first. */
  archive: string[];
  today: string;
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
    json: { ok: true as const, correct, solution: correct ? full : undefined },
  };
}
