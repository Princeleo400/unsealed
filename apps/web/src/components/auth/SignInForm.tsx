'use client';

import { useState } from 'react';
import { browserSupabase } from '@/lib/supabase/browser';

type Props = { next: string; error?: string; google: boolean; apple: boolean };

export function SignInForm({
  next,
  error: initialError,
  google,
  apple,
}: Props) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(initialError ?? null);
  const supabase = browserSupabase();
  const redirectTo = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  if (!supabase) {
    return (
      <p className="rounded-xl border border-line p-4 text-body">
        Accounts aren’t switched on for this site yet. Your progress is saved in
        this browser.
      </p>
    );
  }

  async function sendLink(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()))
      return setError('Please enter a valid email address.');
    setState('sending');
    const { error: err } = await supabase!.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo(), shouldCreateUser: true },
    });
    if (err) {
      setState('idle');
      setError(
        /rate|seconds/i.test(err.message)
          ? 'Too many attempts. Please wait a minute and try again.'
          : 'We couldn’t send the email. Please try again.',
      );
    } else setState('sent');
  }

  async function oauth(provider: 'google' | 'apple') {
    setError(null);
    const { error: err } = await supabase!.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectTo() },
    });
    if (err)
      setError(
        `${provider === 'google' ? 'Google' : 'Apple'} sign-in isn’t available right now.`,
      );
  }

  if (state === 'sent') {
    return (
      <div
        role="status"
        className="rounded-2xl border border-green bg-green/15 p-5"
      >
        <p className="font-extrabold">Check your email</p>
        <p className="mt-1 text-body">
          We sent a sign-in link to <b className="text-paper">{email.trim()}</b>
          . Open it on this device to continue. It may take a minute, and it
          might be in spam.
        </p>
        <button
          type="button"
          onClick={() => setState('idle')}
          className="mt-3 text-sm font-bold text-amber"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red bg-[#2e1c17] p-3 text-sm font-semibold text-red-soft"
        >
          {error}
        </p>
      )}
      {(google || apple) && (
        <div className="flex flex-col gap-2">
          {google && (
            <button
              type="button"
              onClick={() => oauth('google')}
              className="flex h-12 items-center justify-center gap-3 rounded-xl bg-paper font-extrabold text-ink hover:bg-white"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6C12.4 13.5 17.7 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17.5z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.8-6z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.8 6C6.6 42.6 14.6 48 24 48z"
                />
              </svg>
              Continue with Google
            </button>
          )}
          {apple && (
            <button
              type="button"
              onClick={() => oauth('apple')}
              className="flex h-12 items-center justify-center gap-3 rounded-xl border border-paper font-extrabold text-paper hover:bg-walnut"
            >
              Continue with Apple
            </button>
          )}
          <p className="py-1 text-center text-xs text-faint">
            or use your email
          </p>
        </div>
      )}
      <form onSubmit={sendLink} className="flex flex-col gap-3" noValidate>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-muted">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="h-12 rounded-xl border border-line bg-walnut px-4 text-base text-paper placeholder:text-faint"
          />
        </label>
        <button
          type="submit"
          disabled={state === 'sending'}
          className="h-12 rounded-xl bg-amber font-extrabold text-ink disabled:opacity-60"
        >
          {state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
        </button>
      </form>
      <p className="text-xs leading-relaxed text-faint">
        No password needed. Signing in keeps your cases and streak on every
        device. Progress you made before signing in comes with you.
      </p>
    </div>
  );
}
