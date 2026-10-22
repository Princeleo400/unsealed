import Link from 'next/link';
import { SiteFooter, SiteHeader } from '@/components/SiteHeader';
import { WaitlistForm } from '@/components/WaitlistForm';
import { CATALOG } from '@/lib/catalog';
import {
  IconBoard,
  IconCalendar,
  IconFolder,
  IconGlobe,
  IconMegaphone,
  IconScales,
  IconSearch,
  IconString,
  IconTimeline,
  IconUsers,
} from '@/components/icons';

const steps = [
  {
    icon: IconFolder,
    title: 'Open the file',
    text: 'Police reports, door logs, text threads, a dead woman’s phone. Everything is in there.',
  },
  {
    icon: IconString,
    title: 'Tie the red string',
    text: 'Connect two clues that can’t both be true. If you’re right, the case cracks open.',
  },
  {
    icon: IconTimeline,
    title: 'Rebuild the night',
    text: 'Every time you read lands on the timeline. Find where someone was in two places at once.',
  },
  {
    icon: IconScales,
    title: 'Name the killer',
    text: 'Who, how, why, and the three pieces of proof. Three accusations. Then it goes cold.',
  },
];

const features = [
  {
    icon: IconSearch,
    title: 'Search the archive',
    text: 'Some evidence only appears if you search the right name, code or number plate.',
  },
  {
    icon: IconMegaphone,
    title: 'Confront the suspects',
    text: 'Present evidence against a line in their statement and watch the story change.',
  },
  {
    icon: IconBoard,
    title: 'Fair play, always',
    text: 'Every answer is in the file. No pixel-hunting, no gotchas, no buying answers.',
  },
  {
    icon: IconUsers,
    title: 'Solve it with friends',
    text: 'Co-op rooms and a party mode for game night. Only the host needs the case.',
  },
  {
    icon: IconCalendar,
    title: 'A Daily Brief',
    text: 'A free five-minute mystery every day, the same for everyone in the world.',
  },
  {
    icon: IconGlobe,
    title: 'Around the world',
    text: 'Cape Town, Lagos, Lisbon, Seoul. Every case is set somewhere real.',
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:pt-16">
          <div className="flex flex-col gap-6">
            <span className="w-fit -rotate-2 border-2 border-red-text px-3 py-1 font-mono text-xs tracking-[0.25em] text-red-text">
              CASE #001 · FREE
            </span>
            <h1 className="text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl">
              Can you <span className="text-amber">solve it?</span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-body">
              A radio host is found dead in her studio at 01:31. The pathologist
              says she died before 00:50. Thousands of listeners heard her
              talking on air at 01:10.
            </p>
            <p className="max-w-xl text-lg leading-relaxed text-body">
              Read the real case file. Trust nobody.{' '}
              <strong className="text-paper">Name the killer.</strong>
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/play/001-dead-air"
                className="rounded-xl bg-amber px-6 py-3.5 font-extrabold text-ink hover:bg-amber-soft"
              >
                Open the case file
              </Link>
              <Link
                href="/daily"
                className="rounded-xl border border-line-strong px-6 py-3.5 font-bold text-paper hover:border-amber"
              >
                Try today’s 5-minute brief
              </Link>
            </div>
            <p className="text-sm text-faint">
              Free · 45–75 minutes · plays in your browser · no account needed
            </p>
          </div>

          {/* Evidence collage */}
          <div
            aria-hidden="true"
            className="relative mx-auto h-[420px] w-full max-w-[440px]"
          >
            <div className="absolute left-2 top-4 w-64 -rotate-3 bg-paper p-4 font-mono text-[11px] text-ink shadow-2xl">
              <div className="mb-1 tracking-widest text-[#4a3f35]">
                SECUREDOOR ACCESS EXPORT
              </div>
              <div className="mb-2 border-b-2 border-ink pb-1 text-sm font-semibold">
                Keycard log
              </div>
              {[
                ['00:15', 'V-03 (L. Hartmann)', 'IN'],
                ['00:22', 'M. Vos', 'IN'],
                ['00:28', 'S. Dlamini', 'OUT'],
                ['00:52', 'M. Vos', 'OUT'],
              ].map(([time, who, direction]) => (
                <div
                  key={time}
                  className={`grid grid-cols-[44px_1fr_30px] border-b border-paper-line py-1 ${time === '00:22' ? 'bg-amber-wash' : ''}`}
                >
                  <span>{time}</span>
                  <span>{who}</span>
                  <span>{direction}</span>
                </div>
              ))}
            </div>
            <div className="absolute right-0 top-40 w-56 rotate-2 rounded-2xl bg-walnut p-3 text-xs shadow-2xl ring-1 ring-line">
              <div className="mb-2 font-bold">Text line 31994</div>
              <div className="mb-2 rounded-xl bg-line p-2">
                Easter?? lol Thandi you ok? It’s March
                <div className="text-right text-[10px] text-faint">01:11</div>
              </div>
              <div className="rounded-xl bg-line p-2">
                Is this a repeat??
                <div className="text-right text-[10px] text-faint">01:14</div>
              </div>
            </div>
            <div className="absolute bottom-2 left-8 w-60 -rotate-1 bg-paper p-4 text-ink shadow-2xl">
              <div className="absolute -top-2 left-1/2 h-3.5 w-3.5 rounded-full bg-red" />
              <div className="text-sm font-extrabold">
                Pathologist’s summary
              </div>
              <div className="mt-1 font-mono text-[11px] text-[#4a3f35]">
                Time of death: between 00:30 and 00:50
              </div>
            </div>
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 440 420"
            >
              <path
                d="M120 150 C 200 230, 260 210, 330 190"
                stroke="#E8B83A"
                strokeWidth="3"
                fill="none"
              />
            </svg>
          </div>
        </section>

        {/* How it works */}
        <section className="border-y border-walnut bg-cocoa/60">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-3xl font-extrabold tracking-tight">
              You are the detective
            </h2>
            <p className="mt-2 max-w-2xl text-body">
              The game never tells you what a clue means. It only confirms what
              you prove.
            </p>
            <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <li
                  key={step.title}
                  className="rounded-2xl border border-line bg-walnut p-5"
                >
                  <div className="flex items-center gap-3 text-amber">
                    <step.icon className="h-6 w-6" />
                    <span className="font-mono text-xs text-faint">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-extrabold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-body">
                    {step.text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-3xl font-extrabold tracking-tight">
            Not another hidden-object game
          </h2>
          <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="flex gap-4">
                <feature.icon className="mt-1 h-6 w-6 shrink-0 text-amber" />
                <div>
                  <h3 className="font-extrabold">{feature.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-body">
                    {feature.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Cases */}
        <section className="border-t border-walnut">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-3xl font-extrabold tracking-tight">
                The case files
              </h2>
              <Link
                href="/cases"
                className="font-bold text-amber hover:text-amber-soft"
              >
                All cases
              </Link>
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {CATALOG.map((catalogEntry) => (
                <article
                  key={catalogEntry.slug}
                  className="flex flex-col rounded-2xl border border-line bg-walnut p-5"
                >
                  <span className="font-mono text-xs tracking-widest text-red-text">
                    {catalogEntry.number} · {catalogEntry.city.toUpperCase()}
                  </span>
                  <h3 className="mt-2 text-xl font-extrabold">
                    {catalogEntry.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-body">
                    {catalogEntry.hook}
                  </p>
                  <p className="mt-4 text-xs font-semibold text-muted">
                    {catalogEntry.minutes} · difficulty{' '}
                    {catalogEntry.difficulty}/5
                  </p>
                  {catalogEntry.status === 'playable' ? (
                    <Link
                      href={`/play/${catalogEntry.slug}`}
                      className="mt-4 rounded-xl bg-amber px-4 py-3 text-center font-extrabold text-ink hover:bg-amber-soft"
                    >
                      {catalogEntry.productId ? 'Open' : 'Play free'}
                    </Link>
                  ) : (
                    <span className="mt-4 rounded-xl border border-line-strong px-4 py-3 text-center font-bold text-muted">
                      Coming soon
                    </span>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Waitlist */}
        <section id="waitlist" className="border-t border-walnut bg-cocoa/60">
          <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
            <h2 className="text-3xl font-extrabold tracking-tight">
              Get the next case first
            </h2>
            <p className="mt-2 text-body">
              New cases, the Daily Brief, co-op rooms and the phone apps are on
              the way. Join the list and we’ll tell you when they open.
            </p>
            <div className="mt-8">
              <WaitlistForm />
            </div>
            <p className="mt-3 text-xs text-faint">
              No spam. Unsubscribe any time.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
