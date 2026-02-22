# Sprint 2: Coffee Tier Auth Bug & Usage Polling Fix

**Sprint Start**: 2026-02-22
**Priority**: CRITICAL - Coffee tier users (paying customers) cannot analyze websites
**Branch**: `feature/sprint-2-coffee-auth-fix`
**Status**: IN PROGRESS - Tasks 1-3 implemented, build verified, ready for staging test

---

## Problem Statement

When a Coffee tier user's JWT expires mid-session, the `/api/analyze` endpoint returns a misleading error:

```
400: {"message":"Authentication required for Coffee tier. Please log in again.","tier":"coffee"}
```

The user IS known (email identified, tier correctly resolved as 'coffee', 56 credits available), but the backend fails to connect the dots because the `user` variable is never updated from the email lookup.

### Evidence

Console log: `/Logs/20260222-1130-console.yaml`

**User flow that triggered the bug:**
1. User logged in as `jamie.watters.mail@icloud.com` (tier: coffee, 56 credits)
2. Successfully generated a file for a previous analysis (line 1942)
3. Navigated to analyze a new URL: `https://www.aimpactscanner.com`
4. Frontend correctly identified user as coffee tier (line 1987)
5. Backend returned 400 error at `/api/analyze` (line 2008-2009)

**Key console entries:**
```
Line 4:    /api/auth/me returned 401 (JWT expired)
Line 965:  Simple-usage correctly shows: tier: coffee, 56 credits
Line 1987: Frontend: "URL_SUBMITTED: User is authenticated with tier coffee"
Line 2008: /api/analyze returned 400
Line 2009: "Authentication required for Coffee tier. Please log in again."
```

### Secondary issues in same console log:
- ~500+ identical `simple-usage` polling requests (every ~2 seconds)
- CORS errors after `ERR_NETWORK_CHANGED` on simple-usage endpoint
- `/api/auth/me` returns 401 but frontend doesn't clear auth state (zombie session)
- CSP blocking Plausible analytics script
- ~200 `<link preload>` unused resource warnings

---

## Root Cause Analysis

### The Bug (server/routes.ts:408-520)

```
Line 391:  app.post('/api/analyze', ... optionalAuth, async (req, res) => {
Line 408:  const user = req.user;          // <-- undefined (JWT expired, optionalAuth skipped)
           ...
Line 416:  if (user?.email) {              // false - user is undefined
Line 416:  } else if (email) {             // true - frontend sends email in body
Line 420:    const authUser = ...           // Found! Has id, email, tier, credits
Line 432:    if (authUser && !emailCapture) {
Line 433:      userEmail = email;           // Set correctly
Line 434:    }                              // BUT 'user' is still undefined!
           ...
Line 470:  const tier = getUserTierFromAuth(user, userEmail);  // Returns 'coffee' correctly
           ...
Line 512:  if (tier === 'coffee') {         // Enters coffee credit check
Line 520:    if (!user?.id) {               // FAILS - user is still undefined!
Line 522:      return res.status(400).json({
Line 523:        message: 'Authentication required for Coffee tier...'  // Misleading error
```

**Root cause**: `const user = req.user` at line 408 is immutable. When the email fallback finds the auth user (line 420), `user` is never reassigned. The coffee credit check at line 520 requires `user.id` but gets `undefined`.

### Why only Coffee tier is affected

Other tiers don't hit the `if (tier === 'coffee')` block (line 512), so they skip the `user.id` check entirely. Only Coffee tier users with expired JWTs trigger this specific code path.

---

## Task 1: Fix `const user` to `let user` and Populate from Email Fallback

### Problem
`const user = req.user` (line 408) prevents reassignment. When the email fallback finds the user via `authStorage.getUserByEmail()`, the `user` variable stays `undefined`.

### Solution
Change `const` to `let` and assign the found auth user to `user` in the email fallback path.

### Files to Modify

**`server/routes.ts`** - Line 408:

```typescript
// BEFORE (line 408):
const user = req.user;

// AFTER:
let user = req.user;
```

Then inside the email fallback block (after line ~432 where authUser is found):

```typescript
// Inside: if (authUser && !emailCapture) { ... }
// After: userEmail = email;
// ADD:
if (authUser) {
  // Populate user from email lookup so coffee tier credit checks work
  user = authUser as any; // authUser has id, email, tier needed downstream
  console.log(`🔄 Populated user from email fallback: id=${authUser.id}, tier=${authUser.tier}`);
}
```

### Verification
After fix, the flow becomes:
1. `let user = req.user` → `undefined` (expired JWT)
2. Email fallback finds authUser → `user = authUser` (now has `.id`)
3. `getUserTierFromAuth(user, userEmail)` → returns 'coffee' (same as before)
4. `if (!user?.id)` → `false` (user.id now exists!)
5. `checkCoffeeCredits(user.id.toString())` → proceeds normally

### Type Safety Check
`authStorage.getUserByEmail()` returns `AuthUser` which includes `{ id, email, tier, ... }`. The downstream code only accesses `user.id`, `user.email`, and `user.tier` - all present on `AuthUser`. Shape is compatible.

---

## Task 2: Verify No Other Endpoints Have Same Bug

### Analysis Results

| Endpoint | Uses optionalAuth | Has coffee tier check | Affected? |
|----------|-------------------|----------------------|-----------|
| `POST /api/analyze` (line 391) | YES | YES (line 512-542) | **YES - PRIMARY BUG** |
| `POST /api/generate-llm-file` (line 813) | NO | NO | Not affected |
| `POST /api/validate` | YES | NO coffee gating | Not affected |
| `GET /api/credits` | YES | Uses authUser directly | Not affected |
| `GET /api/simple-usage/:email` | NO (public) | NO | Not affected |

**Only `/api/analyze` is affected.** No other endpoints combine `optionalAuth` + `const user` + coffee tier `user.id` gating.

### Action
No changes needed for other endpoints. Document this finding in the sprint.

---

## Task 3: Reduce Excessive Usage Polling

### Problem
Console log shows ~500+ `📊 [SIMPLE] Usage fetched` entries during a single session. The `useUsageTracking` hook has `refetchInterval: 60000` (60 seconds) but entries appear every ~2 seconds.

### Root Cause Hypothesis
When the JWT expires and auth state fluctuates, the email parameter to the hook changes between `undefined` and the actual email. Each change creates a new React Query key (`['simple-usage', undefined]` vs `['simple-usage', 'jamie...']`), causing both queries to fetch independently.

Additionally, `home.tsx:85` has `refetchInterval: 10000` (10 seconds) for a separate `/api/usage` query.

### Files to Modify

**`client/src/pages/home.tsx`** - Line 85:
```typescript
// BEFORE:
refetchInterval: 10000,

// AFTER:
refetchInterval: 60000, // Match useUsageTracking interval
```

**`client/src/hooks/useUsageTracking.ts`** - Add query key stability:
```typescript
// Ensure email is stable before enabling the query
enabled: !!email && email.length > 0,
```

### Verification
After fix, console should show simple-usage fetches at most every 60 seconds, not every 2 seconds.

---

## Task 4: Fix Auth State Zombie Session

### Problem
Console line 4 shows `/api/auth/me` returns 401 (JWT expired), but the frontend continues showing `hasUser=true, tier=coffee`. The user is in a "zombie" state - the UI thinks they're logged in, but their JWT is invalid.

### Root Cause
In `client/src/contexts/AuthContext.tsx:62-115`:
1. `initializeAuth()` sets stored user immediately (line 68)
2. Then tries to refresh from server via `/api/auth/me` (line 74)
3. When 401 returns, the catch block (line 102-110) SHOULD clear auth
4. But the error detection may not match - need to verify `authApi.getCurrentUser()` error format

### Files to Investigate
- `client/src/contexts/AuthContext.tsx:102-110` - Error string matching
- `client/src/lib/auth-api.ts` - How `getCurrentUser()` throws errors

### Action
Investigate whether the error message from `getCurrentUser()` contains 'expired' or 'invalid' (the strings checked at line 102-105). If the error format is `"401: {\"error\":...}"` the `.includes()` check may not match the nested JSON.

---

## Task 5: Test on Staging

### Test Plan

1. **Setup**: Log in as coffee tier user on staging
2. **Expire JWT**: Wait for JWT expiry or manually clear `auth_access_token` from sessionStorage while keeping `auth_user` data
3. **Reproduce original bug**: Navigate to `/analyze`, enter a URL, submit
4. **Expected before fix**: 400 error "Authentication required for Coffee tier"
5. **Expected after fix**: Analysis proceeds normally, credit is deducted

### Additional Tests
- Verify usage polling frequency is reasonable (not hundreds of fetches)
- Verify auth state properly clears or refreshes on JWT expiry
- Verify coffee credit consumption works (credit count decreases)

---

## Task 6: Deploy to Production

### Deploy Steps
1. Create feature branch: `feature/sprint-2-coffee-auth-fix`
2. Implement fixes (Tasks 1, 3, 4)
3. Push to develop branch
4. Test on staging environment
5. Create PR from develop -> main
6. Deploy to production

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| `authUser` shape mismatch with `user` | Credit check fails differently | Verify `AuthUser` type has `id`, `email`, `tier` fields |
| Polling fix breaks usage display | Users don't see updated credits | Test usage display updates correctly after analysis |
| Auth state clearing too aggressively | Users get logged out unnecessarily | Only clear on confirmed auth errors, not network errors |

---

## Backlog (Discovered, Not In Sprint)

- [ ] CSP: Add `plausible.io` to `script-src` directive
- [ ] Fix ~200 `<link preload>` unused resource warnings
- [ ] Make coffee credit check/consumption atomic (prevent race condition)
- [ ] Standardize auth resolution pattern across all endpoints
