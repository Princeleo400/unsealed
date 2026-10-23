import { NextResponse } from 'next/server';
import { bonusView, handleBonus } from '@/server/bonus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'private, no-store' };

/** Opens a Bonus Brief from its ticket. */
export function GET(req: Request) {
  const ticket = new URL(req.url).searchParams.get('ticket') ?? '';
  const view = bonusView(ticket);
  if (!view)
    return NextResponse.json(
      {
        ok: false,
        code: 'ticket_invalid',
        message: 'This Bonus Brief has expired. Start a new one.',
      },
      { status: 410, headers: noStore },
    );
  return NextResponse.json({ ok: true, daily: view }, { headers: noStore });
}

/** Grades a Bonus Brief answer (bonus results never touch the streak). */
export async function POST(req: Request) {
  const { status, json } = handleBonus(await req.json().catch(() => null));
  return NextResponse.json(json, { status, headers: noStore });
}
