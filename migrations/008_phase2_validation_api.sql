-- Phase 2: Validation API Tables
-- Created: 2025-10-19
-- Description: Creates tables for llms.txt validation API, rate limiting, and caching

-- Rate limiting table for API throttling
CREATE TABLE IF NOT EXISTS rate_limits (
  id SERIAL PRIMARY KEY,
  identifier TEXT NOT NULL,
  identifier_type TEXT NOT NULL, -- 'user' or 'ip'
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP NOT NULL DEFAULT NOW(),
  window_end TIMESTAMP NOT NULL
);

-- Create index for efficient rate limit lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON rate_limits (identifier, identifier_type, endpoint, window_end);

-- llms.txt validation results table
CREATE TABLE IF NOT EXISTS llms_txt_validations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES auth_users(id),
  anonymous_id TEXT,
  url TEXT NOT NULL,
  file_url TEXT NOT NULL,
  url_hash TEXT NOT NULL,
  valid BOOLEAN NOT NULL,
  score INTEGER NOT NULL,
  issues JSONB,
  recommendations JSONB,
  robots_conflicts JSONB,
  tier TEXT NOT NULL,
  cached BOOLEAN NOT NULL DEFAULT FALSE,
  processing_time INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- Create indexes for validation lookups
CREATE INDEX IF NOT EXISTS idx_validations_user
  ON llms_txt_validations (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_validations_anonymous
  ON llms_txt_validations (anonymous_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_validations_url_hash
  ON llms_txt_validations (url_hash);
CREATE INDEX IF NOT EXISTS idx_validations_expires
  ON llms_txt_validations (expires_at) WHERE expires_at IS NOT NULL;

-- Validation cache table for 24-hour caching
CREATE TABLE IF NOT EXISTS validation_cache (
  id SERIAL PRIMARY KEY,
  url_hash TEXT NOT NULL UNIQUE,
  validation_result JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

-- Create index for cache expiry cleanup
CREATE INDEX IF NOT EXISTS idx_validation_cache_expires
  ON validation_cache (expires_at);

-- Verify tables were created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name IN ('rate_limits', 'llms_txt_validations', 'validation_cache')
  ) THEN
    RAISE NOTICE 'Phase 2 validation API tables created successfully';
  ELSE
    RAISE EXCEPTION 'Failed to create Phase 2 tables';
  END IF;
END $$;
