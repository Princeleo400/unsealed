# 10 — Putting UNSEALED online (GitHub + Vercel)

**Status:** ready to deploy · **Date:** 28 Oct 2026 · Related: [09-PAYMENTS-SETUP](09-PAYMENTS-SETUP.md)

The code is already on GitHub (`Princeleo400/unsealed`). Vercel builds it from there: every push to `main` updates the live site, and every other branch gets its own preview link. No custom domain is needed yet; Vercel gives a free address such as `unsealed.vercel.app`.

In the steps below, **`YOUR-SITE`** means that Vercel address (for example `unsealed.vercel.app`, or `unsealed-abc123.vercel.app` if the name is taken).

## 1. Push the latest code

From the `unsealed` folder on your Mac:

```bash
pnpm format:check && pnpm typecheck && pnpm test   # all must pass
git add -A
git commit -m "feat: legal pages, deploy setup"
git push
```

Then merge your working branch into `main` on GitHub (a pull request is fine). `main` is what goes live.

`.env.local` is ignored by git (the `.env*` rule), so your keys never reach GitHub. Check with `git status` that it isn't listed.

## 2. Create the Vercel project

1. Sign in at **vercel.com** with your GitHub account.
2. **Add New → Project → Import** `Princeleo400/unsealed`. If it isn't listed, choose **Adjust GitHub App Permissions** and give Vercel access to that repository.
3. On the setup screen:
   - **Root Directory:** `apps/web` (click *Edit*, pick the folder).
   - **Framework Preset:** Next.js (detected).
   - Build and install commands: leave the defaults. Vercel reads `pnpm@10.28.0` from `package.json`.
4. Open **Environment Variables** and add the variables in the next section, then **Deploy**.

## 3. Environment variables

Add each one for **Production** and **Preview**. Paste the values straight into Vercel; never into a chat, a screenshot or git. Mark the secret ones as **Sensitive**.

| Name | Value | Notes |
|---|---|---|
| `SESSION_SECRET` | a **new** random string | Make it with `openssl rand -base64 48`. Don't reuse your local one. Sensitive. |
| `DAILY_SALT` | a **new** random string | Same command. Without it the Daily answers follow a default anyone with the code could reproduce. Changing it later changes every puzzle, so set it once. Sensitive. |
| `NEXT_PUBLIC_SUPABASE_URL` | from Supabase → Project Settings → API | Same as local. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the publishable (anon) key | Same as local. |
| `SUPABASE_SERVICE_ROLE_KEY` | the secret (service role) key | Server only. Sensitive. |
| `NEXT_PUBLIC_AUTH_GOOGLE` / `NEXT_PUBLIC_AUTH_APPLE` | `1` or `0` | Only `1` if that provider is switched on in Supabase. |
| `PAYSTACK_SECRET_KEY` | the **test** key `sk_test_…` | Live key only after Paystack approves go-live. Sensitive. |
| `PAYSTACK_CURRENCIES` | `NGN` | `NGN,USD` once a USD account is approved. |
| `PAYSTACK_PLAN_PASS_MONTHLY`, `PAYSTACK_PLAN_PASS_ANNUAL` (and the `_USD` ones if used) | your test plan codes `PLN_…` | Same as local while in test mode. |
| `NEXT_PUBLIC_GAM_REWARDED_AD_UNIT` | leave empty for now | Without it, hints and free Bonus Briefs are given with no video. |
| `SITE_URL` | leave empty for now | Without it the site uses its Vercel address automatically. Set it to `https://your-domain` when you have one. |

`NEXT_PUBLIC_…` values are built into the pages, so after changing one, redeploy (**Deployments → ⋯ → Redeploy**).

## 4. Tell Supabase about the new address

Supabase → **Authentication → URL Configuration**:

- **Site URL:** `https://YOUR-SITE`
- **Redirect URLs**, keep `http://localhost:3003/**` and add:
  - `https://YOUR-SITE/**`
  - your preview links, e.g. `https://unsealed-*-YOUR-VERCEL-TEAM.vercel.app/**` (the exact pattern is shown on any preview deployment).

Without this, the sign-in email link sends players back to localhost.

Google or Apple sign-in need no change: they return through Supabase.

## 5. Tell Paystack about the webhook (test mode)

Paystack → **Settings → API Keys & Webhooks** → **Test Webhook URL**:

```
https://YOUR-SITE/api/webhooks/paystack
```

Webhooks handle Case Pass renewals and refunds. The return page after paying works without it.

## 6. Check the live site

On your phone and a computer:

- [ ] Home, Daily Brief and Case #001 open; no errors.
- [ ] Sound plays; on an Android phone, a grid tap vibrates.
- [ ] Solve the Daily → **Share result card** → paste the link in WhatsApp: the card image shows as the preview.
- [ ] Sign in with an email link: it lands back on `YOUR-SITE`, not localhost.
- [ ] Signed in: the coin balance shows; play a Bonus Brief.
- [ ] Buy Case #002 with a Paystack test card (`4084 0840 8408 4081`, any future date, CVV `408`, PIN `0000`, OTP `123456`): it unlocks.
- [ ] `/terms`, `/privacy` and `/refunds` open from the footer.

## 7. Before real players and real money

- [ ] Fill in `publisher` and `supportEmail` in `apps/web/src/config/legal.json`. `pnpm launch:check` must pass.
- [ ] Read the Terms, Privacy and Refund pages and make sure you're happy with the refund rules (14 days for unopened cases; 7 days for a first Case Pass payment or forgotten renewal if barely used).
- [ ] Paystack: complete go-live (they ask for the site address and the policy pages), then swap in the live secret key and live plan codes, and set the **Live** webhook URL.
- [ ] Ads: create the Google Ad Manager rewarded unit, then set `NEXT_PUBLIC_GAM_REWARDED_AD_UNIT`. For players in the EU and UK, Google also requires a consent message: Ad Manager → **Privacy & messaging**.
- [ ] Custom domain (later): Vercel → **Settings → Domains**, then set `SITE_URL` and update the Supabase Site URL, redirect URLs and the Paystack webhook to the new address.

## Day to day

- Work on a branch, push it, and open its preview link to check it.
- Merge to `main` to update the live site.
- A broken deploy never replaces the live site; if something slips through, **Deployments → ⋯ → Promote** an earlier deployment to roll back instantly.
