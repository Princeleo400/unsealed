import { NextResponse } from 'next/server';
import { viewerAccess } from '@/server/billing/viewer';
import {
  ARCHIVE_LOCKED_MESSAGE,
  dailyView,
  handleDaily,
  isArchiveOnlyDate,
  isOpenDate,
  todayUTC,
  type DailyAccess,
} from '@/server/daily';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'private, no-store' };

async function dailyAccess(): Promise<DailyAccess> {
  return { fullArchive: Boolean((await viewerAccess())?.pass) };
}

export async function GET(req: Request) {
  const date = new URL(req.url).searchParams.get('date') ?? todayUTC();
  const access = await dailyAccess();
  if (!isOpenDate(date, new Date(), access)) {
    if (isArchiveOnlyDate(date))
      return NextResponse.json(
        { ok: false, code: 'archive_locked', message: ARCHIVE_LOCKED_MESSAGE },
        { status: 402, headers: noStore },
      );
    return NextResponse.json(
      { ok: false, message: 'That Daily Brief is not available.' },
      { status: 404, headers: noStore },
    );
  }
  return NextResponse.json(
    { ok: true, daily: dailyView(date, new Date(), access) },
    { headers: noStore },
  );
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { status, json } = handleDaily(body, new Date(), await dailyAccess());
  return NextResponse.json(json, { status, headers: noStore });
}
