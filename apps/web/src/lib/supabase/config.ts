/**
 * Public Supabase settings. NEXT_PUBLIC_* values are baked in at build time.
 * Accounts are optional: without the URL + publishable (anon) key, sign-in features hide and
 * the game keeps working with progress saved in the browser only.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const authEnabled = (): boolean =>
  Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const appleSignInEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_AUTH_APPLE === '1';
// Social sign-in buttons only appear once the provider is switched on in Supabase (set the flag to 1).
export const googleSignInEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_AUTH_GOOGLE === '1';

/**
 * Where to send someone after signing in. Only same-site paths are allowed, so a link like
 * /auth/callback?next=https://evil.example can't bounce players to another website.
 */
export function safeNext(
  next: string | null | undefined,
  fallback = '/',
): string {
  if (!next || typeof next !== 'string') return fallback;
  if (
    !next.startsWith('/') ||
    next.startsWith('//') ||
    next.startsWith('/\\') ||
    /[\r\n]/.test(next)
  )
    return fallback;
  try {
    const url = new URL(next, 'http://local.invalid');
    if (url.origin !== 'http://local.invalid') return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export type SignInError =
  'provider' | 'missing_code' | 'not_configured' | 'expired';
export const SIGN_IN_ERRORS: Record<SignInError, string> = {
  provider: 'Sign-in was cancelled or didn’t complete. Please try again.',
  missing_code: 'That sign-in link is incomplete. Please request a new one.',
  not_configured: 'Accounts aren’t switched on for this site yet.',
  expired:
    'That sign-in link has expired or was already used. Please request a new one.',
};
export const signInErrorMessage = (
  code: string | undefined,
): string | undefined =>
  code && Object.hasOwn(SIGN_IN_ERRORS, code)
    ? SIGN_IN_ERRORS[code as SignInError]
    : undefined;
