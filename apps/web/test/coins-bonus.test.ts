import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateBonusBrief, newSession } from '@unsealed/engine';
import { COIN_RULES } from '@/lib/coins';
import {
  bonusView,
  handleBonus,
  issueTicket,
  readTicket,
} from '@/server/bonus';
import { startBonus } from '@/server/bonus-start';
import {
  MemoryCoinStore,
  awardAd,
  awardDailySolve,
  claimDailyLogin,
  coinStatus,
} from '@/server/coins';
import { getCase } from '@/server/cases';
import { signState } from '@/server/session';

const USER_ID = 'user-a';
const TODAY = '2026-10-23';
const NOW = new Date('2026-10-23T12:00:00Z');
const SEED = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';

afterEach(() => vi.unstubAllEnvs());

describe('coins', () => {
  it('pay a login bonus once a day and a solve coin only for today’s Daily', async () => {
    const store = new MemoryCoinStore();
    expect(await claimDailyLogin(store, USER_ID, TODAY)).toBe(
      COIN_RULES.dailyLogin,
    );
    expect(await claimDailyLogin(store, USER_ID, TODAY)).toBe(0);
    expect(await awardDailySolve(store, USER_ID, '2026-10-20', TODAY)).toBe(0); // archive
    expect(await awardDailySolve(store, USER_ID, TODAY, TODAY)).toBe(
      COIN_RULES.dailySolve,
    );
    expect(await awardDailySolve(store, USER_ID, TODAY, TODAY)).toBe(0);
    expect(await store.balance(USER_ID)).toBe(
      COIN_RULES.dailyLogin + COIN_RULES.dailySolve,
    );
  });

  it('cap video coins per day; the same video can’t pay twice', async () => {
    const store = new MemoryCoinStore();
    expect((await awardAd(store, USER_ID, TODAY, 'ad-1')).status).toBe(
      'applied',
    );
    expect((await awardAd(store, USER_ID, TODAY, 'ad-1')).status).toBe(
      'duplicate',
    );
    for (let adNumber = 2; adNumber <= COIN_RULES.maxAdsPerDay; adNumber++)
      await awardAd(store, USER_ID, TODAY, `ad-${adNumber}`);
    expect((await awardAd(store, USER_ID, TODAY, 'ad-extra')).status).toBe(
      'cap',
    );
    const status = await coinStatus(store, USER_ID, TODAY, false);
    expect(status).toMatchObject({
      signedIn: true,
      adsLeft: 0,
      balance: COIN_RULES.maxAdsPerDay,
    });
  });
});

describe('starting a Bonus Brief', () => {
  it('Case Pass plays free; members spend a coin; no coins means a clear message', async () => {
    const store = new MemoryCoinStore();
    const pass = await startBonus(
      { difficulty: 'chief' },
      { kind: 'member', userId: USER_ID, pass: true, store },
      NOW,
    );
    expect(pass.json).toMatchObject({ ok: true, paidWith: 'pass' });
    expect(await store.balance(USER_ID)).toBe(0);

    const broke = await startBonus(
      { difficulty: 'rookie' },
      { kind: 'member', userId: USER_ID, pass: false, store },
      NOW,
    );
    expect(broke.status).toBe(402);
    expect(broke.json).toMatchObject({ ok: false, code: 'no_coins' });

    await claimDailyLogin(store, USER_ID, TODAY);
    const paid = await startBonus(
      { difficulty: 'rookie' },
      { kind: 'member', userId: USER_ID, pass: false, store },
      NOW,
    );
    expect(paid.json).toMatchObject({ ok: true, paidWith: 'coin', balance: 0 });
  });

  it('stops at the daily Bonus Brief limit for members without a pass', async () => {
    const store = new MemoryCoinStore();
    store.balances.set(USER_ID, 50);
    const member = {
      kind: 'member' as const,
      userId: USER_ID,
      pass: false,
      store,
    };
    for (let played = 0; played < COIN_RULES.maxBonusPerDay; played++)
      expect(
        (await startBonus({ difficulty: 'detective' }, member, NOW)).status,
      ).toBe(200);
    const limited = await startBonus({ difficulty: 'detective' }, member, NOW);
    expect(limited.status).toBe(429);
    expect(limited.json).toMatchObject({ code: 'bonus_limit' });
  });

  it('guests watch a video, get a small daily allowance, then are asked to sign in', async () => {
    const noAd = await startBonus(
      { difficulty: 'rookie' },
      { kind: 'guest', guestCookie: undefined },
      NOW,
    );
    expect(noAd.json).toMatchObject({ ok: false, code: 'ad_required' });
    const first = await startBonus(
      { difficulty: 'rookie', adReward: { provider: 'no-fill', id: 'x1' } },
      { kind: 'guest', guestCookie: undefined },
      NOW,
    );
    expect(first.json).toMatchObject({ ok: true, paidWith: 'ad' });
    expect(first.guestCookie).toBeTruthy();
    const again = await startBonus(
      { difficulty: 'rookie', adReward: { provider: 'no-fill', id: 'x2' } },
      { kind: 'guest', guestCookie: first.guestCookie },
      NOW,
    );
    expect(again.json).toMatchObject({ ok: false, code: 'guest_limit' });
    // A forged allowance cookie is ignored (treated as unused), never trusted.
    const forged = await startBonus(
      { difficulty: 'rookie', adReward: { provider: 'no-fill', id: 'x3' } },
      {
        kind: 'guest',
        guestCookie: 'eyJkYXkiOiIyMDI2LTEwLTIzIiwidXNlZCI6LTk5fQ.fake',
      },
      NOW,
    );
    expect(forged.json).toMatchObject({ ok: true });
  });

  it('rejects the development test ad in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SESSION_SECRET', 'x'.repeat(40));
    const result = await startBonus(
      { difficulty: 'rookie', adReward: { provider: 'dev', id: 'x' } },
      { kind: 'guest', guestCookie: undefined },
      NOW,
    );
    expect(result.json).toMatchObject({ ok: false, code: 'ad_required' });
  });
});

describe('Bonus Brief tickets', () => {
  it('open the puzzle without its answer, and grade on the server', () => {
    const ticket = issueTicket(SEED, 'detective', NOW);
    const view = bonusView(ticket, NOW)!;
    expect(view.kind).toBe('bonus');
    expect(view.id).toBe('bonus-a1b2c3d4e5f6');
    expect(JSON.stringify(view)).not.toMatch(/culprit|"solution"/);
    const { solution } = generateBonusBrief(SEED, 'detective');
    const right = handleBonus(
      {
        type: 'answer',
        ticket,
        suspect: solution.culprit,
        place: solution.place[solution.culprit],
      },
      NOW,
    );
    expect(right.json).toMatchObject({ ok: true, correct: true });
  });

  it('reject tampered, expired and wrong-purpose tokens', () => {
    const ticket = issueTicket(SEED, 'rookie', NOW);
    const [body, mac] = ticket.split('.');
    const tamperedBody = Buffer.from(
      JSON.stringify({
        seed: SEED,
        difficulty: 'chief',
        issuedAt: NOW.getTime(),
      }),
    ).toString('base64url');
    expect(readTicket(`${tamperedBody}.${mac}`, NOW)).toBeNull();
    expect(
      readTicket(`${body}.${mac}`, new Date('2026-11-05T00:00:00Z')),
    ).toBeNull(); // > 7 days
    const caseToken = signState(newSession(getCase('001-dead-air')!.pub));
    expect(readTicket(caseToken, NOW)).toBeNull();
    expect(handleBonus({ type: 'reveal', ticket: 'garbage' }, NOW).status).toBe(
      410,
    );
  });
});
