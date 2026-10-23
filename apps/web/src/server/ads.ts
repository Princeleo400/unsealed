import 'server-only';
import { z } from 'zod';

/** A rewarded-ad completion reported by the browser (see components/ads/rewarded.ts). */
export const AdRewardSchema = z.object({
  provider: z.enum(['gam', 'no-fill', 'dev']),
  id: z.string().min(1).max(100),
});
export type AdRewardInput = z.infer<typeof AdRewardSchema>;

/** The development test ad is never accepted in production. */
export const adRewardAccepted = (reward: AdRewardInput | undefined) =>
  Boolean(
    reward &&
    !(reward.provider === 'dev' && process.env.NODE_ENV === 'production'),
  );
