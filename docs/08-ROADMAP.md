# 08 — Roadmap and Delivery Plan

**Product:** UNSEALED *(working title)* · **Version:** 0.1 draft · **Date:** 22 Oct 2026

Rule: **each phase must ship and be measured before the next one starts.** The content pipeline (writing cases) runs alongside every phase.

---

## Phase 0: Validate (week 1)

| Task | Output | Done when |
|---|---|---|
| Lock the name; check trademark and domains | Name decision | Domain + social handles registered |
| Finish the Case 001 truth doc and evidence list | Writer's file | Linter-ready outline |
| **Paper playtest:** Case 001 as a printable PDF / Google Doc pack | 5 testers | ≥3 of 5 solve it; "fair" ≥4/5 |
| Landing page + waitlist ("Can you solve it?" teaser) | unsealed landing | Live, with analytics |
| 3 teaser videos (clue-of-the-day format) | TikTok / IG / X posts | Posted; measure waitlist sign-ups |

**Go/no-go:** ≥200 waitlist sign-ups *or* a strong playtest response → Phase 1.

## Phase 1: Web MVP (weeks 2–5)

**Goal:** a playable, monetised web game with Case 001 (free) + 2 paid cases + the Daily Brief.

| Week | Build |
|---|---|
| 2 | Monorepo scaffold; `packages/engine` (case schema, grading, scoring, timeline) **with tests first**; Supabase schema + RLS; auth (anonymous + magic link + Google) |
| 3 | Case player: library, briefing, evidence renderers (document, photo, chat, log, handwriting, receipt, statement), read tracking, pin board, notes, autosave |
| 4 | Edge Functions: check-string, confront, follow-lead, search-archive, submit-verdict, hints; Timeline view; Debrief + share card; case linter + golden-path test in CI |
| 5 | Daily Brief generator + solver (10k-puzzle uniqueness test), streaks, share grid; Stripe + Paystack checkout + entitlements; paywall; PostHog funnel; launch |

**Content in parallel:** Case 002 ("The Last Toast", Lagos) and Case 003 ("Checkout at Room 9", Lisbon) written and playtested.

**Exit criteria:** Case 001 completion ≥35%, first paying customers, no P1 bugs open for 7 days.

## Phase 2: Mobile apps (weeks 6–8)

| Week | Build |
|---|---|
| 6 | Expo app using shared engine and API client; navigation; evidence renderers (native); offline cache for owned cases |
| 7 | RevenueCat (IAP + restore); AdMob rewarded + interstitial with UMP/ATT consent; push notifications (Daily reminder, streak at risk) |
| 8 | Victim's-phone renderer, map measure tool; store listings, screenshots, preview video; TestFlight / Play internal testing → submit |

**Exit criteria:** approved on both stores; crash-free sessions ≥99.5%; D7 ≥12%.

## Phase 3: Together (weeks 9–12)

| Week | Build |
|---|---|
| 9–10 | Co-op rooms: Realtime channel, presence, shared state patches, team chat with evidence attachments, team verdict vote |
| 11–12 | Party Mode: host screen (web), phone join by code/QR (browser, no install), rounds and "beats", voting; Party Pass product |

**Also:** run the first 2 **manual** B2B team-building events using co-op rooms (sell before the portal is built).

**Exit criteria:** ≥1.5 invites per room host; guest → sign-up ≥30%.

## Phase 4: Scale (months 4–6+)

- B2B Case Studio portal (sponsor flag, coupon reward, event dashboard, certificates, sponsor report)
- Seasons (episodic) + Living Witness notifications
- Split-File co-op, Case Variants (Remix)
- Localisation: French, Spanish, Portuguese, German (UI first, then cases)
- Weekend Race events, leaderboards, cosmetics
- Printable kits store listing (Etsy / Gumroad / Selar)
- Content cadence: **1 new premium case per month**, Sunday Story Brief weekly

## Content calendar (first 6 months)

| Month | Release | City |
|---|---|---|
| 1 | 001 Dead Air (free), 002 The Last Toast, 003 Checkout at Room 9 | Cape Town, Lagos, Lisbon |
| 2 | 004 Below Zero | Seoul |
| 3 | 005 (tbd) | Mexico City |
| 4 | 006 (tbd) + first branded case | Nairobi / client city |
| 5 | Season 1, Episode 1–4 (weekly) | London |
| 6 | 007 (tbd) | Mumbai |

## Team and time (lean)

- **Michael:** build + case writing (about 25–35 h/week).
- **Freelance writer** from month 2 (revenue share or a fixed fee per case).
- **Freelance illustrator / AI-art editor** per case.
- **10–20 playtesters** (Discord community; they get free Case Pass months).

## Budget (first 3 months, approximate)

| Item | Cost |
|---|---|
| Domain + email | ~$30 |
| Apple Developer Program | $99/yr |
| Google Play developer | $25 one-time |
| Supabase Pro (when needed), Vercel Pro (when needed) | $0–$45/month |
| EAS builds (free tier first) | $0 |
| Art / freelance per case | $0–$300 |
| Ads for launch tests | $100–$300 |
| **Total to launch** | **≈ $250–$1,000** |

Check current pricing for each service before paying.

## Top decisions to make now

1. Final name and domain.
2. Confirm launch prices (USD + NGN).
3. Confirm Case 001 = "Dead Air" (Cape Town) as the free flagship, or swap in the Lagos case.
4. Write the cases solo at first, or hire a writer from day one.
