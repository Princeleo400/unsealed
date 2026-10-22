import { NextResponse } from 'next/server';
import { loadAccess } from '@/server/billing/access';
import { siteOrigin } from '@/server/billing/checkout';
import { manageLink, paystackEnabled } from '@/server/billing/paystack';
import { supabaseBillingStore } from '@/server/billing/store';
import { stripe } from '@/server/billing/stripe';
import { currentUser } from '@/server/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'private, no-store' };
const fail = (message: string, status: number) => NextResponse.json({ ok: false, message }, { status, headers: noStore });

/** Link to update the card or cancel the Case Pass (FR-PAY-05): Stripe's portal or Paystack's page. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return fail('Please sign in.', 401);
  const store = supabaseBillingStore();
  if (!store) return fail('Billing isn’t switched on.', 503);
  try {
    const [access, customer] = await Promise.all([loadAccess(store, user.id), store.getCustomer(user.id)]);
    const source = access.pass?.source;
    const s = stripe();
    if (source === 'stripe' && s && customer.stripe) {
      const portal = await s.billingPortal.sessions.create({ customer: customer.stripe, return_url: `${siteOrigin(req)}/account` });
      return NextResponse.json({ ok: true, url: portal.url }, { headers: noStore });
    }
    if (source === 'paystack' && paystackEnabled() && customer.paystack) {
      const url = await manageLink(customer.paystack);
      if (url) return NextResponse.json({ ok: true, url }, { headers: noStore });
      return fail('Your Case Pass isn’t renewing, so there’s nothing to manage. It stays active until it ends.', 404);
    }
    return fail('No subscription to manage.', 404);
  } catch (e) {
    console.error('billing manage failed', e);
    return fail('Couldn’t open subscription settings. Please try again.', 502);
  }
}
