-- Migration 011: Apply missing columns to usage_tracking
-- Purpose: Migration 007 (ai_cost_tracking) was never applied to production.
--          Also adds validations_count which was in schema.ts but had no migration.
-- Date: 2026-02-24
-- Sprint: Sprint 7 - Usage Tracking Schema Fix

-- Add AI cost tracking columns (from unapplied migration 007)
ALTER TABLE usage_tracking
ADD COLUMN IF NOT EXISTS actual_tokens_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_ai_cost INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS model_used TEXT,
ADD COLUMN IF NOT EXISTS cost_cap_would_trigger BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cost_cap_triggered_at TIMESTAMP;

-- Add validations_count column (defined in schema.ts but never migrated)
ALTER TABLE usage_tracking
ADD COLUMN IF NOT EXISTS validations_count INTEGER DEFAULT 0;

-- Add indexes for efficient cost queries (from migration 007)
CREATE INDEX IF NOT EXISTS idx_usage_tracking_date_user ON usage_tracking(date, user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_cost_cap ON usage_tracking(cost_cap_would_trigger) WHERE cost_cap_would_trigger = true;

-- Add monthly cost view for monitoring (from migration 007)
CREATE OR REPLACE VIEW monthly_ai_costs AS
SELECT
    u.id as user_id,
    u.email,
    ec.tier,
    DATE_TRUNC('month', CAST(ut.date AS DATE)) as month,
    SUM(ut.actual_ai_cost) / 100.0 as total_ai_cost_usd,
    SUM(ut.actual_tokens_used) as total_tokens,
    COUNT(DISTINCT ut.date) as active_days,
    SUM(ut.analyses_count) as total_analyses,
    MAX(ut.model_used) as most_recent_model,
    BOOL_OR(ut.cost_cap_would_trigger) as would_trigger_cap
FROM usage_tracking ut
JOIN auth_users u ON u.id = ut.user_id
LEFT JOIN "emailCaptures" ec ON ec.user_id = ut.user_id
GROUP BY u.id, u.email, ec.tier, DATE_TRUNC('month', CAST(ut.date AS DATE))
ORDER BY month DESC, total_ai_cost_usd DESC;

-- Record migration
INSERT INTO schema_migrations (filename)
VALUES ('011_apply_missing_columns.sql')
ON CONFLICT (filename) DO NOTHING;

-- Add comments for documentation
COMMENT ON COLUMN usage_tracking.actual_tokens_used IS 'Actual OpenAI tokens consumed for this day';
COMMENT ON COLUMN usage_tracking.actual_ai_cost IS 'Actual OpenAI API cost in cents for this day';
COMMENT ON COLUMN usage_tracking.model_used IS 'OpenAI model used (e.g., gpt-4o-mini, gpt-4o)';
COMMENT ON COLUMN usage_tracking.cost_cap_would_trigger IS 'Flag indicating if cost cap would have been triggered';
COMMENT ON COLUMN usage_tracking.cost_cap_triggered_at IS 'Timestamp when cost cap would have been triggered';
COMMENT ON COLUMN usage_tracking.validations_count IS 'Number of llms.txt validations performed this day';
