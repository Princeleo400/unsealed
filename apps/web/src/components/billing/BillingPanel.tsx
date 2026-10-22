'use client';

import Link from 'next/link';
import { useState } from 'react';

type Props = {
  pass: { name: string; until: string | null; source: string } | null;
  cases: { slug: string; title: string }[];
  available: boolean;
};

/** Account page: what the player owns, and a link to manage or cancel the Case Pass (FR-PAY-05). */
export function BillingPanel({ pass, cases, available }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function manage() {
    setBusy(true);
    setErr(null);
    const res = await fetch('/api/billing/manage', { method: 'POST' }).catch(
      () => null,
    );
    const reply = (await res?.json().catch(() => null)) as {
      ok: boolean;
      url?: string;
      message?: string;
    } | null;
    if (reply?.ok && reply.url) {
      window.location.href = reply.url;
      return;
    }
    setErr(
      reply?.message ??
        'Couldn’t open subscription settings. Please try again.',
    );
    setBusy(false);
  }

  return (
    <section aria-labelledby="billing" className="flex flex-col gap-3">
      <h2
        id="billing"
        className="font-mono text-[11px] tracking-[0.15em] text-faint"
      >
        CASE PASS & PURCHASES
      </h2>
      {!available ? (
        <p className="text-sm text-muted">Purchases aren’t switched on yet.</p>
      ) : pass ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-green p-4">
          <p className="font-extrabold">{pass.name} · active</p>
          <p className="text-sm text-body">
            {pass.until
              ? `Paid up to ${pass.until}. It renews automatically unless you cancel.`
              : 'Active.'}
          </p>
          {(pass.source === 'stripe' || pass.source === 'paystack') && (
            <button
              type="button"
              onClick={() => void manage()}
              disabled={busy}
              className="h-11 rounded-xl border border-line-strong font-extrabold disabled:opacity-50"
            >
              {busy ? 'Opening…' : 'Manage or cancel'}
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-2xl border border-line p-4">
          <p className="text-sm text-body">
            No Case Pass. Get every case, unlimited hints and no ads.
          </p>
          <Link
            href="/pass"
            className="flex h-11 items-center justify-center rounded-xl bg-amber font-extrabold text-ink"
          >
            See Case Pass
          </Link>
        </div>
      )}
      {cases.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {cases.map((ownedCase) => (
            <li key={ownedCase.slug}>
              <Link
                href={`/play/${ownedCase.slug}`}
                className="font-bold text-amber"
              >
                {ownedCase.title}
              </Link>{' '}
              <span className="text-muted">· owned</span>
            </li>
          ))}
        </ul>
      )}
      {err && (
        <p role="alert" className="text-sm font-semibold text-red-soft">
          {err}
        </p>
      )}
    </section>
  );
}
