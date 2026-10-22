import 'server-only';
import Stripe from 'stripe';
import type { StripeReader } from './fulfil';

/** Stripe client. Secret key: STRIPE_SECRET_KEY (sk_test_… / sk_live_…). Null when not configured. */
let client: Stripe | null = null;

export const stripeEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY);

export function stripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client ??= new Stripe(key, {
    maxNetworkRetries: 2,
    timeout: 15_000,
    appInfo: { name: 'UNSEALED' },
  });
  return client;
}

export function stripeReader(stripeClient: Stripe): StripeReader {
  return { subscription: (id) => stripeClient.subscriptions.retrieve(id) };
}

/** Cancel every live subscription immediately (used before deleting an account). */
export async function cancelAllStripe(
  stripeClient: Stripe,
  customerId: string,
): Promise<void> {
  for await (const sub of stripeClient.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 100,
  })) {
    if (
      ['active', 'trialing', 'past_due', 'unpaid', 'incomplete'].includes(
        sub.status,
      )
    )
      await stripeClient.subscriptions.cancel(sub.id);
  }
}
