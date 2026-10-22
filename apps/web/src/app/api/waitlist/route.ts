import { NextResponse } from 'next/server';
import { WaitlistInput, joinWaitlist } from '@/server/waitlist';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = WaitlistInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Please enter a valid email address.' }, { status: 400 });
  }
  if (parsed.data.company) return NextResponse.json({ ok: true, status: 'added' }); // bot: pretend success
  try {
    const r = await joinWaitlist(parsed.data);
    return NextResponse.json({ ok: true, status: r.status });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
