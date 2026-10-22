import 'server-only';
import type Stripe from 'stripe';
import {
  fulfilPaystackCharge,
  fulfilStripeInvoice,
  fulfilStripeSession,
  refundPaystack,
  refundStripeCharge,
  syncStripeSubscription,
  type FulfilResult,
  type PaystackCharge,
  type StripeReader,
} from './fulfil';
import type { BillingStore } from './store';

/** Stripe events we act on. Configure exactly these in the Stripe dashboard (docs/09-PAYMENTS-SETUP.md). */
export const STRIPE_EVENTS = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'charge.refunded',
] as const;

export async function handleStripeEvent(
  event: Stripe.Event,
  store: BillingStore,
  api: StripeReader,
): Promise<FulfilResult> {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      return fulfilStripeSession(event.data.object, store, api);
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      // Re-read the subscription: events can arrive out of order, the API is always current.
      return syncStripeSubscription(
        await api.subscription(event.data.object.id),
        store,
      );
    case 'invoice.paid':
      return fulfilStripeInvoice(event.data.object, store, api);
    case 'charge.refunded':
      return refundStripeCharge(event.data.object, store);
    default:
      return { status: 'ignored', reason: `unhandled ${event.type}` };
  }
}

export async function handlePaystackEvent(
  body: { event?: string; data?: unknown },
  store: BillingStore,
): Promise<FulfilResult> {
  switch (body.event) {
    case 'charge.success':
      return fulfilPaystackCharge(body.data as PaystackCharge, store);
    case 'refund.processed':
      return refundPaystack(
        (body.data ?? {}) as { transaction_reference?: string },
        store,
      );
    default:
      // subscription.create / disable / not_renew need no action: access simply runs to its paid expiry.
      return { status: 'ignored', reason: `unhandled ${body.event}` };
  }
}
