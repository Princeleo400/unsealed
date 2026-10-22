'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type State =
  | { kind: 'checking'; tries: number }
  | { kind: 'paid'; productId: string | null; cases: string[] }
  | { kind: 'pending' }
  | { kind: 'failed'; message: string };

const MAX_TRIES = 10; // ~30 s: bank transfers and some cards take a moment

/** Asks our server to confirm the payment with Stripe / Paystack, retrying while it is still processing. */
export function CheckoutConfirm({
  provider,
  reference,
}: {
  provider: 'stripe' | 'paystack';
  reference: string;
}) {
  const [state, setState] = useState<State>({ kind: 'checking', tries: 0 });

  useEffect(() => {
    if (state.kind !== 'checking') return;
    let cancelled = false;
    const timeout = setTimeout(
      async () => {
        try {
          const res = await fetch('/api/checkout/confirm', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ provider, ref: reference }),
          });
          const reply = (await res.json().catch(() => null)) as
            | {
                ok: true;
                status: 'paid' | 'pending' | 'failed';
                productId: string | null;
                access: { cases: string[] };
              }
            | { ok: false; message: string }
            | null;
          if (cancelled) return;
          if (!reply)
            return setState({
              kind: 'failed',
              message: 'We couldn’t check your payment just now.',
            });
          if (!reply.ok)
            return setState({ kind: 'failed', message: reply.message });
          if (reply.status === 'paid')
            return setState({
              kind: 'paid',
              productId: reply.productId,
              cases: reply.access.cases,
            });
          if (reply.status === 'pending')
            return setState(
              state.tries + 1 >= MAX_TRIES
                ? { kind: 'pending' }
                : { kind: 'checking', tries: state.tries + 1 },
            );
          setState({
            kind: 'failed',
            message: `We couldn’t match this payment to your account. If you were charged, contact support and quote reference ${reference}.`,
          });
        } catch {
          if (!cancelled)
            setState({
              kind: 'failed',
              message: 'We couldn’t reach the server. Check your connection.',
            });
        }
      },
      state.tries === 0 ? 0 : 3000,
    );
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [state, provider, reference]);

  if (state.kind === 'checking')
    return (
      <div role="status" className="flex flex-col items-center gap-4">
        <p className="font-mono text-xs tracking-[0.25em] text-muted">
          CONFIRMING PAYMENT…
        </p>
        <h1 className="text-3xl font-extrabold">One moment</h1>
        <p className="text-body">
          We’re checking with {provider === 'stripe' ? 'Stripe' : 'Paystack'}.
          Please don’t close this page.
        </p>
      </div>
    );

  if (state.kind === 'paid') {
    const isPass = state.productId?.startsWith('pass');
    const caseSlug = !isPass ? state.cases[state.cases.length - 1] : undefined;
    return (
      <div role="status" className="flex flex-col items-center gap-4">
        <p className="font-mono text-xs tracking-[0.25em] text-green-text">
          PAYMENT CONFIRMED
        </p>
        <h1 className="text-3xl font-extrabold">
          {isPass ? 'Your Case Pass is active' : 'The case is yours'}
        </h1>
        <p className="text-body">
          {isPass
            ? 'Every case is open to you, with unlimited hints and no ads.'
            : 'It’s saved to your account on every device.'}
        </p>
        <Link
          href={caseSlug ? `/play/${caseSlug}` : '/cases'}
          className="mt-2 inline-flex h-12 items-center rounded-xl bg-amber px-6 font-extrabold text-ink"
        >
          {caseSlug ? 'Open the case' : 'Choose a case'}
        </Link>
        <Link href="/account" className="text-sm font-bold text-amber">
          See it in your account
        </Link>
      </div>
    );
  }

  if (state.kind === 'pending')
    return (
      <div role="status" className="flex flex-col items-center gap-4">
        <h1 className="text-3xl font-extrabold">Still processing</h1>
        <p className="text-body">
          Your bank hasn’t confirmed the payment yet. It will unlock
          automatically once it does. You can close this page.
        </p>
        <button
          type="button"
          onClick={() => setState({ kind: 'checking', tries: 0 })}
          className="h-12 rounded-xl border border-line-strong px-6 font-extrabold"
        >
          Check again
        </button>
      </div>
    );

  return (
    <div role="alert" className="flex flex-col items-center gap-4">
      <h1 className="text-3xl font-extrabold">We couldn’t confirm it</h1>
      <p className="text-body">{state.message}</p>
      <button
        type="button"
        onClick={() => setState({ kind: 'checking', tries: 0 })}
        className="h-12 rounded-xl bg-amber px-6 font-extrabold text-ink"
      >
        Try again
      </button>
      <Link href="/pass" className="text-sm font-bold text-amber">
        Back to Case Pass
      </Link>
    </div>
  );
}
