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
| LTM-ISS-11 | Perf + policy gaps on llmtxtmastery.com: LCP 6.5s (LH perf .70), robots.txt has no explicit AI-crawler policy (GPTBot/ClaudeBot/PerplexityBot/Google-Extended unnamed) | Open | medium | — | pending |
| LTM-ISS-10 | No structured data on llmtxtmastery.com: zero ld+json (add Organization/WebSite/SoftwareApplication + FAQPage if honest), no date metadata, llms.txt undated | Open | medium | — | pending |
| LTM-ISS-9 | llmtxtmastery.com is a client-rendered SPA: non-JS crawlers (and AImpactScanner: 36/100 F, heading hierarchy 0, content depth 5) see an empty shell — the llms.txt product is itself near-invisible to AI. Add prerendering/SSG for the marketing pages | Fixed — pending review (branch ltm-iss9-prerender, 2026-07-25): build-time playwright prerender of 9 marketing routes; no-JS HTTP proof on local prod server — / = 82.5KB, h1 "AI assistants are answering questions about your industry right now…", 7 h2/22 h3; /pricing = 44.9KB, h1 "Simple, Transparent Pricing" incl. tier copy; all 9 routes full HTML; /analyze,/validator,/login still pristine 4.5KB SPA shell. Merge+deploy, re-scan AImpactScanner vs 36, then close via repo-done.py | high | — | pending |
| LTM-ISS-8 | Stripe SDK v18+ types pin apiVersion 2025-08-27.basil but the client pins 2024-06-20 (kept via documented cast to avoid changing live payment behaviour). Plan a deliberate API-version migration: review breaking changes, update webhook expectations, test in staging | Open | medium | — | pending |
| LTM-ISS-7 | Payment history rows from the subscription-updated webhook never stored the Stripe subscription id or tier (keys not in the insert schema; drizzle dropped them silently). Decide the linkage (map Stripe sub id -> local subscriptions.id FK) and add it deliberately with a test | Open | medium | — | pending |
| LTM-ISS-6 | getUserUsageStats query references table email_captures but the real table name is emailCaptures — the stats query has always failed and returned null; fix the query (and add a test) if the stats are wanted | Open | low | — | pending |
| LTM-ISS-5 | API v1 processAnalysis pipeline is broken against the current sitemap/analyzer APIs: reads sitemapResult.pages/.found/.source (now entries/sitemapFound/analysisMethod), passes userTier where analyzeDiscoveredPagesWithCache expects userEmail, and treats its {pages,metrics} return as an array — every /api/v1 analysis crashes at the first metadata update. Needs a deliberate repair + test (which email/identity to use for usage tracking) | ✅ Resolved 2026-07-25 — processAnalysis repaired against current SitemapResult/analyzer contracts in 765b178 with 4 pinning tests (completed flow, identity fallback, JS-render quota, failure path); identity = API consumer label, analyzer email lookups fail open as for any unknown identity | medium | — | pending |
| LTM-ISS-4 | verify-email: 'already logged in' fast-path after verification has never executed (refreshUser() resolves void, and it reads pendingAnalysisUrl after removing it). Decide whether to revive it by checking auth context user | Open | low | — | pending |
| LTM-ISS-3 | Verify /api/auth/admin/reset-credits endpoint end-to-end (was crashing on undefined COFFEE_TIER_CREDITS; constant now defined at module scope = 20) | Open | low | — | pending |
| LTM-ISS-2 | Burn down the 261-error TS baseline (.tsc-baseline.txt) to zero and restore full tsc gate | ✅ Resolved 2026-07-25 — 261 -> 0 across 12 root-cause batches (4344073..765b178): types made true, no any/ts-ignore/tsconfig loosening; baseline + shim removed, full 'npx tsc --noEmit' husky gate restored and proven (clean commit passes, scratch error rejected, gitleaks blocks a canary secret). Payment paths minimally changed in flagged commits fa2f86d/7ca34df. New rows raised: LTM-ISS-3/4/6/7/8 | low | — | pending |
| LTM-ISS-1 | Pre-commit hook now catches ~40 pre-existing TypeScript errors blocking normal commits | ✅ Resolved 2026-07-23 — Commits unblocked: husky TS check now gates against committed error baseline (.tsc-baseline.txt, 261 pre-existing errors); new TS errors and secrets still blocked (all three hook tests proven), commit 2ff2639 | medium | — | pending |

## Recently closed

| ID | Title | Status | Commit | Detail |
|----|-------|--------|--------|--------|
