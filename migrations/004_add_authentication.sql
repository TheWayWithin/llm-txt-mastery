-- Migration: Add authentication tables and update users table
-- Date: 2025-07-27
-- Description: Enhance users table for JWT authentication and add user sessions

-- Update users table for authentication
ALTER TABLE users 
  DROP COLUMN IF EXISTS username,
  ADD COLUMN IF NOT EXISTS email TEXT UNIQUE NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS credits_remaining INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Remove password column if it exists (replaced with password_hash)
ALTER TABLE users DROP COLUMN IF EXISTS password;

-- Create user sessions table for JWT token management
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  refresh_token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  refresh_expires_at TIMESTAMP NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token_hash ON user_sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at for users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add constraint to ensure tier is valid
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tier_check;
ALTER TABLE users ADD CONSTRAINT users_tier_check 
  CHECK (tier IN ('starter', 'coffee', 'growth', 'scale'));

-- Clean up any existing sessions that might be expired
-- (This is safe to run even if table is empty)
DELETE FROM user_sessions WHERE expires_at < NOW();

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts with authentication and tier information';
COMMENT ON TABLE user_sessions IS 'JWT session management for user authentication';
COMMENT ON COLUMN users.password_hash IS 'bcrypt hashed password';
COMMENT ON COLUMN users.tier IS 'User subscription tier: starter, coffee, growth, scale';
COMMENT ON COLUMN users.credits_remaining IS 'Remaining credits for coffee tier users';
COMMENT ON COLUMN user_sessions.token_hash IS 'SHA-256 hash of JWT access token';
COMMENT ON COLUMN user_sessions.refresh_token_hash IS 'SHA-256 hash of refresh token';