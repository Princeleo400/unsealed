import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Fact,
  LegalPage,
  LegalSection,
  SupportEmail,
} from '@/components/legal/LegalPage';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'What UNSEALED collects, why, who we share it with, and your rights.',
};

export default function PrivacyPage() {
  const publisher = <Fact value={LEGAL.publisher} />;
  return (
    <LegalPage
      title="Privacy Policy"
      path="/privacy"
      summary={
        <ul>
          <li>
            You can play without an account. If you sign in, we keep your email
            address and your game progress.
          </li>
          <li>We never sell your data and never see your full card number.</li>
          <li>
            Optional reward videos come from Google, which may use cookies.
          </li>
          <li>
            You can delete your account and its data at any time from your
            account page.
          </li>
        </ul>
      }
    >
      <LegalSection id="who" title="1. Who is responsible">
        <p>
          UNSEALED is run by {publisher}, based in {LEGAL.country}, who decides
          how your personal data is used (the &quot;data controller&quot;).
          Contact us about privacy at <SupportEmail />. We follow the Nigeria
          Data Protection Act 2023 and, for players in the European Union and
          the United Kingdom, the GDPR.
        </p>
      </LegalSection>

      <LegalSection id="what" title="2. What we collect and why">
        <ul>
          <li>
            <strong>Without an account:</strong> your progress, streak, settings
            (such as sound on or off) and results are saved in your own browser
            and stay on your device. We don&apos;t collect them.
          </li>
          <li>
            <strong>Account details:</strong> your email address, and an
            optional display name. If you sign in with Google or Apple, we
            receive your email address and the name on that account. Used to
            sign you in and keep your account.
          </li>
          <li>
            <strong>Game data:</strong> case progress and boards, Daily Brief
            results (solved or not, wrong guesses and time), coins earned and
            spent. Used to keep your progress on every device, run streaks and
            coins, and stop cheating.
          </li>
          <li>
            <strong>Purchases:</strong> what you bought, the price, currency,
            date and the payment reference. Used to give you access, handle
            refunds and keep accounting records. Card details are handled by
            Paystack; we only receive a reference to the payment.
          </li>
          <li>
            <strong>Email list:</strong> if you ask to hear about new cases, we
            keep your email address until you unsubscribe or ask us to remove
            it.
          </li>
          <li>
            <strong>Technical data:</strong> like every website, our hosting
            providers process your IP address and browser details to deliver the
            site, keep it secure and fix errors. These logs are kept for a short
            time.
          </li>
        </ul>
        <p>
          We use your data to provide the game you asked for (our contract with
          you), to keep the game secure and fair (our legitimate interest), to
          meet legal duties such as tax records, and, for the email list and
          personalised ads, with your consent, which you can withdraw at any
          time.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="3. Cookies and browser storage">
        <ul>
          <li>
            <strong>Needed for the game:</strong> a sign-in cookie when you are
            signed in, a cookie that counts the free Bonus Brief for players
            without an account, and browser storage for your progress and
            settings. These don&apos;t track you across other websites.
          </li>
          <li>
            <strong>Advertising:</strong> when you choose to watch a reward
            video, Google&apos;s ad service may use cookies or device
            identifiers to show and measure the ad, and, where allowed and with
            consent where required, to personalise ads. You can manage
            Google&apos;s ad settings at{' '}
            <a
              href="https://adssettings.google.com"
              className="text-amber underline"
              rel="noopener"
            >
              adssettings.google.com
            </a>
            .
          </li>
        </ul>
        <p>We don&apos;t use analytics or tracking cookies of our own.</p>
      </LegalSection>

      <LegalSection id="sharing" title="4. Who we share it with">
        <p>
          We don&apos;t sell or rent your personal data. We share it only with
          services that help us run the game, under contracts that protect it:
        </p>
        <ul>
          <li>
            <strong>Supabase</strong>: our database and sign-in service
            (account, game data, sign-in emails).
          </li>
          <li>
            <strong>Vercel</strong>: hosts the website.
          </li>
          <li>
            <strong>Paystack</strong>: processes payments and card details.
          </li>
          <li>
            <strong>Google</strong>: reward videos, and Google sign-in if you
            use it. <strong>Apple</strong>: Apple sign-in if you use it.
          </li>
        </ul>
        <p>
          We may also share data if the law requires it, or to protect players
          and the game from fraud or abuse.
        </p>
      </LegalSection>

      <LegalSection id="transfers" title="5. Where your data is stored">
        <p>
          Our providers may store and process data outside your country,
          including in the United States and the European Union. When data
          leaves your country, we rely on the safeguards the law requires, such
          as standard contractual clauses.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="6. How long we keep it">
        <ul>
          <li>Account and game data: until you delete your account.</li>
          <li>
            Purchase records: kept for as long as tax and accounting laws
            require (up to 6 years), even after you delete your account, but no
            longer linked to your account.
          </li>
          <li>Email list: until you unsubscribe or ask us to remove you.</li>
        </ul>
      </LegalSection>

      <LegalSection id="rights" title="7. Your rights">
        <p>
          You can ask us to show you, correct, delete or send you a copy of your
          personal data, to object to or limit how we use it, and to withdraw
          consent. You can delete your account yourself on your{' '}
          <Link href="/account" className="text-amber underline">
            account page
          </Link>
          , which also cancels any Case Pass renewal. For anything else, email{' '}
          <SupportEmail />; we reply within 30 days.
        </p>
        <p>
          If you&apos;re unhappy with how we handle your data, you can complain
          to the Nigeria Data Protection Commission (ndpc.gov.ng) or the data
          protection authority where you live.
        </p>
      </LegalSection>

      <LegalSection id="children" title="8. Children">
        <p>
          UNSEALED is for players aged {LEGAL.minimumAge} and over. We
          don&apos;t knowingly collect data from younger children. If you
          believe a child under {LEGAL.minimumAge} has given us personal data,
          email us and we&apos;ll delete it.
        </p>
      </LegalSection>

      <LegalSection id="security" title="9. Security">
        <p>
          Data is encrypted in transit, access is limited to what each part of
          the game needs, and answers and payments are checked on our servers.
          No system is perfectly secure, but if a breach affects you, we&apos;ll
          tell you and the authorities as the law requires.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="10. Changes to this policy">
        <p>
          If we change how we use your data, we&apos;ll update this page and the
          date at the top, and tell you in the game or by email before important
          changes apply.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
