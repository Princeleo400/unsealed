import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CasePlayer } from '@/components/player/CasePlayer';
import { CATALOG } from '@/lib/catalog';
import { getCase, playableSlugs } from '@/server/cases';

export function generateStaticParams() {
  return playableSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = CATALOG.find((catalogEntry) => catalogEntry.slug === slug);
  return entry
    ? {
        title: `${entry.title} — Case ${entry.number}`,
        description: entry.hook,
      }
    : {};
}

export default async function PlayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!getCase(slug)) notFound();
  return <CasePlayer slug={slug} />;
}
