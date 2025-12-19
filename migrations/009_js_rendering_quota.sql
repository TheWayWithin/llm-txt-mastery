-- Sprint 6: JS Rendering Quota Tracking for Scale Tier
-- Adds columns to track monthly JS render usage for Scale tier users

-- Add JS rendering quota columns to auth_users table
ALTER TABLE auth_users
ADD COLUMN IF NOT EXISTS js_renders_used_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS js_renders_reset_at TIMESTAMP;

-- Initialize reset date for existing Scale tier users
UPDATE auth_users
SET js_renders_reset_at = DATE_TRUNC('month', CURRENT_TIMESTAMP) + INTERVAL '1 month'
WHERE tier = 'scale' AND js_renders_reset_at IS NULL;

-- Create index for efficient quota lookups
CREATE INDEX IF NOT EXISTS idx_auth_users_js_renders ON auth_users (tier, js_renders_used_this_month)
WHERE tier = 'scale';

COMMENT ON COLUMN auth_users.js_renders_used_this_month IS 'Number of JS renders used in current billing period (Scale tier only, limit 100)';
COMMENT ON COLUMN auth_users.js_renders_reset_at IS 'When to reset the monthly JS render counter';
