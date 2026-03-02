# Sprint 7: Usage Tracking Schema Fix

## Problem

The production `usage_tracking` table is missing 5 columns that the application code expects, causing a **silent failure** on every analysis:

```
error: column "actual_tokens_used" does not exist (code: 42703)
```

### Root Cause

Migration `007_ai_cost_tracking.sql` was written (2025-01-30) and the application code was updated to use the new columns, but **the migration was never applied to the production or staging Neon databases**. The build system uses `esbuild` (transpile-only, no type checking), so additional code bugs also slipped through.

### Impact

- **Usage tracking silently fails** on every analysis - the `trackUsage()` function errors and catches, so analyses complete but no usage is recorded in the `usage_tracking` table
- **`simple_usage` table** (separate credit system) still works - credits are consumed correctly
- **Admin AI cost dashboard** (`/admin/ai-costs/*`) returns errors - all queries reference missing columns
- **Monthly cost monitoring** (`getMonthlyAiCost()`) always returns 0 - has a missing `gt` import bug on top of the missing columns

## Issues Found

| # | Issue | File | Line | Severity |
|---|-------|------|------|----------|
| 1 | Migration 007 never applied to production DB | `migrations/007_ai_cost_tracking.sql` | - | CRITICAL |
| 2 | `gt` function not imported but used in query | `server/services/usage.ts` | 15, 430 | HIGH |
| 3 | `updatedAt` field referenced but not in Drizzle schema | `server/services/usage.ts` | 359 | MEDIUM |
| 4 | `validations_count` in schema.ts but no migration for it | `shared/schema.ts` | 117 | LOW |

## Fix

### Part 1: Code Fixes (committed)

1. **Added `gt` import** to `server/services/usage.ts:15`
   - Before: `import { eq, and } from 'drizzle-orm';`
   - After: `import { eq, and, gt } from 'drizzle-orm';`

2. **Removed invalid `updatedAt` reference** from `server/services/usage.ts:359`
   - This field isn't in the Drizzle schema definition for `usageTracking`
   - The update query included it, which would cause a SQL error once the other columns exist

### Part 2: Database Migration (requires manual application)

Migration file: `migrations/011_apply_missing_columns.sql`

This must be applied to **both staging and production** Neon databases via the Neon SQL Editor:

**Columns added to `usage_tracking`:**
- `actual_tokens_used INTEGER DEFAULT 0` - OpenAI tokens consumed per day
- `actual_ai_cost INTEGER DEFAULT 0` - AI cost in cents per day
- `model_used TEXT` - Which OpenAI model was used
- `cost_cap_would_trigger BOOLEAN DEFAULT FALSE` - Cost cap monitoring flag
- `cost_cap_triggered_at TIMESTAMP` - When cost cap would trigger
- `validations_count INTEGER DEFAULT 0` - llms.txt validations per day

**Also creates:**
- Index `idx_usage_tracking_date_user` for efficient cost queries
- Index `idx_usage_tracking_cost_cap` for cost cap lookups
- View `monthly_ai_costs` for admin monitoring dashboard

### How to Apply Migration

1. Open Neon Dashboard for the **staging** project
2. Go to SQL Editor
3. Copy contents of `migrations/011_apply_missing_columns.sql`
4. Run it
5. Verify: `SELECT column_name FROM information_schema.columns WHERE table_name = 'usage_tracking' AND column_name = 'actual_tokens_used';`
6. Repeat for **production** project

## Verification

After migration is applied and code is deployed:

- [ ] Railway logs show no more `column "actual_tokens_used" does not exist` errors
- [ ] `trackUsage()` successfully inserts/updates records with cost data
- [ ] Admin endpoint `/admin/ai-costs/summary` returns data (if ADMIN_API_TOKEN is set)
- [ ] `getMonthlyAiCost()` returns non-zero values when AI calls are made

## Files Modified

- `server/services/usage.ts` - Fixed `gt` import, removed invalid `updatedAt` reference
- `migrations/011_apply_missing_columns.sql` - New migration combining all missing columns
