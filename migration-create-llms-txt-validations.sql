-- Migration: Create llms_txt_validations table
-- Date: 2025-10-21
-- Purpose: Fix 500 error in production validator endpoint
-- Issue: Table was added in development but never migrated to production
--
-- APPLY THIS TO PRODUCTION DATABASE VIA NEON/RAILWAY SQL EDITOR

-- Create the llms_txt_validations table
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
  cached BOOLEAN NOT NULL DEFAULT false,
  processing_time INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- Add indexes for query performance
CREATE INDEX IF NOT EXISTS idx_llms_txt_validations_url_hash
  ON llms_txt_validations(url_hash);

CREATE INDEX IF NOT EXISTS idx_llms_txt_validations_user_id
  ON llms_txt_validations(user_id);

CREATE INDEX IF NOT EXISTS idx_llms_txt_validations_anonymous_id
  ON llms_txt_validations(anonymous_id);

CREATE INDEX IF NOT EXISTS idx_llms_txt_validations_created_at
  ON llms_txt_validations(created_at);

-- Verify table creation
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'llms_txt_validations'
ORDER BY ordinal_position;

-- Expected output: 16 columns (id, user_id, anonymous_id, url, file_url, url_hash, valid, score,
--                              issues, recommendations, robots_conflicts, tier, cached,
--                              processing_time, created_at, expires_at)
