# UNSEALED *(working title)*

> **Every file. Every lie. Your verdict.**
> A fair-play detective game for web and mobile. Read the real case file, tie the red string, rebuild the night, and name the killer, alone, with friends, or at a party.

**Owner:** Michael Ohaga (LeoStack) · **Status:** Pre-production (docs v0.1) · **Date:** 22 Oct 2026

---

## What makes it different

1. **Red String Breakthroughs:** link two clues that can't both be true and get an earned "aha!" mid-case.
2. **Timeline Reconstruction:** every timestamp you read lands on the night's timeline; drag suspects into place.
3. **Confront-by-Evidence:** present evidence against a suspect's statement and watch their story change.
4. **Archive Search:** some evidence only appears if you search the right term.
5. **Verdict with partial feedback:** Who · How · Why · Proof, with 3 tries; you learn *how many* parts were right, not *which*.
6. **Daily Brief:** a free, generated 5-minute logic mystery every day, with streaks and a share grid.
7. **Together:** co-op rooms (guests play free), Split-File co-op, and Party Mode (TV + phones).
8. **World Tour:** every case is set in a real city (Cape Town, Lagos, Lisbon, Seoul…) with fictional people.

## Documents

| # | Document | What's inside |
|---|---|---|
| 01 | [BRD — Business Requirements](docs/01-BRD.md) | Problem, vision, users, objectives, scope, business rules, KPIs, risks |
| 02 | [GDD — Game Design](docs/02-GDD.md) | Pillars, core loop, every mechanic, modes, Daily Brief, scoring, **what we take from the 7 reference games**, art direction |
| 03 | [FRD — Functional Requirements](docs/03-FRD.md) | Numbered requirements with priority/phase, acceptance criteria, non-functional requirements |
| 04 | [Technical Architecture](docs/04-TECH-ARCHITECTURE.md) | Monorepo, stack, case data model, DB tables, Edge Functions, anti-spoiler design, realtime, payments, Daily generator |
| 05 | [Monetisation](docs/05-MONETIZATION.md) | Revenue streams, price list (USD + NGN), free vs paid, ads, store rules, revenue scenarios, funnel, growth plan |
| 06 | [Case Authoring Guide](docs/06-CASE-AUTHORING-GUIDE.md) | The fair-play contract, build order, sizing, recipes, quality gates, playtest protocol |
| 07 | [Pilot Case 001 — "Dead Air"](docs/07-PILOT-CASE-001.md) | ⚠️ Spoilers. Full outline of the free launch case |
| 08 | [Roadmap](docs/08-ROADMAP.md) | Phases 0–4, weekly plan, content calendar, budget, open decisions |
| 09 | [Payments setup](docs/09-PAYMENTS-SETUP.md) | Stripe + Paystack keys, plans, webhooks, test cards, go-live checklist |
| — | [CLAUDE.md](CLAUDE.md) | Build rules for AI-assisted development in this repo |

## Stack

Next.js · TypeScript · Tailwind · Expo (React Native) · Supabase · Vercel · Stripe · Paystack · RevenueCat · AdMob · PostHog

## Working in the repo

```bash
pnpm install
pnpm dev            # web app at http://localhost:3003 (landing, /daily, /cases, /play/001-dead-air)
pnpm build          # production build of the web app
pnpm test           # engine unit tests (Vitest, coverage)
pnpm typecheck
pnpm format         # Prettier, 80 columns (pnpm format:check to verify)
pnpm lint:names     # fails on single-letter variable/parameter names
pnpm case:lint      # validates every case in content/cases
pnpm case:golden    # an automated detective solves every case end to end
pnpm case:pack -- --pdf   # builds the paper playtest packs into dist/<case>/
```

- `apps/web`: the Next.js web app. The landing page and waitlist are in `src/app/page.tsx` and `api/waitlist`. The case player is `src/components/player/*`, and it's graded on the server by `api/play/[slug]`.
- `apps/web/src/server/billing`: payments. Prices live in `apps/web/src/config/pricing.json`; `entitlements` in the database is the one source of truth for access.
- `supabase/migrations`: database tables (waitlist, accounts, payments). `supabase/tests` runs them on PGlite and checks row-level security.
- `packages/engine`: the pure TypeScript game rules (schema, actions, scoring, timeline, linter, golden path)
- `packages/content-tools`: CLI wrappers plus the playtest-pack generator
- `content/cases/<id>/case.json` is the public file; `solution.json` must stay server-only

### Environment variables (`apps/web/.env.local`; see `.env.example`)

| Variable | Needed for | Without it |
|---|---|---|
| `SESSION_SECRET` | Signing play sessions (32+ characters, `openssl rand -base64 48`) | Dev uses a built-in secret; **production refuses to start a case** |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Accounts: sign-in, progress and streaks synced across devices | No sign-in; progress stays in the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Saving waitlist sign-ups, deleting accounts (server only, never public) | Dev saves the waitlist to `apps/web/.data/waitlist.jsonl`; production returns an error |
| `NEXT_PUBLIC_AUTH_GOOGLE`, `NEXT_PUBLIC_AUTH_APPLE` | Showing Google / Apple sign-in buttons (`1` = on) | Email sign-in only |
| `PAYSTACK_SECRET_KEY`, `PAYSTACK_PLAN_PASS_*` (Naira and `_USD` plans) | All checkout today, in ₦ and US$ ([setup](docs/09-PAYMENTS-SETUP.md)) | Buy buttons show "Not on sale yet" |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Optional, later: only if a currency is switched to Stripe in `pricing.json` | Not needed |
| `SITE_URL` | Checkout return links in production | Uses the address the request came from |

## Next step

Phase 0 (validation week) in [08-ROADMAP](docs/08-ROADMAP.md): lock the name, paper-playtest Case 001, and put up the waitlist page.
