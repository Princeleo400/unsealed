# 09 — Payments setup (Paystack now, Stripe later)

**Status:** built, test mode · **Date:** 23 Oct 2026 · Related: [05-MONETIZATION](05-MONETIZATION.md) · FRD FR-PAY-01/02/04/05/06

**Why Paystack for everything:** Stripe doesn't accept businesses registered in Nigeria. A Nigerian Paystack business can turn on international payments (Visa and Mastercard from any country) and charge in **US$** once a Zenith Bank USD domiciliary account is approved. So today **both ₦ and US$ go through Paystack**. The Stripe code is kept and switched off; see "Adding Stripe later" below.

## How it works

| Piece | Where |
|---|---|
| Prices | `apps/web/src/config/pricing.json` (change prices here, not in code) |
| Which provider takes which currency | `currencies.<code>.provider` in the same file (today both are `paystack`) |
| Who owns what | `public.entitlements` in Supabase: the one source of truth |
| Case Pass | A Paystack plan subscription, one plan per currency |
| Unlocking | The return page asks Paystack directly (works on localhost). Webhooks handle renewals and refunds |
| Access rules | Paid cases need the case or an active pass (checked on every request); pass = unlimited hints, no ads |

Players must be signed in to buy, so purchases follow them to every device. A pass stays active to the end of the paid period plus 2 days of grace. Account deletion cancels renewals first. There's no free trial on Paystack (it charges on day one), and the Case Pass page doesn't promise one.

## Environment variables (`apps/web/.env.local` and later Vercel)

```
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_CURRENCIES=NGN                  # NGN,USD once Paystack approves your USD account
PAYSTACK_PLAN_PASS_MONTHLY=PLN_...       # ₦2,000 monthly
PAYSTACK_PLAN_PASS_ANNUAL=PLN_...        # ₦15,000 yearly
PAYSTACK_PLAN_PASS_MONTHLY_USD=PLN_...   # $4.99 monthly
PAYSTACK_PLAN_PASS_ANNUAL_USD=PLN_...    # $29.99 yearly
SITE_URL=            # production only, e.g. https://your-domain
```

Secret keys are server-only. Never paste them into a chat, a screenshot or git. `SUPABASE_SERVICE_ROLE_KEY` must also be set (purchases are written with it). A currency whose plans are missing shows its Case Pass as "Not on sale yet"; single cases still sell.

## Paystack setup

1. Create an account at paystack.com and complete business activation (compliance documents for your business type).
2. Keep **Test mode** on. **Settings → API Keys & Webhooks** → copy the *Test Secret Key* into `PAYSTACK_SECRET_KEY`.
3. **Turn on international payments** (Settings → Preferences, or ask Paystack support). Without it, foreign cards are declined.
4. **US$ (optional at launch):** Paystack's help centre names only a **Zenith Bank USD domiciliary account** for US$ payouts to Nigerian businesses; Access Bank isn't listed. Before opening a new account, email support@paystack.com and ask whether your Access Bank USD account can be added. Once a USD account is approved (**Settings → Accounts → Add USD account**), set `PAYSTACK_CURRENCIES=NGN,USD`.
   **Until then:** leave `PAYSTACK_CURRENCIES=NGN`. The site shows Naira prices to everyone (visitors abroad see a note that their bank converts), and foreign Visa/Mastercard cards pay in Naira once international payments are on. You only lose US$-denominated prices, not foreign customers.
5. **Products → Plans → Create plan**, four times:

   | Plan | Amount | Interval | Env var |
   |---|---|---|---|
   | Case Pass monthly (₦) | ₦2,000 | Monthly | `PAYSTACK_PLAN_PASS_MONTHLY` |
   | Case Pass annual (₦) | ₦15,000 | Annually | `PAYSTACK_PLAN_PASS_ANNUAL` |
   | Case Pass monthly (US$) | $4.99 | Monthly | `PAYSTACK_PLAN_PASS_MONTHLY_USD` |
   | Case Pass annual (US$) | $29.99 | Annually | `PAYSTACK_PLAN_PASS_ANNUAL_USD` |

   Amounts **must match** `pricing.json`, or first purchases are refused. (The US$ plan option appears once US$ is enabled on your account.)
6. Test card (from Paystack's test-payment docs): `4084 0840 8408 4081`, CVV `408`, any future date, PIN `0000`, OTP `123456`.
7. Webhooks need a public URL, so set this after deploying: Webhook URL = `https://YOUR-DOMAIN/api/webhooks/paystack`.

**Before launch, check one thing in test mode:** that a Paystack *renewal* arrives as a `charge.success` webhook that includes the plan and customer code (that's how renewals extend the pass). Paystack's docs don't show the renewal payload in full. If renewals don't extend the pass, tell Claude and it will switch to Paystack's invoice events.

**Fees to expect** (Paystack's published rates; re-check before launch): local Naira cards about 1.5% + ₦100; international cards 3.9% + ₦100.

## Try it locally

1. Fill in the variables above, restart `pnpm dev`.
2. Sign in, open `http://localhost:3003/pass`, pick ₦ or US$, buy with the test card.
3. You come back to "Payment confirmed". Your account page shows the pass and a "Manage or cancel" button. Hints in Case #001 now say "Unlimited hints with Case Pass", and Case #002 opens.

## Adding Stripe later (optional)

Stripe adds Apple Pay / Google Pay, free trials and usually better approval rates on foreign cards. Nigerian founders typically get it by forming a US company (for example through Stripe Atlas). When that's done:

1. Put the Stripe keys in `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`.
2. In `pricing.json`, set `"USD": { "provider": "stripe", … }`. The 7-day annual trial in the config switches on automatically.
3. Stripe webhook endpoint `https://YOUR-DOMAIN/api/webhooks/stripe` with: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `charge.refunded`. Settings → Billing → Customer portal → Save.

Existing Paystack US$ subscribers keep renewing on Paystack; nothing needs migrating.

## Go-live checklist

- [ ] Business activated on Paystack; international payments on; USD account approved.
- [ ] Switch to live mode; put live keys and the four live plan codes in Vercel (not in git). Live plan codes differ from test ones.
- [ ] Set `SITE_URL` to the real domain and add the production webhook.
- [ ] Re-check Naira prices against the exchange rate (doc 05 §3).
- [ ] Publish Terms and Refund policy pages; link them from the Case Pass page.
- [ ] Ask an accountant about VAT on digital sales to foreign buyers (EU/UK rules apply to digital services; a merchant-of-record service handles this for you if it becomes a burden).
- [ ] Turn off Paystack's own subscription emails if you prefer players to cancel through the account page.
