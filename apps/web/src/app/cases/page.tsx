import Link from 'next/link';
import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '@/components/SiteHeader';
import { headers } from 'next/headers';
import { CATALOG } from '@/lib/catalog';
import { currencyForCountry, formatPrice, priceOf } from '@/lib/pricing';

export const metadata: Metadata = { title: 'Case files' };

export default async function CasesPage() {
  const requestHeaders = await headers();
  const currency = currencyForCountry(
    requestHeaders.get('x-vercel-ip-country') ??
      requestHeaders.get('cf-ipcountry'),
  );
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6">
        <h1 className="text-4xl font-extrabold tracking-tight">Case files</h1>
        <p className="mt-2 text-body">
          Every case is fair play: the answer is always in the file.
        </p>
        <Link
          href="/pass"
          className="mt-4 inline-block rounded-xl border border-amber px-4 py-2 text-sm font-extrabold text-amber hover:bg-amber hover:text-ink"
        >
          Case Pass: every case, unlimited hints, no ads
        </Link>
        <ul className="mt-8 flex flex-col gap-4">
          {CATALOG.map((catalogEntry) => (
            <li
              key={catalogEntry.slug}
              className="flex flex-col gap-4 rounded-2xl border border-line bg-walnut p-5 sm:flex-row sm:items-center"
            >
              <div className="flex-1">
                <span className="font-mono text-xs tracking-widest text-red-text">
                  {catalogEntry.number} · {catalogEntry.city.toUpperCase()}
                </span>
                <h2 className="mt-1 text-xl font-extrabold">
                  {catalogEntry.title}
                </h2>
                <p className="mt-1 text-sm text-body">{catalogEntry.hook}</p>
                <p className="mt-2 text-xs font-semibold text-muted">
                  {catalogEntry.minutes} · difficulty {catalogEntry.difficulty}
                  /5 ·{' '}
                  {catalogEntry.productId
                    ? `${formatPrice(priceOf(catalogEntry.productId, currency), currency)} · or included in Case Pass`
                    : 'Free'}
                </p>
              </div>
              {catalogEntry.status === 'playable' ? (
                <Link
                  href={`/play/${catalogEntry.slug}`}
                  className="rounded-xl bg-amber px-6 py-3 text-center font-extrabold text-ink hover:bg-amber-soft"
                >
                  {catalogEntry.productId ? 'Open' : 'Play free'}
                </Link>
              ) : (
                <span className="rounded-xl border border-line-strong px-6 py-3 text-center font-bold text-muted">
                  Coming soon
                </span>
              )}
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </>
  );
}
