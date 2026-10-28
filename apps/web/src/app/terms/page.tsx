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
  title: 'Terms of Service',
  description:
    'The rules for playing UNSEALED and buying cases or the Case Pass.',
};

export default function TermsPage() {
  const publisher = <Fact value={LEGAL.publisher} />;
  return (
    <LegalPage
      title="Terms of Service"
      path="/terms"
      summary={
        <ul>
          <li>You must be {LEGAL.minimumAge} or older to play.</li>
          <li>
            Case #001 and the Daily Brief are free. Other cases and the Case
            Pass are paid; the Case Pass renews until you cancel.
          </li>
          <li>
            Coins are free rewards with no cash value. Hints are never sold.
          </li>
          <li>Play fair, keep it friendly, and enjoy the cases.</li>
        </ul>
      }
    >
      <LegalSection id="who" title="1. Who we are">
        <p>
          UNSEALED (the &quot;game&quot;) is published by {publisher}{' '}
          (&quot;we&quot;, &quot;us&quot;), based in {LEGAL.country}. You can
          reach us at <SupportEmail />. By playing the game or creating an
          account you agree to these terms. If you don&apos;t agree, please
          don&apos;t use the game.
        </p>
      </LegalSection>

      <LegalSection id="age" title="2. Who can play">
        <p>
          You must be at least {LEGAL.minimumAge} years old to play UNSEALED. If
          you are under 18 (or the age of adulthood where you live), you need a
          parent or guardian&apos;s permission to make a purchase, and they are
          responsible for it.
        </p>
        <p>
          The cases are works of fiction about crimes, including murder. They
          contain no graphic violence, but each case lists its content notes
          before you open it.
        </p>
      </LegalSection>

      <LegalSection id="accounts" title="3. Your account">
        <p>
          You can play without an account. Signing in (by email link, Google or
          Apple) keeps your progress, streak, coins and purchases on every
          device. Keep access to your email account safe: anyone who can read
          your email can sign in as you.
        </p>
        <p>
          If you choose a display name, it must not be offensive, impersonate
          someone or include personal details of others. You can delete your
          account at any time from your{' '}
          <Link href="/account" className="text-amber underline">
            account page
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection id="purchases" title="4. Buying cases and the Case Pass">
        <ul>
          <li>
            Prices are shown before you pay, in your currency. Payments are
            processed by Paystack; we never see your full card details. Your
            bank may add its own fees or exchange rate.
          </li>
          <li>
            <strong>Single cases</strong> are a one-off payment. The case stays
            in your account for as long as the game is available.
          </li>
          <li>
            <strong>The Case Pass</strong> is a subscription (monthly or
            yearly). It renews automatically and is charged to the card you paid
            with, at the price shown, until you cancel. You can cancel at any
            time from your account page; you keep access until the end of the
            period you paid for. If we ever change the price, we&apos;ll tell
            you before your next renewal and you can cancel first.
          </li>
          <li>
            Purchases are tied to your account and can&apos;t be transferred or
            resold.
          </li>
          <li>
            Refunds are covered by our{' '}
            <Link href="/refunds" className="text-amber underline">
              Refund Policy
            </Link>
            .
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="coins" title="5. Coins, Bonus Briefs, hints and ads">
        <ul>
          <li>
            Coins are earned for free (daily visits, solving the Daily Brief,
            watching optional videos). They can only be spent on Bonus Briefs in
            the game. They have no cash value and can&apos;t be bought, sold,
            transferred or exchanged for money.
          </li>
          <li>
            We may change how many coins things earn or cost, and daily limits,
            to keep the game fair. Coins disappear if you delete your account.
          </li>
          <li>
            Hints are never sold. Free players can unlock some hints by watching
            a short optional video; Case Pass members get them without ads.
          </li>
          <li>
            Videos are shown by our advertising partner. We don&apos;t control
            their content, but you can report an inappropriate ad to us.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="fair-play" title="6. Fair play">
        <p>When you use UNSEALED, please don&apos;t:</p>
        <ul>
          <li>
            try to break, overload or get around the game&apos;s security, or
            access answers or paid content you haven&apos;t unlocked;
          </li>
          <li>
            use bots, scripts or other tools to play, earn coins, or collect
            content from the game;
          </li>
          <li>fake results, share cards, payments or video rewards;</li>
          <li>
            copy, sell or republish the cases, artwork or puzzles outside the
            game.
          </li>
        </ul>
        <p>
          Sharing your result cards is welcome; they never contain spoilers.
          Please be kind and keep solutions out of public places where other
          players might see them.
        </p>
        <p>
          If someone breaks these rules we may remove their results, coins or
          rewards, or suspend or close their account. If we close an account for
          a reason that isn&apos;t a breach of these terms, we&apos;ll refund
          any unused paid time on a Case Pass.
        </p>
      </LegalSection>

      <LegalSection id="content" title="7. Our content">
        <p>
          The cases, characters, documents, puzzles, artwork, sounds and code of
          UNSEALED belong to {publisher} or our licensors. We give you a
          personal, non-transferable right to play them for your own enjoyment.
          All people, places, businesses and events in the cases are fictional;
          any resemblance to real ones is coincidental.
        </p>
      </LegalSection>

      <LegalSection id="availability" title="8. Changes and availability">
        <p>
          We keep improving the game, so features may change. We try to keep
          UNSEALED available at all times, but we can&apos;t promise it will
          always be free of interruptions or errors. If we ever close the game
          for good, we&apos;ll give at least 30 days&apos; notice and refund any
          unused paid time on Case Pass subscriptions.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="9. Our responsibility to you">
        <p>
          The game is provided &quot;as is&quot;. As far as the law allows, we
          are not responsible for indirect losses (for example lost data or lost
          time), and our total responsibility to you is limited to the amount
          you paid us in the 12 months before the problem. Nothing in these
          terms takes away rights you have under the consumer laws of the
          country where you live.
        </p>
      </LegalSection>

      <LegalSection id="law" title="10. Law and disputes">
        <p>
          These terms are governed by the laws of {LEGAL.country}. If something
          goes wrong, please email us first at <SupportEmail /> and we&apos;ll
          try to sort it out. If you live outside {LEGAL.country}, you can also
          use the courts and consumer protections of your own country.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="11. Changes to these terms">
        <p>
          We may update these terms as the game grows. For important changes
          we&apos;ll tell you in the game or by email before they apply. The
          date at the top shows the latest version. If you keep playing after a
          change, the new terms apply.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
