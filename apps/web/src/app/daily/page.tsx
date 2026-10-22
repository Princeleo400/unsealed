import type { Metadata } from 'next';
import { DailyBrief } from '@/components/daily/DailyBrief';
import { SiteFooter, SiteHeader } from '@/components/SiteHeader';

export const metadata: Metadata = {
  title: 'Daily Brief',
  description:
    'A free five-minute mystery every day. The same puzzle for everyone in the world.',
};

export default async function DailyPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  return (
    <>
      <SiteHeader />
      <main className="px-4 pb-16 pt-2 sm:px-6">
        <DailyBrief key={date ?? 'today'} date={date} />
      </main>
      <SiteFooter />
    </>
  );
}
