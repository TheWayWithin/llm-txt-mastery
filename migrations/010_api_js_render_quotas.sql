-- Migration: Add api_js_render_quotas table for API tiered access
-- Date: 2025-12-19
-- Sprint: 7 Phase 1 - API Enhancement: Tiered Access & JS Rendering
-- Purpose: Track JS rendering quota usage per external user per API key

-- Create the api_js_render_quotas table
CREATE TABLE IF NOT EXISTS api_js_render_quotas (
  id SERIAL PRIMARY KEY,
  api_key_id INTEGER NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  external_user_id TEXT NOT NULL,
  renders_used_this_month INTEGER DEFAULT 0 NOT NULL,
  reset_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_api_key_external_user UNIQUE(api_key_id, external_user_id)
);

-- Index for faster lookups by API key
CREATE INDEX IF NOT EXISTS idx_api_js_render_quotas_api_key
  ON api_js_render_quotas(api_key_id);

-- Index for lookups by external user (when checking across multiple API keys)
CREATE INDEX IF NOT EXISTS idx_api_js_render_quotas_external_user
  ON api_js_render_quotas(external_user_id);

-- Index for monthly reset queries
CREATE INDEX IF NOT EXISTS idx_api_js_render_quotas_reset_at
  ON api_js_render_quotas(reset_at)
  WHERE reset_at IS NOT NULL;

-- Comments for documentation
COMMENT ON TABLE api_js_render_quotas IS
  'Tracks JavaScript rendering quota usage per external user per API key. Used when API consumers pass their user tier and userId.';

COMMENT ON COLUMN api_js_render_quotas.api_key_id IS
  'Foreign key to api_keys table - identifies which API consumer this quota belongs to';

COMMENT ON COLUMN api_js_render_quotas.external_user_id IS
  'Consumer-provided user ID for quota tracking (e.g., aimp_user_123)';

COMMENT ON COLUMN api_js_render_quotas.renders_used_this_month IS
  'Number of JS renders used in current billing period. Resets on the 1st of each month.';

COMMENT ON COLUMN api_js_render_quotas.reset_at IS
  'When the quota counter will reset (typically first of next month). NULL means needs initialization.';
