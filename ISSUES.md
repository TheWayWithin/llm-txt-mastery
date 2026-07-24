# llm-txt-mastery — Issue & Project Register

**This is the single source of truth for what is open in this repo.** One row per
issue/project. Detail lives in the linked doc; this file is the index the Mission
Control reconcile (`repo-reconcile.py`) reads and mirrors to the cockpit.

## ID convention (collision-safe)

Mission Control owns the bare `ISS-`/`PRJ-`/`T-` namespaces. **Every llm-txt-mastery ID
carries the `LTM-` prefix** so it can never collide with a Mission-Control-native
ID or another repo's. Raise issues here with `python3 ~/shared/scripts/repo-issue.py`.

---

## Open

| ID | Title | Status | Severity | Detail | MC-SYNC |
|----|-------|--------|----------|--------|---------|
| LTM-ISS-8 | Stripe SDK v18+ types pin apiVersion 2025-08-27.basil but the client pins 2024-06-20 (kept via documented cast to avoid changing live payment behaviour). Plan a deliberate API-version migration: review breaking changes, update webhook expectations, test in staging | Open | medium | — | pending |
| LTM-ISS-7 | Payment history rows from the subscription-updated webhook never stored the Stripe subscription id or tier (keys not in the insert schema; drizzle dropped them silently). Decide the linkage (map Stripe sub id -> local subscriptions.id FK) and add it deliberately with a test | Open | medium | — | pending |
| LTM-ISS-6 | getUserUsageStats query references table email_captures but the real table name is emailCaptures — the stats query has always failed and returned null; fix the query (and add a test) if the stats are wanted | Open | low | — | pending |
| LTM-ISS-5 | API v1 processAnalysis pipeline is broken against the current sitemap/analyzer APIs: reads sitemapResult.pages/.found/.source (now entries/sitemapFound/analysisMethod), passes userTier where analyzeDiscoveredPagesWithCache expects userEmail, and treats its {pages,metrics} return as an array — every /api/v1 analysis crashes at the first metadata update. Needs a deliberate repair + test (which email/identity to use for usage tracking) | Open | medium | — | pending |
| LTM-ISS-4 | verify-email: 'already logged in' fast-path after verification has never executed (refreshUser() resolves void, and it reads pendingAnalysisUrl after removing it). Decide whether to revive it by checking auth context user | Open | low | — | pending |
| LTM-ISS-3 | Verify /api/auth/admin/reset-credits endpoint end-to-end (was crashing on undefined COFFEE_TIER_CREDITS; constant now defined at module scope = 20) | Open | low | — | pending |
| LTM-ISS-2 | Burn down the 261-error TS baseline (.tsc-baseline.txt) to zero and restore full tsc gate | Open | low | — | pending |
| LTM-ISS-1 | Pre-commit hook now catches ~40 pre-existing TypeScript errors blocking normal commits | ✅ Resolved 2026-07-23 — Commits unblocked: husky TS check now gates against committed error baseline (.tsc-baseline.txt, 261 pre-existing errors); new TS errors and secrets still blocked (all three hook tests proven), commit 2ff2639 | medium | — | pending |

## Recently closed

| ID | Title | Status | Commit | Detail |
|----|-------|--------|--------|--------|
