/** Coin rules for the Daily Brief, loaded from src/config/coins.json and validated. */
import { z } from 'zod';
import raw from '@/config/coins.json';

const CoinRules = z.object({
  dailyLogin: z.number().int().min(0).max(20),
  dailySolve: z.number().int().min(0).max(20),
  perAd: z.number().int().min(0).max(20),
  maxAdsPerDay: z.number().int().min(0).max(20),
  bonusCost: z.number().int().min(1).max(20),
  maxBonusPerDay: z.number().int().min(0).max(50),
  guestBonusPerDay: z.number().int().min(0).max(10),
});

export const COIN_RULES = CoinRules.parse(raw);

/** What the Daily Brief page needs to show the coin panel. */
export type CoinStatus =
  | {
      signedIn: false;
      guestBonusLeft: number;
    }
  | {
      signedIn: true;
      pass: boolean;
      balance: number;
      adsLeft: number;
      /** null = unlimited (Case Pass). */
      bonusLeft: number | null;
      /** Coins added by today's login bonus on this request (0 if already claimed). */
      loginBonus: number;
    };
