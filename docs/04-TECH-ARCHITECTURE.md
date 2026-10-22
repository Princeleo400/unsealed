# 04 — Technical Architecture

**Product:** UNSEALED *(working title)* · **Version:** 0.1 draft · **Date:** 22 Oct 2026
Related: [03-FRD](03-FRD.md) · [06-CASE-AUTHORING-GUIDE](06-CASE-AUTHORING-GUIDE.md)

---

## 1. Stack at a glance

This follows the same pattern as Sevenfold: one repo, a Next.js web app and an Expo phone app, and the **game logic in a shared package** that both import.

| Layer | Choice | Why |
|---|---|---|
| Monorepo | **pnpm + Turborepo** | Shared engine/types between web and mobile; cached builds |
| Web | **Next.js (App Router) + TypeScript + Tailwind CSS**, on **Vercel** | Your core stack; SSR for SEO on case pages and Daily Brief |
| Mobile | **Expo (React Native) + expo-router + NativeWind**, built with **EAS** | Shared TS logic; OTA updates for UI fixes |
| Engine | `packages/engine`: pure TypeScript, zero React | Testable independently (Vitest), used by both apps and by Edge Functions |
| Backend | **Supabase**: Postgres, Auth, Realtime, Storage, Edge Functions (Deno) | Low cost; Realtime covers co-op/party; RLS for security |
| Payments | **Stripe** (global web) · **Paystack** (African web) · **RevenueCat** (App Store / Play billing) | One entitlement model across all three |
| Ads | **Google AdMob** via `react-native-google-mobile-ads` (needs an Expo dev build, not Expo Go) | Rewarded and interstitial on mobile |
| Analytics | **PostHog** (free tier) | Funnels, retention, feature flags |
| Errors | **Sentry** (web + RN) | Crash reporting |
| Email | **Resend** | Magic links (via Supabase SMTP), receipts, B2B |
| i18n | **i18next** (shared JSON resources) | Same strings for web and mobile |
| Validation | **zod** | Case schema, API payloads |
| Drag and drop | `@dnd-kit` (web), `react-native-gesture-handler` + Reanimated (mobile) | Board and timeline |

> Verify current free-tier limits and pricing for each service before launch. They change.

## 2. Repository layout

```
unsealed/
├─ apps/
│  ├─ web/                    # Next.js — marketing, library, case player, party host screen
│  │  ├─ app/
│  │  │  ├─ (marketing)/      # landing, /daily share pages, /cases/[slug] SEO pages
│  │  │  ├─ (game)/play/[caseSlug]/   # case player
│  │  │  ├─ (game)/daily/
│  │  │  ├─ (game)/room/[code]/       # co-op
│  │  │  ├─ (game)/party/[code]/      # party host & player views
│  │  │  ├─ account/  store/  api/    # api = webhooks (stripe, paystack, revenuecat)
│  │  └─ components/
│  └─ mobile/                 # Expo — same screens, native navigation
│     ├─ app/  (expo-router)
│     └─ components/
├─ packages/
│  ├─ engine/                 # PURE TS — no React, no fetch
│  │  ├─ case/                # types, zod schema, selectors (unlocked items, word bank)
│  │  ├─ grading/             # verdict grading, breakthrough + confront matching
│  │  ├─ scoring/             # score, badges, XP, rank
│  │  ├─ timeline/            # build events from read evidence, conflict detection
│  │  ├─ daily/               # puzzle generator + solver + clue text templates
│  │  └─ __tests__/
│  ├─ ui-tokens/              # colours, spacing, typography tokens (Tailwind + NativeWind)
│  ├─ i18n/                   # en.json, fr.json…
│  ├─ api-client/             # typed Supabase calls + Edge Function wrappers
│  └─ content-tools/          # case linter, golden-path tester, publisher CLI
├─ content/
│  └─ cases/
│     └─ 001-dead-air/
│        ├─ case.json         # PUBLIC part (shipped to client)
│        ├─ solution.json     # PRIVATE part (server only — never bundled)
│        ├─ evidence/*.md     # long-form documents
│        └─ assets/           # images (webp), fonts referenced by id
├─ supabase/
│  ├─ migrations/
│  └─ functions/              # check-string, confront, search-archive, submit-verdict, …
└─ docs/                      # these documents
```

**Rule:** `packages/engine` must never import from `content/**/solution.json`. A lint rule plus a CI grep check enforces that.

## 3. Case content model

A case is split into a **public bundle** (sent to players) and a **private solution** (kept on the server only).

### 3.1 Public — `case.json` (simplified TypeScript view)

```ts
type CasePublic = {
  id: string;                 // "001-dead-air"
  version: number;            // bump on any content change
  title: string;
  city: { name: string; country: string; flag: string };
  difficulty: 1 | 2 | 3 | 4 | 5;
  estMinutes: [number, number];       // [45, 75]
  contentNotes: string[];
  par: { hours: number };
  briefing: { markdown: string; coverAsset: string };
  suspects: { id: string; name: string; role: string; portraitAsset: string }[];
  evidence: Evidence[];               // initial + lead-gated (gated ones carry `gate`)
  leads: { id: string; title: string; costHours: number; gate?: Gate }[];
  statements: { id: string; suspectId: string; lines: { n: number; text: string }[] }[];
  archive: { label: string; placeholder: string };   // index itself is server-side
  verdict: {
    who: { blankId: string; options: 'suspects' }[];
    how: { blankId: string; prompt: string; wordIds: string[] }[];
    why: { blankId: string; prompt: string; wordIds: string[] }[];
    proof: { count: 3 };
  };
  words: { id: string; text: string; revealedBy: string[] }[]; // evidence/breakthrough ids
  hints: { stuckPointId: string; nudge: string }[];             // only the nudge is public
};

type Evidence = {
  id: string;            // "E-18"
  tab: 'documents' | 'photos' | 'records' | 'statements' | 'phone';
  number: number;        // display "18/29"
  title: string;
  source: string;        // "Shield Smart Homes · 12–13 Sept"
  type: 'document' | 'photo' | 'chat' | 'log' | 'handwriting' | 'receipt' | 'map' | 'audio' | 'phone';
  body: unknown;         // type-specific payload (validated per type by zod)
  timestamps?: { at: string; label: string; suspectIds?: string[]; place?: string }[];
  gate?: Gate;           // undefined = in the initial file
};

type Gate = { kind: 'lead' | 'breakthrough' | 'search' | 'confront'; id: string };
```

**Gated evidence is not sent until it's unlocked.** The client receives the initial file. When a lead, breakthrough, search or confrontation unlocks items, the Edge Function returns their payloads. That stops anyone reading locked evidence in dev tools.

### 3.2 Private — `solution.json`

```ts
type CaseSolution = {
  caseId: string; version: number;
  breakthroughs: { id: string; a: string; b: string; relation: 'contradiction'|'corroboration'|'link';
                   insight: string; unlocks: Gate[]; essential: boolean }[];
  confrontations: { statementId: string; line: number; evidenceIds: string[];   // any of these works
                    revealLines: { n: number; text: string }[]; unlocks: Gate[] }[];
  archiveIndex: { evidenceId: string; terms: string[]; synonyms?: string[] }[];
  verdict: {
    who: Record<string, string>;                  // blankId -> suspectId
    how: Record<string, string[]>;                // blankId -> accepted wordIds
    why: Record<string, string[]>;
    proofSets: string[][];                        // any accepted set of 3 evidence ids
  };
  hints: { stuckPointId: string; pointer: string; reveal: string; order: number }[];
  debrief: { reconstruction: { step: number; markdown: string; asset?: string }[] };
};
```

**Proof sets:** authors list *every* acceptable set of 3, or mark items as `core` (must include) plus `supporting` (any 1–2 of these). The linter expands this into all accepted sets.

## 4. Database (Supabase Postgres)

Core tables (all with RLS):

| Table | Key columns | Notes |
|---|---|---|
| `profiles` | id (=auth.uid), display_name, avatar_id, xp, rank, region, created_at | |
| `cases` | id, slug, version, status (draft/live/retired), price_tier, is_free, sponsor_id, published_at | Public metadata |
| `case_bundles` | case_id, version, public_json (jsonb), assets_path | Readable by owners (or everyone for free cases) |
| `case_solutions` | case_id, version, solution_json (jsonb) | **No RLS select policy for users.** Only the service role (Edge Functions) can read it. |
| `entitlements` | user_id, kind (case/pass/party), ref_id, source (stripe/paystack/revenuecat/promo/b2b), starts_at, ends_at | Single source of truth |
| `purchases` | id, user_id, provider, provider_ref, product_id, amount, currency, status, raw (jsonb) | Audit log of webhooks |
| `play_sessions` | id, case_id, case_version, owner_id, room_id (nullable), state_json, clock_minutes, hints_used, accusations_used, status (active/solved/cold), score, started_at, ended_at | One per solo play or room |
| `session_events` | id, session_id, user_id, type (read/pin/string_check/confront/lead/search/hint/verdict), payload, result, created_at | Analytics, global stats, replay |
| `rooms` | id, code, host_id, case_id, mode (coop/split/party), settings, status | |
| `room_members` | room_id, user_id, role (host/guest), joined_at | |
| `room_messages` | id, room_id, user_id, text, evidence_id, created_at | |
| `daily_puzzles` | date (pk), difficulty, city, puzzle_json, solution_hash | Generated ahead of time |
| `daily_results` | user_id, date, solved, seconds, wrong_attempts | |
| `streaks` | user_id, current, best, last_date, shields_left | |
| `case_ratings` | user_id, case_id, stars, unfair_flag, comment | |
| `promo_codes` | code, grants (jsonb), max_uses, used_count, expires_at | |
| `sponsors` / `b2b_events` | Phase 4 | |

**Global stats** (`case_stats` materialised view): solve rate, median clock, first-accusation distribution. Refreshed nightly by cron (`pg_cron`).

## 5. Server functions (Supabase Edge Functions)

> **Web MVP as built (22 Oct 2026):** the game checks run in a Next.js route, `apps/web/src/app/api/play/[slug]/route.ts`, on Vercel's servers. They don't use Edge Functions yet. Play sessions are **stateless and signed**: the server returns the player's state with an HMAC signature (`SESSION_SECRET`) and rejects any state that has been edited. It's the same anti-cheat guarantee with no database needed. Solutions are imported only in `server-only` modules, and a test confirms none of their text reaches the browser bundles. The progress stays only in that one browser for now. Moving sessions into `play_sessions` (for cross-device resume and global stats) and adding the Edge Functions below are planned for when accounts arrive.

All game-truth checks happen here, using `packages/engine` (imported into Deno through the build step or a shared ESM build).

| Function | Input | Output | Notes |
|---|---|---|---|
| `open-case` | caseId | public bundle (initial evidence) + saved state | Checks entitlement (free, owned, Pass, room guest) |
| `check-string` | sessionId, a, b, relation | {valid, breakthrough?, unlockedEvidence[], clock} | Idempotent per pair+relation |
| `confront` | sessionId, statementId, line, evidenceId | {valid, revealLines?, unlocked[], clock} | |
| `follow-lead` | sessionId, leadId | {evidence[], clock} | |
| `search-archive` | sessionId, query | {results ≤5} | Rate limited |
| `get-hint` | sessionId, tier | {text, scoreDelta} | Enforces free-tier caps |
| `submit-verdict` | sessionId, answers | {correctSections, accusationsLeft, status, score?} | Never returns which sections |
| `get-debrief` | sessionId | reconstruction, missed items, stats | Only once solved or cold |
| `room-*` | create/join/kick/vote | | Co-op & party orchestration |
| `webhook-stripe` / `webhook-paystack` / `webhook-revenuecat` | provider payload | 200 | Verify signatures; upsert `entitlements` |
| `daily-generate` (cron) | — | — | Keeps ≥14 days of puzzles queued |

## 6. Anti-spoiler and anti-cheat design

1. Solutions, breakthrough pairs, confrontation keys, archive index and hint pointers/reveals are **only in `case_solutions`**, readable only by the service role.
2. Gated evidence is served only after its unlock is earned (§3.1).
3. Verdict responses only say "N of 4 correct".
4. Rate limits on all check endpoints, plus the clock cost per check, make brute force expensive and visible in stats.
5. **Offline mode** can't verify checks, so it queues them. The only offline-graded content is the Daily Brief, which is generated and low-stakes.
6. Accept that determined people will post walkthroughs. **Case Variants** (v2) and the solvers-only debrief limit the damage.

## 7. Real-time (co-op and party)

- One Supabase Realtime **channel per room**: `room:{code}`.
- **Presence:** who's online and what they're viewing.
- **Broadcast:** ephemeral events (cursor/drag positions, typing).
- **Postgres changes / server broadcast:** authoritative state changes, e.g. a string check result. Only Edge Functions write session state, then broadcast the resulting patch, so two players can't double-spend clock time.
- **State model:** the session state is one JSON document with a version number. The server applies actions in order and broadcasts `{version, patch}`. Clients apply patches; if they see a gap in versions, they refetch the full state.
- **Party Mode:** the host screen is just a room member with role `screen`. Phones are members with role `player`. "Beats" are server-dealt per round.

## 8. Payments and entitlements flow

```
Web (Stripe / Paystack checkout)  ─┐
                                   ├─► webhook ─► Edge Fn verifies signature ─► upsert entitlements
Mobile (RevenueCat → App Store /   │                                               │
        Google Play billing)      ─┘                                               ▼
                                                     clients query entitlements (RLS: own rows)
```

- RevenueCat `app_user_id` = the Supabase `auth.uid` (set after login), so store purchases map to the same account.
- Stripe can also be connected to RevenueCat (web billing), which gives one dashboard. Paystack stays a direct integration for African currencies.
- Product IDs: `pass_monthly`, `pass_annual`, `case_{id}`, `season_{id}`, `party_24h`.

## 9. Daily Brief generator (packages/engine/daily)

1. **Pick a template:** dimensions (suspect × place × object [× motive]) and difficulty.
2. **Pick a locale pack** (city): word lists for names, places and objects, e.g. Lisbon → Tram 28 stop, Pastelaria, Fado bar.
3. **Generate a random solution** (an assignment of each suspect to a place and an object).
4. **Generate candidate clues** from typed templates: direct, negative, relative ("the person in the Bakery was not holding the umbrella"), either-or, and lying-witness on Fridays.
5. **Greedy-minimise:** add clues until the **solver** (constraint propagation plus backtracking) finds exactly one solution, then remove redundant clues while uniqueness holds.
6. **Score difficulty** by the solver's search depth; reject puzzles outside the band for that weekday.
7. **Render clue text** in evidence style ("Receipt: one espresso, paid by card ending 4471 — Pastelaria Aurora, 09:12").
8. Store `puzzle_json` plus a hash of the solution.

The generator is deterministic from a seed (date + secret salt), so puzzles can be regenerated and audited. It must be unit-tested heavily: 10,000 generated puzzles should all have exactly one solution.

## 10. Environments and CI/CD

| Env | Web | Mobile | DB |
|---|---|---|---|
| local | `pnpm dev` | Expo dev build | Supabase CLI (local Docker) |
| preview | Vercel preview per PR | EAS internal distribution | Supabase branch / staging project |
| prod | Vercel prod | App Store / Play (EAS Submit) + EAS Update | Supabase prod |

**CI (GitHub Actions)** on every PR:
1. typecheck
2. lint
3. engine unit tests
4. **case linter** on all `content/cases/*`
5. golden-path test (an automated solve of each case)
6. **forbidden-import check** (no `solution.json` in client bundles)
7. Next build

## 11. Security and privacy checklist

- RLS on every table; `case_solutions` has no user policies at all.
- Webhook signature verification for Stripe, Paystack and RevenueCat.
- Rate limits on Edge Functions (per user, per IP for anonymous users).
- Store PII minimally (email, display name). Analytics uses the user id, never the email.
- Ads consent (Google UMP) and ATT on iOS; analytics consent in the EU/UK.
- Data export and delete endpoints.
- Secrets live only in Vercel/EAS/Supabase environment settings, never in the repo.
