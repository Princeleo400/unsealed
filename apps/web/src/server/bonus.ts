import 'server-only';
import { randomBytes } from 'node:crypto';
import {
  BONUS_SEED_PATTERN,
  DAILY_EPOCH,
  DIFFICULTY_LABEL,
  generateBonusBrief,
  type Difficulty,
} from '@unsealed/engine';
import { z } from 'zod';
import { grade, startToken, todayUTC, type DailyView } from './daily';
import { signPayload, verifyPayload } from './session';

/**
 * Bonus Briefs: extra puzzles bought with a coin, a rewarded ad (guests) or Case Pass.
 * The player holds a signed ticket naming the puzzle seed; without a valid ticket there
 * is no puzzle, and the answer is graded here so it never reaches the browser.
 */
export const DIFFICULTIES = [
  'rookie',
  'detective',
  'inspector',
  'chief',
] as const satisfies readonly Difficulty[];
const TICKET_PURPOSE = 'bonus-ticket';
const TICKET_DAYS = 7;
const DAY_MS = 86_400_000;

type Ticket = { seed: string; difficulty: Difficulty; issuedAt: number };

const salt = () => process.env.DAILY_SALT || 'unsealed';

export const newBonusSeed = () => randomBytes(16).toString('hex');

export function issueTicket(
  seed: string,
  difficulty: Difficulty,
  now = new Date(),
): string {
  return signPayload(TICKET_PURPOSE, {
    seed,
    difficulty,
    issuedAt: now.getTime(),
  } satisfies Ticket);
}

export function readTicket(token: string, now = new Date()): Ticket | null {
  const ticket = verifyPayload<Ticket>(TICKET_PURPOSE, token);
  if (!ticket) return null;
  if (!BONUS_SEED_PATTERN.test(ticket.seed)) return null;
  if (!(DIFFICULTIES as readonly string[]).includes(ticket.difficulty))
    return null;
  if (now.getTime() - ticket.issuedAt > TICKET_DAYS * DAY_MS) return null;
  return ticket;
}

export function bonusView(token: string, now = new Date()): DailyView | null {
  const ticket = readTicket(token, now);
  if (!ticket) return null;
  const { puzzle } = generateBonusBrief(ticket.seed, ticket.difficulty, salt());
  return {
    ...puzzle,
    kind: 'bonus',
    ticket: token,
    startToken: startToken(puzzle.id, now),
    difficultyLabel: DIFFICULTY_LABEL[puzzle.difficulty],
    archive: [],
    today: todayUTC(now),
    fullArchive: false,
    epoch: DAILY_EPOCH,
  };
}

const BonusRequest = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('answer'),
    ticket: z.string().max(4000),
    suspect: z.number().int().min(0).max(9),
    place: z.number().int().min(0).max(9),
  }),
  z.object({ type: z.literal('reveal'), ticket: z.string().max(4000) }),
]);

export function handleBonus(body: unknown, now = new Date()) {
  const parsed = BonusRequest.safeParse(body);
  if (!parsed.success)
    return {
      status: 400,
      json: { ok: false as const, message: 'Invalid request.' },
    };
  const ticket = readTicket(parsed.data.ticket, now);
  if (!ticket)
    return {
      status: 410,
      json: {
        ok: false as const,
        message: 'This Bonus Brief has expired. Start a new one.',
      },
    };
  const { puzzle, solution } = generateBonusBrief(
    ticket.seed,
    ticket.difficulty,
    salt(),
  );
  return grade(puzzle, solution, parsed.data, now);
}

/** Guests get a small daily allowance (kept in a signed cookie) before being asked to sign in. */
const GUEST_PURPOSE = 'guest-bonus';
export const GUEST_COOKIE = 'unsealed_guest_bonus';
type GuestAllowance = { day: string; used: number };

export function guestBonusUsed(cookie: string | undefined, today: string) {
  const allowance = cookie
    ? verifyPayload<GuestAllowance>(GUEST_PURPOSE, cookie)
    : null;
  return allowance?.day === today ? allowance.used : 0;
}

export const guestBonusCookie = (today: string, used: number) =>
  signPayload(GUEST_PURPOSE, { day: today, used } satisfies GuestAllowance);
