import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COIN_RULES, type CoinStatus } from '@/lib/coins';
import { GUEST_COOKIE, guestBonusUsed } from '@/server/bonus';
import { viewerAccess } from '@/server/billing/viewer';
import { claimDailyLogin, coinStatus, supabaseCoinStore } from '@/server/coins';
import { todayUTC } from '@/server/daily';
import { currentUser } from '@/server/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'private, no-store' };

/** The player's coins. Opening this also pays today's login bonus (once per day). */
export async function GET() {
  const today = todayUTC();
  const user = await currentUser();
  const store = user ? supabaseCoinStore() : null;
  if (!user || !store) {
    const used = guestBonusUsed(
      (await cookies()).get(GUEST_COOKIE)?.value,
      today,
    );
    const status: CoinStatus = {
      signedIn: false,
      guestBonusLeft: Math.max(0, COIN_RULES.guestBonusPerDay - used),
    };
    return NextResponse.json({ ok: true, coins: status }, { headers: noStore });
  }
  try {
    const loginBonus = await claimDailyLogin(store, user.id, today);
    const pass = Boolean((await viewerAccess())?.pass);
    const status = await coinStatus(store, user.id, today, pass, loginBonus);
    return NextResponse.json({ ok: true, coins: status }, { headers: noStore });
  } catch (error) {
    console.error('coins read failed', error);
    return NextResponse.json(
      { ok: false, message: 'Couldn’t load your coins.' },
      { status: 500, headers: noStore },
    );
  }
}
