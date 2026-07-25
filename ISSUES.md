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
| LTM-ISS-12 | Canonical tag mismatch: head declares https://www.llmtxtmastery.com while the site serves non-www — scanner flags cross-domain canonical (40/100) and www/non-www inconsistency; fix canonical (and per-page canonicals) as part of the LTM-ISS-10 meta work | Open | low | — | pending |
| LTM-ISS-11 | Perf + policy gaps on llmtxtmastery.com: LCP 6.5s (LH perf .70), robots.txt has no explicit AI-crawler policy (GPTBot/ClaudeBot/PerplexityBot/Google-Extended unnamed) | Open | medium | — | pending |
| LTM-ISS-10 | No structured data on llmtxtmastery.com: zero ld+json (add Organization/WebSite/SoftwareApplication + FAQPage if honest), no date metadata, llms.txt undated | ✅ Resolved 2026-07-25 — Shipped (debbd07, deployed 2026-07-25): Organization+WebSite JSON-LD site-wide, SoftwareApplication with real tier prices on / and /pricing, FAQPage from the same constant as the visible FAQ; Content-updated dates with time[datetime] on all marketing pages; llms.txt + llms-full.txt dated. AImpactScanner rescan: 73 -> 81 Excellent (structured data 30->100, FAQ 60->100, freshness 30->100, transparency 35->70). Register updated; remaining: LTM-ISS-11/12 | medium | — | pending |
| LTM-ISS-9 | llmtxtmastery.com is a client-rendered SPA: non-JS crawlers (and AImpactScanner: 36/100 F, heading hierarchy 0, content depth 5) see an empty shell — the llms.txt product is itself near-invisible to AI. Add prerendering/SSG for the marketing pages | ✅ Resolved 2026-07-25 — Prerender shipped (commit 7cf915a, deployed 2026-07-25): 9 marketing routes serve full HTML to non-JS crawlers (/ = 82.5KB with h1, /pricing 44.9KB, etc.; tool routes stay SPA shell). AImpactScanner rescan: 36/100 F -> 73/100 Good; headings 0->80, content depth 5->95, citation structure 100. Register updated; follow-ups LTM-ISS-10/11/12 | high | — | pending |
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
