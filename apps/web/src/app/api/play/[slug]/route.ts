import { NextResponse } from 'next/server';
import { catalogEntry } from '@/lib/catalog';
import { loadAccess, type Access } from '@/server/billing/access';
import { supabaseBillingStore } from '@/server/billing/store';
import { handlePlay } from '@/server/play';
import { supabaseSaveStore } from '@/server/saves';
import { currentUser } from '@/server/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'bad_json', message: 'Invalid JSON.' } },
      { status: 400 },
    );
  }
  const user = await currentUser();

  // Purchases: needed for paid cases (paywall) and for Case Pass perks (unlimited hints).
  let access: Access | 'error' | null = null;
  const billing = user ? supabaseBillingStore() : null;
  if (user && billing) {
    try {
      access = await loadAccess(billing, user.id);
    } catch (error) {
      console.error('access check failed', error);
      access = catalogEntry(slug)?.productId ? 'error' : null; // free cases carry on without perks
    }
  }

  const { status, json } = await handlePlay(
    slug,
    body,
    user
      ? { userId: user.id, store: await supabaseSaveStore(), access }
      : { access },
  );
  return NextResponse.json(json, {
    status,
    headers: { 'Cache-Control': user ? 'private, no-store' : 'no-store' },
  });
}
