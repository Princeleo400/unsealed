import 'server-only';
import { COIN_RULES, type CoinStatus } from '@/lib/coins';
import { adminSupabase } from './supabase';

export type CoinReason = 'daily_login' | 'daily_solve' | 'ad' | 'bonus_spend';
export type CoinResult = {
  status: 'applied' | 'duplicate' | 'cap' | 'insufficient';
  balance: number;
};

/** Where coins live. Swappable so the rules can be tested without a database. */
export interface CoinStore {
  apply(
    userId: string,
    delta: number,
    reason: CoinReason,
    ref: string,
    day: string,
    dailyCap?: number | null,
  ): Promise<CoinResult>;
  balance(userId: string): Promise<number>;
  countToday(userId: string, reason: CoinReason, day: string): Promise<number>;
}

/** Supabase store using the service role (server only); null when not configured. */
export function supabaseCoinStore(): CoinStore | null {
  const db = adminSupabase();
  if (!db) return null;
  return {
    async apply(userId, delta, reason, ref, day, dailyCap = null) {
      const { data, error } = await db.rpc('coin_apply', {
        p_user: userId,
        p_delta: delta,
        p_reason: reason,
        p_ref: ref,
        p_day: day,
        p_daily_cap: dailyCap,
      });
      if (error) throw new Error(`coin_apply failed: ${error.message}`);
      return data as CoinResult;
    },
    async balance(userId) {
      const { data, error } = await db
        .from('coin_wallets')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw new Error(`coin balance failed: ${error.message}`);
      return (data?.balance as number | undefined) ?? 0;
    },
    async countToday(userId, reason, day) {
      const { count, error } = await db
        .from('coin_ledger')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('reason', reason)
        .eq('day', day);
      if (error) throw new Error(`coin count failed: ${error.message}`);
      return count ?? 0;
    },
  };
}

/** In-memory store for tests; mirrors coin_apply in the database. */
export class MemoryCoinStore implements CoinStore {
  balances = new Map<string, number>();
  ledger: {
    userId: string;
    reason: CoinReason;
    ref: string;
    day: string;
    delta: number;
  }[] = [];
  async apply(
    userId: string,
    delta: number,
    reason: CoinReason,
    ref: string,
    day: string,
    dailyCap: number | null = null,
  ): Promise<CoinResult> {
    const balance = this.balances.get(userId) ?? 0;
    const sameRow = (entry: (typeof this.ledger)[number]) =>
      entry.userId === userId && entry.reason === reason;
    if (this.ledger.some((entry) => sameRow(entry) && entry.ref === ref))
      return { status: 'duplicate', balance };
    if (
      dailyCap !== null &&
      this.ledger.filter((entry) => sameRow(entry) && entry.day === day)
        .length >= dailyCap
    )
      return { status: 'cap', balance };
    if (balance + delta < 0) return { status: 'insufficient', balance };
    this.ledger.push({ userId, reason, ref, day, delta });
    this.balances.set(userId, balance + delta);
    return { status: 'applied', balance: balance + delta };
  }
  async balance(userId: string) {
    return this.balances.get(userId) ?? 0;
  }
  async countToday(userId: string, reason: CoinReason, day: string) {
    return this.ledger.filter(
      (entry) =>
        entry.userId === userId && entry.reason === reason && entry.day === day,
    ).length;
  }
}

/** Today's login bonus; paid once per UTC day. Returns the coins added (0 if already claimed). */
export async function claimDailyLogin(
  store: CoinStore,
  userId: string,
  today: string,
): Promise<number> {
  if (!COIN_RULES.dailyLogin) return 0;
  const result = await store.apply(
    userId,
    COIN_RULES.dailyLogin,
    'daily_login',
    today,
    today,
  );
  return result.status === 'applied' ? COIN_RULES.dailyLogin : 0;
}

/** Solving today's Daily (on the day itself, not from the archive) pays once. */
export async function awardDailySolve(
  store: CoinStore,
  userId: string,
  date: string,
  today: string,
): Promise<number> {
  if (date !== today || !COIN_RULES.dailySolve) return 0;
  const result = await store.apply(
    userId,
    COIN_RULES.dailySolve,
    'daily_solve',
    date,
    today,
  );
  return result.status === 'applied' ? COIN_RULES.dailySolve : 0;
}

/** A watched rewarded ad. Capped per day; the same ad can't be counted twice. */
export function awardAd(
  store: CoinStore,
  userId: string,
  today: string,
  adId: string,
): Promise<CoinResult> {
  return store.apply(
    userId,
    COIN_RULES.perAd,
    'ad',
    `${today}:${adId}`.slice(0, 120),
    today,
    COIN_RULES.maxAdsPerDay,
  );
}

/** Pays for one Bonus Brief (the puzzle seed is the receipt). */
export function spendForBonus(
  store: CoinStore,
  userId: string,
  today: string,
  seed: string,
): Promise<CoinResult> {
  return store.apply(
    userId,
    -COIN_RULES.bonusCost,
    'bonus_spend',
    seed,
    today,
    COIN_RULES.maxBonusPerDay,
  );
}

export async function coinStatus(
  store: CoinStore,
  userId: string,
  today: string,
  pass: boolean,
  loginBonus = 0,
): Promise<CoinStatus> {
  const [balance, adsToday, bonusToday] = await Promise.all([
    store.balance(userId),
    store.countToday(userId, 'ad', today),
    store.countToday(userId, 'bonus_spend', today),
  ]);
  return {
    signedIn: true,
    pass,
    balance,
    adsLeft: Math.max(0, COIN_RULES.maxAdsPerDay - adsToday),
    bonusLeft: pass
      ? null
      : Math.max(0, COIN_RULES.maxBonusPerDay - bonusToday),
    loginBonus,
  };
}
