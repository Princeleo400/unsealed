import { NextResponse } from 'next/server';
import { z } from 'zod';
import { disableAll, paystackEnabled } from '@/server/billing/paystack';
import { supabaseBillingStore } from '@/server/billing/store';
import { cancelAllStripe, stripe } from '@/server/billing/stripe';
import { adminSupabase, currentUser, serverSupabase } from '@/server/supabase';

/** Stop every renewal before the account goes, so nobody is billed for a deleted account. */
async function stopRenewals(userId: string): Promise<boolean> {
  const store = supabaseBillingStore();
  if (!store) return true;
  try {
    const customerIds = await store.getCustomer(userId);
    const stripeClient = stripe();
    if (customerIds.stripe && stripeClient)
      await cancelAllStripe(stripeClient, customerIds.stripe);
    if (customerIds.paystack && paystackEnabled())
      await disableAll(customerIds.paystack);
    if (
      (customerIds.stripe && !stripeClient) ||
      (customerIds.paystack && !paystackEnabled())
    )
      return false; // can't reach a provider we've used
    return true;
  } catch (error) {
    console.error('stopping renewals failed', error);
    return false;
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'private, no-store' };
const Patch = z.object({ displayName: z.string().trim().min(1).max(40) });

/** Update the player's display name (row-level security: own profile only). */
export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json(
      { ok: false, message: 'Please sign in.' },
      { status: 401, headers: noStore },
    );
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { ok: false, message: 'Names must be 1–40 characters.' },
      { status: 400, headers: noStore },
    );
  const sb = (await serverSupabase())!;
  // The profile row is created at sign-up by a database trigger; RLS allows updating only your own.
  const { error } = await sb
    .from('profiles')
    .update({ display_name: parsed.data.displayName })
    .eq('id', user.id);
  if (error)
    return NextResponse.json(
      { ok: false, message: 'Could not save your name.' },
      { status: 500, headers: noStore },
    );
  return NextResponse.json({ ok: true }, { headers: noStore });
}

/**
 * Permanently delete the account (FR-AUTH-05). Every row that belongs to the player is removed by
 * `on delete cascade` in the database. Requires { confirm: "DELETE" } to avoid accidents.
 */
export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json(
      { ok: false, message: 'Please sign in.' },
      { status: 401, headers: noStore },
    );
  const body = (await req.json().catch(() => null)) as {
    confirm?: string;
  } | null;
  if (body?.confirm !== 'DELETE')
    return NextResponse.json(
      { ok: false, message: 'Type DELETE to confirm.' },
      { status: 400, headers: noStore },
    );
  const admin = adminSupabase();
  if (!admin)
    return NextResponse.json(
      { ok: false, message: 'Account deletion is not available right now.' },
      { status: 503, headers: noStore },
    );
  if (!(await stopRenewals(user.id)))
    return NextResponse.json(
      {
        ok: false,
        message:
          'We couldn’t cancel your Case Pass renewal, so the account wasn’t deleted. Please try again.',
      },
      { status: 502, headers: noStore },
    );
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error)
    return NextResponse.json(
      { ok: false, message: 'Could not delete the account. Please try again.' },
      { status: 500, headers: noStore },
    );
  const sb = await serverSupabase();
  await sb?.auth.signOut().catch(() => undefined); // clear the session cookies
  return NextResponse.json({ ok: true }, { headers: noStore });
}
