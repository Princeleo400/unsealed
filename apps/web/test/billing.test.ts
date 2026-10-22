import { createHmac } from 'node:crypto';
import type Stripe from 'stripe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CATALOG } from '@/lib/catalog';
import { PRICING, currencyForCountry, formatPrice, priceOf } from '@/lib/pricing';
import type { PlayResponse } from '@/lib/view-types';
import { accessFrom, canOpen, loadAccess, NO_ACCESS } from '@/server/billing/access';
import { fulfilPaystackCharge, fulfilStripeSession, type PaystackCharge, type StripeReader } from '@/server/billing/fulfil';
import { verifyPaystackSignature } from '@/server/billing/paystack';
import { MemoryBillingStore } from '@/server/billing/store';
import { handlePaystackEvent, handleStripeEvent } from '@/server/billing/webhooks';
import { handlePlay } from '@/server/play';

const U = 'user-a';
const V = 'user-b';
const PAID = '002-the-last-toast'; // listed as paid (coming soon) in the catalogue
const DAY = 86_400_000;
const sec = (d: Date) => Math.floor(d.getTime() / 1000);

// ------------------------------------------------------------------ fakes

function sub(over: Partial<Stripe.Subscription> & { periodEnd?: Date } = {}): Stripe.Subscription {
  const end = over.periodEnd ?? new Date(Date.now() + 30 * DAY);
  return {
    id: 'sub_1',
    object: 'subscription',
    status: 'active',
    customer: 'cus_1',
    metadata: { user_id: U, product_id: 'pass-monthly' },
    items: { object: 'list', data: [{ current_period_end: sec(end) } as Stripe.SubscriptionItem], has_more: false, url: '' },
    ...over,
  } as Stripe.Subscription;
}
const reader = (s: Stripe.Subscription): StripeReader => ({ subscription: async () => s });

function session(over: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return {
    id: 'cs_test_1',
    object: 'checkout.session',
    status: 'complete',
    mode: 'payment',
    payment_status: 'paid',
    currency: 'usd',
    amount_total: priceOf('case-standard', 'USD'),
    customer: 'cus_1',
    payment_intent: 'pi_1',
    subscription: null,
    metadata: { user_id: U, product_id: 'case-standard', case_id: PAID },
    ...over,
  } as Stripe.Checkout.Session;
}

function pscharge(over: Partial<PaystackCharge> = {}): PaystackCharge {
  return {
    reference: 'uns_ref1',
    status: 'success',
    amount: priceOf('case-standard', 'NGN'),
    currency: 'NGN',
    paid_at: '2026-10-22T20:00:00.000Z',
    metadata: { user_id: U, product_id: 'case-standard', case_id: PAID },
    plan: {},
    customer: { customer_code: 'CUS_a', email: 'a@example.com' },
    ...over,
  };
}

let store: MemoryBillingStore;
beforeEach(() => {
  store = new MemoryBillingStore();
  vi.stubEnv('PAYSTACK_PLAN_PASS_MONTHLY', 'PLN_month');
  vi.stubEnv('PAYSTACK_PLAN_PASS_ANNUAL', 'PLN_year');
});
afterEach(() => vi.unstubAllEnvs());

// ------------------------------------------------------------------ pricing

describe('pricing config', () => {
  it('matches the price list in docs/05-MONETIZATION', () => {
    expect(formatPrice(priceOf('pass-monthly', 'USD'), 'USD')).toBe('$4.99');
    expect(formatPrice(priceOf('pass-annual', 'USD'), 'USD')).toBe('$29.99');
    expect(formatPrice(priceOf('case-standard', 'USD'), 'USD')).toBe('$2.99');
    expect(formatPrice(priceOf('pass-monthly', 'NGN'), 'NGN')).toBe('₦2,000');
    expect(formatPrice(priceOf('pass-annual', 'NGN'), 'NGN')).toBe('₦15,000');
    expect(formatPrice(priceOf('case-standard', 'NGN'), 'NGN')).toBe('₦1,000');
    expect(PRICING.currencies.NGN.provider).toBe('paystack');
  });
  it('picks Naira for Nigeria and US$ elsewhere', () => {
    expect(currencyForCountry('NG')).toBe('NGN');
    expect(currencyForCountry('ng')).toBe('NGN');
    expect(currencyForCountry('ZA')).toBe('USD');
    expect(currencyForCountry(null)).toBe('USD');
  });
});

// ------------------------------------------------------------------ Stripe

describe('Stripe fulfilment', () => {
  it('a paid case checkout unlocks that case forever, once, however often it is confirmed', async () => {
    for (let i = 0; i < 3; i++) expect((await fulfilStripeSession(session(), store, reader(sub()))).status).toBe('granted');
    expect(store.payments.size).toBe(1);
    const access = await loadAccess(store, U);
    expect(access.cases).toEqual([PAID]);
    expect(canOpen(PAID, access)).toBe(true);
    expect(await store.getCustomer(U)).toEqual({ stripe: 'cus_1', paystack: null });
  });

  it('refuses a session whose amount does not match our price', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await fulfilStripeSession(session({ amount_total: 1 }), store, reader(sub()))).toMatchObject({ status: 'ignored', reason: 'amount mismatch' });
    expect(await loadAccess(store, U)).toEqual(NO_ACCESS);
    spy.mockRestore();
  });

  it('refuses a case that does not match the product, and another player’s session on the return page', async () => {
    expect((await fulfilStripeSession(session({ metadata: { user_id: U, product_id: 'case-standard', case_id: '001-dead-air' } }), store, reader(sub()))).status).toBe('ignored');
    expect(await fulfilStripeSession(session(), store, reader(sub()), V)).toMatchObject({ status: 'ignored', reason: 'session belongs to another player' });
    expect(store.ents.size).toBe(0);
  });

  it('waits while a payment is still processing', async () => {
    expect((await fulfilStripeSession(session({ payment_status: 'unpaid' }), store, reader(sub()))).status).toBe('pending');
    expect((await fulfilStripeSession(session({ status: 'open' }), store, reader(sub()))).status).toBe('pending');
  });

  it('a subscription checkout gives a Case Pass until the period ends, plus grace', async () => {
    const end = new Date('2026-11-22T20:00:00Z');
    const r = await fulfilStripeSession(session({ mode: 'subscription', subscription: 'sub_1', payment_intent: null, metadata: { user_id: U, product_id: 'pass-monthly' } }), store, reader(sub({ periodEnd: end })));
    expect(r.status).toBe('granted');
    const pass = accessFrom(await store.active(U, new Date('2026-11-01'))).pass;
    expect(pass?.expiresAt?.getTime()).toBe(end.getTime() + PRICING.graceDays * DAY);
  });

  it('webhooks re-read the subscription: cancelled ends the pass; past_due keeps the paid period only', async () => {
    const evt = (type: string) => ({ type, data: { object: { id: 'sub_1' } } }) as unknown as Stripe.Event;
    await handleStripeEvent(evt('customer.subscription.created'), store, reader(sub()));
    expect((await loadAccess(store, U)).pass).not.toBeNull();

    const before = store.ents.get('stripe|sub_1')!.expiresAt;
    await handleStripeEvent(evt('customer.subscription.updated'), store, reader(sub({ status: 'past_due', periodEnd: new Date(Date.now() + 60 * DAY) })));
    expect(store.ents.get('stripe|sub_1')!.expiresAt).toEqual(before); // not extended without payment

    await handleStripeEvent(evt('customer.subscription.deleted'), store, reader(sub({ status: 'canceled' })));
    expect((await loadAccess(store, U)).pass).toBeNull();
  });

  it('invoice.paid records the renewal charge and extends the pass', async () => {
    const invoice = { id: 'in_1', amount_paid: 499, currency: 'usd', parent: { subscription_details: { subscription: 'sub_1' } } };
    await handleStripeEvent({ type: 'invoice.paid', data: { object: invoice } } as unknown as Stripe.Event, store, reader(sub()));
    expect(store.payments.get('stripe|in_1')).toMatchObject({ amountMinor: 499, currency: 'USD', userId: U });
    expect((await loadAccess(store, U)).pass?.productId).toBe('pass-monthly');
  });

  it('a full refund takes the case away again', async () => {
    await fulfilStripeSession(session(), store, reader(sub()));
    await handleStripeEvent({ type: 'charge.refunded', data: { object: { payment_intent: 'pi_1', refunded: true } } } as unknown as Stripe.Event, store, reader(sub()));
    expect((await loadAccess(store, U)).cases).toEqual([]);
    expect(store.payments.get('stripe|pi_1')?.status).toBe('refunded');
  });
});

// ------------------------------------------------------------------ Paystack

describe('Paystack fulfilment', () => {
  it('a Naira case purchase unlocks the case and remembers the customer', async () => {
    expect((await fulfilPaystackCharge(pscharge(), store)).status).toBe('granted');
    expect((await fulfilPaystackCharge(pscharge(), store)).status).toBe('granted'); // webhook + return page
    expect(store.payments.size).toBe(1);
    expect((await loadAccess(store, U)).cases).toEqual([PAID]);
    expect(await store.getCustomer(U)).toEqual({ stripe: null, paystack: 'CUS_a' });
  });

  it('first plan charge starts the pass; renewals (no metadata) extend it via the customer', async () => {
    const first = pscharge({ reference: 'r1', amount: priceOf('pass-monthly', 'NGN'), plan: { plan_code: 'PLN_month' }, metadata: { user_id: U, product_id: 'pass-monthly' } });
    expect((await fulfilPaystackCharge(first, store)).status).toBe('granted');
    const e1 = store.ents.get('paystack|CUS_a:PLN_month')!.expiresAt!;
    expect(e1.toISOString()).toBe('2026-11-24T20:00:00.000Z'); // 22 Nov + 2 days grace

    const renewal = pscharge({ reference: 'r2', amount: priceOf('pass-monthly', 'NGN'), plan: { plan_code: 'PLN_month' }, metadata: '', paid_at: '2026-11-22T20:00:00.000Z' });
    expect((await fulfilPaystackCharge(renewal, store)).status).toBe('granted');
    expect(store.ents.get('paystack|CUS_a:PLN_month')!.expiresAt!.toISOString()).toBe('2026-12-24T20:00:00.000Z');
    expect(store.payments.size).toBe(2);

    await fulfilPaystackCharge(first, store); // late replay of the first charge
    expect(store.ents.get('paystack|CUS_a:PLN_month')!.expiresAt!.toISOString()).toBe('2026-12-24T20:00:00.000Z');
  });

  it('a renewal at an old price still renews (grandfathered), but a first purchase must match', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const tampered = pscharge({ amount: 100, plan: { plan_code: 'PLN_year' }, metadata: { user_id: U, product_id: 'pass-annual' } });
    expect(await fulfilPaystackCharge(tampered, store)).toMatchObject({ status: 'ignored', reason: 'amount mismatch' });
    await store.setCustomer(U, { paystack: 'CUS_a' });
    expect((await fulfilPaystackCharge(pscharge({ amount: 1_200_000, plan: { plan_code: 'PLN_year' }, metadata: {} }), store)).status).toBe('granted');
    spy.mockRestore();
  });

  it('ignores failed, foreign-currency, unknown-plan and other players’ transactions', async () => {
    expect((await fulfilPaystackCharge(pscharge({ status: 'abandoned' }), store)).status).toBe('pending');
    expect((await fulfilPaystackCharge(pscharge({ currency: 'GHS' }), store)).status).toBe('ignored');
    expect((await fulfilPaystackCharge(pscharge({ plan: { plan_code: 'PLN_other' } }), store)).status).toBe('ignored');
    expect((await fulfilPaystackCharge(pscharge(), store, V)).status).toBe('ignored');
    expect((await fulfilPaystackCharge(pscharge({ metadata: {}, customer: { customer_code: 'CUS_unknown' } }), store)).status).toBe('ignored');
    expect(store.ents.size).toBe(0);
  });

  it('webhook signatures: valid passes, tampered or missing fails', () => {
    const raw = JSON.stringify({ event: 'charge.success', data: { reference: 'x' } });
    const sig = createHmac('sha512', 'sk_test_secret').update(raw).digest('hex');
    expect(verifyPaystackSignature(raw, sig, 'sk_test_secret')).toBe(true);
    expect(verifyPaystackSignature(raw + ' ', sig, 'sk_test_secret')).toBe(false);
    expect(verifyPaystackSignature(raw, sig, 'sk_test_other')).toBe(false);
    expect(verifyPaystackSignature(raw, null, 'sk_test_secret')).toBe(false);
    expect(verifyPaystackSignature(raw, 'abc', 'sk_test_secret')).toBe(false);
  });

  it('refund.processed takes the case away; other events are ignored', async () => {
    await handlePaystackEvent({ event: 'charge.success', data: pscharge() }, store);
    expect((await loadAccess(store, U)).cases).toEqual([PAID]);
    expect((await handlePaystackEvent({ event: 'subscription.disable', data: {} }, store)).status).toBe('ignored');
    await handlePaystackEvent({ event: 'refund.processed', data: { transaction_reference: 'uns_ref1' } }, store);
    expect((await loadAccess(store, U)).cases).toEqual([]);
  });
});

// ------------------------------------------------------------------ access + paywall

describe('access and the paywall', () => {
  it('the longest pass wins; expired and refunded rows do not count', () => {
    const a = accessFrom([
      { kind: 'pass', caseId: null, productId: 'pass-monthly', source: 'stripe', expiresAt: new Date('2026-11-01') },
      { kind: 'pass', caseId: null, productId: 'pass-annual', source: 'paystack', expiresAt: new Date('2027-10-01') },
    ]);
    expect(a.pass?.productId).toBe('pass-annual');
    expect(canOpen('001-dead-air', null)).toBe(true); // free case: no account needed
    expect(canOpen(PAID, null)).toBe(false);
    expect(canOpen(PAID, a)).toBe(true);
  });

  describe('play API on a paid case', () => {
    const entry = CATALOG.find((c) => c.slug === '001-dead-air')!;
    beforeEach(() => {
      entry.productId = 'case-standard'; // pretend Case 001 is paid for these tests
    });
    afterEach(() => {
      entry.productId = null;
    });
    const start = (ctx: Parameters<typeof handlePlay>[2]) => handlePlay('001-dead-air', { action: { type: 'start' } }, ctx);

    it('signed out or not bought: 402 with paywall details and no case content', async () => {
      const r = await start({ access: null });
      expect(r.status).toBe(402);
      const j = r.json as Extract<PlayResponse, { ok: false }>;
      expect(j.paywall).toEqual({ slug: '001-dead-air', title: 'Dead Air', productId: 'case-standard', signedIn: false });
      expect(j.view).toBeUndefined();
      expect(JSON.stringify(j)).not.toContain('E-01');
      expect((await start({ userId: U, access: NO_ACCESS })).json).toMatchObject({ paywall: { signedIn: true } });
    });

    it('owning the case or a pass opens it; a failed purchase check fails closed', async () => {
      expect((await start({ access: { pass: null, cases: ['001-dead-air'] } })).status).toBe(200);
      expect((await start({ access: { pass: { productId: 'pass-monthly', source: 'stripe', expiresAt: null }, cases: [] } })).status).toBe(200);
      expect((await start({ userId: U, access: 'error' })).status).toBe(503);
    });

    it('a lapsed pass stops working mid-case, even with a valid token', async () => {
      const pass = { pass: { productId: 'pass-monthly', source: 'stripe', expiresAt: null }, cases: [] };
      const r = await start({ access: pass });
      const token = (r.json as Extract<PlayResponse, { ok: true }>).token;
      const next = await handlePlay('001-dead-air', { token, action: { type: 'read', evidenceId: 'E-01' } }, { access: NO_ACCESS });
      expect(next.status).toBe(402);
    });
  });

  it('Case Pass: unlimited hints without ads; free players need an ad after the first', async () => {
    const pass = { pass: { productId: 'pass-annual', source: 'paystack', expiresAt: null }, cases: [] };
    let r = await handlePlay('001-dead-air', { action: { type: 'start' } }, { access: pass });
    let j = r.json as Extract<PlayResponse, { ok: true }>;
    expect(j.view.hintAllowance).toEqual({ freeLeft: 0, adLeft: 0, unlimited: true });
    for (let i = 0; i < 5; i++) {
      r = await handlePlay('001-dead-air', { token: j.token, action: { type: 'hint', tier: 'nudge' } }, { access: pass });
      expect(r.status).toBe(200);
      j = r.json as Extract<PlayResponse, { ok: true }>;
    }
    // The same save without a pass: limit reached.
    const free = await handlePlay('001-dead-air', { token: j.token, action: { type: 'hint', tier: 'nudge', adReward: { provider: 'no-fill', id: 'x' } } }, {});
    expect(free.status).toBe(422);
    expect((free.json as Extract<PlayResponse, { ok: false }>).error.code).toBe('hint_limit');
  });
});
