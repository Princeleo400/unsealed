import Link from 'next/link';
import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '@/components/SiteHeader';
import { CATALOG } from '@/lib/catalog';

export const metadata: Metadata = { title: 'Case files' };

export default function CasesPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6">
        <h1 className="text-4xl font-extrabold tracking-tight">Case files</h1>
        <p className="mt-2 text-body">Every case is fair play: the answer is always in the file.</p>
        <ul className="mt-8 flex flex-col gap-4">
          {CATALOG.map((c) => (
            <li key={c.slug} className="flex flex-col gap-4 rounded-2xl border border-line bg-walnut p-5 sm:flex-row sm:items-center">
              <div className="flex-1">
                <span className="font-mono text-xs tracking-widest text-red-text">
                  {c.number} · {c.city.toUpperCase()}
                </span>
                <h2 className="mt-1 text-xl font-extrabold">{c.title}</h2>
                <p className="mt-1 text-sm text-body">{c.hook}</p>
                <p className="mt-2 text-xs font-semibold text-muted">
                  {c.minutes} · difficulty {c.difficulty}/5 · {c.price === 'free' ? 'Free' : 'Paid · or Case Pass'}
                </p>
              </div>
              {c.status === 'playable' ? (
                <Link href={`/play/${c.slug}`} className="rounded-xl bg-amber px-6 py-3 text-center font-extrabold text-ink hover:bg-amber-soft">
                  Play
                </Link>
              ) : (
                <span className="rounded-xl border border-line-strong px-6 py-3 text-center font-bold text-muted">Coming soon</span>
              )}
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </>
  );
}
