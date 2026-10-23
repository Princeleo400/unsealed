import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GUEST_COOKIE } from '@/server/bonus';
import { startBonus } from '@/server/bonus-start';
import { viewerAccess } from '@/server/billing/viewer';
import { supabaseCoinStore } from '@/server/coins';
import { currentUser } from '@/server/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'private, no-store' };

/** Starts a Bonus Brief: Case Pass free, members spend a coin, guests watch a video. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const user = await currentUser();
  const store = user ? supabaseCoinStore() : null;
  const cookieStore = await cookies();
  try {
    const result = await startBonus(
      body,
      user && store
        ? {
            kind: 'member',
            userId: user.id,
            pass: Boolean((await viewerAccess())?.pass),
            store,
          }
        : { kind: 'guest', guestCookie: cookieStore.get(GUEST_COOKIE)?.value },
    );
    const response = NextResponse.json(result.json, {
      status: result.status,
      headers: noStore,
    });
    if (result.guestCookie)
      response.cookies.set(GUEST_COOKIE, result.guestCookie, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 2 * 86400,
        path: '/',
      });
    return response;
  } catch (error) {
    console.error('bonus start failed', error);
    return NextResponse.json(
      { ok: false, message: 'Couldn’t start a Bonus Brief. Please try again.' },
      { status: 500, headers: noStore },
    );
  }
}
