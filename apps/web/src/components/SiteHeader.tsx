import Link from 'next/link';
import { AuthLink } from '@/components/auth/AuthLink';

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
      <Link href="/" className="font-mono text-sm tracking-[0.3em] text-red-text">
        UNSEALED
      </Link>
      <nav aria-label="Main" className="flex items-center gap-2 sm:gap-4">
        <Link href="/daily" className="px-2 py-2 text-sm font-semibold text-muted hover:text-paper">
          Daily
        </Link>
        <Link href="/cases" className="hidden px-2 py-2 text-sm font-semibold text-muted hover:text-paper sm:inline">
          Cases
        </Link>
        <Link href="/pass" className="hidden px-2 py-2 text-sm font-semibold text-muted hover:text-paper md:inline">
          Case Pass
        </Link>
        <AuthLink className="px-2 py-2 text-sm font-semibold text-muted hover:text-paper" />
        <Link
          href="/play/001-dead-air"
          className="rounded-full bg-amber px-4 py-2.5 text-sm font-extrabold text-ink hover:bg-amber-soft"
        >
          <span className="sm:hidden">Play free</span>
          <span className="hidden sm:inline">Play Case #001 free</span>
        </Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-6xl border-t border-walnut px-4 py-8 text-sm text-faint sm:px-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row">
        <p>© 2026 UNSEALED. All cases are works of fiction.</p>
        <p>
          Detective cases from around the world. <Link href="/pass" className="text-muted hover:text-paper">Case Pass</Link>
        </p>
      </div>
    </footer>
  );
}
