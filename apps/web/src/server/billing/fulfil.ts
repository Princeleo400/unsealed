import 'server-only';
import type Stripe from 'stripe';
import { catalogEntry } from '@/lib/catalog';
import { PRICING, isCurrency, isProductId, priceOf, product, type Currency, type ProductId } from '@/lib/pricing';
import type { BillingStore } from './store';

/**
 * Turning a confirmed payment into access. Every function here is idempotent: Stripe and Paystack
 * retry webhooks, and the return page confirms the same payment again, so each may run many times.
 */
export type FulfilResult =
  | { status: 'granted'; userId: string; productId: ProductId }
  | { status: 'ended'; userId: string; productId: ProductId }
  | { status: 'pending'; reason: string }
  | { status: 'ignored'; reason: string };

const DAY = 86_400_000;
const graceMs = () => PRICING.graceDays * DAY;
const ignored = (reason: string): FulfilResult => ({ status: 'ignored', reason });
const pending = (reason: string): FulfilResult => ({ status: 'pending', reason });

export function addInterval(d: Date, interval: 'month' | 'year'): Date {
  const x = new Date(d);
  if (interval === 'month') x.setUTCMonth(x.getUTCMonth() + 1);
  else x.setUTCFullYear(x.getUTCFullYear() + 1);
  return x;
}

const idOf = (x: string | { id: string } | null | undefined): string | null => (typeof x === 'string' ? x : (x?.id ?? null));

function validCase(caseId: unknown, productId: ProductId): caseId is string {
  return typeof caseId === 'string' && catalogEntry(caseId)?.productId === productId;
}

// ------------------------------------------------------------------ Stripe

export interface StripeReader {
  subscription(id: string): Promise<Stripe.Subscription>;
}

/** Checkout finished (return page or `checkout.session.completed` webhook). */
export async function fulfilStripeSession(
  session: Stripe.Checkout.Session,
  store: BillingStore,
  api: StripeReader,
  expectUserId?: string,
): Promise<FulfilResult> {
  const meta = session.metadata ?? {};
  const userId = meta.user_id;
  const productId = meta.product_id;
  if (!userId || !isProductId(productId)) return ignored('session has no UNSEALED metadata');
  if (expectUserId && expectUserId !== userId) return ignored('session belongs to another player');
  if (session.status !== 'complete') return pending('checkout not complete');
  const customer = idOf(session.customer);
  if (customer) await store.setCustomer(userId, { stripe: customer });

  if (session.mode === 'payment') {
    if (product(productId).kind !== 'case') return ignored('one-off payment for a non-case product');
    if (session.payment_status !== 'paid') return pending('payment still processing');
    if (!validCase(meta.case_id, productId)) return ignored('case does not match product');
    const expected = priceOf(productId, 'USD');
    if (session.currency?.toUpperCase() !== 'USD' || session.amount_total !== expected) {
      console.error('stripe amount mismatch', { session: session.id, amount: session.amount_total, currency: session.currency, expected });
      return ignored('amount mismatch');
    }
    const ref = idOf(session.payment_intent) ?? session.id;
    await store.recordPayment({ userId, provider: 'stripe', ref, productId, amountMinor: expected, currency: 'USD' });
    await store.grant({ userId, kind: 'case', caseId: meta.case_id, source: 'stripe', ref, productId, expiresAt: null, mode: 'extend' });
    return { status: 'granted', userId, productId };
  }

  if (session.mode === 'subscription') {
    const subId = idOf(session.subscription);
    if (!subId) return pending('subscription not created yet');
    const sub = typeof session.subscription === 'object' && session.subscription ? session.subscription : await api.subscription(subId);
    return syncStripeSubscription(sub, store);
  }
  return ignored(`unsupported mode ${session.mode}`);
}

/**
 * Mirror a Stripe subscription into the Case Pass entitlement. Always call with a FRESHLY RETRIEVED
 * subscription (webhooks can arrive out of order). `past_due` is left alone on purpose: access runs
 * to the last paid period + grace, and the next successful payment extends it again.
 */
export async function syncStripeSubscription(sub: Stripe.Subscription, store: BillingStore): Promise<FulfilResult> {
  const productId = sub.metadata?.product_id;
  if (!isProductId(productId) || product(productId).kind !== 'pass') return ignored('subscription has no Case Pass product');
  const customer = idOf(sub.customer);
  const userId = sub.metadata?.user_id || (customer ? await store.userForCustomer('stripe', customer) : null);
  if (!userId) return ignored('no player for subscription');

  if (sub.status === 'incomplete') return pending('first payment not completed');
  if (sub.status === 'past_due') return pending('renewal payment failing; access runs to the paid period');
  if (sub.status === 'active' || sub.status === 'trialing') {
    const periodEnd = Math.max(0, ...sub.items.data.map((i) => i.current_period_end ?? 0));
    if (!periodEnd) return pending('no billing period yet');
    await store.grant({ userId, kind: 'pass', source: 'stripe', ref: sub.id, productId, expiresAt: new Date(periodEnd * 1000 + graceMs()), mode: 'set' });
    return { status: 'granted', userId, productId };
  }
  // canceled, unpaid, incomplete_expired, paused: the pass ends now.
  await store.grant({ userId, kind: 'pass', source: 'stripe', ref: sub.id, productId, expiresAt: new Date(), mode: 'set' });
  return { status: 'ended', userId, productId };
}

/** `invoice.paid`: log the charge, then re-sync the subscription it belongs to. */
export async function fulfilStripeInvoice(invoice: Stripe.Invoice, store: BillingStore, api: StripeReader): Promise<FulfilResult> {
  const subId = idOf(invoice.parent?.subscription_details?.subscription);
  if (!subId) return ignored('invoice is not for a subscription');
  const sub = await api.subscription(subId);
  const productId = sub.metadata?.product_id;
  const customer = idOf(sub.customer);
  const userId = sub.metadata?.user_id || (customer ? await store.userForCustomer('stripe', customer) : null);
  if (userId && isProductId(productId) && invoice.amount_paid > 0 && invoice.id) {
    await store.recordPayment({ userId, provider: 'stripe', ref: invoice.id, productId, amountMinor: invoice.amount_paid, currency: invoice.currency.toUpperCase() });
  }
  return syncStripeSubscription(sub, store);
}

/** `charge.refunded`: a fully refunded case purchase stops working. */
export async function refundStripeCharge(charge: Stripe.Charge, store: BillingStore): Promise<FulfilResult> {
  const pi = idOf(charge.payment_intent);
  if (!pi || !charge.refunded) return ignored('not a full refund');
  await store.revoke('stripe', pi);
  return ignored('revoked');
}

// ------------------------------------------------------------------ Paystack

/** The fields we use from a Paystack transaction (`charge.success` webhook or `/transaction/verify`). */
export type PaystackCharge = {
  reference: string;
  status: string;
  amount: number;
  currency: string;
  paid_at?: string | null;
  paidAt?: string | null;
  metadata?: unknown;
  plan?: { plan_code?: string | null } | string | null;
  customer?: { customer_code?: string | null; email?: string | null } | null;
};

function parseMeta(m: unknown): Record<string, unknown> {
  if (typeof m === 'string') {
    try {
      const j = JSON.parse(m) as unknown;
      return j && typeof j === 'object' ? (j as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return m && typeof m === 'object' ? (m as Record<string, unknown>) : {};
}

/**
 * Paystack plan codes come from env (they differ between test and live mode, and each plan has one
 * currency): PAYSTACK_PLAN_PASS_MONTHLY / _ANNUAL are the Naira plans, ..._USD the US$ plans.
 */
const PLAN_ENV: Record<'pass-monthly' | 'pass-annual', Record<Currency, string>> = {
  'pass-monthly': { NGN: 'PAYSTACK_PLAN_PASS_MONTHLY', USD: 'PAYSTACK_PLAN_PASS_MONTHLY_USD' },
  'pass-annual': { NGN: 'PAYSTACK_PLAN_PASS_ANNUAL', USD: 'PAYSTACK_PLAN_PASS_ANNUAL_USD' },
};
export function paystackPlanFor(productId: ProductId, currency: Currency, env: NodeJS.ProcessEnv = process.env): string | null {
  if (productId !== 'pass-monthly' && productId !== 'pass-annual') return null;
  return env[PLAN_ENV[productId][currency]] || null;
}
export function productForPaystackPlan(planCode: string, env: NodeJS.ProcessEnv = process.env): { productId: ProductId; currency: Currency } | null {
  if (!planCode) return null;
  for (const productId of ['pass-monthly', 'pass-annual'] as const)
    for (const currency of ['NGN', 'USD'] as const) if (env[PLAN_ENV[productId][currency]] === planCode) return { productId, currency };
  return null;
}

export async function fulfilPaystackCharge(data: PaystackCharge, store: BillingStore, expectUserId?: string): Promise<FulfilResult> {
  if (data.status !== 'success') return pending(`transaction ${data.status}`);
  const meta = parseMeta(data.metadata);
  const planCode = typeof data.plan === 'string' ? data.plan : (data.plan?.plan_code ?? '');
  const customer = data.customer?.customer_code ?? null;
  let userId = typeof meta.user_id === 'string' ? meta.user_id : null;
  if (!userId && customer) userId = await store.userForCustomer('paystack', customer); // renewals carry no metadata
  if (!userId) return ignored('no player for transaction');
  if (expectUserId && expectUserId !== userId) return ignored('transaction belongs to another player');
  const currency = data.currency?.toUpperCase();
  if (!isCurrency(currency)) return ignored('unexpected currency');
  if (customer) await store.setCustomer(userId, { paystack: customer });
  const paidAt = new Date(data.paid_at ?? data.paidAt ?? Date.now());

  if (planCode) {
    const plan = productForPaystackPlan(planCode);
    if (!plan) return ignored(`unknown plan ${planCode}`);
    if (plan.currency !== currency) return ignored('plan currency mismatch');
    const productId = plan.productId;
    if (!customer) return ignored('subscription charge without a customer');
    // First purchase (our metadata present): the amount must match our price. Renewals are not checked,
    // so players who subscribed before a price change keep their old price.
    if (meta.product_id && data.amount !== priceOf(productId, currency)) {
      console.error('paystack amount mismatch', { ref: data.reference, amount: data.amount, productId });
      return ignored('amount mismatch');
    }
    const p = product(productId);
    if (p.kind !== 'pass') return ignored('plan is not a pass');
    await store.recordPayment({ userId, provider: 'paystack', ref: data.reference, productId, amountMinor: data.amount, currency });
    await store.grant({
      userId,
      kind: 'pass',
      source: 'paystack',
      ref: `${customer}:${planCode}`,
      productId,
      expiresAt: new Date(addInterval(paidAt, p.interval).getTime() + graceMs()),
      mode: 'extend',
    });
    return { status: 'granted', userId, productId };
  }

  const productId = meta.product_id;
  if (!isProductId(productId) || product(productId).kind !== 'case') return ignored('not an UNSEALED purchase');
  if (!validCase(meta.case_id, productId)) return ignored('case does not match product');
  if (data.amount !== priceOf(productId, currency)) {
    console.error('paystack amount mismatch', { ref: data.reference, amount: data.amount, productId });
    return ignored('amount mismatch');
  }
  await store.recordPayment({ userId, provider: 'paystack', ref: data.reference, productId, amountMinor: data.amount, currency });
  await store.grant({ userId, kind: 'case', caseId: meta.case_id, source: 'paystack', ref: data.reference, productId, expiresAt: null, mode: 'extend' });
  return { status: 'granted', userId, productId };
}

/** `refund.processed`: a refunded case purchase stops working. */
export async function refundPaystack(data: { transaction_reference?: string; transaction?: { reference?: string } }, store: BillingStore): Promise<FulfilResult> {
  const ref = data.transaction_reference ?? data.transaction?.reference;
  if (!ref) return ignored('refund without a transaction reference');
  await store.revoke('paystack', ref);
  return ignored('revoked');
}
