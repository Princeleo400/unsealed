# 09 — Payments setup (Stripe + Paystack)

**Status:** built, test mode · **Date:** 23 Oct 2026 · Related: [05-MONETIZATION](05-MONETIZATION.md) · FRD FR-PAY-01/02/04/05/06

## How it works

| Piece | Where |
|---|---|
| Prices | `apps/web/src/config/pricing.json` (change prices here, not in code) |
| Who owns what | `public.entitlements` in Supabase — the one source of truth |
| US$ | Stripe Checkout (cards, Apple Pay, Google Pay). Case Pass = Stripe subscription |
| Naira | Paystack (card, bank transfer, USSD). Case Pass = Paystack plan subscription |
| Unlocking | The return page asks Stripe/Paystack directly (works on localhost). Webhooks handle renewals, cancellations and refunds |
| Access rules | Paid cases need the case or an active pass (checked on every request); pass = unlimited hints, no ads |

Players must be signed in to buy, so purchases follow them to every device. A pass stays active to the end of the paid period plus 2 days of grace (for slow renewals). Account deletion cancels renewals first.

## Environment variables (`apps/web/.env.local` and later Vercel)

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PLAN_PASS_MONTHLY=PLN_...
PAYSTACK_PLAN_PASS_ANNUAL=PLN_...
SITE_URL=            # production only, e.g. https://your-domain
```

Secret keys are server-only. Never paste them into a chat, a screenshot or git. `SUPABASE_SERVICE_ROLE_KEY` must also be set (purchases are written with it).

## Stripe (test mode)

1. Create an account at stripe.com. Keep **Test mode** on.
2. **Developers → API keys** → copy the *Secret key* (`sk_test_…`) into `STRIPE_SECRET_KEY`.
3. **Settings → Billing → Customer portal** → click **Save** once (turns on "Manage or cancel" for players).
4. Local webhooks: install the Stripe CLI and run
   `stripe listen --forward-to localhost:3003/api/webhooks/stripe`
   It prints a `whsec_…` secret → `STRIPE_WEBHOOK_SECRET`. (Purchases unlock without this; renewals and cancellations need it.)
5. Test card: `4242 4242 4242 4242`, any future date, any CVC.

No products need creating in Stripe: prices come from `pricing.json`.

**Production:** Developers → Webhooks → add endpoint `https://YOUR-DOMAIN/api/webhooks/stripe` with these events:
`checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `charge.refunded`.

## Paystack (test mode)

1. Create an account at paystack.com. Keep **Test mode** on.
2. **Settings → API Keys & Webhooks** → copy the *Test Secret Key* into `PAYSTACK_SECRET_KEY`.
3. **Products → Plans → Create plan**, twice:
   - "Case Pass monthly": ₦2,000, interval **Monthly**
   - "Case Pass annual": ₦15,000, interval **Annually**
   Copy each plan code (`PLN_…`) into `PAYSTACK_PLAN_PASS_MONTHLY` / `PAYSTACK_PLAN_PASS_ANNUAL`.
   The amounts **must match** `pricing.json`, or first purchases are refused.
4. Test card (from Paystack's test-payment docs): `4084 0840 8408 4081`, CVV `408`, any future date, PIN `0000`, OTP `123456`.
5. Webhooks need a public URL, so set them after deploying: Webhook URL = `https://YOUR-DOMAIN/api/webhooks/paystack`.

**Before launch, check one thing in test mode:** that a Paystack *renewal* arrives as a `charge.success` webhook that includes the plan and customer code (that's how renewals extend the pass). Paystack's docs don't show the renewal payload in full. If renewals don't extend the pass, tell Claude and it will switch to Paystack's invoice events.

## Try it locally

1. Fill in the variables above, restart `pnpm dev`.
2. Sign in, open `http://localhost:3003/pass`, pick US$ or Naira, buy a pass with a test card.
3. You come back to "Payment confirmed". Your account page shows the pass and a "Manage or cancel" button. Hints in Case #001 now say "Unlimited hints with Case Pass".

## Go-live checklist

- [ ] Switch both dashboards to live mode; replace keys, plan codes and webhook secrets in Vercel (not in git).
- [ ] Re-create the two Paystack plans in live mode (codes differ).
- [ ] Set `SITE_URL` to the real domain.
- [ ] Add both production webhook endpoints.
- [ ] Re-check Naira prices against the exchange rate (doc 05 §3).
- [ ] Publish Terms and Refund policy pages; link them from the Case Pass page (store and card-network requirement).
- [ ] Turn off Paystack's own subscription emails if you prefer players to cancel through the account page.
