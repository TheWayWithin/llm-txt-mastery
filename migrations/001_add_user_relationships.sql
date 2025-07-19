-- Database Migration: Add User Relationships and Subscription Tables
-- Date: 2025-01-19
-- Description: Adds user_id foreign keys, subscription tables, and usage tracking

-- Add userId column to existing tables
ALTER TABLE "email_captures" ADD COLUMN "user_id" INTEGER REFERENCES "users"("id");
ALTER TABLE "sitemap_analysis" ADD COLUMN "user_id" INTEGER REFERENCES "users"("id");
ALTER TABLE "llm_text_files" ADD COLUMN "user_id" INTEGER REFERENCES "users"("id");

-- Create subscriptions table
CREATE TABLE "subscriptions" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "stripe_customer_id" TEXT UNIQUE,
  "stripe_subscription_id" TEXT UNIQUE,
  "tier" TEXT NOT NULL DEFAULT 'starter',
  "status" TEXT NOT NULL DEFAULT 'active',
  "current_period_start" TIMESTAMP,
  "current_period_end" TIMESTAMP,
  "cancel_at_period_end" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Create payment history table
CREATE TABLE "payment_history" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "subscription_id" INTEGER REFERENCES "subscriptions"("id"),
  "stripe_payment_intent_id" TEXT UNIQUE,
  "amount" INTEGER NOT NULL, -- Amount in cents
  "currency" TEXT NOT NULL DEFAULT 'usd',
  "status" TEXT NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Create usage tracking table
CREATE TABLE "usage_tracking" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "date" TEXT NOT NULL, -- YYYY-MM-DD format
  "analyses_count" INTEGER NOT NULL DEFAULT 0,
  "pages_processed" INTEGER NOT NULL DEFAULT 0,
  "ai_calls_count" INTEGER NOT NULL DEFAULT 0,
  "html_extractions_count" INTEGER NOT NULL DEFAULT 0,
  "cache_hits" INTEGER NOT NULL DEFAULT 0,
  "total_cost" INTEGER NOT NULL DEFAULT 0, -- Cost in cents
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW(),
  UNIQUE("user_id", "date")
);

-- Create analysis cache table
CREATE TABLE "analysis_cache" (
  "id" SERIAL PRIMARY KEY,
  "url" TEXT NOT NULL,
  "url_hash" TEXT NOT NULL UNIQUE,
  "content_hash" TEXT NOT NULL,
  "last_modified" TEXT,
  "etag" TEXT,
  "analysis_result" JSONB,
  "tier" TEXT NOT NULL,
  "cached_at" TIMESTAMP DEFAULT NOW(),
  "expires_at" TIMESTAMP NOT NULL,
  "hit_count" INTEGER NOT NULL DEFAULT 0
);

-- Create indexes for performance
CREATE INDEX "idx_email_captures_user_id" ON "email_captures"("user_id");
CREATE INDEX "idx_sitemap_analysis_user_id" ON "sitemap_analysis"("user_id");
CREATE INDEX "idx_llm_text_files_user_id" ON "llm_text_files"("user_id");
CREATE INDEX "idx_subscriptions_user_id" ON "subscriptions"("user_id");
CREATE INDEX "idx_subscriptions_stripe_customer_id" ON "subscriptions"("stripe_customer_id");
CREATE INDEX "idx_payment_history_user_id" ON "payment_history"("user_id");
CREATE INDEX "idx_usage_tracking_user_date" ON "usage_tracking"("user_id", "date");
CREATE INDEX "idx_analysis_cache_url_hash" ON "analysis_cache"("url_hash");
CREATE INDEX "idx_analysis_cache_expires_at" ON "analysis_cache"("expires_at");

-- Update existing email captures to link to users (if needed)
-- Note: This might need manual data migration depending on existing data

COMMENT ON TABLE "subscriptions" IS 'User subscription data for Stripe integration';
COMMENT ON TABLE "payment_history" IS 'Payment transaction history';
COMMENT ON TABLE "usage_tracking" IS 'Daily usage statistics per user';
COMMENT ON TABLE "analysis_cache" IS 'Cached analysis results for performance';