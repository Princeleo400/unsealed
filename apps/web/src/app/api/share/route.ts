import { NextResponse } from 'next/server';
import { createShare } from '@/server/share';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Turns a finished result into a signed, spoiler-free share card. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const { status, json } = createShare(body);
  return NextResponse.json(json, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
