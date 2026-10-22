import { NextResponse } from 'next/server';
import {
  ResultsInput,
  supabaseResultsStore,
  validResultDate,
} from '@/server/daily-results';
import { currentUser } from '@/server/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };

/** The signed-in player's Daily history (for streaks on any device). Signed-out: { signedIn: false }. */
export async function GET() {
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ ok: true, signedIn: false }, { headers });
  try {
    const history = await (await supabaseResultsStore())!.list(user.id);
    return NextResponse.json(
      { ok: true, signedIn: true, history },
      { headers },
    );
  } catch (error) {
    console.error('daily_results read failed', error);
    return NextResponse.json(
      { ok: false, signedIn: true },
      { status: 500, headers },
    );
  }
}

/** Record results (today's, or ones played before signing in). Days already recorded are kept as they were. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json(
      { ok: false, message: 'Not signed in.' },
      { status: 401, headers },
    );
  const parsed = ResultsInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { ok: false, message: 'Invalid results.' },
      { status: 400, headers },
    );
  const rows = parsed.data.results.filter((row) => validResultDate(row.date));
  if (!rows.length)
    return NextResponse.json({ ok: true, added: 0 }, { headers });
  try {
    await (await supabaseResultsStore())!.add(user.id, rows);
    return NextResponse.json({ ok: true, added: rows.length }, { headers });
  } catch (error) {
    console.error('daily_results write failed', error);
    return NextResponse.json({ ok: false }, { status: 500, headers });
  }
}
