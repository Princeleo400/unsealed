import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { BuyButton } from '@/components/billing/BuyButton';
import { IconCheck } from '@/components/icons';
import { SiteFooter, SiteHeader } from '@/components/SiteHeader';
import { catalogEntry } from '@/lib/catalog';
import { CURRENCIES, PRICING, currencyForCountry, formatPrice, isCurrency, priceOf, trialDays, type Currency } from '@/lib/pricing';
import { safeNext } from '@/lib/supabase/config';
import { canOpen, loadAccess, type Access } from '@/server/billing/access';
import { sellable } from '@/server/billing/checkout';
import { supabaseBillingStore } from '@/server/billing/store';
import { currentUser } from '@/server/supabase';

export const metadata: Metadata = {
  title: 'Case Pass',
  description: 'Every UNSEALED case, unlimited hints and no ads. Or buy a single case and keep it forever.',
};
export const dynamic = 'force-dynamic';

const PERKS = [
  'Every case, including each new monthly release',
  'Unlimited hints with no ads (hints still cost score)',
  'The full Daily Brief archive',
  'Host co-op rooms and Party Mode for any case (coming soon)',
];

const dateFmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export default async function PassPage({ searchParams }: { searchParams: Promise<{ currency?: string; case?: string; back?: string }> }) {
  const sp = await searchParams;
  const h = await headers();
  const currency: Currency = isCurrency(sp.currency) ? sp.currency : currencyForCountry(h.get('x-vercel-ip-country') ?? h.get('cf-ipcountry'));
  const entry = sp.case ? catalogEntry(sp.case) : undefined;
  const forCase = entry?.productId && entry.status === 'playable' ? entry : undefined;
  const back = safeNext(sp.back, forCase ? `/play/${forCase.slug}` : '/cases');

  const user = await currentUser();
  let access: Access | null = null;
  const store = user ? supabaseBillingStore() : null;
  if (user && store) access = await loadAccess(store, user.id).catch(() => null);
  const hasPass = Boolean(access?.pass);
  const ownsCase = forCase ? canOpen(forCase.slug, access) : false;

  const monthly = priceOf('pass-monthly', currency);
  const annual = priceOf('pass-annual', currency);
  const saving = Math.round((1 - annual / (monthly * 12)) * 100);
  const trial = trialDays('pass-annual', currency);
  const graceMs = PRICING.graceDays * 86_400_000;
  const qs = (c: Currency) => {
    const p = new URLSearchParams({ currency: c });
    if (forCase) p.set('case', forCase.slug);
    if (sp.back) p.set('back', back);
    return `/pass?${p.toString()}`;
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6">
        <p className="font-mono text-xs tracking-[0.25em] text-red-text">CASE PASS</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">Open every file.</h1>
        <p className="mt-3 max-w-xl text-lg text-body">
          All cases, unlimited hints, no ads. Case #001 and the Daily Brief stay free for everyone.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-muted">Pay in</span>
          <div role="group" aria-label="Currency" className="flex rounded-full border border-line-strong p-1">
            {CURRENCIES.map((c) => (
              <Link
                key={c}
                href={qs(c)}
                aria-current={c === currency ? 'true' : undefined}
                className={`rounded-full px-4 py-1.5 text-sm font-extrabold ${c === currency ? 'bg-paper text-ink' : 'text-muted hover:text-paper'}`}
              >
                {c === 'USD' ? 'US$' : '₦ Naira'}
              </Link>
            ))}
          </div>
          <span className="text-xs text-faint">{PRICING.currencies[currency].label}</span>
        </div>

        {hasPass && access?.pass && (
          <p role="status" className="mt-6 rounded-2xl border border-green bg-green/15 p-4 font-semibold text-paper">
            Your Case Pass is active
            {access.pass.expiresAt ? ` until ${dateFmt(new Date(access.pass.expiresAt.getTime() - graceMs))}` : ''}.{' '}
            <Link href="/account" className="text-amber underline">Manage it in your account</Link>.
          </p>
        )}

        {forCase && (
          <section aria-labelledby="single" className="mt-8 flex flex-col gap-4 rounded-2xl border border-line bg-walnut p-5 sm:flex-row sm:items-center">
            <div className="flex-1">
              <p className="font-mono text-xs tracking-widest text-red-text">{forCase.number} · {forCase.city.toUpperCase()}</p>
              <h2 id="single" className="mt-1 text-xl font-extrabold">Just this case: {forCase.title}</h2>
              <p className="mt-1 text-sm text-body">
                One payment of <b className="text-paper">{formatPrice(priceOf(forCase.productId!, currency), currency)}</b>. Yours to keep, no subscription.
              </p>
            </div>
            <div className="sm:w-60">
              {ownsCase ? (
                <Link href={`/play/${forCase.slug}`} className="flex h-12 items-center justify-center rounded-xl bg-amber font-extrabold text-ink">
                  Open the case
                </Link>
              ) : (
                <BuyButton
                  productId={forCase.productId!}
                  currency={currency}
                  caseSlug={forCase.slug}
                  back={back}
                  signedIn={Boolean(user)}
                  disabled={!sellable(forCase.productId!, currency)}
                  label={sellable(forCase.productId!, currency) ? `Buy for ${formatPrice(priceOf(forCase.productId!, currency), currency)}` : 'Not on sale yet'}
                />
              )}
            </div>
          </section>
        )}

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <PlanCard
            title="Annual"
            badge={saving > 0 ? `Best value · save ${saving}%` : undefined}
            price={formatPrice(annual, currency)}
            per="/ year"
            sub={`≈ ${formatPrice(Math.round(annual / 12), currency)} a month`}
            terms={
              trial
                ? `New members get a ${trial}-day free trial, then ${formatPrice(annual, currency)} every year until you cancel. Cancel before the trial ends and you pay nothing.`
                : `${formatPrice(annual, currency)} today, then every year until you cancel.`
            }
          >
            <BuyButton
              productId="pass-annual"
              currency={currency}
              back="/pass"
              signedIn={Boolean(user)}
              disabled={hasPass || !sellable('pass-annual', currency)}
              label={hasPass ? 'Already active' : !sellable('pass-annual', currency) ? 'Not on sale yet' : trial ? `Start ${trial}-day free trial` : 'Get the annual pass'}
              primary
            />
          </PlanCard>
          <PlanCard
            title="Monthly"
            price={formatPrice(monthly, currency)}
            per="/ month"
            sub="Flexible"
            terms={`${formatPrice(monthly, currency)} today, then every month until you cancel.`}
          >
            <BuyButton
              productId="pass-monthly"
              currency={currency}
              back="/pass"
              signedIn={Boolean(user)}
              disabled={hasPass || !sellable('pass-monthly', currency)}
              label={hasPass ? 'Already active' : !sellable('pass-monthly', currency) ? 'Not on sale yet' : 'Get the monthly pass'}
            />
          </PlanCard>
        </div>

        <section aria-labelledby="perks" className="mt-10">
          <h2 id="perks" className="text-xl font-extrabold">What you get</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {PERKS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-body">
                <IconCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-text" aria-hidden="true" />
                {p}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="terms" className="mt-10 rounded-2xl border border-line p-5 text-sm leading-relaxed text-muted">
          <h2 id="terms" className="mb-2 font-extrabold text-paper">The small print</h2>
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            <li>The Case Pass renews automatically at the price shown until you cancel. Cancel any time from your account; you keep access until the end of the period you paid for.</li>
            <li>{currency === 'USD' ? 'US$ payments are processed by Stripe.' : 'Naira payments are processed by Paystack. Renewals are charged to the card you paid with.'} We never see your full card details.</li>
            <li>Single cases are a one-off payment and stay in your account forever.</li>
            <li>Hints are never for sale: they always cost score, with or without a pass.</li>
          </ul>
          {!user && (
            <p className="mt-3">
              You’ll need to <Link href={`/signin?next=${encodeURIComponent(qs(currency))}`} className="font-bold text-amber">sign in</Link> first so your purchase is saved to your account.
            </p>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function PlanCard(props: { title: string; badge?: string; price: string; per: string; sub: string; terms: string; children: React.ReactNode }) {
  return (
    <section className={`flex flex-col gap-4 rounded-2xl border bg-walnut p-6 ${props.badge ? 'border-amber' : 'border-line'}`} aria-label={`${props.title} Case Pass`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold">{props.title}</h2>
        {props.badge && <span className="rounded-full bg-amber px-3 py-1 text-xs font-extrabold text-ink">{props.badge}</span>}
      </div>
      <p>
        <span className="text-4xl font-extrabold tracking-tight">{props.price}</span> <span className="text-muted">{props.per}</span>
      </p>
      <p className="-mt-3 text-sm font-semibold text-faint">{props.sub}</p>
      <p className="flex-1 text-sm leading-relaxed text-body">{props.terms}</p>
      {props.children}
    </section>
  );
}
