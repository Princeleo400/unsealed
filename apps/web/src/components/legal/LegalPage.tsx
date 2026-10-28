import Link from 'next/link';
import { SiteFooter, SiteHeader } from '@/components/SiteHeader';
import { LEGAL, isPlaceholder, lastUpdatedLabel } from '@/lib/legal';

const PAGES = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/refunds', label: 'Refund Policy' },
];

/** A value from src/config/legal.json; unfilled placeholders are marked so they're easy to spot. */
export function Fact({ value }: { value: string }) {
  return isPlaceholder(value) ? (
    <mark className="rounded bg-amber/20 px-1 font-mono text-[0.9em] text-amber">
      {value}
    </mark>
  ) : (
    <>{value}</>
  );
}

export function SupportEmail() {
  return isPlaceholder(LEGAL.supportEmail) ? (
    <Fact value={LEGAL.supportEmail} />
  ) : (
    <a
      href={`mailto:${LEGAL.supportEmail}`}
      className="font-semibold text-amber underline"
    >
      {LEGAL.supportEmail}
    </a>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-xl font-extrabold text-paper">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function LegalPage({
  title,
  path,
  summary,
  children,
}: {
  title: string;
  path: string;
  /** Plain-language summary shown above the full text. */
  summary: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-4 sm:px-6">
        <nav
          aria-label="Policies"
          className="mb-8 flex flex-wrap gap-2 text-sm font-semibold"
        >
          {PAGES.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              aria-current={page.href === path ? 'page' : undefined}
              className={`rounded-full border px-3 py-1.5 ${page.href === path ? 'border-amber text-amber' : 'border-line text-muted hover:text-paper'}`}
            >
              {page.label}
            </Link>
          ))}
        </nav>
        <h1 className="text-4xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-2 font-mono text-xs tracking-[0.15em] text-faint">
          LAST UPDATED {lastUpdatedLabel().toUpperCase()}
        </p>
        <div className="legal-text mt-6 rounded-2xl border border-line bg-walnut p-5 text-body">
          <p className="mb-2 font-mono text-[11px] tracking-[0.2em] text-amber">
            IN SHORT
          </p>
          {summary}
        </div>
        <div className="legal-text mt-10 flex flex-col gap-10 leading-relaxed text-body">
          {children}
        </div>
        <p className="mt-12 border-t border-line pt-6 text-sm text-muted">
          Questions about this page? Email <SupportEmail />.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
