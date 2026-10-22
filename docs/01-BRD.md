# 01 — Business Requirements Document (BRD)

**Product:** UNSEALED *(working title — see §11)*
**Type:** Document-based detective / murder-mystery deduction game
**Platforms:** Web (Next.js) + iOS/Android (Expo), one shared game engine
**Market:** Worldwide, English first; localisation-ready from day one
**Owner:** Michael Ohaga (LeoStack) · **Version:** 0.1 draft · **Date:** 22 Oct 2026

---

## 1. Executive summary

UNSEALED is a premium-feeling detective game where players solve murder cases by reading the evidence themselves: police reports, chat threads, door logs, receipts, photos, and a victim's phone. There's no hidden-object filler and no hand-holding. Every answer is in the file, and the player's brain does the detective work.

It combines the best of seven proven products:

- the physical case-file feel of **Hunt A Killer** and **Unsolved Case Files**;
- the phone-as-evidence immersion of **Duskwood**;
- the daily habit loop of **Murdle**;
- the search-to-discover mechanic of **Her Story**;
- the fill-in-the-verdict grading of **The Case of the Golden Idol / Obra Dinn**;
- the "beat the expert's par" scoring of **Sherlock Holmes Consulting Detective**.

On top of those it adds original mechanics: **Red String Breakthroughs**, **Timeline Reconstruction**, **Confront-by-Evidence**, **Split-File co-op**, **Party Mode** and **World Tour seasons**. These are detailed in [02-GDD](02-GDD.md).

It earns money through six streams:

1. A **Case Pass** subscription.
2. One-off **case purchases**.
3. **Ads** in the free tier only.
4. A **Party Pass** for game nights.
5. **B2B** branded cases and team-building events.
6. **Printable case kits.**

## 2. Problem and opportunity

| Observation | Implication |
|---|---|
| Physical mystery boxes prove people pay well for "real" case files. Hunt A Killer runs at **about $30/month** [1]. | There's demand for evidence-reading mysteries at premium prices. Digital delivery can undercut on price while keeping the feel. |
| Murdle started as a **daily puzzle website that went viral**, then became a book series and TV deal [2]. | A free daily puzzle is a proven growth engine for the genre. |
| Corporate virtual murder-mystery events sell at about **$399 per 15 people plus $15 per extra person** [3]. | B2B team-building is a high-value, low-volume revenue line. |
| Mobile detective apps are multiplying (e.g. new "ColdCase – Online Detective" listings with rewarded-ad coin shops) [4], but most are hidden-object or quiz-style. | The space is busy at the *low-quality* end. **Fair-play, document-quality** cases on mobile are still rare, and that's our gap. |
| Mystery fiction is set overwhelmingly in the US and UK. | Cases set in Lagos, Cape Town, Lisbon, Seoul, Mexico City and elsewhere feel fresh to everyone, including those home markets. |
| Brands such as Slim Culture are already using mystery cases as marketing ("solve it: 10% off"). | There's a B2B "Case Studio" opportunity: we write branded cases for businesses. |

## 3. Vision and positioning

**Vision:** the world's best place to solve a murder from your sofa, alone or with friends.

**Positioning statement:** For puzzle lovers and true-crime fans who want a *real* challenge, UNSEALED is a detective game that hands you the full case file and trusts you to solve it. Unlike hidden-object detective apps, every case is fair-play, written like a novel, set somewhere new in the world, and playable solo, in co-op, or as a party game.

**Tagline options:** "Every file. Every lie. Your verdict." · "The truth is in the file." · "Can you solve it?"

## 4. Business objectives (first 12 months)

| # | Objective | Target (assumption to validate) |
|---|---|---|
| BO-1 | Launch a web MVP with 1 free and 2 paid cases plus the Daily Brief | By week 5 |
| BO-2 | Launch iOS and Android apps | By week 8 |
| BO-3 | Reach 20,000 monthly active players | By month 12 (base scenario) |
| BO-4 | Convert ≥2.5% of MAU to paying Case Pass subscribers | Month 12 |
| BO-5 | Ship 1 new premium case per month, plus a daily puzzle every day | From launch |
| BO-6 | Sign ≥4 B2B deals (branded case or team-building event) | Year 1 |
| BO-7 | Keep monthly infrastructure cost under $100 until revenue covers it | Ongoing |

Full revenue scenarios are in [05-MONETIZATION](05-MONETIZATION.md) §8.

## 5. Target users

| Persona | Who | Wants | Pays for |
|---|---|---|---|
| **The Armchair Detective** (core) | 22–45, reads crime fiction, listens to true-crime podcasts, plays Wordle and Murdle | A hard, fair case, 30–90 min, and the feeling of being clever | Case Pass, single cases |
| **The Daily Puzzler** | Commuter; plays 5 minutes a day | A streak, a shareable result, a quick win | Watches ads; occasionally upgrades |
| **The Game-Night Host** | Hosts friends, family or a church/campus group | A ready-made social activity for 3–8 people | Party Pass, cases |
| **The Duo** | Couples and long-distance friends | Something to do together on a call | Case Pass (one buys, both play in co-op) |
| **The HR / Team Lead** (B2B) | People ops, community managers | Remote team-building that isn't awkward | Event packages |
| **The Brand Marketer** (B2B) | Fashion, food and fintech brands | Engagement campaigns, leads, coupon redemptions | Custom branded cases |
| **The Teacher** (later) | Secondary/college, critical-thinking classes | Reasoning exercises with evidence | Education licence |

## 6. Scope

### In scope (v1, months 0–6)
- A solo case engine with all evidence types and core mechanics (see GDD §4).
- Daily Brief: a generated 5-minute logic mini-case, the same for everyone worldwide each day, with streaks and a share grid.
- Accounts, cloud save, cross-platform progress (web ↔ mobile).
- Store: Case Pass, single cases, Party Pass; Stripe + Paystack on web, App Store / Google Play billing on mobile.
- Co-op rooms (2–6 players, shared board, chat).
- Party Mode (host screen plus phones).
- Ads in the free tier (mobile first).
- 4 launch cases: 1 free, 3 paid.
- English UI with i18n plumbing ready.

### Later (v2, months 6–12)
- Split-File asymmetric co-op, Case Variants (Remix), Living Witness push episodes.
- A B2B Case Studio portal (branded cases, event dashboards, coupon codes).
- Localisation: French, Spanish, Portuguese, German.
- Printable kits store, cosmetics, seasonal leaderboards, weekend Race events.

### Out of scope
- User-generated case editor (re-evaluate in year 2).
- Voice acting and 3D environments.
- Real-money prizes or gambling mechanics.

## 7. Stakeholders

| Role | Who | Responsibility |
|---|---|---|
| Product owner, lead dev | Michael (LeoStack) | Decisions, build, release |
| Case writer(s) | Michael at first, plus freelance mystery writers | Case content, fairness |
| Illustrator | Freelance / AI-assisted with a style guide | Evidence art, character portraits |
| Playtesters | 10–20 recruited players per case | Fairness and difficulty sign-off |
| B2B clients | Brands, HR teams | Briefs, sign-off on branded cases |

## 8. Business rules

1. **BR-1 Fair play.** Every case must be solvable from the evidence alone. No case ships without passing the fairness checklist and ≥5 blind playtests ([06-CASE-AUTHORING-GUIDE](06-CASE-AUTHORING-GUIDE.md)).
2. **BR-2 No pay-to-win.** Money never buys an answer. Hints cost score, not cash. Free players can get extra hints by watching a rewarded ad, capped per case.
3. **BR-3 No ads interrupt a case.** Ads never pop up while someone is reading evidence. The only ad inside a case is the **opt-in rewarded video for a hint**, which the player chooses to watch. Other ads appear only around free content (after a Daily Brief, on the lobby).
4. **BR-4 Guests play free.** In co-op and Party Mode, only the host needs to own the case or Party Pass. Invitees play free, which is how the game spreads.
5. **BR-5 Buy once, play everywhere.** A purchase on any platform unlocks the content on all platforms under the same account (subject to store rules; see [05-MONETIZATION](05-MONETIZATION.md) §6).
6. **BR-6 Regional pricing.** Prices follow store price tiers and purchasing-power adjustments (e.g. Naira pricing via Paystack on web).
7. **BR-7 Content rating.** Target 12+/Teen. There is no graphic gore: violence is implied (body outlines, reports), and each case carries content notes.
8. **BR-8 Fiction disclaimer.** All cases are fictional. Real places may be used as settings, but no real people or real businesses are implicated.
9. **BR-9 Solutions stay server-side.** Case answers are never shipped in the client bundle, so spoilers can't be pulled from the app (see [04-TECH-ARCHITECTURE](04-TECH-ARCHITECTURE.md) §6).

## 9. Success metrics (KPIs)

| Area | KPI | Target |
|---|---|---|
| Acquisition | Installs + web sign-ups / month | 5k → 20k by month 6 |
| Activation | % of new players who open Case 001's first evidence | ≥70% |
| Engagement | Case 001 completion rate | ≥40% |
| Retention | D1 / D7 / D30 | 35% / 15% / 7% |
| Habit | % of DAU playing the Daily Brief; median streak | ≥50%; ≥4 days |
| Virality | Share-grid shares per 100 Daily completions; co-op invites per host | ≥8; ≥1.5 |
| Monetisation | MAU → paying conversion | ≥2.5% |
| Monetisation | ARPPU (net) / month | ≥$4 |
| Quality | Average case rating; "unfair" reports per case | ≥4.5/5; <5% |

These are planning targets, not benchmarks. Re-baseline after the first 30 days of real data.

## 10. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Content bottleneck** (cases are slow to write) | High | High | Daily Brief is *generated by code*. Authoring template and checklist. Freelance writers on revenue share. Case Variants reuse one case's assets. |
| **Spoilers** posted online | High | Medium | Server-side grading, Case Variants (different killer per variant), and a community debrief only for people who have solved the case. |
| **Unfair or broken case** gets bad reviews | Medium | High | Fairness checklist, ≥5 blind playtests, an in-game "this felt unfair" report, and hot-fixable case content (JSON, not app code). |
| **Low conversion** in lower-income markets | High | Medium | Regional pricing, ads plus rewarded hints, cheap single cases, Paystack local payment. |
| **Store rejection** (violence, payments) | Low | High | 12+ content standard, IAP offered on mobile, external-link programmes only where allowed. |
| **Copycats** | Medium | Medium | Moat = content library + brand + community + daily-puzzle habit. Trademark the final name and register domains early. |
| **Scope creep** (co-op, party, B2B all at once) | High | High | Phased roadmap ([08-ROADMAP](08-ROADMAP.md)); each phase must ship and earn before the next starts. |
| **AI-generated art looks generic / legal risk** | Medium | Medium | Defined style guide, human editing, only tools whose terms allow commercial use, a log of every generated asset. |

## 11. Naming and brand (decision needed)

"UNSEALED" is a working title. A quick store search shows "Red Thread" and "Case Files" are already crowded. "Unsealed" showed no exact detective-game match in a first search, but needs a proper trademark and domain check before commitment. Alternatives to evaluate: **Casebound**, **The Verdict Room**, **Inkblot Files**, **Deadfile**, **Paper Trail Detective**.

Publisher name: under the planned umbrella studio name (not yet chosen). Until then, use the same interim legal details as Sevenfold.

## 12. Assumptions and dependencies

- Supabase, Vercel, Expo/EAS, RevenueCat, Stripe and Paystack free or low tiers are enough until revenue starts. Verify current pricing before launch.
- Apple and Google developer accounts are active.
- Case content (writing + art) can be produced at about 1 case per 2–3 weeks part-time at first.
- Store payment rules change often. The rules summarised in [05-MONETIZATION](05-MONETIZATION.md) §6 must be re-checked at launch.

## 13. Approval

| Decision | Owner | Status |
|---|---|---|
| Final name and domain | Michael | ☐ Open |
| Pricing (USD base and NGN) | Michael | ☐ Open |
| Launch case lineup | Michael | ☐ Open |
| Go/no-go for Phase 1 after validation week | Michael | ☐ Open |

---

**Sources**
[1] Hunt A Killer subscription price — [My Subscription Addiction](https://www.mysubscriptionaddiction.com/category/hunt-a-killer-reviews)
[2] Murdle origin as a viral daily web puzzle — [Arkansas Business](https://www.arkansasbusiness.com/article/gt-karber-murdle-success/); TV rights deal — [Loeb & Loeb](https://www.loeb.com/en/newsevents/news/2024/11/loeb-represents-g-t-karber-in-sale-of-television-adaptation-rights-of-murdle-to-legendary-television)
[3] Virtual murder-mystery team event pricing — [CourseHorse](https://coursehorse.com/groups/virtual/event/virtual-murder-mystery-team-escape)
[4] ColdCase – Online Detective App Store listing — [Apple App Store](https://apps.apple.com/app/id6758562111)
