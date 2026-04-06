# Sprint 16: Test Suite Recovery

**Date Created**: 2026-04-06
**Priority**: High — CI is red, blocks confident merges to main
**Status**: Ready
**Branch**: `feature/sprint-16-test-suite-recovery`
**Related**: GitHub issue [#23](https://github.com/TheWayWithin/llm-txt-mastery/issues/23)

---

## Background

CI has been failing since 2026-03-29 due to a single ESLint error (orphaned `react-hooks/exhaustive-deps` disable directive). That blocker was fixed in PR #22 (commit `64b8e66`).

With the lint step now passing, **65 pre-existing test failures across 16 test files** are visible in CI. These failures are not regressions — they have existed for at least the past week, hidden because lint was blocking CI execution before reaching the test step.

**Reference CI run** (post-lint-fix, exposes the test failures):
https://github.com/TheWayWithin/llm-txt-mastery/actions/runs/24039054042

**Test summary**:
- Test Files: **16 failed** | 5 passed (21 total)
- Tests: **65 failed** | 165 passed (230 total)

## Goal

Get CI back to fully green: 0 lint errors, 0 test failures, 0 build failures. Restore confidence in the test suite as a regression safety net.

## Out of Scope

- New test coverage for Sprint 10 features (already covered by `tests/sprint-10-js-rendering-autodetect.spec.ts`)
- Refactoring of test infrastructure beyond what's needed to fix failures
- Pre-existing TypeScript errors flagged in `npm run type-check` (already `continue-on-error: true` in CI)
- Lint warnings (525 warnings — separate cleanup, not a CI blocker)

---

## Phase 1: Triage & Categorization (P0 — must do first)

**Objective**: Group the 65 failures into root-cause categories so we fix one cause at a time, not one test at a time.

### Tasks

- [ ] Run full test suite locally and capture output: `npm test 2>&1 | tee test-baseline.log`
- [ ] For each failing test file, identify the failure mode (assertion, mock drift, missing global, type error, etc.)
- [ ] Build a categorization table: `[file] → [category] → [estimated effort]`
- [ ] Prioritize categories by: (a) blast radius (how many tests it unblocks), (b) risk (does the fix touch production code?)
- [ ] Document findings in `progress.md` before starting Phase 2

### Failing Test Files (preliminary list)

| File | Suspected Category |
|------|-------------------|
| `tests/integration/tier-upgrade-integration.test.ts` | Tier/auth assertion drift |
| `tests/integration/validation-api.test.ts` | Validation API contract drift |
| `tests/unit/get-user-tier-validation.test.ts` | Tier resolver logic |
| `tests/unit/email-captures-validation.test.ts` | Stripe webhook → emailCaptures sync (~12 failures) |
| `tests/unit/stripe-webhook-handlers.test.ts` | Stripe webhook handler mocks |
| `tests/unit/rate-limiter.test.ts` | Error handling expectations |
| `server/services/__tests__/generator-validator-integration.test.ts` | Sprint 15 validator scoring changes |
| `server/services/__tests__/validation.test.ts` | Validation service 404 handling |
| `client/src/components/__tests__/InstantRefundButton.test.tsx` | Mock/fixture drift |
| `client/src/components/__tests__/InstantRefundModal.test.tsx` | Mock/fixture drift (~6 failures) |
| `client/src/components/__tests__/email-capture-characterization.test.tsx` | UI characterization snapshot drift |
| `client/src/components/__tests__/email-capture.test.tsx` | UI assertion drift |
| `client/src/components/__tests__/refund-flow.integration.test.tsx` | Integration mock drift |
| `client/src/pages/__tests__/analyze-characterization.test.tsx` | UI characterization snapshot drift |
| `client/src/pages/__tests__/home-auth-flow.test.tsx` | AuthContextType mismatch (mock missing properties) |
| `client/src/test/integration/critical-user-flows.test.tsx` | `IntersectionObserver is not defined` (jsdom polyfill) |

---

## Phase 2: Fix Test Infrastructure (P0 — likely unblocks multiple categories)

**Objective**: Fix shared infrastructure issues that cause cascading failures before touching individual tests.

### Tasks

- [ ] **`IntersectionObserver` polyfill**: jsdom does not implement `IntersectionObserver`. Add a polyfill (or mock) in `client/src/test/setup.ts` (or wherever the vitest setup file lives).
  - Suggested fix: install `intersection-observer` package OR add a mock global in setup file
- [ ] **AuthContextType drift**: `home-auth-flow.test.tsx` mocks are missing `authResolved`, `recognizeEmailUser`, `emailBasedUser` properties. Update the mock factory in the shared test utilities to match the current `AuthContextType` interface.
- [ ] **Test setup audit**: Verify `vitest.config.ts` setup files load all expected globals (browser APIs, MSW, fetch polyfills)
- [ ] Re-run the suite after each infrastructure fix and re-count failures — log progress in `progress.md`

---

## Phase 3: Fix Stripe / Webhook / Email Capture Tests (P1 — biggest cluster)

**Objective**: ~20+ failures cluster around Stripe webhook → emailCaptures table sync. These likely share root cause (mock drift after Sprint 9 Solo migration or Sprint 11 cancellation flow).

### Tasks

- [ ] Read the current `handleCheckoutCompleted`, `handleSubscriptionUpdated`, `handleSubscriptionDeleted` implementations
- [ ] Read the test expectations and compare to actual implementation contracts
- [ ] Identify whether tests are wrong (assertion drift) or implementation is wrong (regression)
- [ ] If implementation is wrong: fix the implementation, document in progress.md
- [ ] If tests are wrong: update assertions to match current contract, document why the contract changed
- [ ] Verify no production behavior changes — these are unit tests, fixes should be in test files in 90%+ of cases

### Files to fix

- [ ] `tests/unit/email-captures-validation.test.ts` (12 failures)
- [ ] `tests/unit/stripe-webhook-handlers.test.ts`
- [ ] `tests/integration/tier-upgrade-integration.test.ts`

---

## Phase 4: Fix Rate Limiter & Validation Tests (P1)

**Objective**: Smaller cluster of unit test failures in middleware and validation services.

### Tasks

- [ ] **Rate limiter** (`tests/unit/rate-limiter.test.ts`): error handling tests expect specific error shapes that may have changed. Read current implementation, align expectations.
- [ ] **Validation service** (`server/services/__tests__/validation.test.ts`): 404 handling test failing. Check if validation service error responses changed in Sprint 13.
- [ ] **Generator-validator integration** (`server/services/__tests__/generator-validator-integration.test.ts`): Likely affected by Sprint 15 scoring changes (binary → proportional). Update score expectations.

---

## Phase 5: Fix UI Component Tests (P2)

**Objective**: React component characterization and integration tests. Lower priority because they don't gate production behavior.

### Tasks

- [ ] **Refund button/modal tests** (`InstantRefundButton.test.tsx`, `InstantRefundModal.test.tsx`): Mock drift. Update test fixtures to match current API/component contracts.
- [ ] **Email capture characterization** (`email-capture-characterization.test.tsx`, `email-capture.test.tsx`): Likely tier label changes (Coffee → Solo migration in Sprint 9).
- [ ] **Analyze characterization** (`analyze-characterization.test.tsx`): May reference removed Enhanced JS Rendering checkbox (Sprint 10) — UPDATE if so.
- [ ] **Home auth flow** (`home-auth-flow.test.tsx`): Will be unblocked by Phase 2 AuthContextType fix.
- [ ] **Critical user flows** (`critical-user-flows.test.tsx`): Will be unblocked by Phase 2 IntersectionObserver fix.
- [ ] **Refund flow integration** (`refund-flow.integration.test.tsx`): Mock drift.

---

## Phase 6: CI Verification & Hardening (P1)

**Objective**: Confirm CI is green and add safeguards against silent test debt accumulation.

### Tasks

- [ ] Push to feature branch and verify full CI green: `gh pr checks`
- [ ] Verify all 5 jobs pass: type-check (allowed-error), lint, build, migrations, **tests**
- [ ] Consider: should `continue-on-error: true` be removed from the type-check step? (Track separately — out of scope for this sprint)
- [ ] Consider: add a CI step that fails if test count drops below baseline (catch silently disabled tests)
- [ ] Update CLAUDE.md with note: "Always verify lint passes before disabling lint-check; orphaned disable directives cause hard failures"
- [ ] Merge to develop, verify staging CI green
- [ ] Merge to main, verify production CI green

---

## Success Criteria

1. ✅ CI pipeline green on `main` and `develop` (test job passes, no longer in_progress on test step)
2. ✅ All 230 tests either pass or are explicitly skipped with `it.skip` and a TODO referencing a tracked issue
3. ✅ No new lint errors introduced
4. ✅ No production code regressions (verify Sprint 10 Playwright tests still pass against staging and production)
5. ✅ Triage findings documented in `progress.md`
6. ✅ CLAUDE.md updated with prevention guidance

---

## Risk & Mitigation

| Risk | Mitigation |
|------|-----------|
| Fixing tests masks real production bugs | For each test fix, verify the test was wrong (mock/fixture drift), not the implementation. Document each decision in progress.md. |
| Some failures may need production code changes | Phase 3 explicitly checks "is this a test bug or an implementation bug?" — escalate implementation bugs as separate tasks. |
| Sprint scope balloons as new failures emerge | Strictly time-box Phase 1 triage. If categories are deeper than expected, split this into Sprint 16a + 16b. |
| `IntersectionObserver` fix may need a vitest config change | Document the change in CLAUDE.md so future devs know jsdom needs explicit polyfills. |

---

## Notes

- This sprint exists because CI silently accumulated test debt while a lint blocker masked the test step. The prevention is twofold: (a) fix the failures, (b) make sure lint failures don't hide test failures in the future. Phase 6 includes both.
- Sprint 10 (JS Rendering Auto-Detection) is **NOT** the cause of any of these failures. Sprint 10 is verified passing on staging and production via `tests/sprint-10-js-rendering-autodetect.spec.ts`.
- The 525 lint warnings are out of scope. They are real but non-blocking. A separate cleanup sprint can address them.
