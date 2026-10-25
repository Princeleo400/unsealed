# CLAUDE.md — build rules for this repo

Read `docs/` before changing behaviour. The FRD IDs (e.g. `FR-BOARD-07`) are the contract. Reference them in PR titles and commits.

## Project
UNSEALED: a fair-play detective game. Monorepo with `apps/web` (Next.js App Router, Tailwind), `apps/mobile` (Expo, expo-router, NativeWind), and `packages/engine` (pure TypeScript game logic shared by web, mobile and Supabase Edge Functions).

## Non-negotiables
1. **Solutions never reach the client.** Only server code may import `content/**/solution.json` or read `case_solutions`: modules that start with `import 'server-only'` (today `apps/web/src/server/*`), and later the Supabase Edge Functions. Client components and `packages/engine` never import it. Grading, breakthrough checks, confrontations, archive search and hint pointers/reveals all run on the server. `apps/web/test/play-api.test.ts` checks that nothing leaks.
2. **Engine first, UI second.** Any new rule goes into `packages/engine` with unit tests (Vitest) *before* any UI uses it. Coverage target ≥90% for engine.
3. **Every case must pass** `pnpm case:lint` and `pnpm case:golden` (automated solve) before merge.
4. **Never sell answers.** No code path may grant hints, verdict feedback or evidence in exchange for payment. Rewarded ads may grant hints, capped per case.
5. **No ads interrupt the case player.** The only ad inside a case is the opt-in rewarded video that unlocks a hint (1 free hint first, max 3 ad hints per case, enforced on the server). Other ads only around the Daily Brief and the lobby.
6. **Verdict feedback** returns only `correctSections` (0–4) and `accusationsLeft`, never which sections were right.
7. **i18n:** no hard-coded user-facing strings. Use `packages/i18n`.
8. **Accessibility:** every interactive element is keyboard reachable (web) and has an accessible label; respect reduced motion.
9. **Defensive CSS:** include `[hidden] { display: none !important; }` in global styles.

## Conventions
- **Formatting:** Prettier, `printWidth` 80 (`.prettierrc`). Run `pnpm format` before handing over files; `pnpm format:check` must pass.
- **Naming:** readable, descriptive names for every variable, parameter and argument. Never single letters (`e`, `s`, `x`, `i`…): use `evidence`, `state`, `index`. `_` is allowed only for an unused value. `pnpm lint:names` enforces this.
- **Sound & vibration:** game moments call `feedback(cue)` from `@/lib/feedback`; add new cues there (recipe + optional vibration), never play audio directly. Vibrate only for moments that matter.
- TypeScript strict. zod schemas for all external data (case files, API payloads, webhooks).
- Prices and product IDs live in config/DB, never hard-coded.
- Supabase: RLS on every table; migrations only via `supabase/migrations`.
- Commits: `feat(FR-CASE-03): log renderer with sort/filter`.

## Before you say "done"
- `pnpm format:check && pnpm lint:names && pnpm typecheck && pnpm test && pnpm case:lint && pnpm case:golden`
- Open the changed screen in a browser / simulator and check it at phone width (375 px) and desktop. A visible bug on first open is a failed delivery.
- When handing code to Michael, list **only new or edited files with their paths**. Don't zip them.
