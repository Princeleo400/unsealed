import type { Metadata } from 'next';
import { DailyBrief } from '@/components/daily/DailyBrief';
import { SiteFooter, SiteHeader } from '@/components/SiteHeader';

export const metadata: Metadata = {
  title: 'Bonus Brief',
  robots: { index: false },
};

export default async function BonusBriefPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string }>;
}) {
  const { ticket } = await searchParams;
  return (
    <>
      <SiteHeader />
      <main className="px-4 pb-16 pt-2 sm:px-6">
        <DailyBrief key={ticket ?? 'none'} ticket={ticket ?? 'missing'} />
      </main>
      <SiteFooter />
    </>
  );
}
