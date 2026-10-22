import { NextResponse } from 'next/server';
import { dailyView, handleDaily, isOpenDate, todayUTC } from '@/server/daily';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  const date = new URL(req.url).searchParams.get('date') ?? todayUTC();
  if (!isOpenDate(date)) return NextResponse.json({ ok: false, message: 'That Daily Brief is not available.' }, { status: 404 });
  return NextResponse.json({ ok: true, daily: dailyView(date) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { status, json } = handleDaily(body);
  return NextResponse.json(json, { status, headers: { 'Cache-Control': 'no-store' } });
}
