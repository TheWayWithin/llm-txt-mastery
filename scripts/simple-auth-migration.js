import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false
});

async function setupAuthTables() {
  const client = await pool.connect();
  
  try {
    console.log('Setting up authentication tables...');
    
    // Create users table with proper authentication fields
    await client.query(`
      CREATE TABLE IF NOT EXISTS auth_users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email_verified BOOLEAN DEFAULT FALSE,
        tier TEXT NOT NULL DEFAULT 'starter' CHECK (tier IN ('starter', 'coffee', 'growth', 'scale')),
        credits_remaining INTEGER DEFAULT 0,
        stripe_customer_id TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('✓ Created auth_users table');
    
    // Create user sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        refresh_token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        refresh_expires_at TIMESTAMP NOT NULL,
        user_agent TEXT,
        ip_address TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        last_used_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('✓ Created user_sessions table');
    
    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);
      CREATE INDEX IF NOT EXISTS idx_auth_users_tier ON auth_users(tier);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
    `);
    
    console.log('✓ Created indexes');
    
    // Create updated_at trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Create trigger for auth_users
    await client.query(`
      DROP TRIGGER IF EXISTS update_auth_users_updated_at ON auth_users;
      CREATE TRIGGER update_auth_users_updated_at
        BEFORE UPDATE ON auth_users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    
    console.log('✓ Created triggers');
    
    // Verify tables
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('auth_users', 'user_sessions')
      ORDER BY table_name
    `);
    
    console.log('✅ Authentication setup complete!');
    console.log('Tables created:', result.rows.map(row => row.table_name));
    
  } catch (error) {
    console.error('Setup failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupAuthTables();