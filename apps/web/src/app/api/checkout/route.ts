import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CURRENCIES, PRODUCT_IDS, type ProductId } from '@/lib/pricing';
import { safeNext } from '@/lib/supabase/config';
import {
  CheckoutError,
  siteOrigin,
  startCheckout,
} from '@/server/billing/checkout';
import { supabaseBillingStore } from '@/server/billing/store';
import { currentUser } from '@/server/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'private, no-store' };
const Body = z.object({
  productId: z.enum(PRODUCT_IDS as [ProductId, ...ProductId[]]),
  currency: z.enum(CURRENCIES),
  caseSlug: z.string().max(60).optional(),
  back: z.string().max(200).optional(),
});

/** Start a purchase (FR-PAY-02). Signed-in players only: what they buy is tied to their account. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user?.email)
    return NextResponse.json(
      { ok: false, code: 'sign_in', message: 'Sign in to buy.' },
      { status: 401, headers: noStore },
    );
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { ok: false, code: 'bad_request', message: 'Invalid request.' },
      { status: 400, headers: noStore },
    );
  const store = supabaseBillingStore();
  if (!store)
    return NextResponse.json(
      {
        ok: false,
        code: 'unavailable',
        message: 'Purchases aren’t switched on yet.',
      },
      { status: 503, headers: noStore },
    );
  const body = parsed.data;
  try {
    const { url } = await startCheckout({
      user: { id: user.id, email: user.email },
      productId: body.productId,
      currency: body.currency,
      caseSlug: body.caseSlug,
      origin: siteOrigin(req),
      backPath: safeNext(body.back, '/pass'),
      store,
    });
    return NextResponse.json({ ok: true, url }, { headers: noStore });
  } catch (error) {
    if (error instanceof CheckoutError)
      return NextResponse.json(
        { ok: false, code: error.code, message: error.message },
        { status: error.status, headers: noStore },
      );
    console.error('checkout failed', error);
    return NextResponse.json(
      {
        ok: false,
        code: 'provider_error',
        message: 'Couldn’t start the checkout. Please try again.',
      },
      { status: 502, headers: noStore },
    );
  }
}
