import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AccountPanel } from '@/components/auth/AccountPanel';
import { BillingPanel } from '@/components/billing/BillingPanel';
import { catalogEntry } from '@/lib/catalog';
import { PRICING, isProductId, product } from '@/lib/pricing';
import { loadAccess, type Access } from '@/server/billing/access';
import { supabaseBillingStore } from '@/server/billing/store';
import { SiteFooter, SiteHeader } from '@/components/SiteHeader';
import { currentUser, serverSupabase } from '@/server/supabase';

export const metadata: Metadata = { title: 'Your account' };
export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect('/signin?next=/account');
  const sb = await serverSupabase();
  const { data } = (await sb?.from('profiles').select('display_name').eq('id', user.id).maybeSingle()) ?? { data: null };
  const store = supabaseBillingStore();
  const access: Access | null = store ? await loadAccess(store, user.id).catch(() => null) : null;
  const pass = access?.pass
    ? {
        name: isProductId(access.pass.productId) ? product(access.pass.productId).name : 'Case Pass',
        // Show the paid-up date, not the grace period we add behind the scenes.
        until: access.pass.expiresAt
          ? new Date(access.pass.expiresAt.getTime() - PRICING.graceDays * 86_400_000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
          : null,
        source: access.pass.source,
      }
    : null;
  const cases = (access?.cases ?? []).map((slug) => ({ slug, title: catalogEntry(slug)?.title ?? slug }));
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-md px-4 pb-16 pt-8 sm:px-6">
        <h1 className="mb-6 text-3xl font-extrabold tracking-tight">Your account</h1>
        <div className="flex flex-col gap-8">
          <BillingPanel pass={pass} cases={cases} available={Boolean(store)} />
          <AccountPanel email={user.email ?? ''} displayName={(data?.display_name as string | null) ?? ''} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
