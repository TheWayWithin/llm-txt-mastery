# Project Plan - LLM.txt Mastery

## Sprint 12: AI Search Arena — llms.txt Excellence

**Sprint Location**: `/sprints/Sprint-12-Benchmark-LLMsTxt-Excellence.md`
**Priority**: HIGH — biggest competitive moat opportunity
**Status**: ✅ COMPLETE — committed and deployed to production
**Date**: 2026-03-24
**Commit**: `8193c35`
**Benchmark Brief**: `/docs/Ideation/benchmark-improvement-brief.md`

### Objective
Improve AI Search Arena llms.txt Generation score from 3.1 to 7.0+ by implementing deep spec compliance validation, multi-format generation, and deployment guidance with verification.

### Tasks
- [x] **Phase 1: Domain Housekeeping (LT-4)** — robots.txt directive, HTML discovery tag, improve our own llms.txt, create llms-full.txt, footer link ✅ 2026-03-23
- [x] **Phase 2: Deep Spec Compliance Validation (LT-1)** — spec compliance engine, content quality scoring, freshness detection, size optimisation, format detection, compliance grade (A/B/C/D), validator UI update ✅ 2026-03-23
- [x] **Phase 3: Multi-Format Generation (LT-2)** — llms-full.txt + llms-mini.txt generation, format selection UI, download endpoint with format param ✅ 2026-03-24
- [x] **Phase 4: Deployment Guidance & Verification (LT-2B)** — POST /api/verify-deployment endpoint, verification UI with per-check pass/fail ✅ 2026-03-24
- [x] **Phase 5: Page & Marketing Updates** — meta descriptions, pricing features, docs sections, validator trust badges, SolutionIntro copy, format cards in file-generation ✅ 2026-03-24

---

## Sprint 11: Cancellation & Refund Flow Overhaul + 7-Day Free Trial

**Sprint Location**: `/sprints/Sprint-11-Cancellation-Flow-Fix.md`
**Priority**: HIGH
**Status**: ✅ COMPLETE — merged to develop, deploying to staging
**Date**: 2026-03-21

### Objective
Fix broken cancellation flow, implement correct business logic with two cancel paths, add 'cancelled' tier, and replace Starter with 7-day free trial at Growth level.

### Tasks
- [x] **Phase 1: Fix Immediate Bugs** — 400 error, tier not updating, inconsistent state, duplicate buttons ✅ 2026-03-21
- [x] **Phase 2: Correct Cancellation Logic** — refund path, cancel-at-period-end, 'cancelled' tier ✅ 2026-03-21
- [x] **Phase 3: Post-Cancellation UX** — subscription ended screen, re-subscribe CTA, block cancelled users ✅ 2026-03-21
- [x] **Phase 4: Replace Starter with 7-Day Free Trial** — Growth features, credit card required, Stripe trial ✅ 2026-03-21
- [ ] **Phase 5: Staging Testing** — test all flows on staging with Stripe test mode
- [ ] **Phase 5b: Production Deploy** — merge develop → main

### Commits (develop branch)
1. `dd9f22d` — feat: overhaul cancellation flow with two cancel paths and 'cancelled' tier (16 files)
2. `2a6418e` — feat: replace Starter tier with 7-day free trial at Growth level (6 files)
3. `d71945e` — docs: update Sprint 11 progress

---

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
**Status**: ✅ COMPLETE — merged to main, deployed to production 2026-03-20
**Date**: 2026-03-15

### Tasks
- [x] **Phase 1: Dashboard UI** — remove coffee credits display, show subscription info ✅ 2026-03-16
- [x] **Phase 2: Usage Tracking** — Solo as subscription tier, monthly reset ✅ 2026-03-16
- [x] **Phase 3: Webhook & Checkout** — subscription mode, tier writes 'solo' ✅ 2026-03-16
- [x] **Phase 4: Naming Cleanup** — route rename, UI text, test files ✅ 2026-03-16
- [x] **Phase 4b: Billing toggle** — signup + dashboard + pricing default to annual ✅ 2026-03-16
- [x] **Phase 4c: Stripe test prices** — Growth $9.95, Scale $19.95 (were $25/$99) ✅ 2026-03-16
- [x] **Phase 4d: Upgrade flow** — redirect to /analyze, not verification page ✅ 2026-03-16
- [x] **Phase 5: Production deploy** — merged develop → main ✅ 2026-03-20
- [x] **Phase 5b: Verify production** — tested on production ✅ 2026-03-20

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
