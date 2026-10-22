import { NextResponse } from 'next/server';
import { WaitlistInput, joinWaitlist } from '@/server/waitlist';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = WaitlistInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: 'Please enter a valid email address.' },
      { status: 400 },
    );
  }
  if (parsed.data.company)
    return NextResponse.json({ ok: true, status: 'added' }); // bot: pretend success
  try {
    const waitlistResult = await joinWaitlist(parsed.data);
    return NextResponse.json({ ok: true, status: waitlistResult.status });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, message: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }
}
