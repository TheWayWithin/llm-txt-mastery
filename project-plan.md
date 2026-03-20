# Project Plan - LLM.txt Mastery

## Sprint 10: JS Rendering Auto-Detection & Quality Fix

**Sprint Location**: `/sprints/Sprint-10-JS-Rendering-Quality-Fix.md`
**Priority**: HIGH — Scale tier produces worse output than Solo
**Status**: READY
**Date**: 2026-03-16

### Objective
Fix JS rendering quality regression where Scale tier with "Enhanced JS Rendering" produces identical generic descriptions for every page on SPAs. Remove checkbox — auto-detect rendering needs.

### Tasks
- [ ] Remove "Enhanced JS Rendering" checkbox — auto-detect from SPA detection
- [ ] Fix `generateFallbackDescription()` — never return generic meta for SPAs
- [ ] Fix filler phrase detection — don't replace good AI descriptions with generic fallback
- [ ] Extract visible body text from rendered DOM for AI analysis
- [ ] Test: Scale tier output quality >= Solo tier on same SPA site

---

## Sprint 9: Solo Subscription Migration

**Sprint Location**: `/sprints/Sprint-9-Solo-Subscription-Migration.md`
**Priority**: High
**Status**: IN PROGRESS — deployed to staging, testing
**Date**: 2026-03-15

### Objective
Migrate Solo tier from coffee credits to recurring subscription. Remove all coffee/credit legacy code.

### Tasks
- [x] **Phase 1: Dashboard UI** — remove coffee credits display, show subscription info ✅ 2026-03-16
- [x] **Phase 2: Usage Tracking** — Solo as subscription tier, monthly reset ✅ 2026-03-16
- [x] **Phase 3: Webhook & Checkout** — subscription mode, tier writes 'solo' ✅ 2026-03-16
- [x] **Phase 4: Naming Cleanup** — route rename, UI text, test files ✅ 2026-03-16
- [x] **Phase 4b: Billing toggle** — signup + dashboard + pricing default to annual ✅ 2026-03-16
- [x] **Phase 4c: Stripe test prices** — Growth $9.95, Scale $19.95 (were $25/$99) ✅ 2026-03-16
- [x] **Phase 4d: Upgrade flow** — redirect to /analyze, not verification page ✅ 2026-03-16
- [ ] **Phase 5: Production deploy** — merge develop → main
- [ ] **Phase 5b: Verify production** — test signup/upgrade flows on production

### Commits (develop branch)
1. `703ea92` — feat: migrate Solo tier from coffee credits to recurring subscription (27 files)
2. `20c3409` — fix: Solo subscribers get 20 analyses on signup, remove all coffee UI text
3. `3b76dbc` — fix: crash from removed Coffee icon import in AuthNav
4. `883838e` — feat: add billing toggle to signup page, default all pricing to annual
5. `2020cf1` — fix: update Growth test mode fallback price ID from $25 to $9.95
6. `4817c7d` — fix: update Scale test mode fallback price ID from $99 to $19.95
7. `4190a08` — fix: status card shows correct tier limit instead of defaulting to 3
8. `b9419f2` — feat: add billing toggle to dashboard upgrade cards, default to annual
9. `0501022` — fix: upgrade flow redirects to analyze page instead of verification screen
10. `fac0b94` — fix: prevent infinite refreshUser loop on upgrade success page

---

## Sprint 2: Coffee Tier Auth Bug & Usage Polling Fix

**Sprint Location**: `/sprints/Sprint-2-Coffee-Tier-Auth-Bug-Fix.md`
**Priority**: CRITICAL
**Status**: PARTIALLY COMPLETE
**Date**: 2026-02-22

### Tasks
- [x] **Task 1**: Fix `const user` to `let user` in `/api/analyze` ✅ 2026-02-22
- [x] **Task 2**: Verify no other endpoints have same bug ✅ 2026-02-22
- [x] **Task 3**: Reduce excessive usage polling (10s → 60s) ✅ 2026-02-22
- [ ] **Task 4**: Fix auth state zombie session
- [ ] **Task 5**: Test fix on staging with expired JWT
- [ ] **Task 6**: Deploy to production

---

## Sprint 1: CSR Title Differentiation & Page Scoring

**Sprint Location**: `/sprints/Sprint-1-CSR-Title-And-Scoring-Improvements.md`
**Priority**: HIGH
**Status**: ✅ COMPLETE
**Date**: 2026-02-21

### Tasks
- [x] Title deduplication using URL paths ✅ 2026-02-21
- [x] CSR-aware quality score boosting ✅ 2026-02-21
- [x] Fix plural grammar "1 pages" → "1 page" ✅ 2026-02-21
- [x] Deploy to production (PR #9) ✅ 2026-02-21
