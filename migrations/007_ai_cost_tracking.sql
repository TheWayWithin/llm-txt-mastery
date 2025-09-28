-- Migration: Add AI cost tracking columns to usage_tracking table
-- Purpose: Track actual OpenAI token usage and costs for monitoring and future cost cap implementation
-- Date: 2025-01-30

-- Add new columns for AI cost tracking
ALTER TABLE usage_tracking 
ADD COLUMN IF NOT EXISTS actual_tokens_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_ai_cost INTEGER DEFAULT 0, -- Actual AI cost in cents
ADD COLUMN IF NOT EXISTS model_used TEXT,
ADD COLUMN IF NOT EXISTS cost_cap_would_trigger BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cost_cap_triggered_at TIMESTAMP;

-- Add index for efficient cost queries
CREATE INDEX IF NOT EXISTS idx_usage_tracking_date_user ON usage_tracking(date, user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_cost_cap ON usage_tracking(cost_cap_would_trigger) WHERE cost_cap_would_trigger = true;

-- Add monthly cost view for easier monitoring
CREATE OR REPLACE VIEW monthly_ai_costs AS
SELECT 
    u.id as user_id,
    u.username,
    ec.email,
    ec.tier,
    DATE_TRUNC('month', CAST(ut.date AS DATE)) as month,
    SUM(ut.actual_ai_cost) / 100.0 as total_ai_cost_usd,
    SUM(ut.actual_tokens_used) as total_tokens,
    COUNT(DISTINCT ut.date) as active_days,
    SUM(ut.analyses_count) as total_analyses,
    MAX(ut.model_used) as most_recent_model,
    BOOL_OR(ut.cost_cap_would_trigger) as would_trigger_cap
FROM usage_tracking ut
JOIN users u ON u.id = ut.user_id
LEFT JOIN email_captures ec ON ec.user_id = u.id
GROUP BY u.id, u.username, ec.email, ec.tier, DATE_TRUNC('month', CAST(ut.date AS DATE))
ORDER BY month DESC, total_ai_cost_usd DESC;

-- Add comment for documentation
COMMENT ON COLUMN usage_tracking.actual_tokens_used IS 'Actual OpenAI tokens consumed for this day';
COMMENT ON COLUMN usage_tracking.actual_ai_cost IS 'Actual OpenAI API cost in cents for this day';
COMMENT ON COLUMN usage_tracking.model_used IS 'OpenAI model used (e.g., gpt-4o-mini, gpt-4o)';
COMMENT ON COLUMN usage_tracking.cost_cap_would_trigger IS 'Flag indicating if cost cap would have been triggered (for testing)';
COMMENT ON COLUMN usage_tracking.cost_cap_triggered_at IS 'Timestamp when cost cap would have been or was triggered';