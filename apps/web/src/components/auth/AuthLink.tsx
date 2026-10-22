'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { browserSupabase } from '@/lib/supabase/browser';

/** "Sign in" / "Account" link. Runs in the browser so pages stay static and fast. Hidden if accounts are off. */
export function AuthLink({ className }: { className?: string }) {
  const sb = browserSupabase();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = sb.auth.onAuthStateChange((_e, session) => setSignedIn(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, [sb]);

  if (!sb || signedIn === null) return null;
  return signedIn ? (
    <Link href="/account" className={className}>Account</Link>
  ) : (
    <Link href={`/signin?next=${typeof window === 'undefined' ? '/' : encodeURIComponent(window.location.pathname)}`} className={className}>
      Sign in
    </Link>
  );
}
