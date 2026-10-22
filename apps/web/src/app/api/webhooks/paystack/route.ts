import { NextResponse } from 'next/server';
import { verifyPaystackSignature } from '@/server/billing/paystack';
import { supabaseBillingStore } from '@/server/billing/store';
import { handlePaystackEvent } from '@/server/billing/webhooks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Paystack webhook. The signature is an HMAC-SHA512 of the raw body with PAYSTACK_SECRET_KEY. */
export async function POST(req: Request) {
  const store = supabaseBillingStore();
  if (!process.env.PAYSTACK_SECRET_KEY || !store) return NextResponse.json({ ok: false }, { status: 503 });
  const raw = await req.text();
  if (!verifyPaystackSignature(raw, req.headers.get('x-paystack-signature'))) return NextResponse.json({ ok: false }, { status: 401 });
  let body: { event?: string; data?: unknown };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  try {
    const r = await handlePaystackEvent(body, store);
    if (r.status === 'ignored' && !r.reason.startsWith('unhandled') && r.reason !== 'revoked') console.warn('paystack webhook ignored', body.event, r.reason);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('paystack webhook failed', body.event, e);
    return NextResponse.json({ ok: false }, { status: 500 }); // Paystack retries
  }
}
