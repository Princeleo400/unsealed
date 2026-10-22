# 05 — Monetisation Strategy

**Product:** UNSEALED *(working title)* · **Version:** 0.1 draft · **Date:** 22 Oct 2026
Related: [01-BRD](01-BRD.md) §8 business rules · [03-FRD](03-FRD.md) §14

---

## 1. Principles

1. **Never sell answers.** Hints cost score, not money. If a game can be bought, nobody trusts the leaderboard.
2. **Free must be genuinely good.** Case 001 is a full premium-quality case, and the Daily Brief is free forever. These are the marketing.
3. **The host pays; friends play free.** Every co-op room and party is a sales demo to 2–7 new people.
4. **Ads around the edges, never inside a case.** Reading evidence is sacred.
5. **Price for the world.** USD anchors, regional tiers, and local payment methods.

## 2. Revenue streams

| # | Stream | Who pays | Model | Phase |
|---|---|---|---|---|
| R1 | **Case Pass** (subscription) | Core players, duos | All cases + Daily archive + no ads + unlimited hints + Party Mode + Streak Shield | P1 web / P2 mobile |
| R2 | **Single cases** | Players who don't want a subscription | Buy once, own forever | P1 |
| R3 | **Season bundles** | Fans of serial stories | 4-episode season at a discount | P4 |
| R4 | **Party Pass** | Game-night hosts | 24-hour host pass (any case, up to 8 players) | P3 |
| R5 | **Ads** | Free players (indirectly) | Rewarded (extra hints) + capped interstitials after Daily | P2 |
| R6 | **B2B: Branded cases** | Brands / marketers | Custom case with brand integration + coupon reward + report | P4 (sell earlier, manually) |
| R7 | **B2B: Team-building events** | HR, community managers | Per-event or per-seat package with a team dashboard | P4 (run manually from P3) |
| R8 | **Printable case kits** | Gift buyers, party hosts | PDF kit on Etsy / Gumroad / Selar | Any time (low effort, reuses case content) |
| R9 | **Cosmetics** *(optional)* | Engaged players | Board themes, pin and string styles, avatar frames | v2, low priority |
| R10 | **Education licence** *(later)* | Schools, tutors | Class pack of reasoning cases + teacher guide | Year 2 |

## 3. Price list (proposal, USD anchor)

| Product | Price (USD) | Nigeria (web, Paystack) | Notes |
|---|---|---|---|
| Case Pass — monthly | **$4.99** | ₦2,000 | 7-day free trial on annual only (cuts trial abuse) |
| Case Pass — annual | **$29.99** (≈50% off monthly) | ₦15,000 | Push the annual plan; better retention and cash up front |
| Single standard case | **$2.99** | ₦1,000 | |
| Single premium / long case | **$4.99** | ₦1,500 | |
| Season bundle (4 episodes) | **$9.99** | ₦3,500 | |
| Party Pass (24 h) | **$3.99** | ₦1,500 | Included in Case Pass |
| Printable kit (PDF) | **$12–15** | ₦5,000 | Off-platform |
| Branded case (B2B) | **$2,000–$8,000** | from ₦1.5M | Depends on length, art and exclusivity |
| Team event (B2B) | **$149 up to 10 people, +$9 per extra seat** | from ₦75,000 | Benchmark: competitors charge ~$399 for 15 + $15 per extra [1] |

- **Mobile prices** follow the App Store / Play regional price tiers. Pick USD tiers and let the stores localise, then adjust the low-income markets manually.
- **Naira prices** are suggestions for web only. Re-check them against the exchange rate and local spending power before launch.
- Keep prices in a config table (FRD FR-PAY-01) so they can change without a release.

## 4. What free vs paid players get

| Feature | Free | Case Pass |
|---|---|---|
| Case 001 (full) | ✅ | ✅ |
| Other cases | Buy individually | ✅ All, including new monthly releases |
| Daily Brief (today) | ✅ | ✅ |
| Daily archive | Last 7 days | ✅ Full |
| Hints per case | 1 free + 3 via rewarded videos | Unlimited (still cost score) |
| Ads | Rewarded + max 3 interstitials/day after Daily | ❌ None |
| Co-op host | Only for owned cases | ✅ Any case |
| Co-op guest | ✅ Free | ✅ |
| Party Mode host | Party Pass | ✅ Included |
| Streak Shield | ❌ | 1/week |
| Global stats in debrief | ✅ | ✅ |
| Case Variants / Remix (v2) | ❌ | ✅ |

## 5. Ads plan

- **Network:** Google AdMob (mobile) and Google Ad Manager rewarded ads (web, hints only). Other web ad formats are **off at launch**: they hurt the premium feel and pay little. Re-evaluate later on the Daily Brief page only.
- **Placements:**
  - **Rewarded:** "+1 hint" after the free one (max 3 per case, web and mobile), "Retry today's Daily after a fail". Web uses Google Ad Manager rewarded ads (mainly fills on mobile browsers); if no ad fills, the hint is given anyway.
  - **Interstitial:** after finishing a Daily Brief, at most once per session and 3 per day. Never in the first session of a new user.
- **No banners** in the case player.
- **Consent:** Google UMP for GDPR, ATT on iOS (FRD FR-PAY-09).

## 6. Payments and store rules

| Channel | Provider | Fees (indicative) | Notes |
|---|---|---|---|
| Web — global | Stripe | ~3% + fixed fee | Cards, Apple Pay, Google Pay, local methods |
| Web — Africa | Paystack | ~1.5% + fixed fee (NG local) | NGN, GHS, KES, ZAR; cards, bank transfer, USSD |
| iOS | App Store via RevenueCat | 15% (Small Business Program, under $1M/yr) / 30% | Must offer IAP for digital content in the app |
| Android | Google Play via RevenueCat | 15% on the first $1M/yr; 15% on subscriptions | Google's announced "Own Billing" programme is rolling out by region [2] |

**Cross-platform rule:** buy on web → it's unlocked in the app (allowed for multiplatform services, as long as the content is also offered through IAP inside the app). Don't show web prices or "cheaper on our website" text inside the iOS app unless the storefront allows it.

**External purchase links (higher margin):** a RevenueCat guide summarises that US App Store apps can now link to external web purchases with no Apple commission, and that EU apps can use link-outs with reduced fees under DMA terms [2]. **These rules change often and are being litigated. Verify with Apple's and Google's current guidelines before you build any link-out.** MVP plan: IAP on mobile, Stripe/Paystack on web, and add US/EU link-outs later as an optimisation.

## 7. Unit economics: what a case costs

| Item | Lean approach | Cost estimate |
|---|---|---|
| Writing and design (~25–30 evidence items) | Michael + AI-assisted drafting, human-edited | 30–50 hours |
| Art (10–15 illustrations, 6 portraits) | Style-guided AI art plus editing, or a freelance illustrator | $0–$300 |
| Playtesting (5+ blind testers) | Discord community; reward = free Case Pass month | ~$0 |
| Localisation (later) | Machine translation plus native reviewer | $100–$300 per language per case |

**Break-even on a $300 case:** about 120 single sales at $2.99 (net about $2.54 after 15% store fees). The bigger value is that every new case keeps Case Pass subscribers from cancelling.

## 8. Revenue scenarios (illustrative — not a forecast)

Month-12 monthly run-rate. Assumptions:
- net revenue = 85% of gross for store and subscription sales;
- ad revenue is already net;
- all subscribers counted at the monthly price (annual plans would lower the monthly equivalent);
- Stripe/Paystack fees ignored for simplicity.

| Input | Conservative | Base | Upside |
|---|---|---|---|
| MAU | 5,000 | 20,000 | 100,000 |
| Case Pass subscribers (% of MAU) | 1.5% → 75 | 2.5% → 500 | 3% → 3,000 |
| Subscription net ($4.99 × subs × 0.85) | $318 | $2,121 | $12,725 |
| Single-case buyers/month (% of MAU) × $2.99 × 0.85 | 0.5% → 25 → $64 | 1% → 200 → $508 | 1.5% → 1,500 → $3,812 |
| Free DAU (25% of MAU) × blended ad ARPDAU × 30 | 1,250 × $0.008 → $300 | 5,000 × $0.010 → $1,500 | 25,000 × $0.015 → $11,250 |
| B2B (avg/month) | $0 | $1,600 | $4,000 |
| **Total net / month** | **≈ $682** | **≈ $5,729** | **≈ $31,787** |

Ad revenue per user varies hugely by country: much higher in the US/UK/EU than in Nigeria or India. The blended figures above assume a global mix.

**What moves the numbers most:**
1. Daily Brief retention (drives MAU and ad inventory).
2. Annual-plan share (cash up front).
3. Co-op/party invites (free acquisition).
4. One or two B2B deals per quarter. B2B alone can cover all costs early on.

## 9. Funnel and the events to track (PostHog)

```
landing_view → daily_started → daily_solved → share_clicked
case001_opened → evidence_read(n) → first_pin → first_string_check → first_breakthrough
→ verdict_submitted → case_solved | case_cold → debrief_viewed
→ paywall_viewed(source) → checkout_started(provider, product) → purchase_completed
room_created → invite_sent → guest_joined → guest_signed_up → guest_purchased
ad_rewarded_shown/completed · ad_interstitial_shown
```

**Key ratios to watch weekly:**
- Case 001 completion
- Paywall view → purchase
- Guest → purchase (the virality payoff)
- D7 retention of Daily players vs non-Daily players

## 10. Growth plan (go-to-market)

1. **"Can you solve it?" short videos.** Turn one clue a day into a 15–30 s vertical video (the same format as the Slim Culture promo) for TikTok, Instagram Reels, YouTube Shorts and Facebook. The answer is revealed the next day, with a link to play.
2. **Daily share grid.** A Wordle-style organic loop.
3. **Communities:** Reddit (puzzle, mystery and true-crime subreddits — follow each sub's self-promo rules), Discord server (playtesters → superfans), Product Hunt launch.
4. **True-crime podcasters and BookTok:** a free Case Pass plus a custom promo code; affiliate revenue share.
5. **Local-first launches per city case:** the Lagos case pushed through WhatsApp groups and Nigerian Twitter/X, the Cape Town case to South African radio and podcast pages, and so on.
6. **B2B outbound:** start with Lagos brands and agencies (they already understand the Slim Culture model), then HR teams at remote-first companies globally.
7. **SEO:** case landing pages, plus "how to play a murder mystery party" content pages.

---

**Sources**
[1] Virtual murder-mystery team event pricing — [CourseHorse](https://coursehorse.com/groups/virtual/event/virtual-murder-mystery-team-escape)
[2] App-to-web purchase rules summary (US, EU, Google Play Own Billing) — [RevenueCat](https://www.revenuecat.com/app-to-web-purchase-guidelines.md). Verify against Apple's and Google's current terms.
