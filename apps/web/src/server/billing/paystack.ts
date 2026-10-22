import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { PaystackCharge } from './fulfil';

/** Minimal Paystack REST client (no SDK needed). Secret key: PAYSTACK_SECRET_KEY (sk_test_… / sk_live_…). */
const BASE = 'https://api.paystack.co';

export const paystackEnabled = () => Boolean(process.env.PAYSTACK_SECRET_KEY);

async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error('Paystack is not configured');
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: T } | null;
  if (!res.ok || !json?.status) throw new Error(`Paystack ${path} failed: ${res.status} ${json?.message ?? ''}`.trim());
  return json.data as T;
}

/** Start a checkout. With `plan`, Paystack creates a subscription and charges the plan amount. */
export function initializeTransaction(p: {
  email: string;
  currency: 'NGN' | 'USD';
  amountMinor: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, string>;
  plan?: string;
}) {
  return call<{ authorization_url: string; reference: string }>('POST', '/transaction/initialize', {
    email: p.email,
    amount: p.amountMinor,
    currency: p.currency,
    reference: p.reference,
    callback_url: p.callbackUrl,
    metadata: p.metadata,
    ...(p.plan ? { plan: p.plan } : {}),
  });
}

export const verifyTransaction = (reference: string) => call<PaystackCharge>('GET', `/transaction/verify/${encodeURIComponent(reference)}`);

type PaystackSub = { subscription_code: string; email_token: string; status: string };

/** A customer's subscriptions (the customer record includes them). */
export async function customerSubscriptions(customerCode: string): Promise<PaystackSub[]> {
  const c = await call<{ subscriptions?: PaystackSub[] }>('GET', `/customer/${encodeURIComponent(customerCode)}`);
  return c.subscriptions ?? [];
}

const LIVE = new Set(['active', 'non-renewing', 'attention']);

/** Paystack-hosted page where the player can update their card or cancel. */
export async function manageLink(customerCode: string): Promise<string | null> {
  const sub = (await customerSubscriptions(customerCode)).find((s) => LIVE.has(s.status));
  if (!sub) return null;
  const r = await call<{ link: string }>('GET', `/subscription/${encodeURIComponent(sub.subscription_code)}/manage/link`);
  return r.link;
}

/** Stop all renewals (used before deleting an account). */
export async function disableAll(customerCode: string): Promise<void> {
  for (const s of await customerSubscriptions(customerCode)) {
    if (s.status === 'active' || s.status === 'attention') await call('POST', '/subscription/disable', { code: s.subscription_code, token: s.email_token });
  }
}

/** Webhook signature: hex HMAC-SHA512 of the RAW body with the secret key, in `x-paystack-signature`. */
export function verifyPaystackSignature(rawBody: string, signature: string | null, secret = process.env.PAYSTACK_SECRET_KEY): boolean {
  if (!secret || !signature) return false;
  const expected = Buffer.from(createHmac('sha512', secret).update(rawBody).digest('hex'), 'utf8');
  const given = Buffer.from(signature, 'utf8');
  return expected.length === given.length && timingSafeEqual(expected, given);
}
