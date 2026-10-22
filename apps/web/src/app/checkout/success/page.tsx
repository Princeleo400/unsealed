import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckoutConfirm } from '@/components/billing/CheckoutConfirm';
import { SiteFooter, SiteHeader } from '@/components/SiteHeader';
import { currentUser } from '@/server/supabase';

export const metadata: Metadata = { title: 'Payment', robots: { index: false } };
export const dynamic = 'force-dynamic';

/** Stripe returns with ?provider=stripe&ref=cs_…; Paystack with ?provider=paystack&reference=… (or trxref). */
export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ provider?: string; ref?: string; reference?: string; trxref?: string }>;
}) {
  const sp = await searchParams;
  const provider = sp.provider === 'stripe' || sp.provider === 'paystack' ? sp.provider : null;
  const ref = (provider === 'stripe' ? sp.ref : (sp.reference ?? sp.trxref)) ?? '';
  const user = await currentUser();
  const here = `/checkout/success?${new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === 'string')).toString()}`;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-md px-4 pb-16 pt-10 text-center sm:px-6">
        {!provider || !ref ? (
          <>
            <h1 className="text-3xl font-extrabold">Nothing to confirm</h1>
            <p className="mt-3 text-body">This page confirms a payment after checkout. If you were charged, your purchase will appear in your account shortly.</p>
            <Link href="/account" className="mt-6 inline-block font-bold text-amber">Go to your account</Link>
          </>
        ) : !user ? (
          <>
            <h1 className="text-3xl font-extrabold">Sign in to finish</h1>
            <p className="mt-3 text-body">Your payment is safe. Sign in with the same email you bought with and we’ll unlock it.</p>
            <Link href={`/signin?next=${encodeURIComponent(here)}`} className="mt-6 inline-flex h-12 items-center rounded-xl bg-amber px-6 font-extrabold text-ink">
              Sign in
            </Link>
          </>
        ) : (
          <CheckoutConfirm provider={provider} reference={ref} />
        )}
      </main>
      <SiteFooter />
    </>
  );
}
