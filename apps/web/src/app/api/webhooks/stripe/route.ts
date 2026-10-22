import { NextResponse } from 'next/server';
import { supabaseBillingStore } from '@/server/billing/store';
import { stripe, stripeReader } from '@/server/billing/stripe';
import { handleStripeEvent } from '@/server/billing/webhooks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Stripe webhook. The signature is checked against the raw body with STRIPE_WEBHOOK_SECRET. */
export async function POST(req: Request) {
  const stripeClient = stripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const store = supabaseBillingStore();
  if (!stripeClient || !secret || !store)
    return NextResponse.json({ ok: false }, { status: 503 });
  const raw = await req.text();
  let event;
  try {
    event = stripeClient.webhooks.constructEvent(
      raw,
      req.headers.get('stripe-signature') ?? '',
      secret,
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: 'bad signature' },
      { status: 400 },
    );
  }
  try {
    const fulfilResult = await handleStripeEvent(
      event,
      store,
      stripeReader(stripeClient),
    );
    if (
      fulfilResult.status === 'ignored' &&
      !fulfilResult.reason.startsWith('unhandled') &&
      fulfilResult.reason !== 'revoked'
    )
      console.warn(
        'stripe webhook ignored',
        event.type,
        event.id,
        fulfilResult.reason,
      );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('stripe webhook failed', event.type, event.id, error);
    return NextResponse.json({ ok: false }, { status: 500 }); // Stripe retries
  }
}
