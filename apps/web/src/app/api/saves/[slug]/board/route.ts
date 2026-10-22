import { NextResponse } from 'next/server';
import { LocalBoardSchema } from '@/lib/board';
import { getCase } from '@/server/cases';
import { supabaseSaveStore } from '@/server/saves';
import { currentUser } from '@/server/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Save the signed-in player's pins/notes for a case. Size- and shape-checked; grading never reads it. */
export async function PUT(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const headers = { 'Cache-Control': 'private, no-store' };
  const { slug } = await ctx.params;
  const found = getCase(slug);
  if (!found) return NextResponse.json({ ok: false }, { status: 404, headers });
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Not signed in.' }, { status: 401, headers });
  const raw = await req.text();
  if (raw.length > 30_000) return NextResponse.json({ ok: false, message: 'Too large.' }, { status: 413, headers });
  const parsed = LocalBoardSchema.safeParse((() => { try { return JSON.parse(raw); } catch { return null; } })());
  if (!parsed.success) return NextResponse.json({ ok: false, message: 'Invalid board.' }, { status: 400, headers });
  try {
    await (await supabaseSaveStore())?.putBoard(user.id, found.pub.id, parsed.data);
    return NextResponse.json({ ok: true }, { headers });
  } catch (e) {
    console.error('board save failed', e);
    return NextResponse.json({ ok: false }, { status: 500, headers });
  }
}
