import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AdRewardSchema, adRewardAccepted } from '@/server/ads';
import { awardAd, supabaseCoinStore } from '@/server/coins';
import { todayUTC } from '@/server/daily';
import { currentUser } from '@/server/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'private, no-store' };
const Body = z.object({ adReward: AdRewardSchema });

/** A finished rewarded video pays a coin (capped per day). */
export async function POST(req: Request) {
  const user = await currentUser();
  const store = user ? supabaseCoinStore() : null;
  if (!user || !store)
    return NextResponse.json(
      { ok: false, message: 'Sign in to collect coins.' },
      { status: 401, headers: noStore },
    );
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !adRewardAccepted(parsed.data.adReward))
    return NextResponse.json(
      { ok: false, message: 'Invalid request.' },
      { status: 400, headers: noStore },
    );
  try {
    const result = await awardAd(
      store,
      user.id,
      todayUTC(),
      parsed.data.adReward.id,
    );
    if (result.status === 'cap')
      return NextResponse.json(
        {
          ok: false,
          message: 'That’s all the video coins for today.',
          balance: result.balance,
        },
        { status: 429, headers: noStore },
      );
    return NextResponse.json(
      { ok: true, balance: result.balance },
      { headers: noStore },
    );
  } catch (error) {
    console.error('coin ad reward failed', error);
    return NextResponse.json(
      { ok: false, message: 'Couldn’t add your coin. Please try again.' },
      { status: 500, headers: noStore },
    );
  }
}
