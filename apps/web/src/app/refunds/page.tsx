import type { Metadata } from 'next';
import Link from 'next/link';
import {
  LegalPage,
  LegalSection,
  SupportEmail,
} from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'When and how you can get a refund for a case or the Case Pass.',
};

export default function RefundsPage() {
  return (
    <LegalPage
      title="Refund Policy"
      path="/refunds"
      summary={
        <ul>
          <li>
            Bought a case and haven&apos;t opened it? Full refund within 14
            days.
          </li>
          <li>
            Case Pass: cancel any time and keep it to the end of the period. A
            first payment or a renewal you didn&apos;t mean to keep can be
            refunded within 7 days if you&apos;ve barely used it.
          </li>
          <li>
            Charged twice, or something stops you playing? We&apos;ll fix it or
            refund you.
          </li>
        </ul>
      }
    >
      <LegalSection id="cases" title="1. Single cases">
        <p>
          You can get a full refund within 14 days of buying a case if you
          haven&apos;t opened it yet. Once you have opened a case you&apos;ve
          started using the digital content, so we don&apos;t normally refund
          it, unless one of the problems in section 3 applies.
        </p>
      </LegalSection>

      <LegalSection id="pass" title="2. The Case Pass">
        <ul>
          <li>
            You can cancel at any time from your{' '}
            <Link href="/account" className="text-amber underline">
              account page
            </Link>
            . You won&apos;t be charged again, and you keep the Case Pass until
            the end of the period you&apos;ve paid for.
          </li>
          <li>
            Within 7 days of your first Case Pass payment, or of a renewal you
            forgot to cancel, you can ask for a full refund if you have opened
            no more than one paid case in that time.
          </li>
          <li>
            Apart from that, we don&apos;t refund part-used months or years.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="problems" title="3. When something goes wrong">
        <p>
          We&apos;ll always refund you (or fix the problem, if you prefer) if:
        </p>
        <ul>
          <li>you were charged twice or charged the wrong amount;</li>
          <li>
            you paid but didn&apos;t get access, and we can&apos;t fix it within
            a few days;
          </li>
          <li>
            a technical fault on our side stops a case from working and we
            can&apos;t fix it in reasonable time;
          </li>
          <li>someone used your card without your permission.</li>
        </ul>
      </LegalSection>

      <LegalSection id="how" title="4. How to ask for a refund">
        <p>
          Email <SupportEmail /> from the email address of your UNSEALED
          account, with the payment reference (it&apos;s in your payment
          receipt) and a short note on what happened. We reply within 3 working
          days.
        </p>
        <p>
          Approved refunds go back to the card or account you paid with, through
          Paystack. Banks usually show them within 5 to 10 working days. If you
          paid in a different currency from your card, your bank may convert the
          amount at a different rate. Once a refund is made, the case or Case
          Pass it paid for is removed from your account.
        </p>
      </LegalSection>

      <LegalSection id="free" title="5. Free items">
        <p>
          Coins, Bonus Briefs, hints and rewards from videos are free and have
          no cash value, so they can&apos;t be refunded or exchanged for money.
        </p>
      </LegalSection>

      <LegalSection id="rights" title="6. Your legal rights">
        <p>
          This policy doesn&apos;t take away any rights you have under the
          consumer protection laws of the country where you live.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
