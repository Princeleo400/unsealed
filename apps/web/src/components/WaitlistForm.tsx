'use client';

import { useState } from 'react';

type State =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'done'; exists: boolean }
  | { kind: 'error'; message: string };

export function WaitlistForm({ source = 'landing' }: { source?: string }) {
  const [state, setState] = useState<State>({ kind: 'idle' });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setState({ kind: 'sending' });
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: data.get('email'),
          country: data.get('country'),
          company: data.get('company'),
          source,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        status?: string;
        message?: string;
      };
      if (!json.ok)
        setState({
          kind: 'error',
          message: json.message ?? 'Something went wrong.',
        });
      else setState({ kind: 'done', exists: json.status === 'exists' });
    } catch {
      setState({ kind: 'error', message: 'No connection. Please try again.' });
    }
  }

  if (state.kind === 'done') {
    return (
      <p
        role="status"
        className="rounded-xl border border-green bg-green/15 px-4 py-4 font-semibold text-paper"
      >
        {state.exists
          ? "You're already signed up. We'll email you when the next case is out."
          : "Done. We'll email you when the next case is out."}
      </p>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      noValidate
    >
      <label className="flex flex-1 flex-col gap-1.5 text-sm font-semibold text-muted">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="h-12 rounded-xl border border-line bg-walnut px-4 text-base text-paper placeholder:text-faint"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-muted sm:w-44">
        Country <span className="sr-only">(optional)</span>
        <input
          name="country"
          type="text"
          autoComplete="country-name"
          placeholder="Optional"
          className="h-12 rounded-xl border border-line bg-walnut px-4 text-base text-paper placeholder:text-faint"
        />
      </label>
      <input
        name="company"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      <button
        type="submit"
        disabled={state.kind === 'sending'}
        className="h-12 rounded-xl bg-amber px-6 font-extrabold text-ink transition hover:bg-amber-soft disabled:opacity-60"
      >
        {state.kind === 'sending' ? 'Saving…' : 'Email me new cases'}
      </button>
      {state.kind === 'error' && (
        <p
          role="alert"
          className="text-sm font-semibold text-red-soft sm:basis-full"
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
