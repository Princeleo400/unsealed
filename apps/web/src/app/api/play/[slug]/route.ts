import { NextResponse } from 'next/server';
import { handlePlay } from '@/server/play';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: { code: 'bad_json', message: 'Invalid JSON.' } }, { status: 400 });
  }
  const { status, json } = handlePlay(slug, body);
  return NextResponse.json(json, { status, headers: { 'Cache-Control': 'no-store' } });
}
