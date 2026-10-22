import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL, authEnabled } from '@/lib/supabase/config';

/**
 * Keeps the Supabase session fresh on every request (the official @supabase/ssr pattern).
 * Without Supabase configured this does nothing.
 */
export async function middleware(request: NextRequest) {
  if (!authEnabled()) return NextResponse.next();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet, headers) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
        for (const [k, v] of Object.entries(headers ?? {})) response.headers.set(k, v);
      },
    },
  });
  try {
    await supabase.auth.getUser(); // refreshes an expired access token if needed
  } catch {
    /* Supabase unreachable: let the request through signed-out */
  }
  return response;
}

export const config = {
  // Skip static files and images; everything else (pages and API routes) gets a fresh session.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?)$).*)'],
};
