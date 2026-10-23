import 'server-only';
import { z } from 'zod';
import { COIN_RULES } from '@/lib/coins';
import { AdRewardSchema, adRewardAccepted } from './ads';
import {
  DIFFICULTIES,
  guestBonusCookie,
  guestBonusUsed,
  issueTicket,
  newBonusSeed,
} from './bonus';
import { spendForBonus, type CoinStore } from './coins';
import { todayUTC } from './daily';

export const StartBonusRequest = z.object({
  difficulty: z.enum(DIFFICULTIES),
  adReward: AdRewardSchema.optional(),
});

type Player =
  | { kind: 'member'; userId: string; pass: boolean; store: CoinStore }
  | { kind: 'guest'; guestCookie: string | undefined };

type StartResult = {
  status: number;
  json:
    | { ok: true; ticket: string; balance?: number; paidWith: string }
    | { ok: false; code: string; message: string; balance?: number };
  guestCookie?: string;
};

/** Pays for a Bonus Brief (pass / coin / ad) and returns its ticket. */
export async function startBonus(
  body: unknown,
  player: Player,
  now = new Date(),
): Promise<StartResult> {
  const parsed = StartBonusRequest.safeParse(body);
  if (!parsed.success)
    return {
      status: 400,
      json: { ok: false, code: 'bad_request', message: 'Invalid request.' },
    };
  const today = todayUTC(now);
  const seed = newBonusSeed();
  const ticket = issueTicket(seed, parsed.data.difficulty, now);

  if (player.kind === 'member') {
    if (player.pass)
      return { status: 200, json: { ok: true, ticket, paidWith: 'pass' } };
    const result = await spendForBonus(
      player.store,
      player.userId,
      today,
      seed,
    );
    if (result.status === 'applied')
      return {
        status: 200,
        json: { ok: true, ticket, balance: result.balance, paidWith: 'coin' },
      };
    if (result.status === 'cap')
      return {
        status: 429,
        json: {
          ok: false,
          code: 'bonus_limit',
          message: `That's ${COIN_RULES.maxBonusPerDay} Bonus Briefs today. Come back tomorrow, or get Case Pass for unlimited.`,
          balance: result.balance,
        },
      };
    return {
      status: 402,
      json: {
        ok: false,
        code: 'no_coins',
        message: 'Not enough coins. Watch a short video to earn one.',
        balance: result.balance,
      },
    };
  }

  // Guests: one short video per Bonus Brief, a small daily allowance, then sign in for coins.
  const used = guestBonusUsed(player.guestCookie, today);
  if (used >= COIN_RULES.guestBonusPerDay)
    return {
      status: 429,
      json: {
        ok: false,
        code: 'guest_limit',
        message:
          'Sign in to keep playing: you get free coins every day, and your streak is saved.',
      },
    };
  if (!adRewardAccepted(parsed.data.adReward))
    return {
      status: 402,
      json: {
        ok: false,
        code: 'ad_required',
        message: 'Watch a short video to play a Bonus Brief.',
      },
    };
  return {
    status: 200,
    json: { ok: true, ticket, paidWith: 'ad' },
    guestCookie: guestBonusCookie(today, used + 1),
  };
}
