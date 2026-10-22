import 'server-only';
import { randomUUID } from 'node:crypto';
import { catalogEntry } from '@/lib/catalog';
import {
  priceOf,
  product,
  providerFor,
  trialDays,
  type Currency,
  type ProductId,
} from '@/lib/pricing';
import { canOpen, loadAccess, type Access } from './access';
import {
  fulfilPaystackCharge,
  fulfilStripeSession,
  paystackPlanFor,
  type FulfilResult,
} from './fulfil';
import {
  initializeTransaction,
  paystackEnabled,
  verifyTransaction,
} from './paystack';
import type { BillingStore } from './store';
import { stripe, stripeEnabled, stripeReader } from './stripe';

export class CheckoutError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

/** Where providers send the player back to. SITE_URL in production; the request's own origin in dev. */
export function siteOrigin(req: Request): string {
  const configured = process.env.SITE_URL?.replace(/\/+$/, '');
  if (configured) return configured;
  return new URL(req.url).origin;
}

/** Can this product be bought in this currency right now? (keys and plans configured) */
export function sellable(productId: ProductId, currency: Currency): boolean {
  if (
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL
  )
    return false; // purchases are recorded with the service role
  if (providerFor(currency) === 'stripe') return stripeEnabled();
  if (!paystackEnabled()) return false;
  return (
    product(productId).kind === 'case' ||
    Boolean(paystackPlanFor(productId, currency))
  );
}

type Start = {
  user: { id: string; email: string };
  productId: ProductId;
  currency: Currency;
  caseSlug?: string | null;
  origin: string;
  /** Page to come back to if the player cancels. Same-site path, already sanitised. */
  backPath: string;
  store: BillingStore;
};

/** Create a Stripe Checkout session or a Paystack transaction; returns the URL to send the player to. */
export async function startCheckout(request: Start): Promise<{ url: string }> {
  const prod = product(request.productId);
  const access: Access = await loadAccess(request.store, request.user.id);

  let caseSlug: string | null = null;
  if (prod.kind === 'case') {
    const entry = request.caseSlug ? catalogEntry(request.caseSlug) : undefined;
    if (
      !entry ||
      entry.productId !== request.productId ||
      entry.status !== 'playable'
    )
      throw new CheckoutError('bad_case', 'That case isn’t on sale.');
    if (canOpen(entry.slug, access))
      throw new CheckoutError(
        'already_owned',
        'You can already open this case.',
        409,
      );
    caseSlug = entry.slug;
  } else if (access.pass) {
    throw new CheckoutError(
      'already_have_pass',
      'Your Case Pass is already active. Manage it from your account.',
      409,
    );
  }

  const amount = priceOf(request.productId, request.currency);
  const meta: Record<string, string> = {
    user_id: request.user.id,
    product_id: request.productId,
    ...(caseSlug ? { case_id: caseSlug } : {}),
  };
  const cancelUrl = `${request.origin}${request.backPath}`;

  if (providerFor(request.currency) === 'stripe') {
    const stripeClient = stripe();
    if (!stripeClient)
      throw new CheckoutError(
        'unavailable',
        'Card payments in US$ aren’t switched on yet.',
        503,
      );
    let customer = (await request.store.getCustomer(request.user.id)).stripe;
    if (!customer) {
      customer = (
        await stripeClient.customers.create({
          email: request.user.email,
          metadata: { user_id: request.user.id },
        })
      ).id;
      await request.store.setCustomer(request.user.id, { stripe: customer });
    }
    const successUrl = `${request.origin}/checkout/success?provider=stripe&ref={CHECKOUT_SESSION_ID}`;
    const name = caseSlug
      ? `${prod.name}: ${catalogEntry(caseSlug)!.title}`
      : prod.name;
    if (prod.kind === 'pass') {
      const trial = (await request.store.everHadPass(request.user.id))
        ? 0
        : trialDays(request.productId, 'USD'); // one free trial per player
      const session = await stripeClient.checkout.sessions.create({
        mode: 'subscription',
        customer,
        client_reference_id: request.user.id,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: amount,
              recurring: { interval: prod.interval },
              product_data: { name },
            },
          },
        ],
        subscription_data: {
          metadata: meta,
          ...(trial ? { trial_period_days: trial } : {}),
        },
        metadata: meta,
        allow_promotion_codes: false,
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
      if (!session.url)
        throw new CheckoutError(
          'provider_error',
          'Couldn’t start the checkout. Please try again.',
          502,
        );
      return { url: session.url };
    }
    const session = await stripeClient.checkout.sessions.create({
      mode: 'payment',
      customer,
      client_reference_id: request.user.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: amount,
            product_data: { name },
          },
        },
      ],
      payment_intent_data: { metadata: meta },
      metadata: meta,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    if (!session.url)
      throw new CheckoutError(
        'provider_error',
        'Couldn’t start the checkout. Please try again.',
        502,
      );
    return { url: session.url };
  }

  if (!paystackEnabled())
    throw new CheckoutError(
      'unavailable',
      'Payments aren’t switched on yet.',
      503,
    );
  const plan =
    prod.kind === 'pass'
      ? paystackPlanFor(request.productId, request.currency)
      : undefined;
  if (prod.kind === 'pass' && !plan)
    throw new CheckoutError(
      'unavailable',
      `The Case Pass in ${request.currency} isn’t set up yet.`,
      503,
    );
  const reference = `uns_${randomUUID().replace(/-/g, '')}`;
  const tx = await initializeTransaction({
    email: request.user.email,
    currency: request.currency,
    amountMinor: amount,
    reference,
    callbackUrl: `${request.origin}/checkout/success?provider=paystack`, // Paystack appends ?reference=…
    metadata: { ...meta, cancel_action: cancelUrl },
    plan: plan ?? undefined,
  });
  return { url: tx.authorization_url };
}

/** The return page: ask the provider directly, so access unlocks even before (or without) the webhook. */
export async function confirmCheckout(
  provider: 'stripe' | 'paystack',
  ref: string,
  userId: string,
  store: BillingStore,
): Promise<FulfilResult> {
  if (provider === 'stripe') {
    const stripeClient = stripe();
    if (!stripeClient)
      throw new CheckoutError(
        'unavailable',
        'Card payments aren’t switched on.',
        503,
      );
    if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(ref))
      throw new CheckoutError('bad_ref', 'Unknown checkout.');
    const session = await stripeClient.checkout.sessions.retrieve(ref, {
      expand: ['subscription'],
    });
    return fulfilStripeSession(
      session,
      store,
      stripeReader(stripeClient),
      userId,
    );
  }
  if (!paystackEnabled())
    throw new CheckoutError(
      'unavailable',
      'Naira payments aren’t switched on.',
      503,
    );
  if (!/^[A-Za-z0-9_.=-]{6,100}$/.test(ref))
    throw new CheckoutError('bad_ref', 'Unknown payment reference.');
  return fulfilPaystackCharge(await verifyTransaction(ref), store, userId);
}
