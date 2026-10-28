# 03 — Functional Requirements Document (FRD)

**Product:** UNSEALED *(working title)* · **Version:** 0.1 draft · **Date:** 22 Oct 2026
Related: [02-GDD](02-GDD.md) (design intent) · [04-TECH-ARCHITECTURE](04-TECH-ARCHITECTURE.md) (how)

**Priority:** **M** = Must (MVP) · **S** = Should (launch or soon after) · **C** = Could (v2) · **W** = Won't now
**Phase:** P1 web MVP · P2 mobile · P3 co-op and party · P4 B2B, seasons, localisation (see [08-ROADMAP](08-ROADMAP.md))
**Platforms:** W = web, M = mobile, B = both

---

## 1. Accounts and profile (AUTH)

| ID | Requirement | Pri | Phase | Plat |
|---|---|---|---|---|
| FR-AUTH-01 | Players can start the free Case 001 and the Daily Brief **without an account** (anonymous session). | M | P1 | B |
| FR-AUTH-02 | Sign up / sign in with email magic link, Google, and Apple (Apple required on iOS when other social logins exist). | M | P1/P2 | B |
| FR-AUTH-03 | Upgrading anonymous → registered **keeps all progress** (anonymous user linked to the new identity). | M | P1 | B |
| FR-AUTH-04 | Profile shows display name, avatar (preset detective avatars), Detective Rank, XP, Casebook and stats. | M | P1 | B |
| FR-AUTH-05 | Users can delete their account and all personal data from settings (store and GDPR/NDPR requirement). | M | P1 | B |
| FR-AUTH-06 | Users can choose region and currency display; defaults come from locale/IP. | S | P1 | W |

> **Status (22 Oct 2026), web:** FR-AUTH-01, 02 (email link built; Google and Apple appear once enabled in Supabase), 03 (progress made before signing in is uploaded, and the save further along wins), 04 (partial: name only), 05 (delete account), FR-CASE-10 (resume on any device) and Daily streak sync are built. Row-level security is tested on PGlite (`supabase/tests`).

**Acceptance (FR-AUTH-03):** Given an anonymous player who has read 10 items in Case 001, when they sign in with Google, then their progress, pins and notes are still there, and the anonymous row is merged, not duplicated.

## 2. Case library and store (LIB)

| ID | Requirement | Pri | Phase | Plat |
|---|---|---|---|---|
| FR-LIB-01 | The library lists all cases with cover, city, difficulty (1–5), estimated time, price/ownership state, rating and badges earned. | M | P1 | B |
| FR-LIB-02 | Filters: Owned · Free · New · City · Difficulty · Length. | S | P1 | B |
| FR-LIB-03 | The case detail page shows the briefing teaser (spoiler-free), content notes, length, players (solo/co-op/party), and a Buy / Play / Included-in-Pass button. | M | P1 | B |
| FR-LIB-04 | Owned cases (Case Pass or purchase) are clearly marked; Case Pass cases show "Included". | M | P1 | B |
| FR-LIB-05 | "Coming soon" cases can be shown with a **Notify me** button (push/email). | C | P2 | B |

## 3. Case player — evidence (CASE)

| ID | Requirement | Pri | Phase | Plat |
|---|---|---|---|---|
| FR-CASE-01 | Opening a case shows the Briefing first, then the Case File with tabs: Briefing, Documents, Photos, Records, Statements, Phone, Archive (only tabs that have content). | M | P1 | B |
| FR-CASE-02 | Each evidence item shows number ("Records · 18/29"), title, source line, and a type-specific body renderer (GDD §4.1). | M | P1 | B |
| FR-CASE-03 | Renderers for: document, photo (zoom + markers), chat thread, log/table (sort/filter), handwriting, receipt, statement, audio transcript. | M | P1 | B |
| FR-CASE-04 | Map renderer with a measure tool showing travel time between two marked points. | S | P1 | B |
| FR-CASE-05 | Victim's-phone mini-OS renderer (Messages, Calls, Photos, Notes, Health, Maps) with optional passcode lock. | S | P1 | B |
| FR-CASE-06 | Items are marked read when opened; a counter shows "X/Y read". Unread items have a dot. | M | P1 | B |
| FR-CASE-07 | Previous/Next navigation within a tab; swipe on mobile, arrow keys on web. | M | P1 | B |
| FR-CASE-08 | Highlighting text in a document saves a **Fact** card that can be pinned. | S | P1 | B |
| FR-CASE-09 | Progress (read state, pins, strings, notes, clock, hints, accusations) **autosaves** to the device immediately and syncs to the cloud within 5 s when online. | M | P1 | B |
| FR-CASE-10 | A case can be resumed on any device signed into the same account. | M | P2 | B |
| FR-CASE-11 | "Accessible font" toggle swaps handwriting fonts for the UI font and adds text labels for colour-based clues. | M | P1 | B |

## 4. Pin board and Red String (BOARD)

| ID | Requirement | Pri | Phase | Plat |
|---|---|---|---|---|
| FR-BOARD-01 | Any evidence item or Fact can be pinned and unpinned; the pin count shows in the header. | M | P1 | B |
| FR-BOARD-02 | Board cards can be dragged; position persists. On small screens a list view is offered as an alternative. | M | P1 | B |
| FR-BOARD-03 | Suspect chips at the top; tapping one toggles crossed-out. | M | P1 | B |
| FR-BOARD-04 | A free-text **My notes** field per case (max 5,000 chars). | M | P1 | B |
| FR-BOARD-05 | **Red String:** select two pinned cards → choose a relation (Contradiction / Corroboration / Link) → **Check**. | M | P1 | B |
| FR-BOARD-06 | A Check is validated **server-side** against the case's Breakthrough definitions (pair plus relation; order of the pair doesn't matter). | M | P1 | B |
| FR-BOARD-07 | Valid → the string turns gold, a Breakthrough card is added, and any unlocks it carries are applied (leads, statement lines, verdict words). Invalid → the string turns red and stays. Either result costs 10 min on the clock. | M | P1 | B |
| FR-BOARD-08 | The same pair and relation can't be re-checked (no double cost); the UI shows the previous result. | M | P1 | B |

**Acceptance (FR-BOARD-07):** Given Breakthrough BT-03 defined as {E-12, E-18, contradiction}, when the player strings E-18 → E-12 as Contradiction and taps Check, then the string turns gold, "BT-03" appears in Breakthroughs, Lead L-05 becomes available, and the clock increases by 10 min.

## 5. Timeline (TIME)

| ID | Requirement | Pri | Phase | Plat |
|---|---|---|---|---|
| FR-TIME-01 | Every timestamp tagged in read evidence appears as an event on the timeline (zoomable, scrolls horizontally). | M | P1 | B |
| FR-TIME-02 | The player can drag suspect tokens onto time slots and attach an evidence card as the reason. | S | P1 | B |
| FR-TIME-03 | Conflict highlight: when the player's placements and read evidence put the same suspect in two locations within an overlapping window, the slot shows amber (no explanation). | S | P1 | B |
| FR-TIME-04 | Tapping a timeline event opens its source evidence. | M | P1 | B |

## 6. Leads, clock and statements (LEAD, STMT)

| ID | Requirement | Pri | Phase | Plat |
|---|---|---|---|---|
| FR-LEAD-01 | Leads list shows available leads with title, cost in hours, and source (initial / Breakthrough / Search). | M | P1 | B |
| FR-LEAD-02 | Following a lead asks for confirmation, adds its cost to the Investigation Clock, and unlocks its evidence items. | M | P1 | B |
| FR-LEAD-03 | The clock shows hours used vs the Inspector's Par (e.g. "6h / Par 5h"). | M | P1 | B |
| FR-STMT-01 | A Statement shows numbered lines; the player can choose **Confront** on a line and select an evidence card. | M | P1 | B |
| FR-STMT-02 | A valid confrontation (server-checked) appends the revised lines, marks the contradicted line struck-through, and applies unlocks. Invalid costs 10 min. | M | P1 | B |

## 7. Archive search (ARCH)

| ID | Requirement | Pri | Phase | Plat |
|---|---|---|---|---|
| FR-ARCH-01 | Search box with min 2 characters; the query must equal a whole archive term (case- and accent-insensitive) or one of its author-defined synonyms. | M | P1 | B |
| FR-ARCH-02 | At most 5 results per query; results show the title and snippet with the term highlighted. | M | P1 | B |
| FR-ARCH-03 | Matching is done **server-side**; the full archive index is never sent to the client. | M | P1 | B |
| FR-ARCH-04 | Search history is kept per case; searches are free. | S | P1 | B |

## 8. Verdict (VERD)

| ID | Requirement | Pri | Phase | Plat |
|---|---|---|---|---|
| FR-VERD-01 | The Verdict has four tabs: Who, How, Why, Proof. Each tab is a set of blanks defined by the case. | M | P1 | B |
| FR-VERD-02 | Word options for How/Why blanks become available only after the player has seen the evidence that introduces them (discovery-gated word bank). | M | P1 | B |
| FR-VERD-03 | Proof requires exactly 3 evidence items (as defined by the case's accepted set). | M | P1 | B |
| FR-VERD-04 | Submit is enabled only when every blank is filled; a confirm dialog shows "This uses 1 of your 3 accusations." | M | P1 | B |
| FR-VERD-05 | Grading is server-side and returns **only the number of fully-correct sections** (0–4), never which ones. | M | P1 | B |
| FR-VERD-06 | 4/4 → Solved → Debrief. After the 3rd wrong submission → Case Cold → Debrief (lowest rank). | M | P1 | B |
| FR-VERD-07 | In co-op, the verdict is proposed by any member and needs a team vote (majority by default; host can set unanimous). | S | P3 | B |

**Acceptance (FR-VERD-05):** Given Who and Why correct, How and Proof wrong, when submitted, then the response is `{correctSections: 2, accusationsLeft: 2}` and the API payload contains no section names.

## 9. Hints (HINT)

| ID | Requirement | Pri | Phase | Plat |
|---|---|---|---|---|
| FR-HINT-01 | Three hint tiers (Nudge, Pointer, Reveal) chosen by the case's current "stuck point" (next unfound essential Breakthrough). | M | P1 | B |
| FR-HINT-02 | Score cost shown before use: −10 / −30 / −75. | M | P1 | B |
| FR-HINT-03 | Free players: 1 free hint per case, then up to 3 more each unlocked by an opt-in rewarded video (web: Google Ad Manager rewarded; mobile: AdMob). If no ad fills, the hint is given anyway. Case Pass: unlimited, no ads. Server enforces the caps. *(Web: built.)* | M | P1 | B |
| FR-HINT-04 | Hints are never sold for money. | M | — | B |

## 10. Debrief, scoring and share (DEB)

| ID | Requirement | Pri | Phase | Plat |
|---|---|---|---|---|
| FR-DEB-01 | Score calculated per GDD §7 on the server; badges awarded. | M | P1 | B |
| FR-DEB-02 | Reconstruction view: illustrated step-by-step story of what happened. | M | P1 | B |
| FR-DEB-03 | "What you missed": essential evidence and Breakthroughs not found by the player. | M | P1 | B |
| FR-DEB-04 | Global stats: solve rate, median hours, % first accusation per suspect (computed nightly or on read with a cache). | S | P1 | B |
| FR-DEB-05 | Spoiler-free share card image (case cover, badges, score, rank, link). Uses the native share sheet on mobile. | M | P1 | B |
| FR-DEB-06 | Player can rate the case (1–5) and flag "felt unfair" with an optional comment. | M | P1 | B |

## 11. Daily Brief (DAILY)

| ID | Requirement | Pri | Phase | Plat |
|---|---|---|---|---|
| FR-DAILY-01 | One puzzle per UTC day, identical for all players, generated ahead (≥14 days buffered) and verified to have exactly one solution. | M | P1 | B |
| FR-DAILY-02 | Difficulty by weekday per GDD §6; Sunday = handcrafted Story Brief (fallback to a generated Chief if none is scheduled). | M | P1 | B |
| FR-DAILY-03 | The UI shows clue statements, a deduction grid (tap to cycle ✕ / ✓ / blank), and an answer form. | M | P1 | B |
| FR-DAILY-04 | Result: time, wrong attempts; streak updated (a missed day breaks it; 1 **Streak Shield** per week for Case Pass holders). | M | P1 | B |
| FR-DAILY-05 | Emoji share grid copied to clipboard / share sheet (GDD §6 format). | M | P1 | B |
| FR-DAILY-06 | Archive of past Dailies: last 7 days free, full archive with Case Pass. | S | P2 | B |
| FR-DAILY-07 | Daily leaderboard (fastest correct, friends + global). | C | P3 | B |
| FR-DAILY-08 | **Bonus Briefs**: extra generated puzzles outside the calendar, any difficulty, never counted in the streak. Members pay 1 coin (max 5 a day); Case Pass plays unlimited with no ads; guests watch one rewarded video a day, then are invited to sign in. | S | P2 | B |
| FR-DAILY-09 | **Coins** (signed-in players): +1 daily login, +1 for solving today's Daily, +1 per rewarded video (max 3 a day). Server-side ledger, idempotent and capped; coins are never sold. | S | P2 | B |
| FR-SHARE-01 | **Share image cards** for Daily, Bonus and case results: a 1200×630 spoiler-free image (never the culprit, place or object) and a share page with link previews and a "Can you solve it?" link. Built only from server-verified results. | S | P2 | B |
| FR-FEEL-01 | **Sound and vibration**: short sound effects for game moments (grid marks, opening evidence, red strings, breakthroughs, wrong answers, hints, coins, case closed / cold), made in code with no audio files. Vibration on supporting phones for bigger moments only. On by default; a speaker button in every header turns sound and vibration off separately, remembered per browser. No background music. | S | P2 | B |
| FR-AD-09 | **Ad blockers**: when a blocker stops a reward video (coins, guest Bonus Brief, hint), the player is asked to pause it, with browser-specific steps and a reload button, instead of getting the reward for free. A genuine "no video available" still rewards. The play-more panel warns up front when a blocker is on. Case Pass and signing in (daily coins) remain ad-free routes. | S | P2 | B |

> **Status (22 Oct 2026):** FR-DAILY-01, 02 (Sunday uses the Chief generator until Story Briefs are written), 03, 05 and 06 are built on the web (`/daily`). Grading happens on the server, and 8,000 generated puzzles were verified to have exactly one solution. Streaks are kept in the browser for now; they move to accounts later. Not built yet: the Streak Shield (needs Case Pass), the Friday lying witness, and leaderboards.
>
> **Status (23 Oct 2026):** FR-DAILY-08, FR-DAILY-09 and FR-SHARE-01 are built. Bonus Briefs live at `/daily/bonus?ticket=…` (signed ticket, 7 days). Coins use `coin_wallets` + `coin_ledger` and the `coin_apply` function (service role only); rates are in `apps/web/src/config/coins.json`. A correct Daily answer returns a signed proof so share cards can say "solved" without trusting the browser; case cards are read from the signed play state. Share pages are `/s/<token>` with the image at `/s/<token>/card.png`.
>
> **Status (25 Oct 2026):** FR-FEEL-01 is built on the web: `apps/web/src/lib/feedback` (`feedback(cue)` plays the sound and vibration). iPhone browsers don't offer vibration to websites, and Safari's silent switch mutes the sounds. Hear every cue at `/dev/sounds` (development only). The mobile app will use `expo-haptics` with the same cue names.

## 12. Co-op rooms (COOP)

| ID | Requirement | Pri | Phase | Plat |
|---|---|---|---|---|
| FR-COOP-01 | The host creates a room for an owned case → gets a 6-character room code and share link. | M | P3 | B |
| FR-COOP-02 | Guests join via link/code; guests don't need to own the case (BR-4). Guests need an account (anonymous allowed). | M | P3 | B |
| FR-COOP-03 | Max 6 members; presence shown (avatar, "reading Records 18"). | M | P3 | B |
| FR-COOP-04 | Shared state: board, pins, strings, breakthroughs, clock, leads, timeline placements, verdict draft — all synced in real time (<500 ms typical). | M | P3 | B |
| FR-COOP-05 | Team chat with text, emoji and **evidence attachments** (tap to open). | M | P3 | B |
| FR-COOP-06 | Host controls: kick, lock room, verdict rule (majority/unanimous), end room. | S | P3 | B |
| FR-COOP-07 | **Split-File** option: evidence is dealt across members; an item is visible to others only after its holder "presents" it in chat. | C | P4 | B |

## 13. Party Mode (PARTY)

| ID | Requirement | Pri | Phase | Plat |
|---|---|---|---|---|
| FR-PARTY-01 | The host opens Party Mode on a big screen (web) → shows a 4-letter join code and QR. | S | P3 | W |
| FR-PARTY-02 | 3–8 players join on phones via browser (no install needed) or the app. | S | P3 | B |
| FR-PARTY-03 | The game is split into rounds; each round deals each phone a private "beat" (evidence to read aloud or a lead to choose). | S | P3 | B |
| FR-PARTY-04 | The big screen shows the shared board, timeline and round timer; phones vote on strings and on the final verdict. | S | P3 | B |
| FR-PARTY-05 | Requires the host to have a Party Pass (24 h) or Case Pass. | S | P3 | B |

## 14. Monetisation (PAY)

| ID | Requirement | Pri | Phase | Plat |
|---|---|---|---|---|
| FR-PAY-01 | Products: Case Pass monthly, Case Pass annual, single case, Season bundle, Party Pass (24 h). Prices are config-driven, not hard-coded. | M | P1 | B |
| FR-PAY-02 | Web checkout via Stripe (global) and Paystack (NGN, GHS, KES, ZAR); currency picked automatically from region, user can override. | M | P1 | W |
| FR-PAY-03 | Mobile purchases via App Store / Google Play billing through RevenueCat. | M | P2 | M |
| FR-PAY-04 | One **entitlements** table is the source of truth; webhooks from Stripe, Paystack and RevenueCat update it; all clients read it. | M | P1 | B |
| FR-PAY-05 | Restore purchases (mobile); manage subscription link (web portal / store settings). | M | P2 | B |
| FR-PAY-06 | Paywall screens show the exact price, renewal terms, trial terms and a cancel-anytime note (store compliance). | M | P1 | B |
| FR-PAY-07 | Promo codes: a code can grant a case, a pass for N days, or a discount (used for B2B, influencers, giveaways). | S | P2 | B |
| FR-PAY-08 | Ads (free tier only): opt-in rewarded video for hints (the only ad shown inside a case); interstitial at most once after a Daily Brief, **never** inside a case. Frequency cap ≤3 interstitials/day. | M | P1/P2 | B |
| FR-PAY-09 | Consent: ad personalisation consent (UMP/GDPR) and iOS ATT prompt before personalised ads. | M | P2 | M |

## 15. Notifications (NOTIF)

| ID | Requirement | Pri | Phase | Plat |
|---|---|---|---|---|
| FR-NOTIF-01 | Opt-in daily reminder for the Daily Brief at the user's chosen time (default 08:00 local). | S | P2 | M |
| FR-NOTIF-02 | Streak-at-risk reminder (20:00 local if not yet played). | S | P2 | M |
| FR-NOTIF-03 | Co-op invites and "your team found a Breakthrough". | S | P3 | B |
| FR-NOTIF-04 | Living Witness messages between Season episodes. | C | P4 | M |

## 16. B2B Case Studio (B2B) — Phase 4

| ID | Requirement | Pri | Phase | Plat |
|---|---|---|---|---|
| FR-B2B-01 | Branded cases are flagged `sponsor` with brand name, logo slot on the briefing and debrief, and an optional reward (coupon code shown on solve). | C | P4 | B |
| FR-B2B-02 | Event packages: an organiser buys N seats → gets team room links → dashboard shows team scores and a winner certificate (PDF). | C | P4 | W |
| FR-B2B-03 | Sponsor report: plays, solves, average time, coupon reveals (aggregated, no personal data). | C | P4 | W |

## 17. Admin and content ops (ADMIN)

| ID | Requirement | Pri | Phase | Plat |
|---|---|---|---|---|
| FR-ADMIN-01 | Cases are authored as JSON/Markdown in the repo, validated by a schema (CI fails on invalid case). | M | P1 | — |
| FR-ADMIN-02 | A **case linter** checks: every essential Breakthrough is reachable, every verdict word is unlockable, every Proof item is reachable, no orphan evidence IDs. | M | P1 | — |
| FR-ADMIN-03 | Publish script uploads case content + assets to Supabase (client bundle), and the solution file to a server-only table. | M | P1 | — |
| FR-ADMIN-04 | Content hot-fix: a case version can be updated without an app release; players mid-case keep their version unless the fix is flagged "critical". | S | P2 | — |
| FR-ADMIN-05 | Simple admin dashboard: case stats, unfair reports, revenue summary, daily puzzle queue. | S | P2 | W |

---

## 18. Non-functional requirements (NFR)

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Performance | Web LCP < 2.5 s on 4G mid-range Android; case open < 1.5 s after first load; evidence switch < 150 ms. |
| NFR-02 | Size | Mobile app download < 40 MB; case assets lazy-loaded and cached (~5–15 MB per case). |
| NFR-03 | Offline | Owned cases can be read and pinned offline. Checks (strings, confrontations, verdict) queue and resolve when back online; the UI says "Will check when you're online." Daily Brief is playable offline once downloaded (grading is local for generated puzzles). |
| NFR-04 | Availability | 99.5% monthly for API (relying on Supabase/Vercel SLAs). |
| NFR-05 | Security | Solutions, Breakthrough definitions, statement unlocks and the archive index are stored server-side only. Row-level security on every table. Rate limit checks (30/min/user) and searches (60/min/user). |
| NFR-06 | Privacy | GDPR, UK GDPR, Nigeria NDPA, CCPA basics: privacy policy, consent for analytics/ads in EU/UK, data export and delete. No data sold. |
| NFR-07 | Accessibility | WCAG 2.2 AA target: contrast, focus states, screen-reader labels, reduced motion, text scaling to 200%. |
| NFR-08 | Localisation | All UI strings in i18n files from day one; case content supports per-locale variants; layout tolerates +35% text length; dates/times/currency localised. |
| NFR-09 | Compatibility | Web: last 2 versions of Chrome, Safari, Firefox, Edge; iOS 16+; Android 8+ (API 26). |
| NFR-10 | Observability | Errors to Sentry; product analytics (PostHog) for the funnel events in [05-MONETIZATION](05-MONETIZATION.md) §9. |
| NFR-11 | Quality | Engine package has ≥90% unit test coverage; each case passes the linter + a scripted "golden path" test that solves it end-to-end. |
| NFR-12 | Cost | Infra < $100/month until monthly revenue > $1,000. |
| NFR-13 | Content rating | Meets 12+ (App Store) / Teen (IARC) — implied violence only. |
