import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient, type User } from '@supabase/supabase-js';
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  authEnabled,
} from '@/lib/supabase/config';

/** A Supabase client acting AS the signed-in player (row-level security applies). New one per request. */
export async function serverSupabase() {
  if (!authEnabled()) return null;
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet)
            store.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only. The middleware refreshes sessions.
        }
      },
    },
  });
}

/** The signed-in player, verified with Supabase (not just read from the cookie). Null if signed out. */
export async function currentUser(): Promise<User | null> {
  const sb = await serverSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb.auth.getUser();
    return error ? null : data.user;
  } catch {
    return null; // Supabase unreachable: behave as signed out rather than break the game
  }
}

/** Service-role client for admin-only work (deleting an account). Never expose to the browser. */
export function adminSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) return null;
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
