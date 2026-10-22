import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loadAccess, summarise } from '@/server/billing/access';
import { CheckoutError, confirmCheckout } from '@/server/billing/checkout';
import { supabaseBillingStore } from '@/server/billing/store';
import { currentUser } from '@/server/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'private, no-store' };
const Body = z.object({ provider: z.enum(['stripe', 'paystack']), ref: z.string().min(1).max(200) });

/** Called by the return page: checks the payment with the provider and unlocks it (idempotent). */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, code: 'sign_in', message: 'Sign in to finish your purchase.' }, { status: 401, headers: noStore });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, code: 'bad_request', message: 'Invalid request.' }, { status: 400, headers: noStore });
  const store = supabaseBillingStore();
  if (!store) return NextResponse.json({ ok: false, code: 'unavailable', message: 'Purchases aren’t switched on.' }, { status: 503, headers: noStore });
  try {
    const r = await confirmCheckout(parsed.data.provider, parsed.data.ref, user.id, store);
    const access = summarise(await loadAccess(store, user.id));
    const status = r.status === 'granted' ? 'paid' : r.status === 'pending' ? 'pending' : 'failed';
    return NextResponse.json({ ok: true, status, productId: 'productId' in r ? r.productId : null, access }, { headers: noStore });
  } catch (e) {
    if (e instanceof CheckoutError) return NextResponse.json({ ok: false, code: e.code, message: e.message }, { status: e.status, headers: noStore });
    console.error('checkout confirm failed', e);
    return NextResponse.json({ ok: false, code: 'provider_error', message: 'We couldn’t check your payment just now.' }, { status: 502, headers: noStore });
  }
}
