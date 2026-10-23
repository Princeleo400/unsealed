import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter, SiteHeader } from '@/components/SiteHeader';
import { readShare, shareHeadline, shareTarget } from '@/server/share';

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const card = readShare(token);
  if (!card) return { title: 'Shared result' };
  const title = `${shareHeadline(card)} · Can you solve it?`;
  const description =
    card.kind === 'case'
      ? `A detective case set in ${card.city}. Read the file, find the lies, name the killer.`
      : `A two-minute logic mystery set in ${card.city}. A new one every day, free.`;
  const image = {
    url: `/s/${token}/card.png`,
    width: 1200,
    height: 630,
    alt: shareHeadline(card),
  };
  return {
    title,
    description,
    robots: { index: false },
    openGraph: { title, description, type: 'website', images: [image] },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default async function SharedResultPage({ params }: Props) {
  const { token } = await params;
  const card = readShare(token);
  if (!card) notFound();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 pb-16 pt-4 text-center sm:px-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/s/${token}/card.png`}
          alt={shareHeadline(card)}
          width={1200}
          height={630}
          className="h-auto w-full rounded-2xl border border-line"
        />
        <h1 className="text-3xl font-extrabold">Can you solve it?</h1>
        <p className="max-w-md text-body">
          {card.kind === 'case'
            ? `“${card.title}” is a full detective case set in ${card.city}. Read the evidence, catch the lies and name the killer.`
            : 'Every day there is a new Daily Brief: one short logic mystery, three tries. It takes a few minutes and it is free.'}
        </p>
        <Link
          href={shareTarget(card)}
          className="flex h-12 items-center rounded-xl bg-amber px-8 font-extrabold text-ink"
        >
          {card.kind === 'case' ? 'Open the case' : "Play today's Daily Brief"}
        </Link>
        <Link href="/cases" className="text-sm font-bold text-amber">
          See all cases
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
