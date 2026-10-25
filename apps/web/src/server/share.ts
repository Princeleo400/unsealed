import 'server-only';
import { computeScore } from '@unsealed/engine';
import { z } from 'zod';
import { bonusView } from './bonus';
import { getCase } from './cases';
import {
  dailyView,
  isPublishedDate,
  isSolvedProof,
  verifiedSeconds,
} from './daily';
import { signPayload, verifyPayload, verifyState } from './session';

/**
 * Share cards (spoiler-free result images). The server builds the card from data it can
 * check: a case card from the signed play state, a Daily card from the puzzle plus a
 * signed "solved" proof and
 * server-checked time. The card never names the culprit, place or object.
 */
const SHARE_PURPOSE = 'share';

export const BADGE_LABELS: Record<string, string> = {
  sharp: 'Sharp',
  swift: 'Swift',
  unassisted: 'Unassisted',
  weaver: 'Weaver',
};

const DailyCardSchema = z.object({
  kind: z.literal('daily'),
  /** "Daily Brief #23" or "Bonus Brief". */
  label: z.string().max(40),
  city: z.string().max(60),
  difficulty: z.string().max(20),
  solved: z.boolean(),
  wrong: z.number().int().min(0).max(3),
  /** Solve time checked against the server's clock; null = not shown. */
  seconds: z.number().int().min(0).max(86_400).nullable(),
});
const CaseCardSchema = z.object({
  kind: z.literal('case'),
  caseId: z.string().max(60),
  title: z.string().max(80),
  city: z.string().max(60),
  solved: z.boolean(),
  score: z.number().int().min(0).max(10_000),
  accusations: z.number().int().min(0).max(3),
  badges: z.array(z.string().max(20)).max(6),
  breakthroughs: z.number().int().min(0).max(50),
  breakthroughsTotal: z.number().int().min(0).max(50),
});
export const ShareCardSchema = z.discriminatedUnion('kind', [
  DailyCardSchema,
  CaseCardSchema,
]);
export type ShareCard = z.infer<typeof ShareCardSchema>;

export const ShareRequest = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('daily'),
    date: z.string().max(10).optional(),
    ticket: z.string().max(2000).optional(),
    proof: z.string().max(400).optional(),
    start: z.string().max(400).optional(),
    wrong: z.number().int().min(0).max(3),
    seconds: z.number().int().min(0),
  }),
  z.object({
    kind: z.literal('case'),
    caseId: z.string().max(60),
    token: z.string().max(20_000),
  }),
]);

type ShareResult =
  | { status: 200; json: { ok: true; token: string; card: ShareCard } }
  | { status: 400 | 404 | 409; json: { ok: false; message: string } };

const fail = (status: 400 | 404 | 409, message: string): ShareResult => ({
  status,
  json: { ok: false, message },
});

export function createShare(body: unknown, now = new Date()): ShareResult {
  const parsed = ShareRequest.safeParse(body);
  if (!parsed.success) return fail(400, 'Invalid request.');
  const request = parsed.data;
  const card =
    request.kind === 'daily' ? dailyCard(request, now) : caseCard(request);
  if (typeof card === 'string')
    return fail(
      card === 'unfinished' ? 409 : 404,
      card === 'unfinished'
        ? 'Finish the case to share your result.'
        : 'Nothing to share.',
    );
  return {
    status: 200,
    json: { ok: true, token: signPayload(SHARE_PURPOSE, card), card },
  };
}

function dailyCard(
  request: Extract<z.infer<typeof ShareRequest>, { kind: 'daily' }>,
  now: Date,
): ShareCard | 'missing' {
  const view = request.ticket
    ? bonusView(request.ticket, now)
    : request.date && isPublishedDate(request.date, now)
      ? dailyView(request.date, now)
      : null;
  if (!view) return 'missing';
  const solved = isSolvedProof(request.proof, view.id);
  return {
    kind: 'daily',
    label:
      view.kind === 'bonus' ? 'Bonus Brief' : `Daily Brief #${view.number}`,
    city: view.city,
    difficulty: view.difficultyLabel,
    solved,
    // Without a proof the card says "cold", so inflated claims only ever make it look worse.
    wrong: solved ? Math.min(2, request.wrong) : 3,
    seconds: solved
      ? verifiedSeconds(
          Math.min(86_400, request.seconds),
          view.id,
          request.start,
          request.proof,
        )
      : null,
  };
}

function caseCard(
  request: Extract<z.infer<typeof ShareRequest>, { kind: 'case' }>,
): ShareCard | 'missing' | 'unfinished' {
  const loaded = getCase(request.caseId);
  if (!loaded) return 'missing';
  const state = verifyState(request.token, {
    caseId: loaded.pub.id,
    version: loaded.pub.version,
  });
  if (!state) return 'missing';
  if (state.status === 'active') return 'unfinished';
  const score = computeScore(state, loaded.sol, loaded.pub.parHours);
  return {
    kind: 'case',
    caseId: loaded.pub.id,
    title: loaded.pub.title,
    city: loaded.pub.city.name,
    solved: state.status === 'solved',
    score: score.total,
    accusations: state.accusations.length,
    badges: score.badges,
    breakthroughs: state.breakthroughs.length,
    breakthroughsTotal: loaded.sol.breakthroughs.length,
  };
}

export function readShare(token: string): ShareCard | null {
  const payload = verifyPayload<unknown>(SHARE_PURPOSE, token);
  const parsed = ShareCardSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

export const clock = (totalSeconds: number) =>
  `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;

/** One line for link previews and the share sheet. */
export function shareHeadline(card: ShareCard): string {
  if (card.kind === 'daily')
    return card.solved
      ? card.seconds === null
        ? `${card.label} solved`
        : `${card.label} solved in ${clock(card.seconds)}`
      : `${card.label}: the case went cold`;
  return card.solved
    ? `"${card.title}" solved · score ${card.score}`
    : `"${card.title}" went cold`;
}

/** Where "Can you solve it?" leads. Bonus and old Dailies point at today's Daily. */
export const shareTarget = (card: ShareCard) =>
  card.kind === 'case' ? `/play/${card.caseId}` : '/daily';
