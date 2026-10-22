import { NextResponse } from 'next/server';
import { supabaseBillingStore } from '@/server/billing/store';
import { stripe, stripeReader } from '@/server/billing/stripe';
import { handleStripeEvent } from '@/server/billing/webhooks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Stripe webhook. The signature is checked against the raw body with STRIPE_WEBHOOK_SECRET. */
export async function POST(req: Request) {
  const s = stripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const store = supabaseBillingStore();
  if (!s || !secret || !store) return NextResponse.json({ ok: false }, { status: 503 });
  const raw = await req.text();
  let event;
  try {
    event = s.webhooks.constructEvent(raw, req.headers.get('stripe-signature') ?? '', secret);
  } catch {
    return NextResponse.json({ ok: false, error: 'bad signature' }, { status: 400 });
  }
  try {
    const r = await handleStripeEvent(event, store, stripeReader(s));
    if (r.status === 'ignored' && !r.reason.startsWith('unhandled') && r.reason !== 'revoked') console.warn('stripe webhook ignored', event.type, event.id, r.reason);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('stripe webhook failed', event.type, event.id, e);
    return NextResponse.json({ ok: false }, { status: 500 }); // Stripe retries
  }
}
