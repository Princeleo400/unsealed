'use client';

import { useState } from 'react';

type Props = {
  productId: string;
  currency: string;
  caseSlug?: string;
  back: string;
  signedIn: boolean;
  disabled?: boolean;
  label: string;
  primary?: boolean;
};

/** Starts a Stripe / Paystack checkout. Signed-out players are sent to sign in first, then back here. */
export function BuyButton({ productId, currency, caseSlug, back, signedIn, disabled, label, primary }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function buy() {
    setErr(null);
    const here = `${window.location.pathname}${window.location.search}`;
    if (!signedIn) {
      window.location.href = `/signin?next=${encodeURIComponent(here)}`;
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productId, currency, caseSlug, back }),
      });
      const j = (await res.json().catch(() => null)) as { ok: boolean; url?: string; code?: string; message?: string } | null;
      if (j?.ok && j.url) {
        window.location.href = j.url;
        return;
      }
      if (j?.code === 'sign_in') {
        window.location.href = `/signin?next=${encodeURIComponent(here)}`;
        return;
      }
      setErr(j?.message ?? 'Couldn’t start the checkout. Please try again.');
    } catch {
      setErr('Couldn’t reach the server. Check your connection and try again.');
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => void buy()}
        disabled={disabled || busy}
        className={`h-12 rounded-xl px-5 font-extrabold disabled:opacity-50 ${
          primary ? 'bg-amber text-ink hover:bg-amber-soft' : 'border border-line-strong text-paper hover:border-amber'
        }`}
      >
        {busy ? 'Opening checkout…' : label}
      </button>
      {err && (
        <p role="alert" className="text-sm font-semibold text-red-soft">
          {err}
        </p>
      )}
    </div>
  );
}
