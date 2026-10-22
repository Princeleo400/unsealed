import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SignInForm } from '@/components/auth/SignInForm';
import { SiteFooter, SiteHeader } from '@/components/SiteHeader';
import { appleSignInEnabled, googleSignInEnabled, safeNext, signInErrorMessage } from '@/lib/supabase/config';
import { currentUser } from '@/server/supabase';

export const metadata: Metadata = { title: 'Sign in' };
export const dynamic = 'force-dynamic';

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next: rawNext, error } = await searchParams;
  const next = safeNext(rawNext, '/');
  if (await currentUser()) redirect(next);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-md px-4 pb-16 pt-8 sm:px-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Sign in</h1>
        <p className="mb-6 mt-2 text-body">Keep your cases, notes and Daily streak on all your devices.</p>
        <SignInForm next={next} error={signInErrorMessage(error)} google={googleSignInEnabled()} apple={appleSignInEnabled()} />
      </main>
      <SiteFooter />
    </>
  );
}
