import { NextResponse } from 'next/server';
import { safeNext, type SignInError } from '@/lib/supabase/config';
import { serverSupabase } from '@/server/supabase';

export const dynamic = 'force-dynamic';

/**
 * Landing point for email sign-in links and Google sign-in (PKCE flow): swaps the one-time
 * `code` for a session cookie, then sends the player back to where they were.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = safeNext(url.searchParams.get('next'), '/');
  // Only fixed error CODES travel in the URL; the sign-in page maps them to its own wording,
  // so nobody can craft a link that shows arbitrary text on our page.
  const fail = (reason: SignInError) =>
    NextResponse.redirect(
      new URL(
        `/signin?error=${reason}&next=${encodeURIComponent(next)}`,
        url.origin,
      ),
    );

  if (url.searchParams.get('error')) return fail('provider');
  if (!code) return fail('missing_code');

  const supabase = await serverSupabase();
  if (!supabase) return fail('not_configured');
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail('expired');

  const res = NextResponse.redirect(new URL(next, url.origin));
  res.headers.set(
    'Cache-Control',
    'private, no-cache, no-store, must-revalidate, max-age=0',
  );
  return res;
}
